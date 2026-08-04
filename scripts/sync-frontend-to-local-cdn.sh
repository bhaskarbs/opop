#!/usr/bin/env bash
# Builds the frontend and uploads frontend/dist into the local fake-gcs-server bucket, so you can
# serve/verify the production static-hosting path (Cloud Storage + Cloud CDN, see
# infra/frontend.tf) entirely locally before it's ever deployed. Mirrors the real deploy step in
# infra/README.md's "Frontend deploy" section (gsutil rsync into the real bucket) — this is the
# same idea against fake-gcs-server instead.
#
# Requires: `docker compose up -d fake-gcs-server` already running (see docker-compose.yml's
# "cdn" profile). Doesn't use gsutil/gcloud storage — this machine has real GCP credentials
# configured for the project's actual infra (see infra/), and there's no reliable way to force
# those CLIs to talk to a local emulator instead, so this uses fake-gcs-server's plain JSON API
# via curl to guarantee everything stays local.
set -euo pipefail

EMULATOR_HOST="${STORAGE_GCS_EMULATOR_HOST:-http://localhost:4443}"
BUCKET="${FRONTEND_BUCKET:-openopportunity-frontend}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST_DIR="$REPO_ROOT/frontend/dist"

if ! curl -sf "$EMULATOR_HOST/storage/v1/b" > /dev/null; then
  echo "fake-gcs-server isn't reachable at $EMULATOR_HOST — start it with:" >&2
  echo "  docker compose up -d fake-gcs-server" >&2
  exit 1
fi

echo "Building frontend..."
(cd "$REPO_ROOT" && npm run build --workspace=frontend)

echo "Ensuring bucket $BUCKET exists..."
curl -sf -X POST "$EMULATOR_HOST/storage/v1/b?project=openopportunity-local" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"$BUCKET\"}" > /dev/null || true

content_type_for() {
  # Extension-based, not `file --mime-type` (content-sniffing) — minified JS/CSS reads as
  # indistinguishable from plain text to a magic-byte sniffer, and browsers are strict about
  # actually getting "text/javascript"/"text/css" for <script type="module">/stylesheet loads.
  case "$1" in
    *.html) echo "text/html; charset=utf-8" ;;
    *.js|*.mjs) echo "text/javascript; charset=utf-8" ;;
    *.css) echo "text/css; charset=utf-8" ;;
    *.json) echo "application/json; charset=utf-8" ;;
    *.svg) echo "image/svg+xml" ;;
    *.png) echo "image/png" ;;
    *.jpg|*.jpeg) echo "image/jpeg" ;;
    *.webp) echo "image/webp" ;;
    *.woff2) echo "font/woff2" ;;
    *.woff) echo "font/woff" ;;
    *.ico) echo "image/x-icon" ;;
    *) file --mime-type -b "$1" ;;
  esac
}

echo "Uploading $DIST_DIR to $BUCKET..."
find "$DIST_DIR" -type f | while read -r file; do
  object_path="${file#"$DIST_DIR"/}"
  content_type="$(content_type_for "$file")"
  curl -sf -X POST \
    "$EMULATOR_HOST/upload/storage/v1/b/$BUCKET/o?uploadType=media&name=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$object_path")" \
    -H "Content-Type: $content_type" \
    --data-binary @"$file" > /dev/null
  echo "  uploaded $object_path ($content_type)"
done

echo ""
echo "Done. Spot-check with, e.g.:"
echo "  curl \"$EMULATOR_HOST/storage/v1/b/$BUCKET/o/index.html?alt=media\""
