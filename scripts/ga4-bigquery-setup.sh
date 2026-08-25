#!/usr/bin/env bash
# Cloud-side setup for the GA4 → BigQuery export. Needs your Google login,
# so it runs on your machine — not in CI, not in a sandbox.
#
# What it does:
#   1. checks gcloud/bq are installed and an account is logged in
#   2. verifies the BigQuery API is enabled on the project   (--apply enables)
#   3. looks for the analytics_<property id> export dataset  (--apply patches
#      the real name into queries/*.sql once it exists)
#   4. creates a $300 budget on the project's billing account with alerts
#      at 50%, 90% and 100%                                  (--apply creates)
#   5. with --measurement-id, swaps the real GA4 Measurement ID for the
#      G-XXXXXXXX placeholder in every page                  (--apply writes)
#
# Without --apply nothing changes anywhere — it reports, and prints the
# exact command each change would run.
#
# Usage:
#   scripts/ga4-bigquery-setup.sh --project <PROJECT_ID> [--apply]
#       [--budget-amount 300] [--measurement-id G-XXXXXXXXXX]
#
# The Cloud project is the one *named* "BigQuery" in the lernerworks.com
# org. This script needs its ID (IDs are lowercase, immutable, shown next
# to the name in the console) — or find it with:
#   gcloud projects list --filter='name:BigQuery'

set -euo pipefail

PROJECT_ID=""
APPLY=0
BUDGET_AMOUNT=300
MEASUREMENT_ID=""
PLACEHOLDER="G-XXXXXXXX"
DATASET_PLACEHOLDER="analytics_XXXXXXXXX"
REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

while [ $# -gt 0 ]; do
  case "$1" in
    --project)        PROJECT_ID="$2"; shift 2 ;;
    --apply)          APPLY=1; shift ;;
    --budget-amount)  BUDGET_AMOUNT="$2"; shift 2 ;;
    --measurement-id) MEASUREMENT_ID="$2"; shift 2 ;;
    -h|--help)        sed -n '2,25p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown option: $1 (try --help)" >&2; exit 2 ;;
  esac
done

say()  { printf '\n== %s\n' "$*"; }
note() { printf '   %s\n' "$*"; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# Mutating commands go through here: always printed, run only with --apply.
run() {
  printf '   $ %s\n' "$*"
  if [ "$APPLY" -eq 1 ]; then "$@"; else note '(dry run — rerun with --apply to execute)'; fi
}

# ── 1. tooling and auth ──────────────────────────────────────────────────
say "Checking tools and login"
command -v gcloud >/dev/null || die "gcloud not found — install the Google Cloud SDK: https://cloud.google.com/sdk/docs/install"
command -v bq     >/dev/null || die "bq not found — it ships with the SDK; rerun the SDK installer"

ACTIVE_ACCOUNT="$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null | head -n1)"
[ -n "$ACTIVE_ACCOUNT" ] || die "no active gcloud account — run: gcloud auth login"
note "logged in as $ACTIVE_ACCOUNT"

if [ -z "$PROJECT_ID" ]; then
  PROJECT_ID="$(gcloud config get-value project 2>/dev/null || true)"
  [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "(unset)" ] \
    || die "no project — pass --project <PROJECT_ID> (gcloud projects list --filter='name:BigQuery' finds it)"
fi
gcloud projects describe "$PROJECT_ID" --format='value(projectId)' >/dev/null \
  || die "cannot access project '$PROJECT_ID' as $ACTIVE_ACCOUNT"
PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
note "project $PROJECT_ID (number $PROJECT_NUMBER)"

# ── 2. BigQuery API ──────────────────────────────────────────────────────
say "BigQuery API"
if gcloud services list --enabled --project "$PROJECT_ID" --format='value(config.name)' \
    | grep -qx 'bigquery.googleapis.com'; then
  note "already enabled"
else
  note "not enabled yet"
  run gcloud services enable bigquery.googleapis.com --project "$PROJECT_ID"
fi

# ── 3. the export dataset ────────────────────────────────────────────────
say "GA4 export dataset"
DATASET="$(bq ls --project_id="$PROJECT_ID" --format=json 2>/dev/null \
  | grep -o 'analytics_[0-9]\{1,\}' | head -n1 || true)"
if [ -n "$DATASET" ]; then
  note "found: $DATASET"
  if grep -rq "$DATASET_PLACEHOLDER" "$REPO_ROOT/queries" 2>/dev/null; then
    note "patching it into queries/*.sql in place of $DATASET_PLACEHOLDER"
    if [ "$APPLY" -eq 1 ]; then
      for f in "$REPO_ROOT"/queries/*.sql; do
        sed -i.bak "s/$DATASET_PLACEHOLDER/$DATASET/g" "$f" && rm -f "$f.bak"
      done
      note "done — commit the change"
    else
      note "(dry run — rerun with --apply to patch)"
    fi
  else
    note "queries/*.sql already point at it"
  fi
else
  note "no analytics_* dataset in $PROJECT_ID yet — normal for up to ~24h"
  note "after the link is created. Confirm the link exists in GA4 under"
  note "Admin → Product links → BigQuery links, then rerun this script."
fi

# ── 4. billing budget ────────────────────────────────────────────────────
say "Billing budget (\$$BUDGET_AMOUNT, alerts at 50/90/100%)"
BILLING_PATH="$(gcloud billing projects describe "$PROJECT_ID" --format='value(billingAccountName)' 2>/dev/null || true)"
if [ -z "$BILLING_PATH" ]; then
  note "SKIPPED: no billing account is attached to $PROJECT_ID"
  note "(attach one at https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID, then rerun)"
else
  BILLING_ACCOUNT="${BILLING_PATH#billingAccounts/}"
  note "billing account $BILLING_ACCOUNT"

  if ! gcloud services list --enabled --project "$PROJECT_ID" --format='value(config.name)' \
      | grep -qx 'billingbudgets.googleapis.com'; then
    note "the Budget API is not enabled yet"
    run gcloud services enable billingbudgets.googleapis.com --project "$PROJECT_ID"
  fi

  BUDGET_NAME="lernerworks GA4/BigQuery — \$$BUDGET_AMOUNT"
  if gcloud billing budgets list --billing-account="$BILLING_ACCOUNT" \
      --format='value(displayName)' 2>/dev/null | grep -Fqx "$BUDGET_NAME"; then
    note "already exists: \"$BUDGET_NAME\""
  else
    # Scoped to this project only; drop --filter-projects to cap the whole
    # billing account instead. Alert emails go to the account's billing
    # admins and users — that's you.
    run gcloud billing budgets create \
      --billing-account="$BILLING_ACCOUNT" \
      --display-name="$BUDGET_NAME" \
      --budget-amount="${BUDGET_AMOUNT}USD" \
      --filter-projects="projects/$PROJECT_NUMBER" \
      --threshold-rule=percent=0.5 \
      --threshold-rule=percent=0.9 \
      --threshold-rule=percent=1.0
    note "a budget only alerts — it never stops spend on its own"
  fi
fi

# ── 5. measurement ID ────────────────────────────────────────────────────
if [ -n "$MEASUREMENT_ID" ]; then
  say "Measurement ID"
  echo "$MEASUREMENT_ID" | grep -Eq '^G-[A-Z0-9]{4,14}$' \
    || die "'$MEASUREMENT_ID' doesn't look like a GA4 Measurement ID (G-XXXXXXXXXX)"
  FILES="$(grep -rl "$PLACEHOLDER" "$REPO_ROOT" --include='*.html' || true)"
  if [ -z "$FILES" ]; then
    note "no $PLACEHOLDER placeholder left — already swapped?"
  else
    note "writing $MEASUREMENT_ID into: $(echo "$FILES" | wc -l | tr -d ' ') files"
    if [ "$APPLY" -eq 1 ]; then
      echo "$FILES" | while IFS= read -r f; do
        sed -i.bak "s/$PLACEHOLDER/$MEASUREMENT_ID/g" "$f" && rm -f "$f.bak"
      done
      note "done — commit the change, then deploy"
    else
      note "(dry run — rerun with --apply to write)"
    fi
  fi
fi

say "Done$( [ "$APPLY" -eq 1 ] || printf ' (dry run — nothing was changed)')"
