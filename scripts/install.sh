#!/usr/bin/env bash
# One-click-ish install for dsh-telegram-channel (macOS / Linux).
# Usage:
#   export DSH_TELEGRAM_TOKEN='123:AA...'
#   export DSH_TELEGRAM_ALLOWED_USER_IDS='7057906059'
#   curl -fsSL https://raw.githubusercontent.com/hi-wenw/dsh-telegram-channel/master/scripts/install.sh | bash
# Or:
#   ./scripts/install.sh --token '...' --user-id '...'
set -euo pipefail

PROFILE_NAME="${DSH_PROFILE:-web}"
SOURCE="${DSH_TELEGRAM_SOURCE:-github:hi-wenw/dsh-telegram-channel}"
TOKEN="${DSH_TELEGRAM_TOKEN:-}"
USER_ID="${DSH_TELEGRAM_ALLOWED_USER_IDS:-}"
LOCAL=0
NO_PERSIST=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --token) TOKEN="${2:-}"; shift 2 ;;
    --user-id) USER_ID="${2:-}"; shift 2 ;;
    --profile) PROFILE_NAME="${2:-}"; shift 2 ;;
    --source) SOURCE="${2:-}"; shift 2 ;;
    --local) LOCAL=1; shift ;;
    --no-persist) NO_PERSIST=1; shift ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

if ! command -v dsh >/dev/null 2>&1; then
  echo "dsh not found in PATH" >&2
  exit 1
fi

if [[ -z "$TOKEN" ]]; then
  read -r -p "Bot Token: " TOKEN
fi
if [[ -z "$USER_ID" ]]; then
  read -r -p "Telegram numeric User ID: " USER_ID
fi
USER_ID="$(echo "$USER_ID" | tr -d '[:space:]')"
if ! [[ "$USER_ID" =~ ^[0-9]+(,[0-9]+)*$ ]]; then
  echo "User ID must be numeric (comma-separated ok)" >&2
  exit 1
fi

export DSH_TELEGRAM_TOKEN="$TOKEN"
export DSH_TELEGRAM_ALLOWED_USER_IDS="$USER_ID"

persist_env() {
  local name="$1" value="$2"
  local line="export ${name}=$(printf %q "$value")"
  for f in "$HOME/.bashrc" "$HOME/.zshrc"; do
    [[ -f "$f" ]] || continue
    if grep -q "^export ${name}=" "$f" 2>/dev/null; then
      # portable-ish replace
      tmp="$(mktemp)"
      grep -v "^export ${name}=" "$f" >"$tmp" || true
      echo "$line" >>"$tmp"
      mv "$tmp" "$f"
    else
      echo "$line" >>"$f"
    fi
  done
}

if [[ "$NO_PERSIST" -eq 0 ]]; then
  persist_env DSH_TELEGRAM_TOKEN "$TOKEN"
  persist_env DSH_TELEGRAM_ALLOWED_USER_IDS "$USER_ID"
  echo "Wrote exports to ~/.bashrc and/or ~/.zshrc (if present)."
fi

DSH_HOME="${DSH_HOME:-$HOME/.dsh}"
PROFILE_DIR="$DSH_HOME/profiles/$PROFILE_NAME"
if [[ ! -d "$PROFILE_DIR" ]]; then
  echo "Profile dir missing: $PROFILE_DIR (run dsh web once first)" >&2
  exit 1
fi

WS="$PROFILE_DIR/pnpm-workspace.yaml"
if [[ ! -f "$WS" ]]; then
  cat >"$WS" <<'EOF'
packages:
  - .

nodeLinker: hoisted
autoInstallPeers: false

allowBuilds:
  dsh-telegram-channel: true
EOF
elif ! grep -q 'dsh-telegram-channel:' "$WS"; then
  if grep -q '^allowBuilds:' "$WS"; then
    awk '
      BEGIN{done=0}
      /^allowBuilds:/{print; print "  dsh-telegram-channel: true"; done=1; next}
      {print}
      END{if(!done){print ""; print "allowBuilds:"; print "  dsh-telegram-channel: true"}}
    ' "$WS" >"$WS.tmp" && mv "$WS.tmp" "$WS"
  else
    printf '\nallowBuilds:\n  dsh-telegram-channel: true\n' >>"$WS"
  fi
fi

if [[ "$LOCAL" -eq 1 ]]; then
  SOURCE="$(cd "$(dirname "$0")/.." && pwd)"
fi

echo "==> dsh plugin --profile $PROFILE_NAME add $SOURCE"
dsh plugin --profile "$PROFILE_NAME" add "$SOURCE"

cat <<EOF

Install done. Next:
  1. Open a new shell (so env vars load)
  2. Run: dsh web
  3. Open a Web conversation
  4. On phone: /start → /sessions → bind

EOF
