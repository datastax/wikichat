"""
This module contains functions to read wikipedia articles
"""
import logging
import re
from dataclasses import replace

import aiohttp
from bs4 import BeautifulSoup, ResultSet as bs4ResultSet

from wikichat.processing.model import ArticleMetadata, Article
from wikichat.utils.metrics import METRICS

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
            async with session.get(meta.url, allow_redirects=True) as response:
                if response.status == 200:
                    html: str = await response.text()
                else:
                    logging.error(
                        f"Continuing after error fetching {meta.url}, unexpected status code {response.status}")
                    return None
        except aiohttp.ClientError as e:
            logging.error(f"Continuing after error fetching {meta.url} - {e}")
            logging.debug(f"Continuing after error fetching {meta.url}", exc_info=True)
            return None

    # lxml is faster but html5lib is more lenient with broken HTML.
    # install the libraries with pip install  html5lib
    soup: BeautifulSoup = BeautifulSoup(html, 'lxml')

    redirects_to = _redirects_to(meta, soup)
    if redirects_to:
        # Do not process pages that direct to another,
        # because different articles with diff URLs have the same content and we get a bunch of chunk collisions
        logging.debug(f"Skipping article {meta.url} because it redirects to {redirects_to}")
        await METRICS.update_article(redirects=1)
        return None

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
        metadata=_maybe_update_metadata(meta, soup),
        content=cleaned_content
    )


def _redirects_to(meta: ArticleMetadata, soup: BeautifulSoup) -> str | None:
    # Next is handling wiki redirects, these are not normal HTTP 302 redirects
    # see https://en.wikipedia.org/wiki/Wikipedia:Redirect
    # Best I can find is look for <link rel="canonical" href="https://en.wikipedia.org/wiki/We_Are_the_World">
    # Example is:
    # https://en.wikipedia.org/wiki/USA_for_Africa redirects to https://en.wikipedia.org/wiki/We_Are_the_World
    # Canonical will be the same as the URL for articles that do not redirect
    canonical_link = soup.find('link', attrs={'rel': 'canonical'})
    new_url = canonical_link.get('href') if canonical_link else None

    return new_url if new_url and new_url != meta.url else None


def _maybe_update_metadata(meta: ArticleMetadata, soup: BeautifulSoup) -> ArticleMetadata:
    replace_meta = False
    # first look for the wikipedia title element, this the title seen on the page and does not include the site name
    # try the standard HTML title element, maybe not a wikipedia article
    title_element = soup.find(id=TITLE_ELEMENT_ID) or soup.find('title')
    new_title = title_element.get_text() if title_element else None
    if new_title and new_title != meta.title:
        replace_meta = True
        logging.debug(f"Updating title for {meta.url} from {meta.title} to {new_title}")

    return replace(meta, title=new_title) if replace_meta else meta
