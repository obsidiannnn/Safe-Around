# Contributing to SafeAround Backend

First off, thank you for considering contributing to the SafeAround project! We want this project to be welcoming and accessible. 

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/obsidiannnn/Safe-Around.git
   cd Safe-Around/backend
   ```
3. **Set up the backend environment** following the Quick Start guide in the [README.md](README.md).

## Development Branches

Please create a feature branch before making changes:
```bash
git checkout -b feature/your-feature-name
# or for bugfixes
git checkout -b fix/your-bugfix-name
```

## Making Changes

1. Write clean, commented, and well-tested Go code.
2. Follow the standard Go formatting. Run `go fmt ./...` before committing.
3. Ensure the project builds and all tests pass:
   ```bash
   make test
   make lint
   ```
4. If you have added or updated database models, make sure you write and test the migration files.
5. Create atomic commits indicating the scope of the change. 

## Submitting a Pull Request

1. Push your branch to your forked repository.
2. Create a Pull Request against the `main` branch.
3. Provide a clear description of the problem your PR solves or the feature it adds.
4. Reference any relevant GitHub issues in the PR description (e.g., `Fixes #123`).

## Code of Conduct

Please treat all maintainers and contributors with respect. 
