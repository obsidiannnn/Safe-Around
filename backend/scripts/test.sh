#!/usr/bin/env bash
set -e

# Run tests and generate coverage report
# Enforces a minimum coverage percentage

COVERAGE_MIN=80
COVERAGE_FILE="coverage.out"

echo "Running tests with coverage..."
go test -v -coverprofile=$COVERAGE_FILE ./...

# Extract the overall coverage percentage
COVERAGE=$(go tool cover -func=$COVERAGE_FILE | grep total: | awk '{print $3}' | sed 's/%//')

echo "-----------------------------------"
echo "Total Coverage: ${COVERAGE}%"
echo "Minimum Required: ${COVERAGE_MIN}%"

# Check if coverage is a valid number and compare
if (( $(echo "$COVERAGE < $COVERAGE_MIN" | bc -l) )); then
    echo "❌ Error: Code coverage is below the required ${COVERAGE_MIN}%."
    exit 1
else
    echo "✅ Success: Code coverage meets the requirement."
fi
