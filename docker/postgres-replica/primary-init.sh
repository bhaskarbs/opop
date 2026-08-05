#!/bin/bash
# Runs once, automatically, the first time the primary container starts with an empty data
# volume — the official postgres image runs every *.sh file in /docker-entrypoint-initdb.d/ as
# part of its own initdb sequence (see docker-compose.yml). Sets up what
# replica-entrypoint.sh needs to stream from this instance: a role with the REPLICATION
# privilege, and a pg_hba.conf rule actually letting that role connect. Local-dev only — trusts
# any host, same reasoning as this repo's other local containers running with plaintext
# passwords/disabled security (see docker-compose.yml's Postgres/Elasticsearch/Redis comments).
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-SQL
    CREATE ROLE replicator WITH REPLICATION LOGIN PASSWORD '$POSTGRES_REPLICATION_PASSWORD';
SQL

echo "host replication replicator all md5" >>"$PGDATA/pg_hba.conf"
