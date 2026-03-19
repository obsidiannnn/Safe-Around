#!/usr/bin/env bash
set -e

# Simplistic DB migration script wrapper matching requirements

source .env

COMMAND=$1

if [ -z "$COMMAND" ]; then
    echo "Usage: ./scripts/migrate.sh [up|down|force|version]"
    exit 1
fi

DB_URL="postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=${DB_SSLMODE:-disable}"

# Ensure golang-migrate is installed
if ! command -v migrate &> /dev/null; then
    echo "golang-migrate not found. Installing..."
    go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
fi

echo "Running migration: $COMMAND"

case $COMMAND in
    up)
        migrate -path migrations -database "$DB_URL" up
        ;;
    down)
        migrate -path migrations -database "$DB_URL" down 1
        ;;
    force)
        VERSION=$2
        if [ -z "$VERSION" ]; then
            echo "Error: 'force' requires a version number."
            exit 1
        fi
        migrate -path migrations -database "$DB_URL" force $VERSION
        ;;
    version)
        migrate -path migrations -database "$DB_URL" version
        ;;
    *)
        echo "Unknown command: $COMMAND"
        exit 1
        ;;
esac
