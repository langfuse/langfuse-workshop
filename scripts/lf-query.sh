#!/usr/bin/env bash
# Read-only Langfuse CLI query wrapper.
#
# Why this exists: it lets the Langfuse query commands be auto-approved in
# .claude/settings.local.json with a single allow rule, while (a) keeping the
# secret key only in .env (sourced at runtime, never copied into settings) and
# (b) refusing any non-read verb so the auto-allow can't trigger a mutation.
#
# Usage:  bash scripts/lf-query.sh <resource> <list|get|get-public> [flags...]
# Example: bash scripts/lf-query.sh traces list --limit 5 --order-by timestamp.desc
set -euo pipefail

# Resolve repo root from this script's location so it works from any cwd.
cd "$(dirname "$0")/.."

# Load credentials from .env (kept out of settings.json on purpose).
set -a
. ./.env
set +a
export LANGFUSE_HOST="${LANGFUSE_HOST:-${LANGFUSE_BASE_URL:-https://cloud.langfuse.com}}"

# Enforce read-only: the verb is the 2nd positional arg (after the resource).
verb="${2:-}"
case "$verb" in
  list|get|get-public|get-many) ;;
  *)
    echo "lf-query: read-only — allowed verbs are list/get/get-public (got '${verb:-<none>}')" >&2
    echo "         usage: bash scripts/lf-query.sh <resource> <list|get|get-public> [flags...]" >&2
    exit 2
    ;;
esac

exec npx -y langfuse-cli@latest api "$@"
