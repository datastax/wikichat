from typing import Any, Generator


def batch_list(
    full_list: list[Any], batch_size: int, enumerate_batches: bool = False
) -> Generator[list[Any] | tuple[int, list[Any]], None, None]:
    """
    Yield successive n-sized chunks from a list.
    """
    batch_count: int = 0
    for offset in range(0, len(full_list), batch_size):
        if enumerate_batches:
            yield batch_count, full_list[offset : offset + batch_size]
            batch_count += 1
        else:
            yield full_list[offset : offset + batch_size]
