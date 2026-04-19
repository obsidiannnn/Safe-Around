#!/bin/bash

# SafeAround Docker Verification Script
# This script verifies that Docker setup is working correctly

set -e

echo "🔍 SafeAround Docker Verification"
echo "=================================="
echo ""

# Check if Docker is installed
echo "✓ Checking Docker installation..."
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi
docker --version

# Check if Docker Compose is installed
echo "✓ Checking Docker Compose installation..."
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi
docker-compose --version

# Check if .env file exists
echo "✓ Checking .env file..."
if [ ! -f .env ]; then
    echo "❌ .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before running docker-compose up"
    exit 1
fi

# Validate required environment variables
echo "✓ Validating environment variables..."
required_vars=("DB_PASSWORD" "JWT_SECRET" "GOOGLE_MAPS_API_KEY")
missing_vars=()

for var in "${required_vars[@]}"; do
    if ! grep -q "^${var}=" .env || grep -q "^${var}=your_" .env || grep -q "^${var}=$" .env; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing or invalid environment variables:"
    for var in "${missing_vars[@]}"; do
        echo "   - $var"
    done
    echo "⚠️  Please update these variables in .env file"
    exit 1
fi

# Check if Dockerfile exists
echo "✓ Checking Dockerfile..."
if [ ! -f Dockerfile ]; then
    echo "❌ Dockerfile not found"
    exit 1
fi

# Check if docker-compose.yml exists
echo "✓ Checking docker-compose.yml..."
if [ ! -f docker-compose.yml ]; then
    echo "❌ docker-compose.yml not found"
    exit 1
fi

# Try to build the Docker image
echo "✓ Building Docker image..."
if docker-compose build backend; then
    echo "✅ Docker image built successfully"
else
    echo "❌ Failed to build Docker image"
    exit 1
fi

# Check if ports are available
echo "✓ Checking if required ports are available..."
ports=(5432 6379 8080)
for port in "${ports[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo "⚠️  Port $port is already in use"
    else
        echo "   Port $port is available"
    fi
done

echo ""
echo "=================================="
echo "✅ Docker verification completed!"
echo ""
echo "Next steps:"
echo "1. Review and update .env file if needed"
echo "2. Run: docker-compose up -d"
echo "3. Check logs: docker-compose logs -f backend"
echo "4. Test health: curl http://localhost:8080/health/ping"
echo ""
