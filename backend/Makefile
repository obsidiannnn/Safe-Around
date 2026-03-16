.PHONY: run build test migrate-up migrate-down docker-up docker-down lint clean setup env deps dev

# Default variables
BINARY_NAME=safearound-backend
MAIN_PATH=cmd/api/main.go

# --- Environment Setup Commands ---

# Run initial project setup (Copy .env, start docker, health checks)
setup:
	@echo "Setting up development environment..."
	@bash scripts/setup-dev.sh

# Generate .env from .env.example
env:
	@echo "Copying .env.example to .env..."
	@cp -n .env.example .env || echo ".env already exists"

# Install Go dependencies
deps:
	@echo "Downloading dependencies..."
	@go mod tidy
	@go mod download

# Start development server with hot reload (Air)
dev:
	@echo "Starting hot-reload server with Air..."
	@air

# --- Standard Commands ---

# Start development server (standard)
run:
	@echo "Starting development server..."
	go run $(MAIN_PATH)

# Build binary
build:
	@echo "Building application..."
	go build -o bin/$(BINARY_NAME) $(MAIN_PATH)

# Run tests
test:
	@echo "Running tests..."
	go test -v -cover ./...

# Run database migrations
migrate-up:
	@echo "Running migrations..."
	# migrate -path migrations -database "postgres://user:pass@localhost:5432/dbname?sslmode=disable" up

# Rollback migrations
migrate-down:
	@echo "Rolling back migrations..."
	# migrate -path migrations -database "postgres://user:pass@localhost:5432/dbname?sslmode=disable" down

# Start Docker containers
docker-up:
	@echo "Starting Docker containers..."
	docker-compose up -d

# Stop Docker containers
docker-down:
	@echo "Stopping Docker containers..."
	docker-compose down

# Run linter
lint:
	@echo "Running custom linter..."
	golangci-lint run

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	rm -rf bin/
	rm -rf tmp/
	rm -rf coverage.out
