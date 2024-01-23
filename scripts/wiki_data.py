"""
Entry point for the script.
"""
import asyncio
import logging
import os
from logging.handlers import RotatingFileHandler

from wikichat import cli
from wikichat.utils.pipeline import WorkerNameLoggingFilter


def _config_logging():
    log_format = '%(asctime)s.%(msecs)03d - %(levelname)-7s - %(name)s - %(worker_name)s - %(message)s'
    log_dt_format = '%Y-%m-%d %H:%M:%S'
    log_dir = os.path.join(os.path.dirname(__file__), "logs")
    os.makedirs(log_dir, exist_ok=True)

    formatter = logging.Formatter(log_format, datefmt=log_dt_format)

    # Create a file handler to log messages to a file
    file_handler = RotatingFileHandler(os.path.join(log_dir, 'debug.log'), maxBytes=1024 * 1024 * 10, backupCount=5)
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(formatter)
    file_handler.addFilter(WorkerNameLoggingFilter())

    # Create a console handler to log messages to the console
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(formatter)
    console_handler.addFilter(lambda record: record.name == "root")
    console_handler.addFilter(WorkerNameLoggingFilter())

    # Get the root logger and add the file and console handlers to it
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG)
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    root_logger.addFilter(WorkerNameLoggingFilter())

    # Special file for chunks we have already seen
    existing_chunk_file_handler = RotatingFileHandler(os.path.join(log_dir, 'existing_chunks.log'),
                                                      maxBytes=1024 * 1024 * 5, backupCount=5)
    existing_chunk_file_handler.setLevel(logging.DEBUG)
    existing_chunk_file_handler.setFormatter(formatter)
    existing_chunk_file_handler.addFilter(WorkerNameLoggingFilter())

    existing_chunk_logger = logging.getLogger('existing_chunks')
    existing_chunk_logger.setLevel(logging.DEBUG)
    existing_chunk_logger.addHandler(existing_chunk_file_handler)
    existing_chunk_logger.addFilter(WorkerNameLoggingFilter())
    existing_chunk_logger.propagate = False


if __name__ == "__main__":

    _config_logging()
    parser = cli.config_arg_parse()

    env_cmd = os.getenv("COMMAND_LINE")
    cmds = env_cmd.split(" ") if env_cmd else None
    args = parser.parse_args(args=cmds)

    if not hasattr(args, "command_def"):
        parser.print_help()
        exit(1)

    command_def: cli.CliCommand = args.command_def
    asyncio.run(command_def.run(args))
