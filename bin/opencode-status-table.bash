#!/bin/bash
# opencode-status-table - Display status in formatted table

JSON=$(~/.config/opencode/bin/opencode-status.bash)

# Define column widths
NAME_WIDTH=15
INSTALLED_WIDTH=12
STATUS_WIDTH=20
TABLE_WIDTH=$((${NAME_WIDTH} + ${INSTALLED_WIDTH} + ${STATUS_WIDTH} + 8))

echo "╔$(printf '═%.0s' $(seq 1 $TABLE_WIDTH))╗"
echo "║$(printf ' %.0s' $(seq 1 $((($TABLE_WIDTH - 24) / 2))))OPENCODE SYSTEM STATUS$(printf ' %.0s' $(seq 1 $((($TABLE_WIDTH - 24) / 2))))║"
echo "╠$(printf '═%.0s' $(seq 1 $TABLE_WIDTH))╣"
echo "║ TOOLS$(printf ' %.0s' $(seq 1 $((TABLE_WIDTH - 7))))║"
echo "║ ────────────── ──────────── ───────────────────── ║"
printf "║ %-15s  %-12s  %-20s ║\n" "Tool" "Installed" "Initialized"
echo "║ ────────────── ──────────── ───────────────────── ║"

echo "$JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
tools = data['tools']
for name, info in tools.items():
    installed = info['installed']
    initialized = info['initialized']
    print(f'║ {name:<15}  {installed:^12}  {initialized:^20} ║')
"

echo "╠$(printf '═%.0s' $(seq 1 $TABLE_WIDTH))╣"
echo "║ SERVICES$(printf ' %.0s' $(seq 1 $((TABLE_WIDTH - 10))))║"
echo "║ ────────────── ──────────── ───────────────────── ║"
printf "║ %-15s  %-12s  %-20s ║\n" "Service" "Installed" "Status"
echo "║ ────────────── ──────────── ───────────────────── ║"

echo "$JSON" | python3 -c "
import json, sys
data = json.load(sys.stdin)
services = data['services']
for name, info in services.items():
    installed = info['installed']
    status = info['status']
    print(f'║ {name:<15}  {installed:^12}  {status:^20} ║')
"

echo "╚$(printf '═%.0s' $(seq 1 $TABLE_WIDTH))╝"
