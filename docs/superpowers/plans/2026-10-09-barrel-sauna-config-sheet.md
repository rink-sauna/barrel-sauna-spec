# バレルサウナ構成確認書アプリ Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 商談中に画面共有しながら最大5仕様を入力し、A4縦の「バレルサウナ構成確認書」をブラウザ印刷でPDF保存できる単一HTMLファイルを作る。

**Architecture:** ソースは責務ごとの素の JavaScript ファイル（ES modules不使用・グローバル関数、`file://` で動かすため）に分け、`build.py` が CSS/JS/ロゴ(Base64) を1つのHTMLにインライン化して `dist/` に出力する。状態ロジックとプレビューHTML生成は DOM 非依存の純粋関数にし、ヘッドレス Chrome で開くテストページで検証する。

**Tech Stack:** HTML / CSS / Vanilla JavaScript（外部ライブラリなし）、Python 3 標準ライブラリ（ビルド）、Google Chrome ヘッドレス（テスト実行・PDF確認）、macOS `sips`（ロゴ縮小）

**Spec:** `docs/superpowers/specs/2026-10-09-barrel-sauna-config-sheet-design.md`

## Global Constraints

- 成果物は単一HTMLファイル `dist/バレルサウナ構成確認書.html`。外部通信・外部ライブラリ・サーバーなしでオフライン動作
- 対象ブラウザ：Google Chrome 最新版
- 金額は一切扱わない
- PDF は `window.print()` ＋ `@page { size: A4 portrait; margin: 15mm; }`
- 仕様は最大5（`MAX_SPECS = 5`）、番号表記は ①②③④⑤、最後の1仕様は削除不可
- 選択肢の文言は spec §3.3 / §3.4 の表記をそのまま使う（R275 は「i – barrel Medium-Long R275（軒あり）」、直径変更は「直径変更 1,800mm→2,050mm」）
- 未選択・未入力は PDF/プレビューで「—」
- 配色：茶 `#4B2721`、金 `#C9A80A`、緑 `#5FBF62`。PDF本文は白背景・黒文字
- 自社HP（https://rink-sauna.com/）のトーンに合わせ、見出し・表題は明朝体（`"Hiragino Mincho ProN", "Yu Mincho", serif`）、本文・フォームはゴシック体（`"Hiragino Sans", "Yu Gothic", sans-serif`）。Webフォントは読み込まない
- 画面本文 16px 以上
- ユーザー入力は必ず HTML エスケープして出力する

## Review Focus

1. **壊れた/古い保存データ**（JSON不正、項目欠落、選択肢から消えた値）→ クラッシュせず該当値を未選択として復元（Task 2 `sanitizeState` テスト）
2. **アクティブタブより前のタブ削除・アクティブタブ自身の削除** → `activeIndex` が常に有効範囲を指す（Task 2 テスト）
3. **自由記載に改行・`<` `&` を含む長文** → エスケープされ改行が保持され、A4幅で折り返す（Task 3 テスト＋Task 5 目視）
4. **熱源を「その他」から別の値に変更** → 「その他の内容」は消え、PDFに出ない（Task 2 テスト）
5. **配送先を「配送なし」→都道府県に戻す** → 配送方法は空のまま再選択可能（Task 2 テスト、Task 4 目視）

---

## File Structure

| ファイル | 責務 |
|---|---|
| `src/options.js` | 選択肢定義 `OPTIONS`・`PREFECTURES`・`PRECHECKS`・項目メタ `SPEC_FIELDS` |
| `src/state.js` | 状態の生成・更新・検証（純粋関数） |
| `src/preview.js` | 状態 → A4ページ群のHTML文字列（純粋関数） |
| `src/storage.js` | localStorage 読み書き（try/catch） |
| `src/app.js` | DOM 構築・イベント・再描画・印刷 |
| `src/style.css` | 画面用＋印刷用CSS |
| `src/index.template.html` | インライン化マーカー入りの雛形 |
| `assets/rink-sauna-logo.png` | 元ロゴ（取込済） / `assets/rink-sauna-logo-800.png` 縮小版 |
| `build.py` | 雛形にCSS/JS/ロゴを埋め込み `dist/` へ出力 |
| `tests/tests.html`, `tests/test-lib.js`, `tests/state.test.js`, `tests/preview.test.js` | ブラウザテスト |
| `tests/run.sh` | ヘッドレスChromeでテスト実行、失敗時 exit 1 |

---

### Task 1: 雛形・ビルド・テスト基盤

**Files:**
- Create: `build.py`, `src/index.template.html`, `src/style.css`（空でよい）, `src/app.js`（空でよい）, `tests/tests.html`, `tests/test-lib.js`, `tests/smoke.test.js`, `tests/run.sh`, `assets/rink-sauna-logo-800.png`, `.gitignore`（`dist/`）

**Interfaces:**
- Produces:
  - テストAPI（グローバル）：`test(name: string, fn: () => void)`、`assertEqual(actual, expected, msg?)`（`JSON.stringify` 比較）、`assertTrue(cond, msg?)`
  - `tests/tests.html` は `../src/options.js`, `../src/state.js`, `../src/preview.js`, `test-lib.js`, `*.test.js` を順に読み、全実行後 `<pre id="result">` に1行目 `PASS: <n> FAIL: <m>`、続けて失敗名とメッセージを書く。存在しないsrcファイルは読み込み失敗しても続行
  - `tests/run.sh`：`"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --allow-file-access-from-files --virtual-time-budget=5000 --dump-dom "file://$(pwd)/tests/tests.html"` の出力から `PASS: n FAIL: m` 行と失敗詳細を表示し、`FAIL: 0` 以外または結果行なしで exit 1
  - `build.py`：`src/index.template.html` 内の `/*INLINE:style.css*/`（`<style>` 内）、`/*INLINE:options.js*/` `/*INLINE:state.js*/` `/*INLINE:preview.js*/` `/*INLINE:storage.js*/` `/*INLINE:app.js*/`（`<script>` 内）を該当ファイル内容で、`{{LOGO_DATA_URI}}` を `data:image/png;base64,...`（`assets/rink-sauna-logo-800.png`）で置換し `dist/バレルサウナ構成確認書.html` を書く。未置換マーカーが残れば exit 1

- [ ] **Step 1:** `git init`、`.gitignore` に `dist/` を書く
- [ ] **Step 2:** ロゴ縮小：`sips -Z 800 assets/rink-sauna-logo.png --out assets/rink-sauna-logo-800.png` → 800×285 前後のPNGができること
- [ ] **Step 3:** テスト基盤と `tests/smoke.test.js`（`test('harness works', () => assertEqual(1 + 1, 2))`）を作成
- [ ] **Step 4:** `bash tests/run.sh` → `PASS: 1 FAIL: 0`、exit 0
- [ ] **Step 5:** 一時的に smoke テストを `assertEqual(1, 2)` にして `bash tests/run.sh` → exit 1 と失敗名表示を確認し、元に戻す
- [ ] **Step 6:** 雛形（`<!doctype html>`, `lang="ja"`, `<title>バレルサウナ構成確認書</title>`, `<div id="app"></div>`, マーカー）と `build.py` を作成。`python3 build.py` → `dist/バレルサウナ構成確認書.html` が生成され、`grep -c "INLINE:\|{{LOGO" dist/*.html` が 0
- [ ] **Step 7:** Commit `chore: scaffold build and browser test harness`

---

### Task 2: 選択肢定義と状態ロジック

**Files:**
- Create: `src/options.js`, `src/state.js`, `tests/state.test.js`

**Interfaces:**
- Produces（`src/options.js`）：
  - `OPTIONS` オブジェクト。キーと値（文字列配列）は spec §3.3 の表どおり：`model`, `specChanges`, `roof`, `paint`, `coldBath`, `windows`, `assembly`, `heater`, `electrical`, `deliveryMethod`, `products`
  - `PREFECTURES: string[]`（北海道〜沖縄の47、JISコード順）、`NO_DELIVERY = '配送なし'`、`HEATER_OTHER = 'その他'`
  - `MODEL_FEATURES: { [modelLabel]: string[] }` — Medium系 `['軒']`、Large系 `['軒','前室']`、他 `[]`
  - `PRECHECKS: {id, title, text}[]` — id は `electrical`, `secondary`, `foundation`, `delivery`, `commercial`。title/text は spec §3.4 の文言
  - `SPEC_FIELDS: {key, label, type}[]` — 表示順の項目メタ。type は `'text' | 'textarea' | 'single' | 'multi' | 'prefecture'`。label は spec §3.3 の項目名（`heaterOther` の label は「熱源（その他の内容）」）
- Produces（`src/state.js`）：
  - `MAX_SPECS = 5`
  - `createSpec(): Spec` — `{name:'', model:'', specChanges:[], specNote:'', roof:'', paint:'', coldBath:'', windows:[], assembly:'', heater:'', heaterOther:'', electrical:'', destination:'', deliveryMethod:'', products:[]}`
  - `toISODate(d: Date): string`（ローカル日付 `YYYY-MM-DD`）
  - `createState(today: Date): State` — `{date, customerName:'', contactName:'', specs:[createSpec()], activeIndex:0, checks:{electrical:'',secondary:'',foundation:'',delivery:'',commercial:''}}`（checks 値は `'' | 'はい' | 'いいえ'`）
  - `addSpec(s): State`、`duplicateSpec(s, i): State`（末尾に深いコピーを追加し active に）、`removeSpec(s, i): State`、`setActive(s, i): State`、`updateSpec(s, i, patch): State`、`updateRoot(s, patch): State`、`setCheck(s, id, value): State`
  - `printableSpecs(s): {number: number, spec: Spec}[]` — `model` が空でない仕様のみ、`number` はタブ番号（1始まり）
  - `sanitizeState(raw: unknown, today: Date): State`
  - `specNumberLabel(n: number): string`（1→'①' … 5→'⑤'）、`formatDateJa(iso: string): string`（`'2026-10-09'`→`'2026年10月9日'`、空/不正→`'—'`）
  - 全更新関数は入力を変更せず新しいオブジェクトを返す

- [ ] **Step 1: 失敗するテストを書く**（`tests/state.test.js`）

```js
const T = new Date(2026, 9, 9);
test('createState: 当日・仕様1つ', () => { const s = createState(T); assertEqual(s.date, '2026-10-09'); assertEqual(s.specs.length, 1); assertEqual(s.activeIndex, 0); });
test('addSpec: 5で頭打ち・新タブがactive', () => { let s = createState(T); for (let k = 0; k < 6; k++) s = addSpec(s); assertEqual(s.specs.length, 5); assertEqual(s.activeIndex, 4); });
test('duplicateSpec: 深いコピー', () => { let s = updateSpec(createState(T), 0, {name:'A', windows:['x']}); s = duplicateSpec(s, 0); assertEqual(s.specs[1].name, 'A'); s.specs[1].windows.push('y'); assertEqual(s.specs[0].windows, ['x']); assertEqual(s.activeIndex, 1); });
test('duplicateSpec: 5つ時は無変化', () => { let s = createState(T); for (let k = 0; k < 4; k++) s = addSpec(s); assertEqual(duplicateSpec(s, 0).specs.length, 5); });
test('removeSpec: 最後の1つは消せない', () => { assertEqual(removeSpec(createState(T), 0).specs.length, 1); });
test('removeSpec: active より前を消すと active が詰まる', () => { let s = addSpec(addSpec(createState(T))); s = setActive(s, 2); s = removeSpec(s, 0); assertEqual(s.activeIndex, 1); assertEqual(s.specs.length, 2); });
test('removeSpec: 末尾の active を消すと範囲内', () => { let s = addSpec(addSpec(createState(T))); s = removeSpec(s, 2); assertEqual(s.activeIndex, 1); });
test('updateSpec: 配送なしで配送方法クリア', () => { let s = updateSpec(createState(T), 0, {destination:'千葉県', deliveryMethod:OPTIONS.deliveryMethod[0]}); s = updateSpec(s, 0, {destination:NO_DELIVERY}); assertEqual(s.specs[0].deliveryMethod, ''); s = updateSpec(s, 0, {destination:'千葉県'}); assertEqual(s.specs[0].deliveryMethod, ''); });
test('updateSpec: 配送なし中は配送方法を設定できない', () => { let s = updateSpec(createState(T), 0, {destination:NO_DELIVERY}); s = updateSpec(s, 0, {deliveryMethod:OPTIONS.deliveryMethod[0]}); assertEqual(s.specs[0].deliveryMethod, ''); });
test('updateSpec: 熱源をその他以外にすると内容クリア', () => { let s = updateSpec(createState(T), 0, {heater:HEATER_OTHER, heaterOther:'自社手配'}); s = updateSpec(s, 0, {heater:OPTIONS.heater[0]}); assertEqual(s.specs[0].heaterOther, ''); });
test('updateSpec: 入力を変更しない', () => { const s = createState(T); updateSpec(s, 0, {name:'X'}); assertEqual(s.specs[0].name, ''); });
test('printableSpecs: 規格未選択は除外・番号はタブ番号', () => { let s = addSpec(addSpec(createState(T))); s = updateSpec(s, 1, {model:OPTIONS.model[0]}); assertEqual(printableSpecs(s).map(p => p.number), [2]); });
test('sanitizeState: 不正入力は初期状態', () => { assertEqual(sanitizeState('壊れた', T), createState(T)); assertEqual(sanitizeState(null, T), createState(T)); });
test('sanitizeState: 消えた選択肢は未選択・欠落補完', () => { const s = sanitizeState({date:'2026-01-02', specs:[{model:'旧モデル', windows:['旧窓', OPTIONS.windows[0]], destination:'火星'}], checks:{electrical:'はい', foundation:'たぶん'}, activeIndex:9}, T); assertEqual(s.specs[0].model, ''); assertEqual(s.specs[0].windows, [OPTIONS.windows[0]]); assertEqual(s.specs[0].destination, ''); assertEqual(s.specs[0].roof, ''); assertEqual(s.checks.electrical, 'はい'); assertEqual(s.checks.foundation, ''); assertEqual(s.activeIndex, 0); assertEqual(s.date, '2026-01-02'); });
test('sanitizeState: 6つ以上は5に切り詰め', () => { const s = sanitizeState({specs:[{},{},{},{},{},{}]}, T); assertEqual(s.specs.length, 5); });
test('formatDateJa', () => { assertEqual(formatDateJa('2026-10-09'), '2026年10月9日'); assertEqual(formatDateJa(''), '—'); });
test('specNumberLabel', () => { assertEqual([1,2,3,4,5].map(specNumberLabel).join(''), '①②③④⑤'); });
test('OPTIONS: spec表記', () => { assertEqual(OPTIONS.model.length, 8); assertTrue(OPTIONS.model.includes('i – barrel Medium-Long R275（軒あり）')); assertEqual(PREFECTURES.length, 47); assertEqual(PRECHECKS.length, 5); assertEqual(OPTIONS.heater.length, 10); });
```

- [ ] **Step 2:** `bash tests/run.sh` → 上記テストが FAIL（関数未定義）
- [ ] **Step 3:** `src/options.js` と `src/state.js` を実装。`sanitizeState` は single 項目は選択肢に含まれる値のみ、multi は含まれる値のみに filter、配送先は `PREFECTURES` か `NO_DELIVERY` のみ、date は `YYYY-MM-DD` 形式のみ採用（それ以外は当日）、text 項目は string のみ、その後 `updateSpec` と同じ整合ルール（配送なし／熱源その他）を適用
- [ ] **Step 4:** `bash tests/run.sh` → `FAIL: 0`
- [ ] **Step 5:** Commit `feat: option definitions and spec state logic`

---

### Task 3: プレビュー（印刷）HTML生成

**Files:**
- Create: `src/preview.js`, `tests/preview.test.js`

**Interfaces:**
- Consumes: Task 2 の `OPTIONS`, `SPEC_FIELDS`, `PRECHECKS`, `HEATER_OTHER`, `printableSpecs`, `specNumberLabel`, `formatDateJa`
- Produces:
  - `escapeHTML(s: string): string`（`& < > " '`）
  - `renderPreview(state: State, logoSrc: string): string` — `<section class="page">` の連結。構成：
    - 印刷対象仕様ごとに1ページ。共通ヘッダー（`<img class="logo" src=logoSrc>`、`<h1>バレルサウナ構成確認書</h1>`、日付 `formatDateJa`、お客様名、担当者名）＋見出し `仕様①：{仕様名}`（仕様名空なら `仕様①`）＋`<table class="spec-table">`（`SPEC_FIELDS` 順、`name` 行は除く）
    - 印刷対象が0件なら代わりに `<section class="page page-empty">` 1枚（ヘッダー＋「規格を選択すると、ここに仕様が表示されます」）
    - 最終ページ：ヘッダー＋`<h2>事前確認事項</h2>`＋各 PRECHECK の title・text・回答（`はい`/`いいえ`/`—`）
    - 各ページ末尾 `<footer class="page-no">n / N</footer>`
  - 値の表示：空文字・空配列→`—`、multi→`<br>` 区切り、textarea→エスケープ後に改行を `<br>`、`heaterOther` 行は heater が `HEATER_OTHER` のときだけ出す、`deliveryMethod` は配送なしなら `—`

- [ ] **Step 1: 失敗するテストを書く**（`tests/preview.test.js`。`const T = new Date(2026, 9, 9)`、HTML は `new DOMParser().parseFromString(html, 'text/html')` で検査）

```js
const parse = h => new DOMParser().parseFromString(h, 'text/html');
const base = () => updateRoot(createState(T), {customerName:'山田商事', contactName:'山田'});
test('preview: 未選択のみ→空ページ＋確認ページ', () => { const d = parse(renderPreview(base(), 'L')); assertEqual(d.querySelectorAll('.page').length, 2); assertTrue(d.querySelector('.page-empty') !== null); });
test('preview: 仕様2件＋確認＝3ページ・ページ番号', () => { let s = addSpec(base()); s = updateSpec(s, 0, {model:OPTIONS.model[0], name:'標準案'}); s = updateSpec(s, 1, {model:OPTIONS.model[3]}); const d = parse(renderPreview(s, 'L')); const pages = d.querySelectorAll('.page'); assertEqual(pages.length, 3); assertTrue(pages[0].textContent.includes('仕様①：標準案')); assertTrue(pages[1].textContent.includes('仕様②')); assertEqual(pages[2].querySelector('.page-no').textContent.trim(), '3 / 3'); });
test('preview: ヘッダーに日付・宛名', () => { let s = updateSpec(base(), 0, {model:OPTIONS.model[0]}); const t = parse(renderPreview(s, 'L')).querySelector('.page').textContent; assertTrue(t.includes('2026年10月9日')); assertTrue(t.includes('山田商事')); assertTrue(t.includes('山田')); });
test('preview: 未選択は—、複数選択は改行', () => { let s = updateSpec(base(), 0, {model:OPTIONS.model[0], windows:[OPTIONS.windows[0], OPTIONS.windows[1]]}); const d = parse(renderPreview(s, 'L')); const rows = [...d.querySelectorAll('.spec-table tr')]; const row = l => rows.find(r => r.textContent.includes(l)); assertTrue(row('屋根材').textContent.includes('—')); assertEqual(row('オプション窓ガラス').querySelectorAll('br').length, 1); });
test('preview: 特記事項はエスケープ＋改行保持', () => { let s = updateSpec(base(), 0, {model:OPTIONS.model[0], specNote:'<b>1行目</b>&\n2行目'}); const html = renderPreview(s, 'L'); assertTrue(html.includes('&lt;b&gt;1行目&lt;/b&gt;&amp;<br>2行目')); });
test('preview: 宛名もエスケープ', () => { const s = updateRoot(base(), {customerName:'<script>x</script>'}); assertTrue(!renderPreview(s, 'L').includes('<script>x')); });
test('preview: 熱源その他の内容は条件付き', () => { let s = updateSpec(base(), 0, {model:OPTIONS.model[0], heater:OPTIONS.heater[0]}); assertTrue(!renderPreview(s, 'L').includes('熱源（その他の内容）')); s = updateSpec(s, 0, {heater:HEATER_OTHER, heaterOther:'持込'}); assertTrue(renderPreview(s, 'L').includes('持込')); });
test('preview: 事前確認の回答', () => { let s = setCheck(base(), 'electrical', 'はい'); const last = [...parse(renderPreview(s, 'L')).querySelectorAll('.page')].pop(); assertTrue(last.textContent.includes('事前確認事項')); assertTrue(last.textContent.includes('はい')); assertTrue(last.textContent.includes('—')); });
```

- [ ] **Step 2:** `bash tests/run.sh` → preview テストが FAIL
- [ ] **Step 3:** `src/preview.js` を実装
- [ ] **Step 4:** `bash tests/run.sh` → `FAIL: 0`
- [ ] **Step 5:** Commit `feat: A4 preview renderer`

---

### Task 4: 入力フォームUI・保存

**Files:**
- Create: `src/storage.js`
- Modify: `src/app.js`, `src/style.css`, `src/index.template.html`

**Interfaces:**
- Consumes: Task 2 全関数・定数、Task 3 `renderPreview`, `escapeHTML`
- Produces:
  - `src/storage.js`：`STORAGE_KEY = 'rink-barrel-config-sheet-v1'`、`loadState(today: Date): State`（読込→`JSON.parse`→`sanitizeState`、例外時 `createState`）、`saveState(state): void`（例外は握りつぶす）
  - `src/app.js`：`LOGO_SRC` 定数（雛形で `{{LOGO_DATA_URI}}` を代入）、モジュール内 `let state`、`render()` がフォームとプレビュー（`#preview` に `renderPreview(state, LOGO_SRC)`）を再描画し `saveState` を呼ぶ。テキスト入力はフォーカスを失わないよう、フォーム全体ではなくプレビューのみ再描画する（タブ切替・追加・削除・選択変更時はフォームも再描画）

- [ ] **Step 1:** 画面構成を実装（spec §3 のワイヤー）：
  - ヘッダー（茶背景、ロゴ、タイトル、［新規作成］［PDF出力］）
  - 左カラム：共通情報 → タブ列（①〜、＋仕様を追加）→ 仕様フォーム（［この仕様を複製］［削除］）→ 事前確認事項
  - 右カラム：`#preview`（A4比率のページを縮小表示、各ページに影）
  - 入力形式：single で選択肢4以下はセグメントボタン、`model`/`heater` はプルダウン、`destination` は都道府県＋配送なしのプルダウン、multi はトグルボタン
  - 規格選択時、`MODEL_FEATURES` を「標準装備：軒・前室」のバッジで表示
  - `heaterOther` 入力欄は heater が その他 のときだけ表示
  - 配送なしのとき配送方法ボタンを disabled
  - 5仕様で［＋仕様を追加］［複製］disabled、1仕様で［削除］disabled
  - 削除・新規作成は `confirm()`
  - 幅 1100px 未満でプレビューを下に配置
- [ ] **Step 2:** `python3 build.py` → 成功、`bash tests/run.sh` → `FAIL: 0`
- [ ] **Step 3:** 内蔵ブラウザで `file://.../dist/バレルサウナ構成確認書.html` を開き、次をすべて確認する：
  - 全項目を入力するとプレビューに即反映される
  - 仕様を追加→複製→削除して番号が詰まる
  - 配送なし⇄千葉県の切替で配送方法が無効化・空になる
  - 熱源その他で入力欄が出る
  - 再読込で内容が復元される
  - 新規作成でクリアされる
  - コンソールエラーなし
- [ ] **Step 4:** Commit `feat: form UI with tabs and autosave`

---

### Task 5: 印刷・PDF出力

**Files:**
- Modify: `src/style.css`, `src/app.js`

**Interfaces:**
- Consumes: Task 4 の画面、Task 2 `printableSpecs`

- [ ] **Step 1:** 印刷CSSを実装：
  - `@page { size: A4 portrait; margin: 15mm; }`
  - `@media print` でヘッダー・左カラム・ボタンを非表示にし、`#preview` のみを等倍表示（縮小・影なし）
  - `.page` は `break-after: page`（最後は auto）、表は `break-inside: avoid`、長文は `overflow-wrap: anywhere`
- [ ] **Step 2:** ［PDF出力］の挙動を実装：
  - `printableSpecs(state).length === 0` なら `alert('規格が選択された仕様がありません。規格を選択してから出力してください。')` で中止
  - それ以外は `document.title` を一時的に `バレルサウナ構成確認書_{お客様名}_{YYYYMMDD}` にして `window.print()`。お客様名が空なら名前部分を省略し、`afterprint` で元に戻す
- [ ] **Step 3:** 自動確認：
  - 一時的に `tests/print-fixture.html` を作る。`localStorage` に仕様2件（片方は特記事項に長い複数行テキスト）と確認事項を入れた状態を書いてから `dist` の HTML へ遷移する
  - 続けて `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --allow-file-access-from-files --print-to-pdf="$(pwd)/dist/test-print.pdf" --no-pdf-header-footer --virtual-time-budget=5000 "file://$(pwd)/tests/print-fixture.html"` を実行する
  - 3ページのPDFになることを確認する。`mdls -name kMDItemNumberOfPages dist/test-print.pdf` が 3（Spotlight未反映なら `strings dist/test-print.pdf | grep -c "/Type /Page$"` 等で代替）
  - 確認後、fixture は削除する
- [ ] **Step 4:** 内蔵ブラウザで実データを入力し、次を目視確認する：
  - 印刷プレビューで A4縦になっている
  - ロゴ・日本語・「—」・ページ番号が正しく出る
  - 長文が枠内で折り返す
  - フォームが写り込まない
- [ ] **Step 5:** Commit `feat: A4 print layout and PDF export`
