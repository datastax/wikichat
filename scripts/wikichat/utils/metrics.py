import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import timedelta

from wikichat.utils.pipeline import AsyncPipeline


@dataclass
class ListenerMetrics:
    total_events: int = 0
    canary_events: int = 0
    bot_events: int = 0
    skipped_events: int = 0
    enwiki_edits: int = 0


@dataclass
class DBMetrics:
    chunks_inserted: int = 0
    chunks_deleted: int = 0
    chunk_collision: int = 0

    articles_inserted: int = 0
    articles_read: int = 0


@dataclass
class Chunks:
    chunks_created: int = 0
    chunk_diff_new: int = 0
    chunk_diff_deleted: int = 0
    chunk_diff_unchanged: int = 0
    chunks_vectorized: int = 0


@dataclass
class _Metrics:
    _listener: ListenerMetrics = field(default_factory=ListenerMetrics)
    _database: DBMetrics = field(default_factory=DBMetrics)
    _chunks: Chunks = field(default_factory=Chunks)

    report_interval_secs: int = 10

    def __post_init__(self):
        self._start_secs = time.time()
        self._async_lock = asyncio.Lock()

    async def update_listener(self, total_events: int = 0, canary_events: int = 0, bot_events: int = 0,
                              skipped_events: int = 0, enwiki_edits: int = 0):
        async with self._async_lock:
            self._listener.total_events += total_events
            self._listener.canary_events += canary_events
            self._listener.bot_events += bot_events
            self._listener.skipped_events += skipped_events
            self._listener.enwiki_edits += enwiki_edits
            return None
            # return self._maybe_describe(pipeline=pipeline) if describe else None

    async def update_database(self, chunks_inserted: int = 0, chunks_deleted: int = 0, chunks_unchanged: int = 0,
                              chunk_collision: int = 0,
                              articles_inserted: int = 0, articles_read: int = 0):
        async with self._async_lock:
            self._database.chunks_inserted += chunks_inserted
            self._database.chunks_deleted += chunks_deleted
            self._database.chunk_collision += chunk_collision
            self._database.articles_inserted += articles_inserted
            self._database.articles_read += articles_read

    async def update_chunks(self, chunks_created: int = 0, chunk_diff_new: int = 0, chunk_diff_deleted: int = 0,
                            chunk_diff_unchanged: int = 0, chunks_vectorized: int = 0):
        async with self._async_lock:
            self._chunks.chunks_created += chunks_created
            self._chunks.chunk_diff_new += chunk_diff_new
            self._chunks.chunk_diff_deleted += chunk_diff_deleted
            self._chunks.chunk_diff_unchanged += chunk_diff_unchanged
            self._chunks.chunks_vectorized += chunks_vectorized

    async def describe(self, pipeline: AsyncPipeline) -> str:
        now = time.time()

        def _pprint(x):
            return f"{x:>8} (total) {round(x / processing_time.total_seconds(), 2):>8} (op/s)"

        async with self._async_lock:
            processing_time: timedelta = timedelta(seconds=now - self._start_secs)

            return f"""
                Total Time (h:mm:s):{processing_time}
                
                Wikipedia Listener:      
                    Total events:           {_pprint(self._listener.total_events)}
                    Canary events:          {_pprint(self._listener.canary_events)}
                    Bot events:             {_pprint(self._listener.bot_events)}
                    Skipped events:         {_pprint(self._listener.skipped_events)}
                    enwiki edits:           {_pprint(self._listener.enwiki_edits)}
                    
                Chunks: 
                    Chunks created:         {_pprint(self._chunks.chunks_created)}
                    Chunk diff new:         {_pprint(self._chunks.chunk_diff_new)}
                    Chunk diff deleted:     {_pprint(self._chunks.chunk_diff_deleted)}
                    Chunk diff unchanged:   {_pprint(self._chunks.chunk_diff_unchanged)}
                    Chunks vectorized:      {_pprint(self._chunks.chunks_vectorized)}
                    
                Database:
                    Chunks inserted:        {_pprint(self._database.chunks_inserted)}
                    Chunks deleted:         {_pprint(self._database.chunks_deleted)}
                    Chunk collisions:       {_pprint(self._database.chunk_collision)}
                    Articles read:          {_pprint(self._database.articles_read)}
                    Articles inserted:      {_pprint(self._database.articles_inserted)}
                    
                Pipeline:
                    {pipeline.queue_depths() if pipeline else ""}
            """

    async def metrics_reporter_task(self, pipeline: AsyncPipeline, interval_seconds: int = 10):
        try:
            while True:
                desc: str = await self.describe(pipeline)
                logging.info(desc)
                await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            # report one last time
            desc: str = await self.describe(pipeline)
            logging.info(desc)
            raise


METRICS = _Metrics()
