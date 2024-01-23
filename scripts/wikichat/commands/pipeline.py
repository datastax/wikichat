"""
COmmands that process articles through the pipeline
"""
import json
import logging
from typing import Any

from aiohttp import ClientPayloadError
from aiohttp_sse_client2.client import MessageEvent, EventSource

from wikichat.commands.model import CommonPipelineArgs, LoadPipelineArgs
from wikichat.processing.articles import process_article_metadata
from wikichat.processing.model import ArticleMetadata
from wikichat.utils.metrics import METRICS
from wikichat.utils.pipeline import AsyncPipeline

WIKIPEDIA_CHANGES_URL = 'https://stream.wikimedia.org/v2/stream/recentchange'


# ======================================================================================================================
# Commands
# ======================================================================================================================

async def load_base_data(pipeline: AsyncPipeline, args: LoadPipelineArgs) -> bool:
    return await process_article_metadata(pipeline,
                                          read_popular_links(args.file, max_file_lines=args.max_file_lines))


async def listen_for_changes(pipeline: AsyncPipeline, args: CommonPipelineArgs) -> bool:
    # for SSE client see https://pypi.org/project/aiohttp-sse-client2/

    event: MessageEvent
    keep_listening: bool = True

    # Issue with timeout
    # see https://github.com/rtfol/aiohttp-sse-client/issues/2
    while keep_listening:
        async with EventSource(WIKIPEDIA_CHANGES_URL, timeout=None) as event_source:
            try:
                async for event in event_source:
                    event_doc: dict[Any, Any] = maybe_parse_wiki_event(event)
                    match event_doc:
                        case {"meta": {"domain": "canary"}}:
                            # these are events used by wikipedia to test the service, ignore them
                            await METRICS.update_listener(total_events=1, canary_events=1)
                            pass
                        case {"bot": True}:
                            # ignore bot edits
                            await METRICS.update_listener(total_events=1, bot_events=1)
                            pass
                        case {"namespace": 0, "wiki": "enwiki", "type": "edit"}:
                            # namespace 0 is the  wikipedia article namespace, this skips talk pages etc.
                            # see https://en.wikipedia.org/wiki/Wikipedia:Namespace
                            article_metadata: ArticleMetadata = ArticleMetadata(
                                title=event_doc['title'],
                                url=event_doc['title_url']
                            )

                            # Let's process this article!
                            if not await process_article_metadata(pipeline, [article_metadata]):
                                keep_listening = False
                                break
                            await METRICS.update_listener(total_events=1, enwiki_edits=1)
                        case _:
                            await METRICS.update_listener(total_events=1, skipped_events=1)

            except ConnectionError:
                pass
            except ClientPayloadError:
                # see https://github.com/aio-libs/aiohttp/issues/4581
                # there seems to be no work around for this yet (Jen 2024) so just retry
                logging.debug("Error in event source, retrying see https://github.com/aio-libs/aiohttp/issues/4581",
                              exc_info=True)
                pass
    return False


async def load_and_listen(pipeline: AsyncPipeline, args: LoadPipelineArgs) -> bool:
    if await load_base_data(pipeline, args):
        logging.info("Starting to listen for changes")
        return await listen_for_changes(pipeline, args)
    else:
        logging.info("Reached max item quota using the base data, will not listen for changes")
    return False


# ======================================================================================================================
# Helpers
# ======================================================================================================================

def read_popular_links(file_path: str, max_file_lines: int):
    """Read the popular links file we use to bootstrap the system"""
    # Sample of the line in the file

    links: list[ArticleMetadata] = list()
    logging.info(f"Reading links from file {file_path} limit is {max_file_lines}")
    line_count = 0
    with open(file_path, mode='r', newline='') as file:
        while max_file_lines == 0 or line_count < max_file_lines:
            url: str = file.readline().strip()
            line_count += 1

            if not url:
                # end of file
                break
            links.append(ArticleMetadata(url=url))

    logging.info(f"Read {len(links)} links from file {file_path}")
    return links


def maybe_parse_wiki_event(event: MessageEvent) -> dict[Any, Any] | None:
    # Wikipedia Recent Changes schema see
    # https://wikitech.wikimedia.org/wiki/Event_Platform/EventStreams#Recent_Changes
    # https://schema.wikimedia.org/repositories/primary/jsonschema/mediawiki/recentchange/latest.yaml

    if event.type != 'message':
        return None
    try:
        return json.loads(event.data)
    except ValueError:
        logging.debug(f"Error parsing event data, continuing: {event.data}")
        return None
