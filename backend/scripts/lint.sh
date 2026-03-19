#!/usr/bin/env bash
set -e

# Install golangci-lint if it doesn't exist
if ! command -v golangci-lint &> /dev/null; then
    echo "golangci-lint not found. Installing..."
    go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest
fi

echo "Running linter..."
# Runs linter checking for common errors (unused vars, error handling, etc)
golangci-lint run ./...

if [ $? -eq 0 ]; then
    echo "✅ Linter passed successfully."
else
    echo "❌ Linter found issues."
    exit 1
fi
