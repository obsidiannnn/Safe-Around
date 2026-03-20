FROM python:3.11-slim

# Install system dependencies including those required for psycopg2 and compiling spacy
RUN apt-get update \
    && apt-get install -y gcc libpq-dev python3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements for cached layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-fetch the english spaCy model to ensure it is available to Transformers instantly
RUN python -m spacy download en_core_web_lg

COPY . .

# Expose FastAPI metrics default port
EXPOSE 8001

# Entry Command triggers Pipeline application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
