#!/usr/bin/env bash
# LittleDock - Docker helpers for LittleBaby
# Inspired by Simon Willison's "Running LittleBaby in Docker"
# https://til.simonwillison.net/llms/littlebaby-docker
#
# Installation:
#   mkdir -p ~/.littledock && curl -sL https://raw.githubusercontent.com/littlebaby/littlebaby/main/scripts/littledock/littledock-helpers.sh -o ~/.littledock/littledock-helpers.sh
#   echo 'source ~/.littledock/littledock-helpers.sh' >> ~/.zshrc
#
# Usage:
#   littledock-help    # Show all available commands

# =============================================================================
# Colors
# =============================================================================
_CLR_RESET='\033[0m'
_CLR_BOLD='\033[1m'
_CLR_DIM='\033[2m'
_CLR_GREEN='\033[0;32m'
_CLR_YELLOW='\033[1;33m'
_CLR_BLUE='\033[0;34m'
_CLR_MAGENTA='\033[0;35m'
_CLR_CYAN='\033[0;36m'
_CLR_RED='\033[0;31m'

# Styled command output (green + bold)
_clr_cmd() {
  echo -e "${_CLR_GREEN}${_CLR_BOLD}$1${_CLR_RESET}"
}

# Inline command for use in sentences
_cmd() {
  echo "${_CLR_GREEN}${_CLR_BOLD}$1${_CLR_RESET}"
}

# =============================================================================
# Config
# =============================================================================
CLAWDOCK_CONFIG="${HOME}/.littledock/config"

# Common paths to check for LittleBaby
CLAWDOCK_COMMON_PATHS=(
  "${HOME}/littlebaby"
  "${HOME}/workspace/littlebaby"
  "${HOME}/projects/littlebaby"
  "${HOME}/dev/littlebaby"
  "${HOME}/code/littlebaby"
  "${HOME}/src/littlebaby"
)

_littledock_filter_warnings() {
  grep -v "^WARN\|^time="
}

_littledock_trim_quotes() {
  local value="$1"
  value="${value#\"}"
  value="${value%\"}"
  printf "%s" "$value"
}

_littledock_mask_value() {
  local value="$1"
  local length=${#value}
  if (( length == 0 )); then
    printf "%s" "<empty>"
    return 0
  fi
  if (( length == 1 )); then
    printf "%s" "<redacted:1 char>"
    return 0
  fi
  printf "%s" "<redacted:${length} chars>"
}

_littledock_read_config_dir() {
  if [[ ! -f "$CLAWDOCK_CONFIG" ]]; then
    return 1
  fi
  local raw
  raw=$(sed -n 's/^CLAWDOCK_DIR=//p' "$CLAWDOCK_CONFIG" | head -n 1)
  if [[ -z "$raw" ]]; then
    return 1
  fi
  _littledock_trim_quotes "$raw"
}

# Ensure CLAWDOCK_DIR is set and valid
_littledock_ensure_dir() {
  # Already set and valid?
  if [[ -n "$CLAWDOCK_DIR" && -f "${CLAWDOCK_DIR}/docker-compose.yml" ]]; then
    return 0
  fi

  # Try loading from config
  local config_dir
  config_dir=$(_littledock_read_config_dir)
  if [[ -n "$config_dir" && -f "${config_dir}/docker-compose.yml" ]]; then
    CLAWDOCK_DIR="$config_dir"
    return 0
  fi

  # Auto-detect from common paths
  local found_path=""
  for path in "${CLAWDOCK_COMMON_PATHS[@]}"; do
    if [[ -f "${path}/docker-compose.yml" ]]; then
      found_path="$path"
      break
    fi
  done

  if [[ -n "$found_path" ]]; then
    echo ""
    echo "🦞 Found LittleBaby at: $found_path"
    echo -n "   Use this location? [Y/n] "
    read -r response
    if [[ "$response" =~ ^[Nn] ]]; then
      echo ""
      echo "Set CLAWDOCK_DIR manually:"
      echo "  export CLAWDOCK_DIR=/path/to/littlebaby"
      return 1
    fi
    CLAWDOCK_DIR="$found_path"
  else
    echo ""
    echo "❌ LittleBaby not found in common locations."
    echo ""
    echo "Clone it first:"
    echo ""
    echo "  git clone https://github.com/littlebaby/littlebaby.git ~/littlebaby"
    echo "  cd ~/littlebaby && ./scripts/docker/setup.sh"
    echo ""
    echo "Or set CLAWDOCK_DIR if it's elsewhere:"
    echo ""
    echo "  export CLAWDOCK_DIR=/path/to/littlebaby"
    echo ""
    return 1
  fi

  # Save to config
  if [[ ! -d "${HOME}/.littledock" ]]; then
    /bin/mkdir -p "${HOME}/.littledock"
  fi
  echo "CLAWDOCK_DIR=\"$CLAWDOCK_DIR\"" > "$CLAWDOCK_CONFIG"
  echo "✅ Saved to $CLAWDOCK_CONFIG"
  echo ""
  return 0
}

# Wrapper to run docker compose commands
_littledock_compose() {
  _littledock_ensure_dir || return 1
  local compose_args=(-f "${CLAWDOCK_DIR}/docker-compose.yml")
  if [[ -f "${CLAWDOCK_DIR}/docker-compose.extra.yml" ]]; then
    compose_args+=(-f "${CLAWDOCK_DIR}/docker-compose.extra.yml")
  fi
  command docker compose "${compose_args[@]}" "$@"
}

_littledock_read_env_token() {
  _littledock_ensure_dir || return 1
  if [[ ! -f "${CLAWDOCK_DIR}/.env" ]]; then
    return 1
  fi
  local raw
  raw=$(sed -n 's/^LITTLEBABY_GATEWAY_TOKEN=//p' "${CLAWDOCK_DIR}/.env" | head -n 1)
  if [[ -z "$raw" ]]; then
    return 1
  fi
  _littledock_trim_quotes "$raw"
}

# Basic Operations
littledock-start() {
  _littledock_compose up -d littlebaby-gateway
}

littledock-stop() {
  _littledock_compose down
}

littledock-restart() {
  _littledock_compose restart littlebaby-gateway
}

littledock-logs() {
  _littledock_compose logs -f littlebaby-gateway
}

littledock-status() {
  _littledock_compose ps
}

# Navigation
littledock-cd() {
  _littledock_ensure_dir || return 1
  cd "${CLAWDOCK_DIR}"
}

littledock-config() {
  cd ~/.littlebaby
}

littledock-show-config() {
  _littledock_ensure_dir >/dev/null 2>&1 || true
  local config_dir="${HOME}/.littlebaby"
  echo -e "${_CLR_BOLD}Config directory:${_CLR_RESET} ${_CLR_CYAN}${config_dir}${_CLR_RESET}"
  echo ""

  # Show littlebaby.json
  if [[ -f "${config_dir}/littlebaby.json" ]]; then
    echo -e "${_CLR_BOLD}${config_dir}/littlebaby.json${_CLR_RESET}"
    echo -e "${_CLR_DIM}$(cat "${config_dir}/littlebaby.json")${_CLR_RESET}"
  else
    echo -e "${_CLR_YELLOW}No littlebaby.json found${_CLR_RESET}"
  fi
  echo ""

  # Show .env (mask secret values)
  if [[ -f "${config_dir}/.env" ]]; then
    echo -e "${_CLR_BOLD}${config_dir}/.env${_CLR_RESET}"
    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      elif [[ "$line" == *=* ]]; then
        local key="${line%%=*}"
        local val="${line#*=}"
        echo -e "${_CLR_CYAN}${key}${_CLR_RESET}=${_CLR_DIM}$(_littledock_mask_value "$val")${_CLR_RESET}"
      else
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      fi
    done < "${config_dir}/.env"
  else
    echo -e "${_CLR_YELLOW}No .env found${_CLR_RESET}"
  fi
  echo ""

  # Show project .env if available
  if [[ -n "$CLAWDOCK_DIR" && -f "${CLAWDOCK_DIR}/.env" ]]; then
    echo -e "${_CLR_BOLD}${CLAWDOCK_DIR}/.env${_CLR_RESET}"
    while IFS= read -r line || [[ -n "$line" ]]; do
      if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "$line" ]]; then
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      elif [[ "$line" == *=* ]]; then
        local key="${line%%=*}"
        local val="${line#*=}"
        echo -e "${_CLR_CYAN}${key}${_CLR_RESET}=${_CLR_DIM}$(_littledock_mask_value "$val")${_CLR_RESET}"
      else
        echo -e "${_CLR_DIM}${line}${_CLR_RESET}"
      fi
    done < "${CLAWDOCK_DIR}/.env"
  fi
  echo ""
}

littledock-workspace() {
  cd ~/.littlebaby/workspace
}

# Container Access
littledock-shell() {
  _littledock_compose exec littlebaby-gateway \
    bash -c 'echo "alias littlebaby=\"./littlebaby.mjs\"" > /tmp/.bashrc_littlebaby && bash --rcfile /tmp/.bashrc_littlebaby'
}

littledock-exec() {
  _littledock_compose exec littlebaby-gateway "$@"
}

littledock-cli() {
  _littledock_compose run --rm littlebaby-cli "$@"
}

# Maintenance
littledock-update() {
  _littledock_ensure_dir || return 1

  echo "🔄 Updating LittleBaby..."

  echo ""
  echo "📥 Pulling latest source..."
  git -C "${CLAWDOCK_DIR}" pull || { echo "❌ git pull failed"; return 1; }

  echo ""
  echo "🔨 Rebuilding Docker image (this may take a few minutes)..."
  _littledock_compose build littlebaby-gateway || { echo "❌ Build failed"; return 1; }

  echo ""
  echo "♻️  Recreating container with new image..."
  _littledock_compose down 2>&1 | _littledock_filter_warnings
  _littledock_compose up -d littlebaby-gateway 2>&1 | _littledock_filter_warnings

  echo ""
  echo "⏳ Waiting for gateway to start..."
  sleep 5

  echo "✅ Update complete!"
  echo -e "   Verify: $(_cmd littledock-cli status)"
}

littledock-rebuild() {
  _littledock_compose build littlebaby-gateway
}

littledock-clean() {
  _littledock_compose down -v --remove-orphans
}

# Health check
littledock-health() {
  _littledock_ensure_dir || return 1
  local token
  token=$(_littledock_read_env_token)
  if [[ -z "$token" ]]; then
    echo "❌ Error: Could not find gateway token"
    echo "   Check: ${CLAWDOCK_DIR}/.env"
    return 1
  fi
  _littledock_compose exec -e "LITTLEBABY_GATEWAY_TOKEN=$token" littlebaby-gateway \
    node dist/index.js health
}

# Show gateway token
littledock-token() {
  _littledock_read_env_token
}

# Fix token configuration (run this once after setup)
littledock-fix-token() {
  _littledock_ensure_dir || return 1

  echo "🔧 Configuring gateway token..."
  local token
  token=$(littledock-token)
  if [[ -z "$token" ]]; then
    echo "❌ Error: Could not find gateway token"
    echo "   Check: ${CLAWDOCK_DIR}/.env"
    return 1
  fi

  echo "📝 Setting token: ${token:0:20}..."

  _littledock_compose exec -e "TOKEN=$token" littlebaby-gateway \
    bash -c './littlebaby.mjs config set gateway.remote.token "$TOKEN" && ./littlebaby.mjs config set gateway.auth.token "$TOKEN"' 2>&1 | _littledock_filter_warnings

  echo "🔍 Verifying token was saved..."
  local saved_token
  saved_token=$(_littledock_compose exec littlebaby-gateway \
    bash -c "./littlebaby.mjs config get gateway.remote.token 2>/dev/null" 2>&1 | _littledock_filter_warnings | tr -d '\r\n' | head -c 64)

  if [[ "$saved_token" == "$token" ]]; then
    echo "✅ Token saved correctly!"
  else
    echo "⚠️  Token mismatch detected"
    echo "   Expected: ${token:0:20}..."
    echo "   Got: ${saved_token:0:20}..."
  fi

  echo "🔄 Restarting gateway..."
  _littledock_compose restart littlebaby-gateway 2>&1 | _littledock_filter_warnings

  echo "⏳ Waiting for gateway to start..."
  sleep 5

  echo "✅ Configuration complete!"
  echo -e "   Try: $(_cmd littledock-devices)"
}

# Open dashboard in browser
littledock-dashboard() {
  _littledock_ensure_dir || return 1

  echo "🦞 Getting dashboard URL..."
  local output exit_status url
  output=$(_littledock_compose run --rm littlebaby-cli dashboard --no-open 2>&1)
  exit_status=$?
  url=$(printf "%s\n" "$output" | _littledock_filter_warnings | grep -o 'http[s]\?://[^[:space:]]*' | head -n 1)
  if [[ $exit_status -ne 0 ]]; then
    echo "❌ Failed to get dashboard URL"
    echo -e "   Try restarting: $(_cmd littledock-restart)"
    return 1
  fi

  if [[ -n "$url" ]]; then
    echo -e "✅ Opening: ${_CLR_CYAN}${url}${_CLR_RESET}"
    open "$url" 2>/dev/null || xdg-open "$url" 2>/dev/null || echo -e "   Please open manually: ${_CLR_CYAN}${url}${_CLR_RESET}"
    echo ""
    echo -e "${_CLR_CYAN}💡 If you see ${_CLR_RED}'pairing required'${_CLR_CYAN} error:${_CLR_RESET}"
    echo -e "   1. Run: $(_cmd littledock-devices)"
    echo "   2. Copy the Request ID from the Pending table"
    echo -e "   3. Run: $(_cmd 'littledock-approve <request-id>')"
  else
    echo "❌ Failed to get dashboard URL"
    echo -e "   Try restarting: $(_cmd littledock-restart)"
  fi
}

# List device pairings
littledock-devices() {
  _littledock_ensure_dir || return 1

  echo "🔍 Checking device pairings..."
  local output exit_status
  output=$(_littledock_compose exec littlebaby-gateway node dist/index.js devices list 2>&1)
  exit_status=$?
  printf "%s\n" "$output" | _littledock_filter_warnings
  if [ $exit_status -ne 0 ]; then
    echo ""
    echo -e "${_CLR_CYAN}💡 If you see token errors above:${_CLR_RESET}"
    echo -e "   1. Verify token is set: $(_cmd littledock-token)"
    echo -e "   2. Try fixing the token automatically: $(_cmd littledock-fix-token)"
    echo "   3. If you still see errors, try manual config inside container:"
    echo -e "      $(_cmd littledock-shell)"
    echo -e "      $(_cmd 'littlebaby config get gateway.remote.token')"
    return 1
  fi

  echo ""
  echo -e "${_CLR_CYAN}💡 To approve a pairing request:${_CLR_RESET}"
  echo -e "   $(_cmd 'littledock-approve <request-id>')"
}

# Approve device pairing request
littledock-approve() {
  _littledock_ensure_dir || return 1

  if [[ -z "$1" ]]; then
    echo -e "❌ Usage: $(_cmd 'littledock-approve <request-id>')"
    echo ""
    echo -e "${_CLR_CYAN}💡 How to approve a device:${_CLR_RESET}"
    echo -e "   1. Run: $(_cmd littledock-devices)"
    echo "   2. Find the Request ID in the Pending table (long UUID)"
    echo -e "   3. Run: $(_cmd 'littledock-approve <that-request-id>')"
    echo ""
    echo "Example:"
    echo -e "   $(_cmd 'littledock-approve 6f9db1bd-a1cc-4d3f-b643-2c195262464e')"
    return 1
  fi

  echo "✅ Approving device: $1"
  _littledock_compose exec littlebaby-gateway \
    node dist/index.js devices approve "$1" 2>&1 | _littledock_filter_warnings

  echo ""
  echo "✅ Device approved! Refresh your browser."
}

# Show all available littledock helper commands
littledock-help() {
  echo -e "\n${_CLR_BOLD}${_CLR_CYAN}🦞 LittleDock - Docker Helpers for LittleBaby${_CLR_RESET}\n"

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}⚡ Basic Operations${_CLR_RESET}"
  echo -e "  $(_cmd littledock-start)       ${_CLR_DIM}Start the gateway${_CLR_RESET}"
  echo -e "  $(_cmd littledock-stop)        ${_CLR_DIM}Stop the gateway${_CLR_RESET}"
  echo -e "  $(_cmd littledock-restart)     ${_CLR_DIM}Restart the gateway${_CLR_RESET}"
  echo -e "  $(_cmd littledock-status)      ${_CLR_DIM}Check container status${_CLR_RESET}"
  echo -e "  $(_cmd littledock-logs)        ${_CLR_DIM}View live logs (follows)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🐚 Container Access${_CLR_RESET}"
  echo -e "  $(_cmd littledock-shell)       ${_CLR_DIM}Shell into container (littlebaby alias ready)${_CLR_RESET}"
  echo -e "  $(_cmd littledock-cli)         ${_CLR_DIM}Run CLI commands (e.g., littledock-cli status)${_CLR_RESET}"
  echo -e "  $(_cmd littledock-exec) ${_CLR_CYAN}<cmd>${_CLR_RESET}  ${_CLR_DIM}Execute command in gateway container${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🌐 Web UI & Devices${_CLR_RESET}"
  echo -e "  $(_cmd littledock-dashboard)   ${_CLR_DIM}Open web UI in browser ${_CLR_CYAN}(auto-guides you)${_CLR_RESET}"
  echo -e "  $(_cmd littledock-devices)     ${_CLR_DIM}List device pairings ${_CLR_CYAN}(auto-guides you)${_CLR_RESET}"
  echo -e "  $(_cmd littledock-approve) ${_CLR_CYAN}<id>${_CLR_RESET} ${_CLR_DIM}Approve device pairing ${_CLR_CYAN}(with examples)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}⚙️  Setup & Configuration${_CLR_RESET}"
  echo -e "  $(_cmd littledock-fix-token)   ${_CLR_DIM}Configure gateway token ${_CLR_CYAN}(run once)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🔧 Maintenance${_CLR_RESET}"
  echo -e "  $(_cmd littledock-update)      ${_CLR_DIM}Pull, rebuild, and restart ${_CLR_CYAN}(one-command update)${_CLR_RESET}"
  echo -e "  $(_cmd littledock-rebuild)     ${_CLR_DIM}Rebuild Docker image only${_CLR_RESET}"
  echo -e "  $(_cmd littledock-clean)       ${_CLR_RED}⚠️  Remove containers & volumes (nuclear)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🛠️  Utilities${_CLR_RESET}"
  echo -e "  $(_cmd littledock-health)      ${_CLR_DIM}Run health check${_CLR_RESET}"
  echo -e "  $(_cmd littledock-token)       ${_CLR_DIM}Show gateway auth token${_CLR_RESET}"
  echo -e "  $(_cmd littledock-cd)          ${_CLR_DIM}Jump to littlebaby project directory${_CLR_RESET}"
  echo -e "  $(_cmd littledock-config)      ${_CLR_DIM}Open config directory (~/.littlebaby)${_CLR_RESET}"
  echo -e "  $(_cmd littledock-show-config) ${_CLR_DIM}Print config files with redacted values${_CLR_RESET}"
  echo -e "  $(_cmd littledock-workspace)   ${_CLR_DIM}Open workspace directory${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${_CLR_RESET}"
  echo -e "${_CLR_BOLD}${_CLR_GREEN}🚀 First Time Setup${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  1.${_CLR_RESET} $(_cmd littledock-start)          ${_CLR_DIM}# Start the gateway${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  2.${_CLR_RESET} $(_cmd littledock-fix-token)      ${_CLR_DIM}# Configure token${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  3.${_CLR_RESET} $(_cmd littledock-dashboard)      ${_CLR_DIM}# Open web UI${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  4.${_CLR_RESET} $(_cmd littledock-devices)        ${_CLR_DIM}# If pairing needed${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  5.${_CLR_RESET} $(_cmd littledock-approve) ${_CLR_CYAN}<id>${_CLR_RESET}   ${_CLR_DIM}# Approve pairing${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_GREEN}💬 WhatsApp Setup${_CLR_RESET}"
  echo -e "  $(_cmd littledock-shell)"
  echo -e "    ${_CLR_BLUE}>${_CLR_RESET} $(_cmd 'littlebaby channels login --channel whatsapp')"
  echo -e "    ${_CLR_BLUE}>${_CLR_RESET} $(_cmd 'littlebaby status')"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_CYAN}💡 All commands guide you through next steps!${_CLR_RESET}"
  echo -e "${_CLR_BLUE}📚 Docs: ${_CLR_RESET}${_CLR_CYAN}https://docs.littlebaby.ai${_CLR_RESET}"
  echo ""
}
