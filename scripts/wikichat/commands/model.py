from dataclasses import dataclass, field

from dataclasses_json import dataclass_json

# ======================================================================================================================
# pipeline commands
# ======================================================================================================================

@dataclass_json
@dataclass
class CommonPipelineArgs():
    max_articles: int = field(default=25,
                              metadata={
                                  "help": 'Maximum number of articles to process, from both bulk loading and listening.'})

    truncate_first: bool = field(default=False,
                                    metadata={
                                        "help": 'Truncate the database before starting the pipeline.'})


@dataclass_json
@dataclass
class LoadPipelineArgs(CommonPipelineArgs):
    max_file_lines: int = field(default=15,
                                metadata={
                                    "is_file_arg": True,
                                    "help": 'Maximum number of lines to read from the file to start processing.'
                                })
    file: str = field(default="data/wiki_links.txt",
                      metadata={
                          "is_file_arg": True,
                          "help": 'File of urls, one per line'}
                      )

# ======================================================================================================================
# database commands
# ======================================================================================================================

@dataclass_json
@dataclass
class EmbedAndSearchArgs():
    query: str
    limit: int = 5
    filter_json: str = ""
    _filter: dict[str, any] | None = field(init=False)

    def __post_init__(self):
        self._filter = None if not self.filter_json else json.loads(self.filter_json)
