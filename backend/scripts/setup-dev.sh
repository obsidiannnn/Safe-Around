#!/usr/bin/env bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Starting SafeAround backend development setup...${NC}\n"

# 1. Setup Environment File
if [ ! -f .env ]; then
    echo -e "${GREEN}Creating .env file from .env.example...${NC}"
    cp .env.example .env
    echo ".env file created. Please update it with your actual secrets if needed."
else
    echo -e "${GREEN}.env file already exists. Skipping...${NC}"
fi

# 2. Start Docker Containers
echo -e "\n${BLUE}Starting Docker containers...${NC}"
docker-compose up -d

# 3. Wait for Services
echo -e "\n${BLUE}Waiting for PostgreSQL to be healthy...${NC}"
until docker inspect -f '{{.State.Health.Status}}' safearound_db | grep -q "healthy"; do
    printf "."
    sleep 2
done
echo -e "\n${GREEN}PostgreSQL is ready!${NC}"

echo -e "\n${BLUE}Waiting for Redis to be healthy...${NC}"
until docker inspect -f '{{.State.Health.Status}}' safearound_redis | grep -q "healthy"; do
    printf "."
    sleep 2
done
echo -e "\n${GREEN}Redis is ready!${NC}"

# 4. Next Steps Instructions
echo -e "\n${GREEN}==========================================${NC}"
echo -e "${GREEN}Setup completed successfully!${NC}"
echo -e "${GREEN}==========================================${NC}"
echo -e "\nNext steps:"
echo -e "1. Install dependencies:  ${BLUE}make deps${NC}"
echo -e "2. Start the server:      ${BLUE}make dev${NC}"
echo -e "\nServices running at:"
echo -e "- SafeAround API:         ${BLUE}http://localhost:8000${NC}"
echo -e "- pgAdmin (Database UI):  ${BLUE}http://localhost:5050${NC} (admin@safearound.local / admin)"
echo -e "\nHappy coding!"
