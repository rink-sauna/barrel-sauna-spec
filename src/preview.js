// 状態から A4 ページ群（プレビュー兼印刷用）の HTML を組み立てる純粋関数。

const EMPTY_MARK = '—';

function escapeHTML(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textOrEmpty(s) {
  return s ? escapeHTML(s) : EMPTY_MARK;
}

function multiline(s) {
  return s ? escapeHTML(s).replace(/\r?\n/g, '<br>') : EMPTY_MARK;
}

function fieldValueHTML(field, spec) {
  const v = spec[field.key];
  if (field.type === 'multi') return v.length ? v.map(escapeHTML).join('<br>') : EMPTY_MARK;
  if (field.type === 'textarea') return multiline(v);
  return textOrEmpty(v);
}

function pageHeaderHTML(state, logoSrc) {
  return (
    '<header class="sheet-header">' +
      '<div class="sheet-title-block">' +
        '<h1 class="sheet-title">バレルサウナ仕様確認書</h1>' +
        '<dl class="sheet-meta">' +
          '<div><dt>日付</dt><dd>' + formatDateJa(state.date) + '</dd></div>' +
          '<div><dt>お客様名</dt><dd>' + textOrEmpty(state.customerName) + '</dd></div>' +
          '<div><dt>担当者名</dt><dd>' + textOrEmpty(state.contactName) + '</dd></div>' +
        '</dl>' +
      '</div>' +
      '<img class="logo" src="' + escapeHTML(logoSrc) + '" alt="Rink SAUNA">' +
    '</header>'
  );
}

// 共通ヘッダーと仕様名は thead に置く。1仕様が2枚にまたがっても、印刷時に各用紙の先頭へ繰り返される
function specBodyHTML(title, spec, header) {
  const rows = SPEC_FIELDS
    .filter(f => f.key !== 'heaterOther' || spec.heater === HEATER_OTHER)
    .map(f => '<tr><th>' + escapeHTML(f.label) + '</th><td>' + fieldValueHTML(f, spec) + '</td></tr>')
    .join('');
  return '<table class="spec-table"><colgroup><col class="col-label"><col></colgroup><thead><tr><td colspan="2" class="spec-head">' + header +
    '<h2 class="spec-title">' + escapeHTML(title) + '</h2></td></tr></thead><tbody>' + rows + '</tbody></table>';
}

function emptyBodyHTML() {
  return '<p class="empty-note">規格を選択すると、ここに仕様が表示されます</p>';
}

function checksBodyHTML(state) {
  const items = PRECHECKS.map(c =>
    '<li class="check-item">' +
      '<div class="check-head"><span class="check-title">' + escapeHTML(c.title) + '</span>' +
      '<span class="check-answer">' + textOrEmpty(state.checks[c.id]) + '</span></div>' +
      '<p class="check-text">' + multiline(c.text) + '</p>' +
    '</li>'
  ).join('');
  return '<h2 class="spec-title">事前確認事項</h2><ul class="check-list">' + items + '</ul>';
}

function renderPreview(state, logoSrc) {
  const header = pageHeaderHTML(state, logoSrc);
  const specs = printableSpecs(state);
  const bodies = specs.length
    ? specs.map(p => ({ cls: 'page', head: '', body: specBodyHTML(specName(state, p.number - 1), p.spec, header) }))
    : [{ cls: 'page page-empty', head: header, body: emptyBodyHTML() }];
  bodies.push({ cls: 'page page-checks', head: header, body: checksBodyHTML(state) });

  const total = bodies.length;
  return bodies
    .map((b, i) =>
      '<section class="' + b.cls + '">' + b.head +
        '<div class="sheet-body">' + b.body + '</div>' +
        '<footer class="page-no">' + (i + 1) + ' / ' + total + '</footer>' +
      '</section>')
    .join('');
}
