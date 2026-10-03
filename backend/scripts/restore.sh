#!/usr/bin/env bash
# ==============================================================================
# EquipTrack Production PostgreSQL Restore Script
# ==============================================================================
# Usage:
#   ./restore.sh <path_to_backup_file.sql.gz>
# Example:
#   DATABASE_URL="postgres://user:pass@localhost:5432/equiptrack" ./restore.sh ./backups/equiptrack_backup_20261003_120000.sql.gz
# ==============================================================================

set -euo pipefail

BACKUP_FILE="${1:-}"

if [ -z "${BACKUP_FILE}" ] || [ ! -f "${BACKUP_FILE}" ]; then
  echo "❌ Error: Please specify a valid backup file (.sql or .sql.gz)."
  echo "Usage: ./restore.sh <path_to_backup_file>"
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set."
  exit 1
fi

echo "⚠️  WARNING: This will restore database data from '${BACKUP_FILE}' to '${DATABASE_URL}'."
read -p "Are you sure you want to proceed with restore? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Restore cancelled."
  exit 0
fi

echo "🔄 Restoring database dump..."
if [[ "${BACKUP_FILE}" == *.gz ]]; then
  gunzip -c "${BACKUP_FILE}" | psql "${DATABASE_URL}"
else
  psql "${DATABASE_URL}" < "${BACKUP_FILE}"
fi

echo "✅ Database restore completed successfully."
