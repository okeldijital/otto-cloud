#!/bin/sh
set -eu

# Mac-first wrapper for the deterministic M2KR artwork migration.
# It accepts the recovered assets.zip, strips macOS metadata/non-canonical
# images, and invokes the TypeScript migration against the canonical UUID files.

ASSETS_PATH=""
EXECUTE=""
ORG_ID=""
ACTOR_USER_ID=""

usage() {
  cat <<'EOF'
Otto Cloud — M2KR Release Artwork Recovery Runner

Usage:
  sh scripts/migrate-m2kr-release-artwork.sh --assets ./assets.zip [options]

Options:
  --assets <path>          Assets directory or .zip archive (required)
  --dry-run                Validate mapping only (default)
  --execute                Allow R2/database writes
  --org-id <uuid>          M2KR organization UUID
  --actor-user-id <id>     Otto migration actor user id
  --help                   Show this help
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --assets)
      ASSETS_PATH="$2"
      shift 2
      ;;
    --execute)
      EXECUTE="--execute"
      shift
      ;;
    --dry-run)
      EXECUTE="--dry-run"
      shift
      ;;
    --org-id)
      ORG_ID="$2"
      shift 2
      ;;
    --actor-user-id)
      ACTOR_USER_ID="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
done

if [ -z "$ASSETS_PATH" ]; then
  echo "--assets is required" >&2
  usage >&2
  exit 1
fi

if [ ! -e "$ASSETS_PATH" ]; then
  echo "Assets path does not exist: $ASSETS_PATH" >&2
  exit 1
fi

TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/otto-m2kr-artwork.XXXXXX")"
cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT INT TERM

CANONICAL_DIR="$TMP_ROOT/canonical"
mkdir -p "$CANONICAL_DIR"

if [ -d "$ASSETS_PATH" ]; then
  SOURCE_DIR="$ASSETS_PATH"
else
  case "$ASSETS_PATH" in
    *.zip|*.ZIP)
      unzip -q "$ASSETS_PATH" -d "$TMP_ROOT/extracted"
      SOURCE_DIR="$TMP_ROOT/extracted"
      ;;
    *)
      echo "--assets must be a directory or .zip archive" >&2
      exit 1
      ;;
  esac
fi

# Only UUID-named artwork is part of the release recovery set. This excludes
# __MACOSX metadata, AppleDouble files (._*), and unrelated images such as
# logo variations included in the recovered archive.
find "$SOURCE_DIR" -type f \
  -regextype posix-extended \
  -iregex '.*/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp|gif|avif|bmp|tif|tiff)' \
  -exec cp '{}' "$CANONICAL_DIR/" \;

COUNT="$(find "$CANONICAL_DIR" -type f | wc -l | tr -d ' ')"
if [ "$COUNT" -ne 81 ]; then
  echo "Expected 81 canonical M2KR artwork files; found $COUNT" >&2
  exit 1
fi

echo "[m2kr-runner] canonical artwork files: $COUNT"

echo "[m2kr-runner] source: $ASSETS_PATH"

CMD="npx tsx scripts/migrate-m2kr-release-artwork.ts --assets $CANONICAL_DIR"
if [ -n "$ORG_ID" ]; then
  CMD="$CMD --org-id $ORG_ID"
fi
if [ -n "$ACTOR_USER_ID" ]; then
  CMD="$CMD --actor-user-id $ACTOR_USER_ID"
fi
if [ -n "$EXECUTE" ]; then
  CMD="$CMD $EXECUTE"
fi

# Intentionally use the shell only for argument assembly; the migration itself
# remains the TypeScript utility and retains its own dry-run/execute safety gate.
eval "$CMD"
