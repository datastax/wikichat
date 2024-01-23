"""
The command line options are configured there, they are CLICommand and PipelineCommand objects.

The CLICommands are abstractions for running the code in the commands/ module. The code in here should not
cause any of the commands to be loaded until they are invoked by the command line. The exception is the
commands/model which is used to build the argparse options.

"""
import argparse
import asyncio
import logging
from argparse import ArgumentParser, ArgumentDefaultsHelpFormatter
from dataclasses import dataclass, fields, MISSING
from typing import Callable, Any, Union

from wikichat.commands import model
from wikichat.utils.metrics import METRICS


# ======================================================================================================================
# Model
# ======================================================================================================================

@dataclass
class CliCommand:
    """Base for all commands we create in argparse.

     argparse calls these subcommands"""
    name: str
    help: str
    func_supplier: Callable
    args_cls: Union[type, None] = None

    async def run(self, args: argparse.Namespace):
        kwargs = vars(args)

        # removing from the kwargs also removes it from the args object
        # we want to get everything out that is not part of the args_cls
        # the command name passed on the cli
        command_name = kwargs.pop("command", None)
        kwargs.pop("command_def", None)

        command_func = self.func_supplier()
        if command_func is None:
            raise ValueError("No function to run")
        command_args: Any = None if self.args_cls is None else self.args_cls(**kwargs)

        logging.info(f"Running command {self.name} with args {command_args}")
        return await self._run_func(command_func, command_args)

    async def _run_func(self, command_func: Callable, command_args: Any):
        return await command_func(command_args)


@dataclass
class PipelineCommand(CliCommand):

    async def _run_func(self, command_func: Callable, command_args: model.CommonPipelineArgs):
        from wikichat.utils.pipeline import AsyncPipeline
        from wikichat import processing
        from wikichat import database

        if command_args.truncate_first:
            await database.truncate_all_collections()

        pipeline: AsyncPipeline = processing.create_pipeline(max_items=command_args.max_articles,
                                                             rotate_collection_every=command_args.rotate_collections_every)
        metrics_task = asyncio.create_task(METRICS.metrics_reporter_task(pipeline))

        logging.info("Starting...")
        await command_func(pipeline, command_args)

        await pipeline.join_all_steps()
        await pipeline.cancel_and_gather()

        metrics_task.cancel()
        try:
            logging.debug("Waiting for metrics task to finish")
            await metrics_task
        except asyncio.CancelledError:
            logging.debug("Metrics task cancelled")
        return

# ======================================================================================================================
# Delayed loading of the command functions to avoid circular imports
# ======================================================================================================================

def _load_base_data() -> Callable:
    from wikichat.commands import pipeline
    return pipeline.load_base_data


def _listen_for_changes() -> Callable:
    from wikichat.commands import pipeline
    return pipeline.listen_for_changes


def _load_and_listen() -> Callable:
    from wikichat.commands import pipeline
    return pipeline.load_and_listen


def _embed_and_search() -> Callable:
    from wikichat.commands import database
    return database.embed_and_search

def _suggested_articles() -> Callable:
    from wikichat.commands import database
    return database.suggested_articles

def _suggested_search() -> Callable:
    from wikichat.commands import database
    return database.suggested_search

# ======================================================================================================================
# The commands we want to make available on the command line, an object for each command,
# and the functions to configure the argparse
# ======================================================================================================================

ALL_COMMANDS: list[CliCommand] = [
    PipelineCommand(
        name="load",
        help='Bulk load data from a file of urls, one per line',
        func_supplier=_load_base_data,
        args_cls=model.LoadPipelineArgs
    ),
    PipelineCommand(
        name="listen",
        help='Listen to a data source for changes',
        func_supplier=_listen_for_changes,
        args_cls=model.CommonPipelineArgs
    ),
    PipelineCommand(
        name="load-and-listen",
        help='Bulk load, and then listen for changes',
        func_supplier=_load_and_listen,
        args_cls=model.LoadPipelineArgs
    ),
    CliCommand(
        name="embed-and-search",
        help="Embed a question and search the database for similar articles",
        func_supplier=_embed_and_search,
        args_cls=model.EmbedAndSearchArgs),
    CliCommand(
        name="suggested-articles",
        help="Get chunks for suggested articles based on recent articles",
        func_supplier=_suggested_articles,
        args_cls=None),
    CliCommand(
        name="suggested-search",
        help="Run ANN search based on suggested articles in DB",
        func_supplier=_suggested_search,
        args_cls=model.SuggestedSearchArgs)
]


def _add_command_args(args_cls, parser: ArgumentParser) -> ArgumentParser:
    if not args_cls:
        return parser

    for arg_field in fields(args_cls):
        if not arg_field.init:
            continue

        if arg_field.default_factory is not MISSING or arg_field.default is not MISSING:
            default = arg_field.default_factory if arg_field.default_factory is not MISSING else arg_field.default
            parser.add_argument(f"--{arg_field.name}", type=arg_field.type, required=False,
                                default=default,
                                help=arg_field.metadata.get("help", ""))
        else:
            parser.add_argument(arg_field.name, type=arg_field.type,
                                help=arg_field.metadata.get("help", ""))
    return parser


def config_arg_parse():
    # Create the top-level parser
    parser = ArgumentParser(description="This script loads data from wikipedia and listens for changes.",
                            formatter_class=ArgumentDefaultsHelpFormatter)
    subparsers = parser.add_subparsers(dest="command", help="Subcommands")

    # Common args for all commands
    common_arguments = ArgumentParser(add_help=False)

    # Commands to get the script to do something
    for command in ALL_COMMANDS:
        command_parser = subparsers.add_parser(command.name, parents=[common_arguments],
                                               formatter_class=ArgumentDefaultsHelpFormatter,
                                               help=command.help)
        command_parser.set_defaults(command_def=command)
        _add_command_args(command.args_cls, command_parser)
    return parser
