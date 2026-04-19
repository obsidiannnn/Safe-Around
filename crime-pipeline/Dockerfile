# crime-pipeline/Dockerfile

FROM python:3.11-slim

# Install system dependencies for psycopg2 and spaCy
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy model (use sm for faster builds, lg for better accuracy)
RUN python -m spacy download en_core_web_sm

# Copy application code
COPY . .

# Expose port for FastAPI health checks
EXPOSE 8001

# Run the main pipeline (includes FastAPI server + scheduler)
CMD ["python", "crime_pipeline.py"]
