"""
Defines an async pipeline that can be used to process items through a series of steps.

This is used by :mod:`wikichat.processing` to build a pipeline of commands defined in :mod:`wikichat.processing.articles`.

"""
import asyncio
import contextvars
import logging
from typing import Callable, Any, Union

# used by the pipeline and the log filter to get the worker name
WORKER_NAME_CONTEXT_VAR = contextvars.ContextVar('worker_name', default="unknown_worker")


class AsyncStep:
    """A step in the pipeline that will call the func for each object added to it's source queue"""

    def __init__(self, func: Callable[[Any], Any], num_tasks: int,
                 listener: Callable[['AsyncStep', Any], bool] = None):
        self.func: Callable[[Any], Any] = func
        self.name: str = self.func.__name__
        self.num_tasks: int = num_tasks

        self._listener = listener
        self._error_listener: Callable[[Exception], None] = None

        self._source: asyncio.Queue = asyncio.Queue()
        self._next_step: Union['AsyncStep', None] = None

        # see start_tasks
        self.tasks = []

    def start_tasks(self):
        """Create the tasks and get them listening to the source queue.

        Does not happen automatically because the pipeline may change the source queue.
        Adding the step to the pipeline will call this automatically.
        """
        if self.tasks:
            raise Exception("Tasks already started")
        self.tasks = [asyncio.create_task(self._worker(f"{self.name}-{i}"), name=f"{self.name}-{i}") for i in
                      range(self.num_tasks)]

    async def add_item(self, item: Any) -> bool:
        await self._source.put(item)
        return True

    async def _worker(self, worker_name: str):
        while True:

            item = await self._source.get()
            # We call the listener here before passing to the worker.
            # The listener can decide to not pass the item to the worker, or if somethign should be done
            # before the worker starts. The listener can use a lock to step all other workers starting until it is done.
            # listener need to handle async
            context_token = WORKER_NAME_CONTEXT_VAR.set(worker_name)
            try:
                if self._listener is None:
                    process_item = True
                else:
                    process_item: bool = await self._listener(self, item)
                if not process_item:
                    continue
                result = await self.func(item)

                if result is not None and self._next_step:
                    # there is no dest when this is the last step
                    await self._next_step.add_item(result)
            except Exception as e:
                logging.exception(f"Error in worker, item will be dropped - {e}", exc_info=True)
                # Second log is to get the details into the debug so we can fix, first is to get it into
                # heroku or other log aggregators
                logging.debug(f"Error in worker {worker_name}", exc_info=True)
                if self._error_listener:
                    try:
                        await self._error_listener(e)
                    except Exception as e2:
                        logging.exception(f"Error in error listener - {e2}", exc_info=False)
            finally:
                WORKER_NAME_CONTEXT_VAR.reset(context_token)

            self._source.task_done()


class AsyncPipeline:
    """The pipeline of :class:`AsyncStep` that will process items through the steps"""

    def __init__(self, max_items: int = 0, error_listener: Callable[[Exception], None] = None):
        self.steps: list[AsyncStep] = []
        self._put_count: int = 0
        self.max_items: int = max_items
        self._error_listener = error_listener
        self._async_lock = asyncio.Lock()

    def add_step(self, step: AsyncStep) -> 'AsyncPipeline':
        if self.steps:
            self.steps[-1]._next_step = step
        step._error_listener = self._error_listener
        self.steps.append(step)
        # start now because we may have changed the source queue
        step.start_tasks()
        return self

    def add_last_step(self, step: AsyncStep) -> 'AsyncPipeline':
        # set the last step dest to be None so we do not fill up the queue with no readers
        step.dest = None
        self.add_step(step)
        return self

    async def put_to_first_step(self, item: Any) -> bool:
        async with self._async_lock:
            if not self.max_items or self._put_count < self.max_items:
                await self.steps[0].add_item(item)
                self._put_count += 1
                return True
            else:
                return False

    def queue_depths(self) -> dict[str, int]:
        return {step.name: step._source.qsize() for step in self.steps}

    async def join_all_steps(self):
        logging.info("Waiting for all step source queues to be empty")
        for step in self.steps:
            # the steps dest is the source for the next step
            logging.info(f"Waiting for step {step.name} source queue to be empty")
            await step._source.join()
        logging.info("All step source queues are empty")
        return

    def tasks(self) -> list:
        return [task for step in self.steps for task in step.tasks]

    async def cancel_and_gather(self):
        logging.info("Cancelling all tasks")
        for task in self.tasks():
            logging.info(f"Cancelling task {task}")
            task.cancel()
        logging.info("Gathering all tasks")
        await asyncio.gather(*self.tasks(), return_exceptions=True)


class WorkerNameLoggingFilter(logging.Filter):
    """Add the worker name to the log record"""

    def filter(self, record):
        record.worker_name = WORKER_NAME_CONTEXT_VAR.get()
        return True
