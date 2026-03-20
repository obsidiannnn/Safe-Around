from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    DATABASE_CONFIG: dict = {
        'host': 'localhost',
        'port': 5433,  # Note: 5433 for dev docker pgAdmin conflict override
        'database': 'safearound_dev',
        'user': 'safearound_user',
        'password': 'your_secure_password'
    }
    
    # APIs
    POLICE_API_URL: str = "https://api.police.gov/v1"
    POLICE_API_KEY: str = ""
    GOOGLE_MAPS_API_KEY: str = ""
    
    # News sites configuration
    NEWS_SITES: list = [
        {
            'name': 'local_news',
            'url': 'https://example.com/crime',
            'article_selector': '.crime-article',
            'title_selector': 'h2',
            'content_selector': '.content',
            'date_selector': '.date'
        }
    ]
    
    class Config:
        env_file = ".env"

settings = Settings()
