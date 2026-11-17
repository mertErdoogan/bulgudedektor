#!/usr/bin/env bash
# Bütün uçtan uca testleri sırayla çalıştırır. Her test dosyası demo veriyi değiştirdiği için
# aralarında veritabanı yeniden doldurulur ve hız sınırı sayaçları sıfırlanır.
#
# Kullanım:  scripts/ci/e2e.sh                 # hepsi
#            SUITES="core returns" scripts/ci/e2e.sh
# Önkoşul:   çalışan sunucu (BASE_URL, varsayılan http://localhost:3000) ve DATABASE_URL
#            sunucu şu ortamla başlatılmış olmalı:
#            CRON_SECRET=test123 PAYMENT_SIMULATION=force-test-only \
#            PAYTR_BASE_URL=http://127.0.0.1:4010 META_GRAPH_URL=http://127.0.0.1:4011
set -u
cd "$(dirname "$0")/../.."

: "${DATABASE_URL:?DATABASE_URL gerekli}"
export BASE_URL="${BASE_URL:-http://localhost:3000}"
export BASE="$BASE_URL"
SUITES="${SUITES:-$(ls tests/e2e/*_e2e.py | xargs -n1 basename | sed 's/_e2e\.py$//' | sort)}"
LOG_DIR="${LOG_DIR:-test-results}"
mkdir -p "$LOG_DIR"

passed=()
failed=()
for s in $SUITES; do
  npm run -s db:seed >/dev/null 2>&1 || { echo "Demo veri yüklenemedi ($s öncesi)"; exit 2; }
  psql "$DATABASE_URL" -qc "truncate rate_hits" >/dev/null 2>&1 || true
  [ -n "${GITHUB_ACTIONS:-}" ] && echo "::group::$s"
  start=$(date +%s)
  if timeout 900 python3 "tests/e2e/${s}_e2e.py" >"$LOG_DIR/$s.log" 2>&1; then
    passed+=("$s")
    result="geçti"
  else
    failed+=("$s")
    result="KALDI"
  fi
  # Ayrıntı: başarısız kontroller ve son satırlar
  grep -E "^FAIL|FAIL |Traceback|Error" "$LOG_DIR/$s.log" | head -40
  tail -n 3 "$LOG_DIR/$s.log"
  [ -n "${GITHUB_ACTIONS:-}" ] && echo "::endgroup::"
  echo "$s: $result ($(( $(date +%s) - start )) sn)"
  if [ "$result" = "KALDI" ] && [ -n "${GITHUB_ACTIONS:-}" ]; then
    echo "::error title=Uçtan uca test kaldı::$s — ayrıntı için '$s' grubunu veya test-results/$s.log dosyasını açın"
  fi
done

# Mobilde yatay taşma: en çok girilen sayfalar
for path in / /urunler /sepet /sihirbaz /sayfa/hakkimizda; do
  if ! python3 tests/e2e/mobile_overflow.py "$path" >>"$LOG_DIR/mobile_overflow.log" 2>&1; then
    failed+=("mobil-taşma:$path")
  fi
done

echo
echo "Geçen (${#passed[@]}): ${passed[*]:-}"
echo "Kalan (${#failed[@]}): ${failed[*]:-}"
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### Uçtan uca testler"
    echo "Geçen: ${#passed[@]} · Kalan: ${#failed[@]}"
    for f in "${failed[@]:-}"; do [ -n "$f" ] && echo "- ❌ $f"; done
  } >>"$GITHUB_STEP_SUMMARY"
fi
[ ${#failed[@]} -eq 0 ]
