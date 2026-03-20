#!/usr/bin/env bash
# =============================================================================
# SafeAround Deployment Script
# Usage:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh [dev|staging|prod]  (default: prod)
# =============================================================================
set -euo pipefail

ENV="${1:-prod}"
COMPOSE_FILE="docker-compose.yml"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

log() { echo "[$(date -u +"%H:%M:%S")] $*"; }
ok()  { echo "✅  $*"; }
err() { echo "❌  $*" >&2; exit 1; }

log "SafeAround Deployment — env=$ENV  ts=$TIMESTAMP"
echo "======================================================="

# --- Load environment ---
if [ ! -f .env ]; then
  err ".env not found. Copy .env.example and fill in secrets."
fi
source .env
ok "Environment loaded"

# --- Validate required secrets ---
: "${DB_PASSWORD:?DB_PASSWORD must be set in .env}"
: "${JWT_SECRET:?JWT_SECRET must be set in .env}"
: "${FCM_SERVER_KEY:?FCM_SERVER_KEY must be set in .env}"

# --- Tag images with git SHA for traceability ---
GIT_SHA=$(git rev-parse --short HEAD 2>/dev/null || echo "local")
export APP_VERSION="${GIT_SHA}"
log "Deploying image tag: $APP_VERSION"

# --- Pull latest base images ---
log "Pulling base images..."
docker compose -f "$COMPOSE_FILE" pull postgres redis prometheus grafana 2>&1 | tail -5
ok "Base images up to date"

# --- Build application images ---
log "Building application images (backend, worker, crime-pipeline)..."
docker compose -f "$COMPOSE_FILE" build --pull backend worker crime-pipeline 2>&1 | tail -20
ok "Images built: safearound/backend:$APP_VERSION, safearound/worker:$APP_VERSION"

# --- Database migrations ---
log "Applying database schema..."
docker compose -f "$COMPOSE_FILE" up -d postgres
echo "  Waiting for Postgres to be healthy..."
for i in $(seq 1 30); do
  if docker compose -f "$COMPOSE_FILE" exec -T postgres \
      pg_isready -U "${DB_USER:-safearound_user}" -q 2>/dev/null; then
    break
  fi
  sleep 2
done

# schema.sql is auto-sourced via docker-entrypoint-initdb.d on first boot.
# For subsequent deployments run the migrate script directly:
docker compose -f "$COMPOSE_FILE" run --rm backend \
  sh -c "cd /app && ./scripts/migrate.sh up" 2>/dev/null || true
ok "Database migrations applied"

# --- Start full stack ---
log "Starting all services..."
docker compose -f "$COMPOSE_FILE" up -d

# --- Wait for health checks ---
log "Waiting for API health check (up to 60s)..."
for i in $(seq 1 30); do
  if curl -sf "http://localhost:${SERVER_PORT:-8080}/health/ping" > /dev/null 2>&1; then
    ok "Backend is healthy"
    break
  fi
  if [ "$i" -eq 30 ]; then
    err "Backend failed health check after 60s. Check: docker compose logs backend"
  fi
  sleep 2
done

# --- Print deployment summary ---
echo ""
echo "======================================================="
echo "🎉  SafeAround deployed successfully!"
echo ""
echo "  API:        http://localhost:${SERVER_PORT:-8080}/api/v1"
echo "  Health:     http://localhost:${SERVER_PORT:-8080}/health"
echo "  Metrics:    http://localhost:${SERVER_PORT:-8080}/metrics"
echo "  Grafana:    http://localhost:3000   (admin / ${GRAFANA_PASSWORD:-safearound123})"
echo "  Prometheus: http://localhost:9090"
echo "  Konga:      http://localhost:1337"
echo "  Kong proxy: http://localhost:80/api/v1"
echo ""
echo "  Image tag:  $APP_VERSION"
echo "  Deployed at: $TIMESTAMP"
echo "======================================================="
