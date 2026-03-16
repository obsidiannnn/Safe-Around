# SafeAround Backend

SafeAround Backend is the core API and worker service for the SafeAround platform. It provides geolocation services, emergency alerts, user management, and safety intelligence features.

## Tech Stack

- **Language:** Go (Golang) 1.21+
- **Framework:** Gin Web Framework
- **Database:** PostgreSQL with PostGIS extension (for spatial queries)
- **Cache:** Redis
- **Architecture:** Clean Architecture principles

## Prerequisites

To run this project, you will need:
- [Go](https://golang.org/doc/install) 1.21 or later
- [Docker & Docker Compose](https://docs.docker.com/get-docker/) (for local database and Redis services)
- [Make](https://www.gnu.org/software/make/) (optional, but recommended for automation)
- [golangci-lint](https://golangci-lint.run/usage/install/) (for linting)

## Quick Start Guide

1. **Clone the repository:**
   ```bash
   git clone https://github.com/obsidiannnn/Safe-Around.git
   cd Safe-Around/backend
   ```

2. **Start external services (PostgreSQL & Redis):**
   ```bash
   make docker-up
   ```

3. **Install dependencies:**
   ```bash
   go mod download
   ```

4. **Run database migrations:**
   ```bash
   make migrate-up
   ```

5. **Start the development server:**
   ```bash
   make run
   ```

   The server will be available at `http://localhost:8080`.

## Project Structure Overview

```
safearound-backend/
├── cmd/
│   └── api/          # Main application entry point
├── internal/
│   ├── config/       # Configuration loading and validation
│   ├── database/     # DB connections (PostgreSQL, Redis)
│   ├── handlers/     # HTTP handlers / controllers (Gin)
│   ├── middleware/   # Custom HTTP midlewares (Auth, Logging)
│   ├── models/       # Data structures and domain models
│   ├── repository/   # Data access layer
│   ├── services/     # Core business logic
│   └── utils/        # Shared helper functions
├── pkg/              # Public libraries (can be used by other projects)
├── scripts/          # Build, config, deployment scripts
├── migrations/       # SQL database migrations
├── tests/            # Integration and E2E tests
├── docs/             # Swagger and API documentation
```

## Development Setup

For a frictionless development experience, you can use **[Air](https://github.com/cosmtrek/air)** for hot-reloading:

```bash
go install github.com/cosmtrek/air@latest
air
```

Make sure you copy the environment template:
```bash
cp .env.example .env
```
And adjust the `.env` variables according to your local setup.

## API Documentation

*(Coming Soon)* - Swagger API documentation will be available at `/swagger/index.html` when running locally.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
