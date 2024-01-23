"""
Arguments used by the command functions.

This module is loaded by the CLI to understand what command line options to expose via argparse. It should not
load other parts of the wikichat application.
"""
from dataclasses import dataclass, field

from dataclasses_json import dataclass_json


# ======================================================================================================================
# pipeline commands
# ======================================================================================================================

@dataclass_json
@dataclass
class CommonPipelineArgs():
    max_articles: int = field(default=2000,
                              metadata={
                                  "help": 'Maximum number of articles to process, from both bulk loading and listening.'})

    truncate_first: bool = field(default=True,
                                 metadata={
                                     "help": 'Truncate the database before starting the pipeline.'})

    rotate_collections_every: int = field(default=100000,
                                          metadata={
                                              "help": "Rotate the database collection every N chunks, 0 to disable."})


@dataclass_json
@dataclass
class LoadPipelineArgs(CommonPipelineArgs):
    max_file_lines: int = field(default=0,
                                metadata={
                                    "help": 'Maximum number of lines to read from the file to start processing, 0 to disable.'
                                })
    file: str = field(default="scripts/data/wiki_links.txt",
                      metadata={
                          "help": 'File of urls, one per line'})


# ======================================================================================================================
# database commands
# ======================================================================================================================

@dataclass_json
@dataclass
class EmbedAndSearchArgs():
    query: str = field(metadata={
        "help": 'String to embedd and using for ANN search'}
    )
    limit: int = field(default=5,
                       metadata={
                           "help": 'Limit to use for ANN search.'
                       })
    filter_json: str = field(default="",
                             metadata={
                                 "help": 'JSON string to parse to create a filter for the ANN search.'
                             })
    _filter: dict[str, any] | None = field(init=False)

    def __post_init__(self):
        self._filter = None if not self.filter_json else json.loads(self.filter_json)


@dataclass_json
@dataclass
class SuggestedSearchArgs():
    repeats: int = field(default=3,
                         metadata={
                             "help": 'Number of times to search using a new suggested article, 0 for continuous.'
                         })

    limit: int = field(default=5,
                       metadata={
                           "help": 'Limit to use for ANN search.'
                       })

    delay_secs: float = field(default=2,
                              metadata={
                                  "help": 'Delay between searches.'
                              })
