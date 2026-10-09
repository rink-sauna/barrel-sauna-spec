#!/bin/bash
# ヘッドレス Chrome で tests/tests.html を実行し、失敗があれば exit 1
cd "$(dirname "$0")/.." || exit 1
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
DOM=$("$CHROME" --headless=new --disable-gpu --allow-file-access-from-files \
  --virtual-time-budget=5000 --dump-dom "file://$(pwd)/tests/tests.html" 2>/dev/null)
RESULT=$(printf '%s' "$DOM" | python3 -c '
import sys, re, html
m = re.search(r"<pre id=\"result\">(.*?)</pre>", sys.stdin.read(), re.S)
print(html.unescape(m.group(1)) if m else "")
')
echo "$RESULT"
FIRST=$(printf '%s\n' "$RESULT" | head -1)
if [[ "$FIRST" =~ ^PASS:\ [0-9]+\ FAIL:\ 0$ ]]; then exit 0; fi
exit 1
