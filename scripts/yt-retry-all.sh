#!/bin/sh
# Hourly: refresh each channel's audience (country → time zone) every 6 h, rebuild the plan, and upload/schedule every
# approved video on all channels until YouTube's account-wide daily upload cap lets them through (owner 2026-10-26).
# Mission Voices is skipped while data/cache/mv-upload-retry.sh is still active (its log changed < 45 min ago) to avoid double uploads.
cd /e/clips-viral || exit 1
LOG=data/logs/yt-retry.log
for i in $(seq 1 72); do
  if [ $((i % 6)) -eq 1 ]; then
    for b in rankings clipping compilations quiz-ar; do timeout 120 npx tsx scripts/youtube.ts analytics $b >/dev/null 2>&1; done
    python scripts/audience-slots.py >> $LOG 2>&1
  fi
  python scripts/publish-plan.py --start "$(date +%F)" >> $LOG 2>&1
  brands="compilations quiz-ar rankings"
  if [ -z "$(find data/logs/mv-upload-retry.log -mmin -45 2>/dev/null)" ]; then brands="clipping $brands"; fi
  pending=0
  for b in $brands; do
    out=$(timeout 1800 npx tsx scripts/youtube.ts upload $b 2>&1)
    echo "$(date '+%F %T') try $i $b: $(echo "$out" | grep -c '^scheduled') scheduled" >> $LOG
    echo "$out" | grep '^scheduled' >> $LOG
    if echo "$out" | grep -q uploadLimitExceeded; then pending=1; echo "  cap hit" >> $LOG; break; fi
    echo "$out" | grep -q '"error"' && pending=1
  done
  python scripts/sync-publishing.py >/dev/null 2>&1
  python scripts/publish-plan.py --start "$(date +%F)" >/dev/null 2>&1
  left=$(python -c "import json;print(len(json.load(open('data/publish-plan.json',encoding='utf-8'))))")
  [ "$pending" = 0 ] && [ "$left" = 0 ] && { echo "$(date '+%F %T') all scheduled" >> $LOG; exit 0; }
  sleep 3600
done
