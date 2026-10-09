#!/usr/bin/env python3
"""fixture 経由で保存データを復元し、PDFのページ数と復元内容を確認する。"""
import pathlib
import re
import shutil
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
URL = (ROOT / "tests" / "print-fixture.html").as_uri()
PDF = ROOT / "dist" / "test-print.pdf"
PROFILE = ROOT / "dist" / ".chrome-test"
EXPECTED_PAGES = 3  # 仕様2件（規格未選択の仕様は除外）＋事前確認


def chrome(*args):
    flags = ["--headless=new", "--disable-gpu", "--allow-file-access-from-files",
             "--virtual-time-budget=5000", f"--user-data-dir={PROFILE}"]
    try:
        return subprocess.run([CHROME, *flags, *args, URL], capture_output=True, timeout=60).stdout
    except subprocess.TimeoutExpired as e:
        return e.stdout or b""


shutil.rmtree(PROFILE, ignore_errors=True)
PDF.unlink(missing_ok=True)
chrome(f"--print-to-pdf={PDF}", "--no-pdf-header-footer")
pages = len(re.findall(rb"/Type\s*/Page[^s]", PDF.read_bytes())) if PDF.exists() else 0
dom = chrome("--dump-dom").decode("utf-8", "replace")
restored = "テスト復元商事" in dom
shutil.rmtree(PROFILE, ignore_errors=True)
print(f"pages={pages} (expected {EXPECTED_PAGES}) restored={restored}")
sys.exit(0 if pages == EXPECTED_PAGES and restored else 1)
