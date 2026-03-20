from bs4 import BeautifulSoup
import requests
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class NewsScraper:
    """Scrape crime news from local news websites"""
    
    def __init__(self, config: list):
        self.sites = config
        self.session = requests.Session()
    
    def scrape_all(self) -> List[Dict]:
        """Scrape all configured news sites"""
        all_incidents = []
        
        for site in self.sites:
            try:
                incidents = self.scrape_site(site)
                all_incidents.extend(incidents)
            except Exception as e:
                logger.error(f"Error scraping {site['name']}: {e}")
                continue
        
        logger.info(f"Scraped {len(all_incidents)} incidents from news")
        return all_incidents
    
    def scrape_site(self, site: Dict) -> List[Dict]:
        """Scrape single news site"""
        response = self.session.get(site['url'], timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        articles = soup.select(site['article_selector'])
        
        incidents = []
        for article in articles:
            try:
                incident = self.parse_article(article, site)
                if incident:
                    incidents.append(incident)
            except Exception as e:
                logger.warning(f"Failed to parse article: {e}")
                continue
        
        return incidents
    
    def parse_article(self, article, site: Dict) -> Dict:
        """Extract incident data from article HTML"""
        title_tag = article.select_one(site['title_selector'])
        content_tag = article.select_one(site['content_selector'])
        date_tag = article.select_one(site['date_selector'])
        
        if not title_tag or not content_tag:
            return {}

        return {
            'title': title_tag.text.strip(),
            'description': content_tag.text.strip(),
            'date_text': date_tag.text.strip() if date_tag else "",
            'source': f"news_{site['name']}",
            'url': article.get('href', ''),
            'raw_html': str(article)
        }
