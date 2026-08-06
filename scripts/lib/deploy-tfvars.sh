#!/usr/bin/env bash
# Shared by every scripts/*.sh toggle script (deploy-firebase.sh, deploy-loadbalancer.sh,
# enable/disable-redis.sh, enable/disable-elasticsearch.sh, set-loadbalancer-domain.sh,
# upgrade/downgrade-sql-replica.sh, scale-up/down-backend.sh) — reads/updates infra/deploy.tfvars
# in place, creating it from deploy.tfvars.example on first use. Meant to be sourced, not run
# directly.
#
# The whole point of routing every toggle through these functions: running any single script
# only ever changes the setting it's actually responsible for. Without this, each script calling
# `terraform apply -var="x=y"` directly would silently reset every *other* toggle back to its
# default on every apply, since Terraform has no memory of a previous run's flags — deploy.tfvars
# is what actually persists "every other toggle should stay whatever it already was."
set_deploy_tfvar() {
  local repo_root="$1" key="$2" value="$3"
  local tfvars="$repo_root/infra/deploy.tfvars"

  if [ ! -f "$tfvars" ]; then
    cp "$repo_root/infra/deploy.tfvars.example" "$tfvars"
  fi

  if grep -q "^${key}[[:space:]]*=" "$tfvars"; then
    # -i.bak (with a suffix), not bare -i — BSD sed (macOS) requires an explicit backup suffix
    # argument, unlike GNU sed where it's optional; this form works on both.
    sed -i.bak "s|^${key}[[:space:]]*=.*|${key} = ${value}|" "$tfvars"
    rm -f "$tfvars.bak"
  else
    echo "${key} = ${value}" >>"$tfvars"
  fi
}

# Prints the current raw value for a key (whatever's on the right of "=", untrimmed of quotes) —
# from deploy.tfvars if it exists, else falls back to deploy.tfvars.example so a first-ever call
# (before deploy.tfvars has been created by any set_deploy_tfvar call) still returns a sensible
# answer instead of nothing. Used by scripts that need to validate a new value against the
# current one (e.g. scale-up-backend.sh refusing a value that isn't actually higher).
get_deploy_tfvar() {
  local repo_root="$1" key="$2"
  local tfvars="$repo_root/infra/deploy.tfvars"
  [ -f "$tfvars" ] || tfvars="$repo_root/infra/deploy.tfvars.example"

  # `|| true` is load-bearing, not decorative: grep exits 1 on "no match" (e.g. deploy.tfvars
  # predates this key existing), and under callers' `set -euo pipefail`, an unguarded pipeline
  # ending in that exit code kills the whole script right here — even though "key not found,
  # print nothing" is exactly the intended, handled outcome for callers that check for an empty
  # result (confirmed by hitting this for real while testing scale-up-backend.sh, not assumed).
  grep "^${key}[[:space:]]*=" "$tfvars" 2>/dev/null | sed -E 's/^[^=]+=[[:space:]]*//' || true
}

# Called once, at the very end of each toggle script, only after `terraform apply` has already
# succeeded — deploy.tfvars is tracked in git (unlike terraform.tfvars) specifically because
# .github/workflows/deploy.yml reads this exact file on every push to main (see its own header
# comment); an uncommitted local change here is invisible to CI, which would just reapply the
# last-committed value on its next run and silently undo what this script just did.
remind_to_commit_deploy_tfvars() {
  echo "" >&2
  echo "Applied locally — now commit + push infra/deploy.tfvars so CI applies the same thing" >&2
  echo "next time it runs, instead of reverting it on the next push to main:" >&2
  echo "  git add infra/deploy.tfvars && git commit -m \"infra: update deploy.tfvars\" && git push" >&2
}
