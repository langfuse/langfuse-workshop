#!/usr/bin/env bash
# Bring every canonical checkpoint tag in line with main (or SOURCE_REF).
#
# Each tag gets SOURCE_REF's tree, except the milestone files listed in
# milestone_files(). Those keep the tag's own code, so each step still starts
# where its lesson expects (for example, no tracing before 02). Inside a
# milestone file, regions between
#   // checkpoint-sync:begin <name>
#   // checkpoint-sync:end <name>
# are still copied from SOURCE_REF, so shared content such as the system
# prompt reaches every tag.
#
# Usage (from repo root, clean working tree):
#   ./scripts/sync-checkpoints.sh                    # update tags locally
#   ./scripts/sync-checkpoints.sh --verify           # also typecheck each tag
#   ./scripts/sync-checkpoints.sh --verify --push    # then force-push moved tags
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PUSH=0
VERIFY=0
for arg in "$@"; do
  case "$arg" in
    --push) PUSH=1 ;;
    --verify) VERIFY=1 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

TAGS=(
  checkpoint/00-setup
  checkpoint/01-base-app
  checkpoint/02-tracing
  checkpoint/03-prompt-management
  checkpoint/04-monitoring
  checkpoint/05-dataset
  checkpoint/06-experiments
  checkpoint/07-evaluation
  checkpoint/08-wrap-up
)

# Files whose code is what the next lesson changes. Add a file here when a
# lesson starts editing it; remove it once no earlier tag differs from main.
milestone_files() {
  case "$1" in
    checkpoint/00-setup | checkpoint/01-base-app | checkpoint/02-tracing)
      echo "src/server/index.ts src/server/support-agent.ts src/server/tools.ts"
      ;;
    checkpoint/03-prompt-management)
      echo "src/server/support-agent.ts src/server/tools.ts"
      ;;
    *)
      echo ""
      ;;
  esac
}

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree must be clean before syncing checkpoints." >&2
  exit 1
fi

SOURCE_REF="${SOURCE_REF:-main}"
if ! git rev-parse --verify "$SOURCE_REF^{commit}" >/dev/null 2>&1; then
  echo "Missing source ref: $SOURCE_REF" >&2
  exit 1
fi
SOURCE_SHA="$(git rev-parse --short "$SOURCE_REF")"

START_REF="$(git symbolic-ref -q --short HEAD || git rev-parse HEAD)"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/checkpoint-sync.XXXXXX")"
cleanup() {
  git checkout -q -f "$START_REF" >/dev/null 2>&1 || true
  rm -rf "$STAGE"
}
trap cleanup EXIT

mkdir -p "$STAGE/source" "$STAGE/keep"
git archive "$SOURCE_REF" | tar -x -C "$STAGE/source"
rm -rf "$STAGE/source/.github"

sync_regions() {
  python3 - "$1" "$2" <<'PY'
import re, sys

source_path, target_path = sys.argv[1], sys.argv[2]
pattern = re.compile(
    r"^[ \t]*// checkpoint-sync:begin (\S+)\n.*?^[ \t]*// checkpoint-sync:end \1\n",
    re.S | re.M,
)
source = open(source_path).read()
target = open(target_path).read()
regions = {m.group(1): m.group(0) for m in pattern.finditer(source)}
target_names = {m.group(1) for m in pattern.finditer(target)}
missing = sorted(set(regions) - target_names)
if missing:
    sys.exit(f"{target_path}: missing checkpoint-sync region(s) {', '.join(missing)}")
target = pattern.sub(lambda m: regions.get(m.group(1), m.group(0)), target)
open(target_path, "w").write(target)
PY
}

MOVED=()
for tag in "${TAGS[@]}"; do
  if ! git rev-parse --verify "refs/tags/$tag" >/dev/null 2>&1; then
    echo "Missing tag: $tag" >&2
    exit 1
  fi

  echo "==> $tag"
  git checkout -q -f --detach "refs/tags/$tag"

  keep_files="$(milestone_files "$tag")"
  rm -rf "$STAGE/keep" && mkdir -p "$STAGE/keep"
  for file in $keep_files; do
    mkdir -p "$STAGE/keep/$(dirname "$file")"
    git show "HEAD:$file" >"$STAGE/keep/$file"
  done

  git ls-files -z | grep -zv '^\.github/' | xargs -0 rm -f
  cp -a "$STAGE/source/." .

  for file in $keep_files; do
    cp "$STAGE/keep/$file" "$file"
    if [[ -f "$STAGE/source/$file" ]]; then
      sync_regions "$STAGE/source/$file" "$file"
    fi
  done

  git add -A
  if git diff --cached --quiet; then
    echo "    already in sync with $SOURCE_REF"
    continue
  fi

  if [[ "$VERIFY" -eq 1 ]]; then
    echo "    typecheck"
    npm run -s typecheck
  fi

  git commit -q -m "$(cat <<MSG
Sync checkpoint with ${SOURCE_REF} (${SOURCE_SHA})

Takes ${SOURCE_REF}'s tree, except the milestone files this step still
starts from: ${keep_files:-none}. Shared checkpoint-sync regions inside
those files come from ${SOURCE_REF} too.
MSG
)"

  git tag -f "$tag" HEAD >/dev/null
  MOVED+=("refs/tags/$tag")
  echo "    updated $(git rev-parse --short HEAD)"
done

if [[ "${#MOVED[@]}" -eq 0 ]]; then
  echo "All checkpoint tags already match $SOURCE_REF."
  exit 0
fi

if [[ "$PUSH" -eq 1 ]]; then
  git push --atomic --force origin "${MOVED[@]}"
  echo "Pushed ${#MOVED[@]} tag(s)."
else
  echo "Updated ${#MOVED[@]} tag(s) locally. Re-run with --push to publish them."
fi
