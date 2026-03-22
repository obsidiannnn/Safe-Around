#!/bin/bash

# SafeAround - NLP Model Installer
# Downloads the en_core_web_lg model for high-precision area extraction.

set -e

echo "🧠 Installing spaCy NLP models..."

# Check if spacy is installed
if ! python3 -c "import spacy" &> /dev/null; then
    echo "⚠️ spaCy NOT found. Installing from requirements.txt..."
    pip3 install spacy
fi

# Download the large English model
python3 -m spacy download en_core_web_lg

echo "✅ NLP models installed successfully!"
