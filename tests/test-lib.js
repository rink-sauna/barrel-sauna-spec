// 最小のブラウザ用テストランナー。結果は #result に書き出す。
const __tests = [];

function test(name, fn) {
  __tests.push({ name, fn });
}

function assertEqual(actual, expected, msg) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error((msg ? msg + ': ' : '') + 'expected ' + e + ' but got ' + a);
}

function assertTrue(cond, msg) {
  if (!cond) throw new Error(msg || 'expected condition to be true');
}

function __runTests() {
  let pass = 0;
  const failures = [];
  for (const t of __tests) {
    try {
      t.fn();
      pass++;
    } catch (e) {
      failures.push(t.name + ' — ' + (e && e.message ? e.message : e));
    }
  }
  const out = document.getElementById('result');
  out.textContent = ['PASS: ' + pass + ' FAIL: ' + failures.length].concat(failures).join('\n');
}
