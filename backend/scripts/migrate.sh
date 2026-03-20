#!/usr/bin/env bash
# =============================================================================
# SafeAround Database Migration Script
# =============================================================================
# Usage:
#   ./scripts/migrate.sh schema       - Apply full schema.sql (idempotent)
#   ./scripts/migrate.sh seed         - Insert seed data from seed.sql
#   ./scripts/migrate.sh setup        - schema + seed in one step
#   ./scripts/migrate.sh up           - Run golang-migrate up
#   ./scripts/migrate.sh down         - Roll back one migration
#   ./scripts/migrate.sh force <N>    - Force version N
#   ./scripts/migrate.sh version      - Print current migration version
#   ./scripts/migrate.sh refresh-mv   - Refresh mv_heatmap_grid materialized view
# =============================================================================

set -euo pipefail

# Load .env if present
if [ -f .env ]; then
    source .env
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMAND="${1:-}"

if [ -z "$COMMAND" ]; then
    echo "Usage: ./scripts/migrate.sh [schema|seed|setup|up|down|force|version|refresh-mv]"
    exit 1
fi

DB_URL="postgres://${DB_USER:-safearound}:${DB_PASSWORD:-changeme}@${DB_HOST:-localhost}:${DB_PORT:-5432}/${DB_NAME:-safearound}?sslmode=${DB_SSLMODE:-disable}"

run_sql_file() {
    local file="$SCRIPT_DIR/$1"
    if [ ! -f "$file" ]; then
        echo "❌  SQL file not found: $file"
        exit 1
    fi
    echo "⏳  Applying $1 ..."
    psql "$DB_URL" -f "$file"
    echo "✅  $1 applied."
}

ensure_migrate() {
    if ! command -v migrate &>/dev/null; then
        echo "📦  golang-migrate not found. Installing..."
        go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
    fi
}

case $COMMAND in
    schema)
        run_sql_file "schema.sql"
        ;;
    seed)
        run_sql_file "seed.sql"
        ;;
    setup)
        echo "🚀  Full SafeAround DB setup..."
        run_sql_file "schema.sql"
        run_sql_file "seed.sql"
        echo ""
        echo "🎉  Database is ready!"
        ;;
    up)
        ensure_migrate
        echo "⬆️   Applying migrations..."
        migrate -path migrations -database "$DB_URL" up
        ;;
    down)
        ensure_migrate
        echo "⬇️   Rolling back one migration..."
        migrate -path migrations -database "$DB_URL" down 1
        ;;
    force)
        ensure_migrate
        VERSION="${2:-}"
        if [ -z "$VERSION" ]; then
            echo "❌  'force' requires a version number. Example: ./scripts/migrate.sh force 3"
            exit 1
        fi
        migrate -path migrations -database "$DB_URL" force "$VERSION"
        ;;
    version)
        ensure_migrate
        migrate -path migrations -database "$DB_URL" version
        ;;
    refresh-mv)
        echo "♻️   Refreshing mv_heatmap_grid materialized view..."
        psql "$DB_URL" -c "REFRESH MATERIALIZED VIEW CONCURRENTLY mv_heatmap_grid;"
        echo "✅  Heatmap grid refreshed."
        ;;
    status)
        echo "📊  Database table sizes:"
        psql "$DB_URL" -c "
            SELECT
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
        "
        ;;
    *)
        echo "❌  Unknown command: $COMMAND"
        echo "Usage: ./scripts/migrate.sh [schema|seed|setup|up|down|force|version|refresh-mv|status]"
        exit 1
        ;;
esac
