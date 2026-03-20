import logging
import os
from logging.handlers import RotatingFileHandler

def setup_logger():
    """Configure centralized file-based logging for the ETL pipeline"""
    os.makedirs('logs', exist_ok=True)
    
    logger = logging.getLogger()
    logger.setLevel(logging.INFO)
    
    # Avoid adding handlers multiple times when reloaded
    if not logger.handlers:
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        
        # Console output
        ch = logging.StreamHandler()
        ch.setFormatter(formatter)
        logger.addHandler(ch)
        
        # File output (rotation at 10MB)
        fh = RotatingFileHandler('logs/pipeline.log', maxBytes=10*1024*1024, backupCount=5)
        fh.setFormatter(formatter)
        logger.addHandler(fh)

    return logger

class Alerter:
    """Manages failure thresholds and alerting"""
    def __init__(self, failure_threshold=3):
        self.failure_threshold = failure_threshold
        self.consecutive_failures = 0
        self.logger = logging.getLogger(__name__)

    def register_success(self):
        self.consecutive_failures = 0

    def register_failure(self, error: Exception):
        self.consecutive_failures += 1
        self.logger.error(f"Pipeline failure registered: {error}. Consecutive: {self.consecutive_failures}")
        
        if self.consecutive_failures >= self.failure_threshold:
            self.trigger_alert()
            
    def trigger_alert(self):
        """Simulate PagerDuty/Email fallback mechanism"""
        self.logger.critical("CRITICAL ALERT: Pipeline has failed 3 times consecutively! Requires manual intervention.")
        # E.g., boto3.client('sns').publish(...) - simulated here
