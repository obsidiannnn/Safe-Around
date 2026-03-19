# Architecture Overview

The SafeAround Backend follows clean architecture principles, heavily favoring modularity and separation of concerns. This ensures long-term testability and scalability as the product grows.

## Structure Explanation

```
cmd/api           # Main execution entry points. Routes, Database, and configurations are bootstrapped here.
internal/
  config/         # Logic for extracting structured configuration values (from .env or System Environment)
  database/       # Underlying database connection helpers/pooling
  handlers/       # Direct HTTP handlers. Responsible for reading JSON bodies, interacting with services, and firing back APIResponses.
  middleware/     # Generic Gin Middlewares like Auth validation, CORS, Rate Limiters, etc.
  models/         # Core Domain Models (structs mapping directly to GORM entities) 
  repository/     # Data Layer. Houses SQL interactions completely isolating GORM from the core logic handlers.
  routes/         # Registers end-points to handlers
  services/       # Pure business-logic (e.g processing algorithms, heavy lifting calculations decoupled from request parameters).
  utils/          # Stateless helper logic (e.g hashing passwords, generating JWTs)
pkg/              # Packages considered mature enough that external projects could safely import them
migrations/       # Pure SQL logic sequentially migrating structural data forwards and backwards
scripts/          # Automation Bash scripts hooking heavily into Makefile jobs
tests/            # E2E integration tests mapping Handlers + Databases + Routes
```

## Dependency Flow Diagram

```
[ Router / HTTP ] ->  API Calls
       |
[ Middlewares ]   ->  Intercepts validation (Auth, CORS)
       |
[ Handlers ]      ->  Parses body -> invokes Repositories/Services
       |
[ Services ]      ->  Executes business rules 
       |
[ Repositories ]  ->  Converts objects -> Executes Postgres commands (GORM)
       |
[ Models ]        ->  Strict Data types spanning all layers
```

## Standard Design Patterns
1. **Repository Pattern:** Logic for extracting and mutating `models.User` lives completely within the `UserRepository`. If we move from completely Postgres to Mongo next year, the handler won't know the difference.
2. **Standard API Wrapper Structure:** All responses are generated through `handlers.APIResponse{}` enforcing strict `{"success", "data", "error", "meta"}` keys universally. 
3. **Graceful Shutdown:** `main.go` halts the process, draining existing HTTP connections prior to dumping the program during crashes or updates.
