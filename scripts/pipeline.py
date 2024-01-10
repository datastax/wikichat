import asyncio
import contextvars
import logging
import sys
from typing import Callable, Any

# used by the pipeline and the log filter to get the worker name
WORKER_NAME_CONTEXT_VAR = contextvars.ContextVar('worker_name', default="unknown_worker")

class AsyncStep:

    def __init__(self, func: Callable[[Any], Any], num_tasks: int):
        self.func: Callable[[Any], Any] = func
        self.name: str = self.func.__name__
        self.num_tasks: int = num_tasks

        self.source: asyncio.Queue = asyncio.Queue()
        self.dest: asyncio.Queue = asyncio.Queue()

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

    async def _worker(self, worker_name: str):
        while True:
            item = await self.source.get()
            context_token = WORKER_NAME_CONTEXT_VAR.set(worker_name)
            try:
                result = await self.func(item)

                if result is not None and self.dest:
                    # there is no dest when this is the last step
                    await self.dest.put(result)
            except Exception:
                logging.exception(f"Error in worker {worker_name}", exc_info=True)
                sys.exit(1)
            finally:
                WORKER_NAME_CONTEXT_VAR.reset(context_token)

            self.source.task_done()


class AsyncPipeline:
    def __init__(self, max_items: int = 0):
        self.steps: list[AsyncStep] = []
        self._put_count: int = 0
        self.max_items: int = max_items
        self._async_lock = asyncio.Lock()

    def add_step(self, step: AsyncStep) -> 'AsyncPipeline':
        if self.steps:
            step.source = self.steps[-1].dest
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
                self._put_count += 1
                await self.steps[0].source.put(item)
                return True
            else:
                return False

    def queue_depths(self) -> dict[str, int]:
        return {step.name: step.source.qsize() for step in self.steps}

    async def join_all_steps(self):
        logging.info("Waiting for all step source queues to be empty")
        for step in self.steps:
            # the steps dest is the source for the next step
            logging.info(f"Waiting for step {step.name} source queue to be empty")
            await step.source.join()
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
