#!/bin/bash
# Pull real-time GitHub traffic for agentsid-scanner
# Usage: ./scripts/gh-traffic.sh

REPO="AgentsID-dev/agentsid-scanner"

echo "📊 AgentsID Scanner — GitHub Traffic"
echo "══════════════════════════════════════"

# Views
VIEWS=$(gh api repos/$REPO/traffic/views)
TOTAL_VIEWS=$(echo $VIEWS | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['count'])")
UNIQUE_VIEWS=$(echo $VIEWS | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['uniques'])")
echo "👁  Views (14d):   $TOTAL_VIEWS total · $UNIQUE_VIEWS unique"

# Clones
CLONES=$(gh api repos/$REPO/traffic/clones)
TOTAL_CLONES=$(echo $CLONES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['count'])")
UNIQUE_CLONES=$(echo $CLONES | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['uniques'])")
echo "📦 Clones (14d):  $TOTAL_CLONES total · $UNIQUE_CLONES unique"

# npm downloads
NPM=$(curl -s "https://api.npmjs.org/downloads/point/last-week/@agentsid/scanner")
NPM_DL=$(echo $NPM | python3 -c "import sys,json; print(json.load(sys.stdin)['downloads'])")
echo "⬇️  npm (7d):      $NPM_DL downloads"

echo ""
echo "🔗 Top Referrers"
echo "──────────────────────────────────────"
gh api repos/$REPO/traffic/popular/referrers | python3 -c "
import sys, json
refs = json.load(sys.stdin)
for r in refs:
    print(f\"  {r['referrer']:<35} {r['uniques']} unique\")
"

echo ""
echo "📄 Top Content"
echo "──────────────────────────────────────"
gh api repos/$REPO/traffic/popular/paths | python3 -c "
import sys, json
paths = json.load(sys.stdin)
for p in paths[:5]:
    title = p['path'].split('/')[-1][:40]
    print(f\"  {title:<42} {p['uniques']} unique\")
"

echo ""
echo "Updated: $(date '+%Y-%m-%d %H:%M:%S')"
