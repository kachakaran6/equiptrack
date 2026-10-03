#!/usr/bin/env bash
# ==============================================================================
# EquipTrack Production PostgreSQL Backup Script
# ==============================================================================
# Usage:
#   ./backup.sh [output_directory]
# Example:
#   DATABASE_URL="postgres://user:pass@localhost:5432/equiptrack" ./backup.sh ./backups
# ==============================================================================

set -euo pipefail

BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="${BACKUP_DIR}/equiptrack_backup_${TIMESTAMP}.sql.gz"

mkdir -p "${BACKUP_DIR}"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set."
  exit 1
fi

echo "📦 Creating compressed PostgreSQL database dump..."
echo "Target: ${FILENAME}"

pg_dump "${DATABASE_URL}" --clean --if-exists --no-owner --no-privileges | gzip > "${FILENAME}"

FILESIZE=$(du -h "${FILENAME}" | cut -f1)
echo "✅ Backup successfully created: ${FILENAME} (${FILESIZE})"
