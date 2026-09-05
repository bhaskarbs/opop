#!/usr/bin/env bash
# Reports memory (total vs. remaining) for every prod compute resource this app runs on: the
# Cloud Run backend and the Cloud SQL instance, plus Memorystore Redis if enabled. There's no
# real "server" to SSH into and run `free -h` on — this is all managed GCP infra — so this
# queries each service's configured memory limit (gcloud describe) alongside its actual usage
# from Cloud Monitoring (the REST API directly; gcloud itself has no `time-series list` command).
#
# Usage: ./check-prod-memory.sh
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONNECTION_NAME="$(cd "$REPO_ROOT/infra" && terraform output -raw sql_connection_name 2>/dev/null)"
if [ -z "$CONNECTION_NAME" ]; then
  echo "Couldn't determine the project/region from terraform output — is infra/ applied?" >&2
  exit 1
fi
PROJECT="$(cut -d: -f1 <<<"$CONNECTION_NAME")"
REGION="$(cut -d: -f2 <<<"$CONNECTION_NAME")"
SQL_INSTANCE="$(cut -d: -f3 <<<"$CONNECTION_NAME")"
RUN_SERVICE="openopportunity-backend"

TOKEN="$(gcloud auth print-access-token)"
END="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
START_RECENT="$(date -u -v-15M +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '-15 minutes' +%Y-%m-%dT%H:%M:%SZ)"
# Cloud Run here scales to zero on a schedule (see scripts/scale-down-backend.sh /
# disable-backend-night-schedule.sh) and can go quiet for hours between requests, so its own
# query below uses this much wider window and takes the latest point in it, rather than the
# always-on Cloud SQL/Redis instances' tighter 15-minute one.
START_WIDE="$(date -u -v-24H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '-24 hours' +%Y-%m-%dT%H:%M:%SZ)"

# $1: metric type, $2: extra resource-label filter clause (e.g. resource.labels.foo="bar"),
# $3: interval start (defaults to the 15-minute window if omitted).
# Cloud Run reports one time series per revision, and most 1-minute buckets have zero samples
# (an empty distribution, no "mean" key at all) since this backend sees intermittent traffic —
# so this can't just take the first series' latest point; it has to scan every point across
# every returned series and pick the most recent one that actually has data.
# Prints that value (int64 or distribution mean), or nothing if no real sample exists anywhere
# in the window (e.g. Cloud Run scaled to zero with no traffic at all in the last 24h).
query_latest_metric_value() {
  local metric_type="$1" resource_filter="$2" start="${3:-$START_RECENT}"
  curl -s -G "https://monitoring.googleapis.com/v3/projects/${PROJECT}/timeSeries" \
    -H "Authorization: Bearer ${TOKEN}" \
    --data-urlencode "filter=metric.type=\"${metric_type}\" AND ${resource_filter}" \
    --data-urlencode "interval.startTime=${start}" \
    --data-urlencode "interval.endTime=${END}" |
    python3 -c '
import json, sys
data = json.load(sys.stdin)
series = data.get("timeSeries") or []
candidates = []
for s in series:
    for p in s.get("points") or []:
        value = p["value"]
        end_time = p["interval"]["endTime"]
        if "int64Value" in value:
            candidates.append((end_time, value["int64Value"]))
        elif "distributionValue" in value and "mean" in value["distributionValue"]:
            candidates.append((end_time, value["distributionValue"]["mean"]))
print(max(candidates)[1] if candidates else "")
'
}

# Converts a Kubernetes-style quantity ("1Gi", "512Mi") to bytes.
to_bytes() {
  python3 -c "
value = '$1'
units = {'Ki': 1024, 'Mi': 1024**2, 'Gi': 1024**3, 'Ti': 1024**4}
for suffix, factor in units.items():
    if value.endswith(suffix):
        print(int(float(value[: -len(suffix)]) * factor))
        break
else:
    print(int(value))
"
}

human() {
  python3 -c "
bytes_value = $1
for unit in ['B', 'KiB', 'MiB', 'GiB']:
    if bytes_value < 1024:
        print(f'{bytes_value:.1f} {unit}')
        break
    bytes_value /= 1024
else:
    print(f'{bytes_value:.1f} TiB')
"
}

echo "=== Cloud Run backend ($RUN_SERVICE, $REGION) ==="
RUN_LIMIT_RAW="$(gcloud run services describe "$RUN_SERVICE" --region="$REGION" --project="$PROJECT" \
  --format="value(spec.template.spec.containers[0].resources.limits.memory)")"
RUN_LIMIT_BYTES="$(to_bytes "$RUN_LIMIT_RAW")"
RUN_UTILIZATION="$(query_latest_metric_value \
  "run.googleapis.com/container/memory/utilizations" \
  "resource.labels.service_name=\"${RUN_SERVICE}\"" \
  "$START_WIDE")"
if [ -z "$RUN_UTILIZATION" ]; then
  echo "Total: $(human "$RUN_LIMIT_BYTES") ($RUN_LIMIT_RAW)"
  echo "No memory usage data in the last 24 hours (likely scaled to zero with no traffic at all)."
else
  RUN_USED_BYTES="$(python3 -c "print(int($RUN_LIMIT_BYTES * $RUN_UTILIZATION))")"
  RUN_REMAINING_BYTES="$((RUN_LIMIT_BYTES - RUN_USED_BYTES))"
  printf "Total:     %s\n" "$(human "$RUN_LIMIT_BYTES")"
  printf "Used:      %s (%.1f%%)\n" "$(human "$RUN_USED_BYTES")" "$(python3 -c "print($RUN_UTILIZATION * 100)")"
  printf "Remaining: %s\n" "$(human "$RUN_REMAINING_BYTES")"
fi

echo ""
echo "=== Cloud SQL ($SQL_INSTANCE, $REGION) ==="
SQL_TIER="$(gcloud sql instances describe "$SQL_INSTANCE" --project="$PROJECT" --format="value(settings.tier)")"
SQL_QUOTA="$(query_latest_metric_value \
  "cloudsql.googleapis.com/database/memory/quota" \
  "resource.labels.database_id=\"${PROJECT}:${SQL_INSTANCE}\"")"
SQL_USAGE="$(query_latest_metric_value \
  "cloudsql.googleapis.com/database/memory/usage" \
  "resource.labels.database_id=\"${PROJECT}:${SQL_INSTANCE}\"")"
if [ -z "$SQL_QUOTA" ] || [ -z "$SQL_USAGE" ]; then
  echo "No memory metrics available yet for tier $SQL_TIER (a brand-new instance can take a"
  echo "few minutes before Cloud Monitoring has data)."
else
  SQL_REMAINING="$((${SQL_QUOTA%.*} - ${SQL_USAGE%.*}))"
  printf "Tier:      %s\n" "$SQL_TIER"
  printf "Total:     %s\n" "$(human "$SQL_QUOTA")"
  printf "Used:      %s\n" "$(human "$SQL_USAGE")"
  printf "Remaining: %s\n" "$(human "$SQL_REMAINING")"
  echo "Note: Cloud SQL's memory/usage metric includes the OS's disk page cache, which Linux"
  echo "opportunistically fills with any spare RAM — it's normal for this to sit near 100% even"
  echo "when the database itself isn't under memory pressure (same reason 'free -h' looks fuller"
  echo "than expected on any Linux box). A consistently high value here isn't on its own a sign"
  echo "of a problem; watch for actual OOM restarts or query slowness instead."
fi

echo ""
echo "=== Memorystore Redis ==="
if REDIS_INFO="$(gcloud redis instances describe openopportunity-cache --region="$REGION" --project="$PROJECT" \
  --format="value(memorySizeGb)" 2>/dev/null)" && [ -n "$REDIS_INFO" ]; then
  REDIS_QUOTA_BYTES="$(python3 -c "print(int($REDIS_INFO * 1024**3))")"
  REDIS_USAGE="$(query_latest_metric_value \
    "redis.googleapis.com/stats/memory/usage" \
    "resource.labels.instance_id=\"openopportunity-cache\"")"
  printf "Total:     %s\n" "$(human "$REDIS_QUOTA_BYTES")"
  if [ -n "$REDIS_USAGE" ]; then
    printf "Used:      %s\n" "$(human "$REDIS_USAGE")"
    printf "Remaining: %s\n" "$(human "$((REDIS_QUOTA_BYTES - ${REDIS_USAGE%.*}))")"
  fi
else
  echo "Not enabled (enable_redis=false in infra/deploy.tfvars) — nothing to report."
fi
