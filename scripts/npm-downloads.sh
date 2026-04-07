#!/bin/bash
# Track npm download stats for AgentsID packages
# Usage: ./scripts/npm-downloads.sh [--daily]
#
# Packages tracked:
#   @agentsid/scanner       — core scanner library
#   @agentsid/mcp-scanner   — MCP server wrapper

PACKAGES=("@agentsid/scanner" "@agentsid/mcp-scanner" "@agentsid/sdk" "@agentsid/proxy")

echo "AgentsID — npm Download Tracker"
echo "================================"
echo ""

for PKG in "${PACKAGES[@]}"; do
  echo "Package: $PKG"
  echo "--------------------------------"

  LAST_DAY=$(curl -s "https://api.npmjs.org/downloads/point/last-day/$PKG" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).downloads||0))")
  LAST_WEEK=$(curl -s "https://api.npmjs.org/downloads/point/last-week/$PKG" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).downloads||0))")
  LAST_MONTH=$(curl -s "https://api.npmjs.org/downloads/point/last-month/$PKG" | node -e "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).downloads||0))")

  echo "  Last 24h:  $LAST_DAY"
  echo "  Last 7d:   $LAST_WEEK"
  echo "  Last 30d:  $LAST_MONTH"

  if [[ "$1" == "--daily" ]]; then
    TODAY=$(date -u '+%Y-%m-%d')
    WEEK_AGO=$(date -u -d '7 days ago' '+%Y-%m-%d' 2>/dev/null || date -u -v-7d '+%Y-%m-%d' 2>/dev/null)
    echo "  Daily breakdown ($WEEK_AGO to $TODAY):"
    curl -s "https://api.npmjs.org/downloads/range/$WEEK_AGO:$TODAY/$PKG" | node -e "
      let d='';
      process.stdin.on('data',c=>d+=c);
      process.stdin.on('end',()=>{
        const data=JSON.parse(d);
        for(const e of data.downloads||[]){
          const bar=e.downloads>0?'#'.repeat(Math.max(1,Math.floor(e.downloads/5))):'-';
          console.log('    '+e.day+'  '+String(e.downloads).padStart(6)+'  '+bar);
        }
      });
    "
  fi

  echo ""
done

echo "Updated: $(date '+%Y-%m-%d %H:%M:%S')"
