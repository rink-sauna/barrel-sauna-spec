#!/usr/bin/env python3
"""src/ の CSS・JS とロゴを1つのHTMLにまとめ、dist/ に出力する。"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"
LOGO = ROOT / "assets" / "rink-sauna-logo-800.png"
OUT = ROOT / "dist" / "バレルサウナ仕様確認書.html"
INDEX_REDIRECT = """<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=./バレルサウナ仕様確認書.html">
<title>バレルサウナ仕様確認書</title>
</head>
<body><a href="./バレルサウナ仕様確認書.html">バレルサウナ仕様確認書</a></body>
</html>
"""


def main() -> int:
    html = (SRC / "index.template.html").read_text(encoding="utf-8")

    def inline(match: re.Match) -> str:
        path = SRC / match.group(1)
        if not path.exists():
            print(f"missing source: {path}", file=sys.stderr)
            sys.exit(1)
        return path.read_text(encoding="utf-8")

    html = re.sub(r"/\*INLINE:([\w.-]+)\*/", inline, html)
    logo = base64.b64encode(LOGO.read_bytes()).decode("ascii")
    html = html.replace("{{LOGO_DATA_URI}}", "data:image/png;base64," + logo)

    if "INLINE:" in html or "{{LOGO" in html:
        print("unreplaced marker remains", file=sys.stderr)
        return 1

    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(html, encoding="utf-8")
    # 公開時にサイトの直下（/）を開いた人を本体へ案内する
    (OUT.parent / "index.html").write_text(INDEX_REDIRECT, encoding="utf-8")
    print(f"built {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
