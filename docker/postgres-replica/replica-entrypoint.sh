#!/bin/bash
# Bootstraps this container as a Postgres streaming-replication standby of the "postgres"
# (primary) service, then hands off to the official image's own entrypoint. The postgres image's
# POSTGRES_* env vars only know how to initialize a brand-new database — there's no built-in
# "clone an existing primary and follow it" mode — so this exists to do that cloning step once
# (via pg_basebackup) before the normal postgres process ever starts. On every later restart the
# data directory is already populated, so this whole block is skipped and postgres just resumes
# streaming from wherever it left off.
set -euo pipefail

if [ -z "$(ls -A "$PGDATA" 2>/dev/null)" ]; then
  echo "Replica data directory is empty — cloning from $PRIMARY_HOST via pg_basebackup..."
  until pg_basebackup \
    --host="$PRIMARY_HOST" \
    --port=5432 \
    --username=replicator \
    --pgdata="$PGDATA" \
    --format=plain \
    --wal-method=stream \
    --write-recovery-conf \
    --progress \
    --no-password; do
    echo "Primary not ready yet, retrying in 2s..."
    sleep 2
  done
  chmod 0700 "$PGDATA"
fi

exec docker-entrypoint.sh postgres
