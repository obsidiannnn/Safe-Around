#!/bin/bash

# SafeAround - Automated Database Backup Script
# This script creates a compressed backup of the PostgreSQL database.

set -e

BACKUP_DIR="/home/user/Safe-Around/backups" # Replace with your backup directory
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/safearound_db_${TIMESTAMP}.sql.gz"

echo "💾 Starting SafeAround Database Backup..."

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Run pg_dump inside the docker container and compress the output
# Note: Ensure DB_USER and DB_NAME are consistent with your .env
docker exec safearound-postgres pg_dump -U safearound_user -d safearound_prod | gzip > "${BACKUP_FILE}"

# Delete backups older than 30 days to save space
find "${BACKUP_DIR}" -type f -name "*.sql.gz" -mtime +30 -delete

echo "✅ Backup complete: ${BACKUP_FILE}"
echo "📅 Retaining last 30 days of archives."
