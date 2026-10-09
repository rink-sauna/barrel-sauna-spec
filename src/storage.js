// 入力中の内容をブラウザに自動保存する。使えない環境では何もしない。

const STORAGE_KEY = 'rink-barrel-config-sheet-v1';

function loadState(today) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return sanitizeState(raw ? JSON.parse(raw) : null, today);
  } catch (e) {
    return createState(today);
  }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // プライベートブラウズ等で保存できない場合は保存しないだけ
  }
}
