"""This module contains functions to read wikipedia articles
"""
from dataclasses import replace
from datetime import datetime
import logging
import re

import aiohttp
from bs4 import BeautifulSoup, ResultSet as bs4ResultSet
import pytz

from v2.model import ArticleMetadata, Article

CONTENT_ELEMENT_ID = 'mw-content-text'
VALID_TAGS = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
TITLE_ELEMENT_ID = "firstHeading"

# Remove content inside square brackets and the brackets themselves
PATTERN_SQUARE_BRACKETS = re.compile(r'\[.*?\]')
PATTERN_UNWANTED_CHARS = re.compile(r'[^a-zA-Z0-9\s,"()[\]{}:]')
PATTERN_SPACES = re.compile(r'\s+')


async def scrape_article(meta: ArticleMetadata) -> Article | None:
    """Loads the article content from the URL and cleans it up"""

    logging.debug(f"Scraping article {meta.url}")
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(meta.url) as response:
                if response.status == 200:
                    html: str = await response.text()
                else:
                    logging.error(
                        f"Continuing after error fetching {meta.url}, unexpected status code {response.status}")
                    return None
        except aiohttp.ClientError:
            logging.error(f"Continuing after error fetching {meta.url}", exc_info=True)
            return None

    # lxml is faster but html5lib is more lenient with broken HTML.
    # install the libraries with pip install  html5lib
    soup: BeautifulSoup = BeautifulSoup(html, 'lxml')
    content = soup.find(id=CONTENT_ELEMENT_ID)
    if not content:
        logging.error(
            f"Continuing after error fetching {meta.url}, could not find content element {CONTENT_ELEMENT_ID}")
        return None

    # Remove images
    for img in content.find_all('img'):
        img.decompose()

    # Extract text content from specific tags
    all_elements: bs4ResultSet = content.find_all(VALID_TAGS)
    cleaned_content: str = ' '.join([element.get_text() for element in all_elements])
    cleaned_content = PATTERN_SQUARE_BRACKETS.sub('', cleaned_content)
    cleaned_content = PATTERN_UNWANTED_CHARS.sub('', cleaned_content)
    cleaned_content = PATTERN_SPACES.sub(' ', cleaned_content)

    logging.debug(f"Scraped article {meta.url} with {len(cleaned_content)} characters")
    return Article(
        metadata=_maybe_update_title(meta, soup),
        content=cleaned_content
    )


def _maybe_update_title(meta: ArticleMetadata, soup: BeautifulSoup) -> ArticleMetadata:
    # first look for the wikipedia title element, this the title seen on the page and does not include the site name
    title_element = soup.find(id=TITLE_ELEMENT_ID)
    if not title_element:
        # try the standard HTML title element, maybe not a wikipedia article
        title_element = soup.find('title')

    return replace(meta, title=title_element.get_text()) if title_element else meta
