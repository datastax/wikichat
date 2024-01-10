# Read Me

** HACK **

This is a hack to get peeps going while we polish, all the files will get moved around soon.

The code Aaron wrote is in this dir, scripts. It will get moved soon.

To get started: 

Copy the .env.example file and setup, see insturctions in the file 

Create a python virtual environment:

- coded with python v 3.12.1 (should work with anything beyond 3.9 I think but has not tested)
- Create python environment `python3 -m venv venv`
- Activate the environment `. venv/bin/activate`
- Install dependencies `pip install -r requirements.txt`

Run the entry point script it is in the outer directory (for now), see the help: 

```commandline
% python3 wiki_data.py --help
usage: wiki_data.py [-h] {load,listen,load_and_listen} ...

This script loads data from wikipedia and listens for changes.

positional arguments:
  {load,listen,load_and_listen}
                        Subcommands
    load                Bulk load data from a file of urls, one per line
    listen              Listen to a data source for changes
    load_and_listen     Bulk load, and then listen for changes

options:
  -h, --help            show this help message and exit
```

There are three commands, load, listen, and load_and_listen.
There is help for each command.

```commandline
% python3 wiki_data.py load --help
usage: wiki_data.py load [-h] [--max_articles MAX_ARTICLES] [--max_file_lines MAX_FILE_LINES] [--file FILE]

options:
  -h, --help            show this help message and exit
  --max_articles MAX_ARTICLES
                        Maximum number of articles to process, from both bulk loading and listening. (default: 25)
  --max_file_lines MAX_FILE_LINES
                        Maximum number of lines to read from the file to start processing. (default: 15)
  --file FILE           File of urls, one per line (default: scripts/wiki_links.txt)
```

You do not need to pass any args to make it work, try with the defaults and listen for new articles.

```commandline
% python3 wiki_data.py listen       
2024-01-10 19:34:25.163 - INFO    - root - unknown_worker - Running command listen with args CommandArgs(max_articles=25, max_file_lines=15, file='scripts/wiki_links.txt')
2024-01-10 19:34:25.166 - INFO    - root - unknown_worker - Starting...
2024-01-10 19:34:25.175 - INFO    - root - unknown_worker - 
                Total Time (h:mm:s):0:00:00.016958
                
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
                    Chunks inserted:               0 (total)      0.0 (op/s)
                    Chunks deleted:                0 (total)      0.0 (op/s)
                    Chunk collisions:              0 (total)      0.0 (op/s)
                    Articles read:                 0 (total)      0.0 (op/s)
                    Articles inserted:             0 (total)      0.0 (op/s)
                    
                Pipeline:
                    {'load_article': 0, 'chunk_article': 0, 'calc_chunk_diff': 0, 'vectorize_diff': 0, 'store_article_diff': 0}
            
2024-01-10 19:34:27.663 - INFO    - root - unknown_worker - Updated article: https://en.wikipedia.org/wiki/Diocese_of_Gaza
2024-01-10 19:34:27.942 - INFO    - root - unknown_worker - Updated article: https://en.wikipedia.org/wiki/Anna_Kalinskaya
2024-01-10 19:34:28.260 - INFO    - root - unknown_worker - Updated article: https://en.wikipedia.org/wiki/List_of_works_by_Vincent_van_Gogh
```