#!/bin/sh
# Arena Dedektör gece yedeği: veritabanı (+ pazar günleri yüklenen görseller) → yerel ./backups ve sunucu dışı depolama.
# docker-compose "backup" servisi her gece 03:30'da çalıştırır. Elle çalıştırmak için:
#   docker compose exec backup sh /deploy/backup.sh
#
# Sunucu dışı kopya (önerilir; sunucu bozulursa yedek de gitmesin): .env içinde
#   BACKUP_S3_BUCKET   ör. arena-yedek  (herkese AÇIK OLMAYAN ayrı bir bucket)
#   BACKUP_S3_ENDPOINT Cloudflare R2: https://<hesap-id>.r2.cloudflarestorage.com  (AWS S3 için boş)
#   BACKUP_S3_ACCESS_KEY_ID / BACKUP_S3_SECRET_ACCESS_KEY  (boşsa S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY kullanılır)
# Yerelde 14 gün, uzakta 30 gün saklanır.
set -eu

DAY=$(date +%F)
DIR=/backups
mkdir -p "$DIR"
DB_FILE="$DIR/arena-$DAY.dump"

echo "[yedek] $DAY veritabanı alınıyor…"
pg_dump -h db -U arena -Fc arena > "$DB_FILE.tmp"
mv "$DB_FILE.tmp" "$DB_FILE"
# Yedeğin okunabildiğini doğrula (bozuk yedek, yedek değildir)
pg_restore --list "$DB_FILE" > /dev/null
echo "[yedek] veritabanı tamam: $(du -h "$DB_FILE" | cut -f1)"

# Pazar günleri yüklenen görselleri de arşivle (ürün fotoğrafları, dekontlar)
UP_FILE=""
if [ "$(date +%u)" = "7" ] && [ -d /uploads ]; then
  UP_FILE="$DIR/uploads-$DAY.tar.gz"
  tar -czf "$UP_FILE" -C /uploads .
  echo "[yedek] görseller arşivlendi: $(du -h "$UP_FILE" | cut -f1)"
fi

find "$DIR" -name 'arena-*.dump' -mtime +14 -delete
find "$DIR" -name 'uploads-*.tar.gz' -mtime +30 -delete

if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  command -v aws > /dev/null 2>&1 || apk add --no-cache aws-cli > /dev/null
  export AWS_ACCESS_KEY_ID="${BACKUP_S3_ACCESS_KEY_ID:-${S3_ACCESS_KEY_ID:-}}"
  export AWS_SECRET_ACCESS_KEY="${BACKUP_S3_SECRET_ACCESS_KEY:-${S3_SECRET_ACCESS_KEY:-}}"
  export AWS_DEFAULT_REGION="${S3_REGION:-auto}"
  EP=""
  [ -n "${BACKUP_S3_ENDPOINT:-}" ] && EP="--endpoint-url ${BACKUP_S3_ENDPOINT}"
  # shellcheck disable=SC2086
  aws $EP s3 cp "$DB_FILE" "s3://$BACKUP_S3_BUCKET/db/$(basename "$DB_FILE")" --only-show-errors
  # shellcheck disable=SC2086
  [ -n "$UP_FILE" ] && aws $EP s3 cp "$UP_FILE" "s3://$BACKUP_S3_BUCKET/uploads/$(basename "$UP_FILE")" --only-show-errors
  # 30 günden eski uzak veritabanı yedeklerini sil
  OLD=$(date -d "@$(( $(date +%s) - 30 * 86400 ))" +%F 2>/dev/null || date -v-30d +%F)
  # shellcheck disable=SC2086
  aws $EP s3 ls "s3://$BACKUP_S3_BUCKET/db/" | awk '{print $4}' | while read -r f; do
    d=$(echo "$f" | sed -n 's/^arena-\([0-9-]*\)\.dump$/\1/p')
    if [ -n "$d" ] && [ "$d" \< "$OLD" ]; then aws $EP s3 rm "s3://$BACKUP_S3_BUCKET/db/$f" --only-show-errors; fi
  done
  echo "[yedek] sunucu dışına kopyalandı: s3://$BACKUP_S3_BUCKET"
else
  echo "[yedek] UYARI: BACKUP_S3_BUCKET tanımlı değil; yedek yalnızca bu sunucuda duruyor."
fi
