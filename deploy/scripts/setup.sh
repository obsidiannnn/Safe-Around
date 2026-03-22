#!/bin/bash

# SafeAround - Automated Server Setup Script
# This script installs Docker, Docker Compose, and configures the environment.

set -e

echo "🚀 Starting SafeAround Server Setup..."

# 1. Update and install basic dependencies
sudo apt-get update
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    ufw \
    git

# 2. Install Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

# 3. Configure Firewall (UFW)
echo "🔒 Configuring Firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8080/tcp
sudo ufw --force enable

# 4. Prepare Environment
echo "📂 Preparing environment..."
if [ ! -f .env ]; then
    echo "⚠️ .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please update .env with your production secrets!"
fi

# 5. Create Data Directories
mkdir -p data/postgres data/redis data/prometheus data/grafana

# 6. Verify Installation
docker --version
docker compose version

echo "✅ Server setup complete!"
echo "👉 Next steps:"
echo "1. Edit your .env file with production credentials."
echo "2. Run 'docker compose up -d' to start the system."
