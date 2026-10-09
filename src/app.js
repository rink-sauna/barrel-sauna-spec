// 画面の組み立てとイベント処理。状態の変更は state.js の関数経由で行う。

let state = loadState(new Date());
const APP_TITLE = document.title;

// 選択肢が多い単一選択はプルダウン、少ないものはボタンで表示する
const SELECT_FIELDS = ['model', 'assembly', 'heater'];
// 配送先が「配送なし」のとき選べない項目
const DELIVERY_DEPENDENT = ['remoteIsland', 'deliveryMethod'];

function h(s) {
  return escapeHTML(s);
}

function shellHTML() {
  return (
    '<header class="app-header">' +
      '<img class="app-logo" src="' + LOGO_SRC + '" alt="Rink SAUNA">' +
      '<h1 class="app-title">バレルサウナ仕様確認書</h1>' +
      '<div class="app-actions">' +
        '<button type="button" class="btn btn-ghost" data-action="reset">新規作成</button>' +
        '<button type="button" class="btn btn-primary" data-action="print">PDF出力</button>' +
      '</div>' +
    '</header>' +
    '<main class="app-main">' +
      '<div class="form-col" id="form"></div>' +
      '<div class="preview-col"><div class="preview" id="preview"></div></div>' +
    '</main>'
  );
}

function commonHTML() {
  return (
    '<section class="card">' +
      '<h2 class="card-title">基本情報</h2>' +
      '<div class="grid-3">' +
        '<label class="field"><span class="field-label">日付</span>' +
          '<input type="date" data-root="date" value="' + h(state.date) + '"></label>' +
        '<label class="field"><span class="field-label">お客様名（個人・会社名）</span>' +
          '<input type="text" data-root="customerName" value="' + h(state.customerName) + '"></label>' +
        '<label class="field"><span class="field-label">担当者名</span>' +
          '<input type="text" data-root="contactName" value="' + h(state.contactName) + '" placeholder="例）山田 太郎 様"></label>' +
      '</div>' +
    '</section>'
  );
}

function tabsHTML() {
  const full = state.specs.length >= MAX_SPECS;
  const tabs = state.specs.map((_, i) => {
    const active = i === state.activeIndex;
    const label = '仕様' + specNumberLabel(i + 1);
    return '<button type="button" class="tab' + (active ? ' is-active' : '') + '" data-action="tab" data-index="' + i + '"' +
      ' role="tab" aria-selected="' + active + '">' + label + '</button>';
  }).join('');
  return (
    '<div class="tabs" role="tablist">' + tabs +
      '<button type="button" class="tab tab-add" data-action="add"' + (full ? ' disabled' : '') + '>＋仕様を追加</button>' +
    '</div>'
  );
}

function choiceButtons(action, key, values, selected, opts) {
  const disabled = opts && opts.disabled;
  return '<div class="choices">' + values.map(v => {
    const on = Array.isArray(selected) ? selected.includes(v) : selected === v;
    return '<button type="button" class="choice' + (on ? ' is-on' : '') + '" data-action="' + action + '"' +
      ' data-key="' + h(key) + '" data-value="' + h(v) + '" aria-pressed="' + on + '"' +
      (disabled ? ' disabled' : '') + '>' + h(v) + '</button>';
  }).join('') + '</div>';
}

function selectHTML(key, values, selected, placeholder) {
  const opts = ['<option value="">' + placeholder + '</option>']
    .concat(values.map(v => '<option value="' + h(v) + '"' + (v === selected ? ' selected' : '') + '>' + h(v) + '</option>'));
  return '<select data-spec-select="' + h(key) + '">' + opts.join('') + '</select>';
}

function fieldControlHTML(field, spec) {
  const v = spec[field.key];
  switch (field.type) {
    case 'text':
      return '<input type="text" data-spec-field="' + field.key + '" value="' + h(v) + '">';
    case 'textarea':
      return '<textarea rows="3" data-spec-field="' + field.key + '">' + h(v) + '</textarea>';
    case 'multi':
      return choiceButtons('multi', field.key, OPTIONS[field.key], v);
    case 'prefecture':
      return selectHTML(field.key, [NO_DELIVERY].concat(PREFECTURES), v, '選択してください');
    default:
      if (SELECT_FIELDS.includes(field.key)) return selectHTML(field.key, OPTIONS[field.key], v, '選択してください');
      return choiceButtons('single', field.key, OPTIONS[field.key], v,
        { disabled: DELIVERY_DEPENDENT.includes(field.key) && spec.destination === NO_DELIVERY });
  }
}

function fieldNoteHTML(field, spec) {
  if (field.key === 'model' && spec.model) {
    const features = MODEL_FEATURES[spec.model] || [];
    if (features.length) return '<p class="field-note">標準装備：' + features.map(f => '<span class="badge">' + h(f) + '</span>').join('') + '</p>';
  }
  if (DELIVERY_DEPENDENT.includes(field.key) && spec.destination === NO_DELIVERY) {
    return '<p class="field-note">配送先が「配送なし」のため選択できません</p>';
  }
  if (field.type === 'multi') return '<p class="field-hint">複数選択できます</p>';
  return '';
}

function revisionHTML(revision) {
  const isUpdate = revision > 0;
  const stepper = isUpdate
    ? '<div class="stepper">' +
        '<button type="button" class="btn btn-small" data-action="rev-dec" aria-label="版を下げる"' + (revision <= 1 ? ' disabled' : '') + '>−</button>' +
        '<span class="stepper-value">' + h(revisionLabel(revision)) + '</span>' +
        '<button type="button" class="btn btn-small" data-action="rev-inc" aria-label="版を上げる"' + (revision >= MAX_REVISION ? ' disabled' : '') + '>＋</button>' +
      '</div>'
    : '';
  return (
    '<div class="field revision"><span class="field-label">版</span>' +
      '<div class="revision-row"><div class="choices">' +
        '<button type="button" class="choice' + (isUpdate ? '' : ' is-on') + '" data-action="rev-first" aria-pressed="' + !isUpdate + '">初版</button>' +
        '<button type="button" class="choice' + (isUpdate ? ' is-on' : '') + '" data-action="rev-update" aria-pressed="' + isUpdate + '">更新版</button>' +
      '</div>' + stepper + '</div>' +
    '</div>'
  );
}

function specFormHTML() {
  const i = state.activeIndex;
  const spec = state.specs[i];
  const full = state.specs.length >= MAX_SPECS;
  const fields = SPEC_FIELDS
    .filter(f => f.key !== 'heaterOther' || spec.heater === HEATER_OTHER)
    .map(f =>
      '<div class="field field-' + f.key + '">' +
        '<span class="field-label">' + h(f.label) + '</span>' +
        fieldControlHTML(f, spec) + fieldNoteHTML(f, spec) +
      '</div>')
    .join('');
  return (
    '<section class="card spec-card">' +
      tabsHTML() +
      '<div class="spec-tools">' +
        '<button type="button" class="btn btn-small" data-action="duplicate"' + (full ? ' disabled' : '') + '>この仕様を複製</button>' +
        '<button type="button" class="btn btn-small btn-danger" data-action="remove"' + (state.specs.length <= 1 ? ' disabled' : '') + '>この仕様を削除</button>' +
      '</div>' +
      revisionHTML(spec.revision) +
      '<div class="spec-name"><span class="field-label">仕様名（自動）</span>' +
        '<p id="spec-name" class="spec-name-value">' + h(specName(state, i)) + '</p></div>' +
      '<div class="spec-fields">' + fields + '</div>' +
    '</section>'
  );
}

function checksHTML() {
  const items = PRECHECKS.map(c =>
    '<div class="check-row">' +
      '<div class="check-body"><p class="check-q">' + h(c.title) + '</p>' +
      '<p class="check-desc">' + h(c.text).replace(/\n/g, '<br>') + '</p></div>' +
      choiceButtons('check', c.id, CHECK_ANSWERS, state.checks[c.id]) +
    '</div>'
  ).join('');
  return '<section class="card"><h2 class="card-title">事前確認事項</h2>' + items + '</section>';
}

function renderForm() {
  document.getElementById('form').innerHTML = commonHTML() + specFormHTML() + checksHTML();
}

function renderPreviewPane() {
  document.getElementById('preview').innerHTML = renderPreview(state, LOGO_SRC);
  saveState(state);
}

function renderAll() {
  renderForm();
  renderPreviewPane();
}

// テキスト入力中はフォームを再描画せず、仕様名の表示とプレビューだけ更新する
function updateSpecNameDisplay() {
  const el = document.getElementById('spec-name');
  if (el) el.textContent = specName(state, state.activeIndex);
}

function onInput(e) {
  const t = e.target;
  if (t.dataset.root) {
    state = updateRoot(state, { [t.dataset.root]: t.value });
    updateSpecNameDisplay();
    renderPreviewPane();
  } else if (t.dataset.specField) {
    state = updateSpec(state, state.activeIndex, { [t.dataset.specField]: t.value });
    renderPreviewPane();
  }
}

function onChange(e) {
  const t = e.target;
  if (t.dataset.specSelect) {
    state = updateSpec(state, state.activeIndex, { [t.dataset.specSelect]: t.value });
    renderAll();
  }
}

function onClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn || btn.disabled) return;
  const { action, key, value, index } = btn.dataset;
  const spec = state.specs[state.activeIndex];
  switch (action) {
    case 'tab':
      state = setActive(state, Number(index));
      break;
    case 'add':
      state = addSpec(state);
      break;
    case 'duplicate':
      state = duplicateSpec(state, state.activeIndex);
      break;
    case 'remove':
      if (!confirm('仕様' + specNumberLabel(state.activeIndex + 1) + 'を削除します。よろしいですか？')) return;
      state = removeSpec(state, state.activeIndex);
      break;
    case 'single':
      // 選択中のボタンをもう一度押すと未選択に戻す
      state = updateSpec(state, state.activeIndex, { [key]: spec[key] === value ? '' : value });
      break;
    case 'multi': {
      const cur = spec[key];
      const next = cur.includes(value) ? cur.filter(v => v !== value) : OPTIONS[key].filter(v => v === value || cur.includes(v));
      state = updateSpec(state, state.activeIndex, { [key]: next });
      break;
    }
    case 'rev-first':
      state = updateSpec(state, state.activeIndex, { revision: 0 });
      break;
    case 'rev-update':
      state = updateSpec(state, state.activeIndex, { revision: Math.max(1, spec.revision) });
      break;
    case 'rev-dec':
      state = updateSpec(state, state.activeIndex, { revision: Math.max(1, spec.revision - 1) });
      break;
    case 'rev-inc':
      state = updateSpec(state, state.activeIndex, { revision: Math.min(MAX_REVISION, spec.revision + 1) });
      break;
    case 'check':
      state = setCheck(state, key, state.checks[key] === value ? '' : value);
      break;
    case 'reset':
      if (!confirm('入力内容をすべて消去して新規作成します。よろしいですか？')) return;
      state = createState(new Date());
      break;
    case 'print':
      exportPDF();
      return;
    default:
      return;
  }
  renderAll();
}

function exportPDF() {
  if (printableSpecs(state).length === 0) {
    alert('規格が選択された仕様がありません。規格を選択してから出力してください。');
    return;
  }
  // 保存時のファイル名の初期値になる
  document.title = pdfTitle(state);
  window.addEventListener('afterprint', () => { document.title = APP_TITLE; }, { once: true });
  window.print();
}

// プレビューの A4 ページを列の幅に合わせて縮小する
function fitPreview() {
  const col = document.querySelector('.preview-col');
  const pageWidthPx = 210 * 96 / 25.4;
  const zoom = Math.min(1, (col.clientWidth - 32) / pageWidthPx);
  document.getElementById('preview').style.setProperty('--preview-zoom', String(Math.max(0.3, zoom)));
}

function init() {
  const app = document.getElementById('app');
  app.innerHTML = shellHTML();
  app.addEventListener('input', onInput);
  app.addEventListener('change', onChange);
  app.addEventListener('click', onClick);
  renderAll();
  new ResizeObserver(fitPreview).observe(document.querySelector('.preview-col'));
  fitPreview();
}

init();
