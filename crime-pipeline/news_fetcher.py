"""
SafeAround - News Fetcher Service (Phase 1)
============================================
Fetches crime news from multiple Indian sources:
  - Google News RSS (EN + HI)
  - NewsAPI
  - Times of India RSS
  - Hindustan Times RSS
  - Indian Express RSS
  - NDTV RSS
  - Aaj Tak RSS (Hindi)

Features:
  - Parallel source fetching (ThreadPoolExecutor)
  - URL-based deduplication (Redis-backed + in-memory)
  - Title similarity dedup (80% threshold)
  - Retry logic with exponential backoff
  - 24-hour freshness filter
  - India-relevance keyword filter
"""
import hashlib
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher

import feedparser
import requests
from dateutil import parser as dateutil_parser

logger = logging.getLogger("pipeline.news_fetcher")

# ─── Crime Keywords ────────────────────────────────────────────────────────────
CRIME_KEYWORDS_EN = [
    "crime", "murder", "killed", "death", "rape", "sexual assault",
    "robbery", "dacoity", "loot", "theft", "stolen", "burglary",
    "assault", "attack", "stabbed", "shoot", "shooting", "bomb",
    "kidnap", "abduction", "missing", "arrested", "police",
    "accused", "victim", "complaint", "FIR", "accused",
]
CRIME_KEYWORDS_HI = [
    "हत्या", "बलात्कार", "लूट", "डकैती", "चोरी",
    "हमला", "अपहरण", "गिरफ्तार", "पुलिस", "मृत",
    "घायल", "गोली", "बम", "अपराध",
]
ALL_CRIME_KEYWORDS = [k.lower() for k in CRIME_KEYWORDS_EN + CRIME_KEYWORDS_HI]

# ─── News Sources ──────────────────────────────────────────────────────────────
RSS_SOURCES = [
    # National (English)
    {
        "name": "Times of India - Crime",
        "url": "https://timesofindia.indiatimes.com/rssfeeds/-2128936835.cms",
        "lang": "en",
    },
    {
        "name": "Hindustan Times",
        "url": "https://www.hindustantimes.com/feeds/rss/india-news/rssfeed.xml",
        "lang": "en",
    },
    {
        "name": "Indian Express",
        "url": "https://indianexpress.com/section/india/feed/",
        "lang": "en",
    },
    {
        "name": "NDTV India",
        "url": "https://feeds.feedburner.com/NDTV-LatestNews",
        "lang": "en",
    },
    {
        "name": "The Hindu",
        "url": "https://www.thehindu.com/news/national/?service=rss",
        "lang": "en",
    },
    # Google News (crime-targeted)
    {
        "name": "Google News Crime IN",
        "url": "https://news.google.com/rss/search?q=crime+india&hl=en-IN&gl=IN&ceid=IN:en",
        "lang": "en",
    },
    {
        "name": "Google News Murder IN",
        "url": "https://news.google.com/rss/search?q=murder+robbery+assault+india&hl=en-IN&gl=IN&ceid=IN:en",
        "lang": "en",
    },
    # Hindi sources
    {
        "name": "Aaj Tak",
        "url": "https://news.google.com/rss/search?q=हत्या+लूट+भारत&hl=hi&gl=IN&ceid=IN:hi",
        "lang": "hi",
    },
    {
        "name": "Google News Hindi Crime",
        "url": "https://news.google.com/rss/search?q=अपराध+पुलिस+भारत&hl=hi&gl=IN&ceid=IN:hi",
        "lang": "hi",
    },
]


class NewsFetcherService:
    """
    Fetches crime news from all configured Indian sources.
    Implements parallel fetching, retry, dedup, and freshness filtering.
    """

    def __init__(self, redis_client=None, news_api_key: str = ""):
        self.redis         = redis_client
        self.news_api_key  = news_api_key
        self._seen_urls    = set()   # In-process fast dedup
        self._seen_titles  = []      # For similarity dedup (last 500)

    # ──────────────────────────────────────────────────────────────────────────
    # PUBLIC: Fetch All Sources
    # ──────────────────────────────────────────────────────────────────────────

    def fetch_all_sources(self) -> list:
        """
        Fetch crime news from all sources in parallel.
        Returns deduplicated list of raw article dicts.
        """
        logger.info("📰 Starting news fetch from %d RSS + NewsAPI sources", len(RSS_SOURCES))
        all_articles = []

        # RSS sources in parallel (IO-bound)
        with ThreadPoolExecutor(max_workers=8) as ex:
            futures = {
                ex.submit(self._fetch_rss_with_retry, src): src["name"]
                for src in RSS_SOURCES
            }
            for future in as_completed(futures):
                src_name = futures[future]
                try:
                    articles = future.result()
                    logger.info("  ✅ %s → %d articles", src_name, len(articles))
                    all_articles.extend(articles)
                except Exception as exc:
                    logger.warning("  ⚠️ %s failed: %s", src_name, exc)

        # NewsAPI (sequential, API-keyed)
        if self.news_api_key:
            newsapi_articles = self._fetch_newsapi_with_retry()
            logger.info("  ✅ NewsAPI → %d articles", len(newsapi_articles))
            all_articles.extend(newsapi_articles)

        # Dedup + filter
        unique   = self._deduplicate(all_articles)
        filtered = self._filter_relevant(unique)

        logger.info(
            "📰 Fetch complete: %d raw → %d unique → %d crime-relevant",
            len(all_articles), len(unique), len(filtered)
        )
        return filtered

    # ──────────────────────────────────────────────────────────────────────────
    # FETCH: RSS
    # ──────────────────────────────────────────────────────────────────────────

    def _fetch_rss_with_retry(self, source: dict, max_attempts: int = 3) -> list:
        """Fetch a single RSS source with exponential backoff retry."""
        for attempt in range(max_attempts):
            try:
                return self._fetch_rss(source)
            except Exception as exc:
                wait = 2 ** attempt
                logger.debug("RSS retry %d/%d for %s (wait %ds): %s",
                             attempt + 1, max_attempts, source["name"], wait, exc)
                time.sleep(wait)
        return []

    def _fetch_rss(self, source: dict) -> list:
        feed     = feedparser.parse(source["url"])
        articles = []
        cutoff   = datetime.now(timezone.utc) - timedelta(hours=24)

        for entry in feed.entries:
            pub_str = entry.get("published") or entry.get("updated", "")
            pub_dt  = self._parse_date(pub_str)

            # Freshness filter
            if pub_dt and pub_dt < cutoff:
                continue

            import re
            title = entry.get("title", "")
            desc  = re.sub(r"<[^>]+>", " ", entry.get("summary", "") or "")
            link  = entry.get("link", "")

            articles.append({
                "title":       title,
                "description": desc.strip(),
                "url":         link,
                "published":   pub_str,
                "source":      source["name"],
                "lang":        source.get("lang", "en"),
            })

        return articles

    # ──────────────────────────────────────────────────────────────────────────
    # FETCH: NewsAPI
    # ──────────────────────────────────────────────────────────────────────────

    def _fetch_newsapi_with_retry(self, max_attempts: int = 3) -> list:
        for attempt in range(max_attempts):
            try:
                return self._fetch_newsapi()
            except Exception as exc:
                wait = 2 ** attempt
                logger.debug("NewsAPI retry %d/%d (wait %ds): %s", attempt + 1, max_attempts, wait, exc)
                time.sleep(wait)
        return []

    def _fetch_newsapi(self) -> list:
        cutoff   = (datetime.now(timezone.utc) - timedelta(hours=24)).strftime("%Y-%m-%dT%H:%M:%SZ")
        articles = []
        query_terms = [
            'crime India',
            'murder robbery assault India',
            'kidnapping theft India',
        ]

        for q in query_terms:
            resp = requests.get(
                "https://newsapi.org/v2/everything",
                params={
                    "q":        q,
                    "from":     cutoff,
                    "language": "en",
                    "sortBy":   "publishedAt",
                    "pageSize": 25,
                    "apiKey":   self.news_api_key,
                },
                timeout=10,
            )
            if resp.status_code == 200:
                for article in resp.json().get("articles", []):
                    articles.append({
                        "title":       article.get("title", ""),
                        "description": article.get("description") or "",
                        "url":         article.get("url", ""),
                        "published":   article.get("publishedAt", ""),
                        "source":      f"NewsAPI/{article.get('source', {}).get('name', 'unknown')}",
                        "lang":        "en",
                    })
                time.sleep(0.3)   # Be kind to free tier
            elif resp.status_code == 429:
                logger.warning("NewsAPI rate limit hit, waiting 60s")
                time.sleep(60)

        return articles

    # ──────────────────────────────────────────────────────────────────────────
    # DEDUP + FILTER
    # ──────────────────────────────────────────────────────────────────────────

    def _is_seen(self, url: str) -> bool:
        """Check Redis then in-memory for URL."""
        if url in self._seen_urls:
            return True
        if self.redis:
            key = f"sa:seen:{hashlib.md5(url.encode()).hexdigest()}"
            if self.redis.exists(key):
                return True
            self.redis.setex(key, 7 * 86400, 1)   # 7-day TTL
        self._seen_urls.add(url)
        return False

    def _is_similar_title(self, title: str) -> bool:
        """Return True if title is ≥80% similar to a recently seen title."""
        title_lower = title.lower()
        for seen in self._seen_titles[-200:]:
            ratio = SequenceMatcher(None, title_lower, seen).ratio()
            if ratio >= 0.80:
                return True
        self._seen_titles.append(title_lower)
        if len(self._seen_titles) > 500:
            self._seen_titles = self._seen_titles[-400:]
        return False

    def _deduplicate(self, articles: list) -> list:
        unique = []
        for a in articles:
            url   = a.get("url", "")
            title = a.get("title", "")
            if not url or self._is_seen(url):
                continue
            if title and self._is_similar_title(title):
                continue
            unique.append(a)
        return unique

    def _filter_relevant(self, articles: list) -> list:
        """Keep only articles containing a crime keyword."""
        relevant = []
        for a in articles:
            text = (a.get("title", "") + " " + a.get("description", "")).lower()
            if any(kw in text for kw in ALL_CRIME_KEYWORDS):
                relevant.append(a)
        return relevant

    # ──────────────────────────────────────────────────────────────────────────
    # HELPER
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _parse_date(date_str: str):
        try:
            dt = dateutil_parser.parse(date_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            return None
