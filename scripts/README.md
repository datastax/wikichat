# WikiChat - Data Loader

The Python project in this directory is the companion data loader for the WikiChat Next.JS application. It is designed to load an initial 1,000 articles and then listen to changes from Wikipedia [Event Streams](https://wikitech.wikimedia.org/wiki/Event_Platform/EventStreams). Articles are broke into chunks, which are stored in Astra DB together with a vector calculated using [Cohere](https://cohere.ai/).

## Getting Started

### Python Environment

The Python code was developed and tested on a Mac, but should work on Linux and Windows. It was developed using Python 3.12.1, and we recommend you use that version. 

Create and configure a virtual python environment to run the code in: 
1. In the root directory of the project create a virtual environment using `python3 -m venv .venv`
2. Activate the environment for the current terminal session using `source .venv/bin/activate`
- Install dependencies `pip3 install -r requirements.txt`

### Credentials  

To run the data loader you will need an API token from [Cohere](https://cohere.ai/) and the Astra DB credentials from the WikiChat Next.JS application.

From within the `scripts/` directory make a copy of the `.env.example` file and name it `.env`. Edit the `.env` file and add your Cohere API token and Astra DB credentials as explained in the comments.

### Running the Data Loader

Run the entry point script from the root of the project and use the help to get started.  

```commandline
% python3 scripts/wiki_data.py --help
usage: wiki_data.py [-h] {load,listen,load-and-listen,embed-and-search,suggested-articles,suggested-search} ...

This script loads data from wikipedia and listens for changes.

positional arguments:
  {load,listen,load-and-listen,embed-and-search,suggested-articles,suggested-search}
                        Subcommands
    load                Bulk load data from a file of urls, one per line
    listen              Listen to a data source for changes
    load-and-listen     Bulk load, and then listen for changes
    embed-and-search    Embed a question and search the database for similar articles
    suggested-articles  Get chunks for suggested articles based on recent articles
    suggested-search    Run ANN search based on suggested articles in DB

options:
  -h, --help            show this help message and exit
```

The `load`, `listen`, and `load-and-listen` commands are used to ingest articles, the remianing commands are used to search the database for testing outside of the Next.js application. 

The most useful command is `load-and-listen`, which can be used without any parameters. Like all commands you can get a list of the available options using the `--help` flag.

```commandline
% python3 scripts/wiki_data.py load-and-listen --help
usage: wiki_data.py load-and-listen [-h] [--max_articles MAX_ARTICLES] [--truncate_first TRUNCATE_FIRST] [--rotate_collections_every ROTATE_COLLECTIONS_EVERY] [--max_file_lines MAX_FILE_LINES] [--file FILE]

options:
  -h, --help            show this help message and exit
  --max_articles MAX_ARTICLES
                        Maximum number of articles to process, from both bulk loading and listening. (default: 2000)
  --truncate_first TRUNCATE_FIRST
                        Truncate the database before starting the pipeline. (default: False)
  --rotate_collections_every ROTATE_COLLECTIONS_EVERY
                        Rotate the database collection every N chunks, 0 to disable. (default: 100000)
  --max_file_lines MAX_FILE_LINES
                        Maximum number of lines to read from the file to start processing, 0 to disable. (default: 0)
  --file FILE           File of urls, one per line (default: scripts/data/wiki_links.txt)
```

When run the `load-and-listen` command will attempt to load all the articles listed in the `scripts/data/wiki_links.txt` file. It will then listen for changes from Wikipedia and update the database accordingly. By default, it will stop after processing a maximum of 2,000 articles, counting both the articles loaded from the file and the articles updated from Wikipedia.

To assist with understanding the script makes extensive use of logging, logs are written to three locations: 

* Info level logs are written to the console, including a metrics about the processing pipeline (explained below).
* Debug level logs are written to the `scripts/logs/debug.log` file, which is rotated every 5MB and 5 old files are kept.
* Chunks that already existed in the database when we tried to insert them are logged in the `scripts/logs/existing_chunks.log` file. As this is an asyncronos pipeline there may be some situated where an article is updated quickly and the same chunk is inserted twice. This is not an error, but it is logged for debugging purposes.

When the script is started the command, arguments, and start time are logged as below:  

```commandline
% python3 scripts/wiki_data.py load-and-listen
2024-01-23 14:03:34.058 - INFO    - root - unknown_worker - Running command load-and-listen with args LoadPipelineArgs(max_articles=2000, truncate_first=False, rotate_collections_every=100000, max_file_lines=0, file='scripts/data/wiki_links.txt')
2024-01-23 14:03:34.058 - INFO    - root - unknown_worker - Starting...
2024-01-23 14:03:34.058 - INFO    - root - unknown_worker - Reading links from file scripts/data/wiki_links.txt limit is 0
2024-01-23 14:03:34.059 - INFO    - root - unknown_worker - Read 978 links from file scripts/data/wiki_links.txt
2024-01-23 14:03:34.060 - INFO    - root - unknown_worker - Starting to listen for changes
2024-01-23 14:03:34.067 - INFO    - root - unknown_worker - 
Processing:
    Total Time (h:mm:s):    0:00:02.189130
    Report interval (s):    10
Wikipedia Listener:      
    Total events:                  0 (total)      0.0 (op/s)
    Canary events:                 0 (total)      0.0 (op/s)
    Bot events:                    0 (total)      0.0 (op/s)
    Skipped events:                0 (total)      0.0 (op/s)
    enwiki edits:                  0 (total)      0.0 (op/s)
Chunks: 
    Chunks created:                0 (total)      0.0 (op/s)
    Chunk diff new:                0 (total)      0.0 (op/s)
    Chunk diff deleted:            0 (total)      0.0 (op/s)
    Chunk diff unchanged:          0 (total)      0.0 (op/s)
    Chunks vectorized:             0 (total)      0.0 (op/s)
Database:
    Rotations:                     0 (total)      0.0 (op/s)
    Chunks inserted:               0 (total)      0.0 (op/s)
    Chunks deleted:                0 (total)      0.0 (op/s)
    Chunk collisions:              0 (total)      0.0 (op/s)
    Articles read:                 0 (total)      0.0 (op/s)
    Articles inserted:             0 (total)      0.0 (op/s)
Pipeline:
    {'load_article': 968, 'chunk_article': 0, 'calc_chunk_diff': 0, 'vectorize_diff': 0, 'store_article_diff': 0}
Errors:
    None
Articles:
    Skipped - redirect:            0 (total)      0.0 (op/s)  
    Skipped - zero vector:         0 (total)      0.0 (op/s)
    Recent URLs:            None  
```

## Loader Metrics

The script logs metrics about the processing pipeline every 10 seconds, for example: 

```commandline
2024-01-23 14:05:21.009 - INFO    - root - unknown_worker - 
Processing:
    Total Time (h:mm:s):    0:01:49.131670
    Report interval (s):    10
Wikipedia Listener:      
    Total events:               2830 (total)    25.93 (op/s)
    Canary events:                 0 (total)      0.0 (op/s)
    Bot events:                 1268 (total)    11.62 (op/s)
    Skipped events:             1437 (total)    13.17 (op/s)
    enwiki edits:                125 (total)     1.15 (op/s)
Chunks: 
    Chunks created:            24434 (total)   223.89 (op/s)
    Chunk diff new:            22373 (total)   205.01 (op/s)
    Chunk diff deleted:            1 (total)     0.01 (op/s)
    Chunk diff unchanged:       1782 (total)    16.33 (op/s)
    Chunks vectorized:         18116 (total)    166.0 (op/s)
Database:
    Rotations:                     0 (total)      0.0 (op/s)
    Chunks inserted:            5539 (total)    50.76 (op/s)
    Chunks deleted:                1 (total)     0.01 (op/s)
    Chunk collisions:              0 (total)      0.0 (op/s)
    Articles read:                24 (total)     0.22 (op/s)
    Articles inserted:           101 (total)     0.93 (op/s)
Pipeline:
    {'load_article': 759, 'chunk_article': 1, 'calc_chunk_diff': 0, 'vectorize_diff': 45, 'store_article_diff': 168}
Errors:
    None
Articles:
    Skipped - redirect:           10 (total)     0.09 (op/s)  
    Skipped - zero vector:         0 (total)      0.0 (op/s)
    Recent URLs:            /William_Shakespeare /Earth  
```

The metrics are broken into the following sections:
* Processing: Information on the Python process 
    * Total Time (h:mm:s): The total time the script has been running
    * Report interval (s): How frewuently the report is generated
* Wikipedia Listener: Information about listening to Wikipedia changes
  * Total events: The total number of events received from Wikipedia changes
  * Canary events: The number of events that were canaries, i.e. not real edits
  * Bot events: The number of events that were from bots
  * Skipped events: The number of events that were either not in the english language or were not edits to article pages (e.g. talk pages)
  * enwiki edits: The number of events that were edits by humans to english article pages
* Chunks: Information about the chunks created and updated
  * Chunks created: The number of chunks created from all processed articles
  * Chunk diff new: The number of chunks that were determined to be new, includes both the first time we see an article and any subsequent updates 
  * Chunk diff deleted: The number of chunks that were deleted from articles
  * Chunk diff unchanged: The number of chunks that were unchanged
  * Chunks vectorized: The number of chunks that were vectorized using Cohere
* Database: Information about the database operations
  * Rotations: The number of times the database collections were truncated after reaching the maximum number of chunks controlled by the command line configuration. 
  * Chunks inserted: The number of chunks inserted into the database
  * Chunks deleted: The number of chunks deleted from the database
  * Chunk collisions: The number of times we tried to insert a chunk that already existed in the database
  * Articles read: The number of articles successfuly read from the database, these are articles that have been updated since the last time we read them
  * Articles inserted: The number of articles inserted into the database, including both the first time we see an article and any subsequent updates
* Pipeline: Information about the states of the asyncronous processing pipeline, each stage has a queue of articles to be processed 
  * load_article: The number of articles waiting to be scrapped from wikipedia
  * chunk_article: The number of articles waiting to be chunked
  * calc_chunk_diff: The number of articles waiting to have a diff calculated
  * vectorize_diff: The number of articles waiting to have new chunks vectorized (not the count of chunks)
  * store_article_diff: The number of articles waiting to be stored in the database, this includes storing new chunks, deleting old ones, and updating metadata. 
* Errors: Any errors that have occured, and their count
* Articles: Information about the articles processed
  * Skipped - redirect: The number of articles that were skipped because they were wikipedia redirects that would result in duplicate content
  * Skipped - zero vector: The number of articles that were skipped because Cohere was not able to vectorize all of the chunks for the article
  * Recent URLs: The URL paths to the articles processed since the last report, this is useful for debugging. 
