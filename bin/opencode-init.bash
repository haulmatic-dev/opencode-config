#!/bin/bash
# opencode-init - System-wide setup for opencode
# Outputs structured JSON for opencode to display

set -e

STATUS_ONLY=false
for arg in "$@"; do
  case $arg in
    --status-only)
      STATUS_ONLY=true
      shift
      ;;
  esac
done

has_tool() {
  command -v "$1" &>/dev/null && return 0
  [ -f "$HOME/.local/bin/$1" ] && return 0
  [ -f "$HOME/.nodenv/versions/22.20.0/bin/$1" ] && return 0
  [ -f "/opt/homebrew/bin/$1" ] && return 0
  [ -f "$HOME/.cargo/bin/$1" ] && return 0
  return 1
}

is_initialized() {
  case "$1" in
    cm)
      [ -d ".cass" ] && return 0 || return 1
      ;;
    bd)
      [ -d ".beads" ] && return 0 || return 1
      ;;
    tldr)
      [ -d ".tldr" ] && return 0 || return 1
      ;;
    *)
      return 0
      ;;
  esac
}

is_running() {
  case "$1" in
    tldr)
      [ $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null) = "200" ] && return 0 || return 1
      ;;
    gptcache)
      [ $(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/cache_status 2>/dev/null) = "200" ] && return 0 || return 1
      ;;
    cm|cass)
      [ $(pgrep -f "cass" 2>/dev/null) ] && return 0 || return 1
      ;;
    *)
      return 1
      ;;
  esac
}

echo "{"
echo '  "tools": ['

tools=(
  "cm:cass_memory"
  "biome:Biome"
  "prettier:Prettier"
  "bd:bd (Beads CLI)"
  "bv:bv (Beads Viewer)"
  "osgrep:osgrep"
  "ubs:UBS"
  "pm2:PM2"
)

first=true
for item in "${tools[@]}"; do
  IFS=':' read -r cmd name <<< "$item"
  installed="no"
  initialized="-"

  if has_tool "$cmd"; then
    installed="yes"
    if [ "$cmd" = "cm" ] || [ "$cmd" = "bd" ] || [ "$cmd" = "tldr" ]; then
      if is_initialized "$cmd"; then
        initialized="yes"
      else
        initialized="no"
      fi
    fi
  fi

  [ "$first" = true ] && first=false || echo ","
  printf '    {"name": "%s", "installed": "%s", "running": "-", "initialized": "%s"}' "$name" "$installed" "$initialized"
done

echo ""
echo '  ],'
echo '  "services": ['

services=(
  "tldr:TLDR daemon"
  "gptcache:GPTCache"
  "cm:cass_memory"
)

first=true
for item in "${services[@]}"; do
  IFS=':' read -r cmd name <<< "$item"
  installed="no"
  running="no"

  if has_tool "$cmd"; then
    installed="yes"
    if is_running "$cmd"; then
      running="yes"
    else
      running="no"
    fi
  fi

  [ "$first" = true ] && first=false || echo ","
  printf '    {"name": "%s", "installed": "%s", "running": "%s"}' "$name" "$installed" "$running"
done

echo ""
echo '  ]'
echo "}"
