#!/bin/bash
# Builds a deployable zip for the Yelnats Lambda.
#   scripts/build-lambda.sh current   -> lambda/ as it is now (SDK v3, Node 22)
#   scripts/build-lambda.sh legacy    -> the pre-2026-11 code (commit 729f0be) with aws-sdk v2
#                                        bundled, so it runs on Node 16 or 22 (used for rollback)
# Prints the zip path.
set -euo pipefail
MODE=${1:-current}
REPO=$(cd "$(dirname "$0")/.." && pwd)
WORK=$(mktemp -d)
OUT=/tmp/enohp-lambda-$MODE.zip
if [ "$MODE" = current ]; then
  cp "$REPO"/lambda/index.js "$REPO"/lambda/app.js "$REPO"/lambda/daily.js "$REPO"/lambda/daily-phrases.json "$REPO"/lambda/package.json "$WORK"/
elif [ "$MODE" = legacy ]; then
  git -C "$REPO" show 729f0be:lambda/index.js > "$WORK"/index.js
  printf '{"name":"enohp-lambda-legacy","private":true,"dependencies":{"uuid":"^9.0.1","aws-sdk":"^2.1691.0"}}\n' > "$WORK"/package.json
else
  echo "usage: $0 current|legacy" >&2; exit 1
fi
(cd "$WORK" && npm install --omit=dev --no-audit --no-fund --loglevel=error >/dev/null && node -e "require('./index.js')" && rm -f "$OUT" && zip -qr "$OUT" .)
rm -rf "$WORK"
echo "$OUT"
