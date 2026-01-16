#!/bin/bash
# opencode-status - Deterministic status checks for tools and services

set -e

# Count installed tools
TOOLS_INSTALLED=0

# ===== TOOLS =====
echo "{"
echo '  "tools": {'

# cass_memory
if command -v cm >/dev/null 2>&1; then
    CASS_INSTALLED="yes"
    CASS_INIT="yes"
    ((TOOLS_INSTALLED++))
else
    CASS_INSTALLED="no"
    CASS_INIT="no"
fi

# bd (Beads CLI)
if command -v bd >/dev/null 2>&1; then
    BD_INSTALLED="yes"
    BD_INIT="yes"
    ((TOOLS_INSTALLED++))
else
    BD_INSTALLED="no"
    BD_INIT="no"
fi

# bv (Beads Viewer)
if command -v bv >/dev/null 2>&1; then
    BV_INSTALLED="yes"
    ((TOOLS_INSTALLED++))
else
    BV_INSTALLED="no"
fi

# Biome
if command -v biome >/dev/null 2>&1; then
    BIOME_INSTALLED="yes"
    ((TOOLS_INSTALLED++))
else
    BIOME_INSTALLED="no"
fi

# Prettier
if command -v prettier >/dev/null 2>&1; then
    PRETTIER_INSTALLED="yes"
    ((TOOLS_INSTALLED++))
else
    PRETTIER_INSTALLED="no"
fi

# osgrep
if command -v osgrep >/dev/null 2>&1; then
    OSGREP_INSTALLED="yes"
    ((TOOLS_INSTALLED++))
else
    OSGREP_INSTALLED="no"
fi

# UBS
if command -v ubs >/dev/null 2>&1; then
    UBS_INSTALLED="yes"
    ((TOOLS_INSTALLED++))
else
    UBS_INSTALLED="no"
fi

# PM2
if command -v pm2 >/dev/null 2>&1; then
    PM2_INSTALLED="yes"
    ((TOOLS_INSTALLED++))
else
    PM2_INSTALLED="no"
fi

# TLDR (tool, not daemon)
if command -v tldr >/dev/null 2>&1; then
    TLDR_INSTALLED="yes"
    ((TOOLS_INSTALLED++))
else
    TLDR_INSTALLED="no"
fi

TLDR_INIT="no"
if [ -d ~/.config/opencode/.tldr ]; then
    TLDR_INIT="yes"
fi

echo "    \"cass_memory\": {\"installed\": \"$CASS_INSTALLED\", \"initialized\": \"$CASS_INIT\"},"
echo "    \"bd\": {\"installed\": \"$BD_INSTALLED\", \"initialized\": \"$BD_INIT\"},"
echo "    \"bv\": {\"installed\": \"$BV_INSTALLED\", \"initialized\": \"-\"},"
echo "    \"biome\": {\"installed\": \"$BIOME_INSTALLED\", \"initialized\": \"-\"},"
echo "    \"prettier\": {\"installed\": \"$PRETTIER_INSTALLED\", \"initialized\": \"-\"},"
echo "    \"osgrep\": {\"installed\": \"$OSGREP_INSTALLED\", \"initialized\": \"-\"},"
echo "    \"ubs\": {\"installed\": \"$UBS_INSTALLED\", \"initialized\": \"-\"},"
echo "    \"pm2\": {\"installed\": \"$PM2_INSTALLED\", \"initialized\": \"-\"},"
echo "    \"tldr\": {\"installed\": \"$TLDR_INSTALLED\", \"initialized\": \"$TLDR_INIT\"}"
echo "  },"

# ===== SERVICES =====
echo '  "services": {'
SERVICES_RUNNING=0

# TLDR Daemon
TLDR_DAEMON_STATUS="unknown"
TLDR_DAEMON_OUTPUT=$(timeout 5 tldr daemon status 2>&1 || echo "Command failed")
if echo "$TLDR_DAEMON_OUTPUT" | grep -qi "^Status.*ready"; then
    TLDR_DAEMON_STATUS="running"
    TLDR_DAEMON_INSTALLED="yes"
    ((SERVICES_RUNNING++))
elif echo "$TLDR_DAEMON_OUTPUT" | grep -qi "not running\|daemon not running"; then
    TLDR_DAEMON_STATUS="stopped"
    TLDR_DAEMON_INSTALLED="yes"
else
    TLDR_DAEMON_STATUS="unknown"
    TLDR_DAEMON_INSTALLED="yes"
fi

# GPTCache
GPTCACHE_STATUS="stopped"
GPTCACHE_INSTALLED="no"
if lsof -i :8000 2>/dev/null | grep -q "LISTEN"; then
    GPTCACHE_HTTP=$(curl -s --connect-timeout 2 http://localhost:8000/ 2>/dev/null || echo "")
    if echo "$GPTCACHE_HTTP" | grep -qi "gptcache\|hello"; then
        GPTCACHE_STATUS="running"
        GPTCACHE_INSTALLED="yes"
        ((SERVICES_RUNNING++))
    fi
fi

# cass_memory service - Use health check
CASS_SERVICE_STATUS="stopped"
if cass health 2>&1 | grep -qi "Healthy"; then
    CASS_SERVICE_STATUS="running"
    ((SERVICES_RUNNING++))
fi

echo "    \"tldr_daemon\": {\"installed\": \"$TLDR_DAEMON_INSTALLED\", \"status\": \"$TLDR_DAEMON_STATUS\"},"
echo "    \"gptcache\": {\"installed\": \"$GPTCACHE_INSTALLED\", \"status\": \"$GPTCACHE_STATUS\"},"
echo "    \"cass_memory\": {\"installed\": \"yes\", \"status\": \"$CASS_SERVICE_STATUS\"}"
echo "  },"

# ===== SUMMARY =====
echo '  "summary": {'
echo "    \"tools_total\": 9,"
echo "    \"tools_installed\": $TOOLS_INSTALLED,"
echo "    \"services_total\": 3,"
echo "    \"services_running\": $SERVICES_RUNNING"
echo "  }"
echo "}"
