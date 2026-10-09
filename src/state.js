// 確認書の状態を扱う純粋関数。すべて入力を変更せず新しい状態を返す。

const MAX_SPECS = 5;
const SPEC_NUMBER_LABELS = ['①', '②', '③', '④', '⑤'];
const DEFAULT_CONTACT_NAME = '深山';
const MAX_REVISION = 99;

function createSpec() {
  return {
    revision: 0, model: '', specChanges: [], specNote: '', roof: '', paint: '',
    coldBath: '', windows: [], assembly: '', heater: '', heaterOther: '',
    electrical: '', destination: '', remoteIsland: '', deliveryMethod: '', products: [],
  };
}

function createChecks() {
  const checks = {};
  for (const c of PRECHECKS) checks[c.id] = '';
  return checks;
}

function toISODate(d) {
  const pad = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function createState(today) {
  return {
    date: toISODate(today),
    customerName: '',
    contactName: DEFAULT_CONTACT_NAME,
    specs: [createSpec()],
    activeIndex: 0,
    checks: createChecks(),
  };
}

function cloneSpec(spec) {
  return JSON.parse(JSON.stringify(spec));
}

function clampIndex(i, length) {
  return Math.min(Math.max(0, i), length - 1);
}

// 項目間の整合ルール（配送なし→離島・配送方法なし、熱源その他以外→内容なし）
function normalizeSpec(spec) {
  const s = { ...spec };
  if (s.destination === NO_DELIVERY) {
    s.remoteIsland = '';
    s.deliveryMethod = '';
  }
  if (s.heater !== HEATER_OTHER) s.heaterOther = '';
  return s;
}

function addSpec(state) {
  if (state.specs.length >= MAX_SPECS) return state;
  const specs = state.specs.concat([createSpec()]);
  return { ...state, specs, activeIndex: specs.length - 1 };
}

function duplicateSpec(state, index) {
  if (state.specs.length >= MAX_SPECS) return state;
  const specs = state.specs.concat([cloneSpec(state.specs[index])]);
  return { ...state, specs, activeIndex: specs.length - 1 };
}

function removeSpec(state, index) {
  if (state.specs.length <= 1) return state;
  const specs = state.specs.filter((_, i) => i !== index);
  let active = state.activeIndex;
  if (index < active) active -= 1;
  return { ...state, specs, activeIndex: clampIndex(active, specs.length) };
}

function setActive(state, index) {
  return { ...state, activeIndex: clampIndex(index, state.specs.length) };
}

function updateSpec(state, index, patch) {
  const prev = state.specs[index];
  const next = normalizeSpec({ ...prev, ...patch });
  const specs = state.specs.map((s, i) => (i === index ? next : s));
  return { ...state, specs };
}

function updateRoot(state, patch) {
  return { ...state, ...patch };
}

function setCheck(state, id, value) {
  return { ...state, checks: { ...state.checks, [id]: value } };
}

function printableSpecs(state) {
  return state.specs
    .map((spec, i) => ({ number: i + 1, spec }))
    .filter(p => p.spec.model !== '');
}

// 仕様名は入力内容から自動で決める：日付_お客様名_都道府県_規格_仕様①_版（未入力の部分は省く）
function specName(state, index) {
  const spec = state.specs[index];
  const parts = [
    state.date.replace(/-/g, ''),
    state.customerName.trim(),
    spec.destination,
    spec.model,
    '仕様' + specNumberLabel(index + 1),
    revisionLabel(spec.revision),
  ];
  return parts.filter(Boolean).join('_');
}

// 版の表記：0 = 初版、1以上 = 更新版N
function revisionLabel(revision) {
  return revision > 0 ? '更新版' + revision : '初版';
}

// PDF保存時のファイル名。印刷する仕様が複数なら、先頭の仕様の内容と版に仕様番号を並べる（例：…_仕様①③_初版）
function pdfTitle(state) {
  const specs = printableSpecs(state);
  if (specs.length === 0) return '';
  const first = specs[0].spec;
  const parts = [
    state.date.replace(/-/g, ''),
    state.customerName.trim(),
    first.destination,
    first.model,
    '仕様' + specs.map(p => specNumberLabel(p.number)).join(''),
    revisionLabel(first.revision),
  ];
  return parts.filter(Boolean).join('_').replace(/[\\/:*?"<>|]/g, '-');
}

function specNumberLabel(n) {
  return SPEC_NUMBER_LABELS[n - 1] || String(n);
}

function formatDateJa(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '—';
  return Number(m[1]) + '年' + Number(m[2]) + '月' + Number(m[3]) + '日';
}

function allowedValues(key) {
  return key === 'destination' ? PREFECTURES.concat([NO_DELIVERY]) : OPTIONS[key];
}

function sanitizeSpec(raw) {
  const spec = createSpec();
  if (!raw || typeof raw !== 'object') return spec;
  for (const f of SPEC_FIELDS) {
    const v = raw[f.key];
    if (f.type === 'text' || f.type === 'textarea') {
      if (typeof v === 'string') spec[f.key] = v;
    } else if (f.type === 'multi') {
      if (Array.isArray(v)) spec[f.key] = v.filter(x => OPTIONS[f.key].includes(x));
    } else if (allowedValues(f.key).includes(v)) {
      spec[f.key] = v;
    }
  }
  if (Number.isInteger(raw.revision) && raw.revision > 0) spec.revision = Math.min(raw.revision, MAX_REVISION);
  return normalizeSpec(spec);
}

// localStorage から読み込んだ値など、信用できない入力を正しい状態に直す
function sanitizeState(raw, today) {
  const state = createState(today);
  if (!raw || typeof raw !== 'object') return state;
  if (typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date)) state.date = raw.date;
  if (typeof raw.customerName === 'string') state.customerName = raw.customerName;
  if (typeof raw.contactName === 'string') state.contactName = raw.contactName;
  if (Array.isArray(raw.specs) && raw.specs.length > 0) {
    state.specs = raw.specs.slice(0, MAX_SPECS).map(sanitizeSpec);
  }
  if (raw.checks && typeof raw.checks === 'object') {
    for (const c of PRECHECKS) {
      if (CHECK_ANSWERS.includes(raw.checks[c.id])) state.checks[c.id] = raw.checks[c.id];
    }
  }
  if (Number.isInteger(raw.activeIndex) && raw.activeIndex >= 0 && raw.activeIndex < state.specs.length) {
    state.activeIndex = raw.activeIndex;
  }
  return state;
}
