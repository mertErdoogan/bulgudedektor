#!/usr/bin/env bash
# Veritabanı yedeği (VPS kurulumunda crontab ile her gece çalıştırın):
#   0 3 * * * cd /srv/arena && ./scripts/backup.sh >> backups/backup.log 2>&1
# Yönetilen Postgres (Neon, Supabase, Railway) kullanıyorsanız onların otomatik yedeği yeterlidir.
set -euo pipefail
source .env 2>/dev/null || true
: "${DATABASE_URL:?DATABASE_URL tanımlı değil}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
mkdir -p backups
FILE="backups/db-$(date +%Y%m%d-%H%M).sql.gz"
pg_dump "$DATABASE_URL" --no-owner --no-privileges | gzip > "$FILE"
# Yüklenen görseller yerel diskteyse onları da arşivle
if [ -d "${UPLOAD_DIR:-./uploads}" ]; then tar -czf "backups/uploads-$(date +%Y%m%d).tar.gz" -C "$(dirname "${UPLOAD_DIR:-./uploads}")" "$(basename "${UPLOAD_DIR:-./uploads}")"; fi
find backups -name "*.gz" -mtime +"$KEEP_DAYS" -delete
echo "$(date -Is) yedek alındı: $FILE"
