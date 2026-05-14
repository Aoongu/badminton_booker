const fs = require('fs');
const c = fs.readFileSync('d:/Documents/code/badmintonbooker_solo/worker_v16.js', 'utf8');
let m = c;

// === FIX 1: Remove encryption plaintext/ciphertext logs ===
const encPlainLog = "log('db', '\\ud83d\\udcdd \\u52a0\\u5bc6\\u660e\\u6587: ' + JSON.stringify(rawObj)); ";
const encCipherLog = "log('db', '\\ud83d\\udd12 \\u52a0\\u5bc6\\u5bc6\\u6587: ' + payload + ' (' + payload.length + 'hex)');";
m = m.replace(encPlainLog, '');
m = m.replace(encCipherLog, '');
console.log('1a. Encryption logs removed:', !m.includes('\\u52a0\\u5bc6\\u660e\\u6587') ? 'YES' : 'NO');

// Add response time to query success log
const oldOkLog = "log('ok', `\\u2705 \\u5df2\\u52a0\\u8f7d ${date} \\u573a\\u6b21\\u6570\\u636e";
const newOkLog = "const ms = Date.now() - t0; log('ok', `\\u2705 \\u5df2\\u52a0\\u8f7d ${date} \\u573a\\u6b21\\u6570\\u636e (${ms}ms)";
m = m.replace(oldOkLog, newOkLog);
console.log('1b. Response time added:', m.includes('Date.now() - t0') ? 'YES' : 'NO');

// === FIX 2: Booked slots show price instead of "满" ===
// Update JS: booked cells show price text instead of "满"
const oldBooked = "} else if (fen === -1 || isBooked) {\\n        cellClass = 'booked'; cellLabel = '满';";
const newBooked = "} else if (fen === -1 || isBooked) {\\n        cellClass = 'booked';\\n        if (isBooked && fen > 0) { cellLabel = '\\u00a5' + (fen / 100); } else { cellLabel = ''; }";
m = m.replace(oldBooked, newBooked);
console.log('2a. Booked shows price in JS:', m.includes("isBooked && fen > 0") ? 'YES' : 'NO');

// Update CSS: .slot.booked red background + remove ::after "满"
const oldSlotBookedCSS = ".slot.booked{background:#1a1a2e;border:1px solid #2d2d4a;color:#4b5563;cursor:not-allowed}";
const newSlotBookedCSS = ".slot.booked{background:#7f1d1d;border:1px solid #991b1b;color:#fca5a5;cursor:not-allowed;font-size:11px}";
m = m.replace(oldSlotBookedCSS, newSlotBookedCSS);
console.log('2b. .slot.booked CSS updated to red:', m.includes(".slot.booked{background:#7f1d1d") ? 'YES' : 'NO');

// Remove ::after pseudo-element that shows "满"
const oldAfterCSS = ".slot.booked::after{content:'\\u6ee1';font-size:10px}";
m = m.replace(oldAfterCSS, '');
console.log('2c. Removed ::after "满":', !m.includes("slot.booked::after") ? 'YES' : 'NO');

// Update legend dot color
const oldLegBooked = ".leg-dot.booked{background:#1a1a2e;border:1px solid #2d2d4a}";
const newLegBooked = ".leg-dot.booked{background:#7f1d1d;border:1px solid #991b1b}";
m = m.replace(oldLegBooked, newLegBooked);
console.log('2d. Legend dot updated:', m.includes(".leg-dot.booked{background:#7f1d1d") ? 'YES' : 'NO');

// === FIX 3: Clear grid before loading new day ===
const oldLoading = "btn.classList.add('loading');\\n\\n  try {";
const newLoading = "btn.classList.add('loading');\\n  D.loaded = false; D.priceMap = {}; bookedSet.clear(); closedSet.clear(); selected.clear(); buildGrid();\\n\\n  try {";
m = m.replace(oldLoading, newLoading);
console.log('3. Grid cleared before loading:', m.includes("D.loaded = false; D.priceMap = {}; bookedSet.clear") ? 'YES' : 'NO');

// === FIX 4: Add floating toast notification ===
// Insert toast CSS before "/* selected */" comment (reliable anchor)
const toastCSS = ".toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:9999;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:700;color:#fff;opacity:0;transition:opacity .3s;pointer-events:none}.toast.show{opacity:1}.toast.ok{background:#059669}.toast.er{background:#dc2626}.toast.wn{background:#d97706}\\n";
const selectedAnchor = "/* selected */";
m = m.replace(selectedAnchor, toastCSS + selectedAnchor);
console.log('4a. Toast CSS inserted:', m.includes(".toast{position:fixed") ? 'YES' : 'NO');

// Insert toast HTML div (must use \\\" for quotes inside the JS string constant)
m = m.replace('<body>', '<body>\\n<div id=\\\"toast\\\" class=\\\"toast\\\"></div>');
console.log('4b. Toast div inserted:', m.includes('id=\\\"toast\\\"') ? 'YES' : 'NO');

// Insert showToast JS function
const toastFn = "function showToast(type, msg, dur) {\\n  const el = document.getElementById('toast');\\n  el.textContent = msg;\\n  el.className = 'toast ' + type + ' show';\\n  clearTimeout(el._t);\\n  el._t = setTimeout(() => { el.className = 'toast'; }, dur || 3000);\\n}\\n\\n";
m = m.replace('function log(type, msg) {', toastFn + 'function log(type, msg) {');
console.log('4c. showToast function inserted:', m.includes("function showToast") ? 'YES' : 'NO');

// Add toast to booking success (file uses double-backslash unicode: \\ud83c\\udf89)
m = m.replace(
  "log('ok', `\\\\ud83c\\\\udf89\\\\ud83c\\\\udf89",
  "showToast('ok', '\\\\u2705 \\\\u9884\\\\u7ea6\\\\u6210\\\\u529f\\\\uff01'); log('ok', `\\\\ud83c\\\\udf89\\\\ud83c\\\\udf89"
);
// Add toast to booking failure (two patterns: warning sign and cross mark)
m = m.replace(
  "log('er', `[${label}] \\\\u26a0\\\\ufe0f",
  "showToast('er', '\\\\u274c \\\\u9884\\\\u7ea6\\\\u5931\\\\u8d25'); log('er', `[${label}] \\\\u26a0\\\\ufe0f"
);
m = m.replace(
  "log('er', `[${label}] \\\\u274c",
  "showToast('er', '\\\\u274c \\\\u9884\\\\u7ea6\\\\u5931\\\\u8d25'); log('er', `[${label}] \\\\u274c"
);
console.log('4d. Toast calls added:', m.includes("showToast('ok'") && m.includes("showToast('er'") ? 'YES' : 'NO');

// === FIX 5: Add wxLogin support ===
const wxLoginFn = "async function wxLogin() {\\n  const openid = prompt('\\u8bf7\\u8f93\\u5165\\u5fae\\u4fe1openid\\uff08\\u53ef\\u4ece\\u5fae\\u4fe1\\u5c0f\\u7a0b\\u5e8f\\u6293\\u5305\\u83b7\\u53d6\\uff09:');\\n  if (!openid) return;\\n  log('inf', '\\ud83d\\udd11 \\u5c1d\\u8bd5\\u5fae\\u4fe1\\u767b\\u5f55...');\\n  try {\\n    const payload = aesEncrypt({ openid });\\n    const res = await fetch(PROXY + '/service/appointment/appointment/phone/login/wxLogin', {\\n      method: 'POST',\\n      headers: { 'Content-Type': 'application/json' },\\n      body: JSON.stringify({ item: payload })\\n    });\\n    const raw = await res.text();\\n    let data = {};\\n    try { data = JSON.parse(raw); } catch(_) {}\\n    if (data.item) {\\n      const dec = aesDecrypt(data.item);\\n      const parsed = JSON.parse(dec);\\n      if (parsed.success !== false && parsed.resultData) {\\n        const token = parsed.resultData.token || parsed.resultData;\\n        if (typeof token === 'string' && token.length > 10) {\\n          document.getElementById('token').value = token;\\n          localStorage.setItem('cugb_token', token);\\n          log('ok', '\\u2705 \\u767b\\u5f55\\u6210\\u529f\\uff01Token\\u5df2\\u81ea\\u52a8\\u586b\\u5165');\\n          showToast('ok', '\\u2705 \\u767b\\u5f55\\u6210\\u529f\\uff01', 2000);\\n          return;\\n        }\\n      }\\n    }\\n    log('er', '\\u274c \\u767b\\u5f55\\u5931\\u8d25\\uff0c\\u8bf7\\u68c0\\u67e5openid\\u6216\\u624b\\u52a8\\u8f93\\u5165Token');\\n    showToast('er', '\\u274c \\u767b\\u5f55\\u5931\\u8d25');\\n  } catch(e) {\\n    log('er', '\\u274c \\u767b\\u5f55\\u5f02\\u5e38: ' + e.message);\\n  }\\n}\\n\\n";

m = m.replace(
  '// \\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\n// \\u521d\\u59cb\\u5316',
  wxLoginFn + '// \\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\n// \\u521d\\u59cb\\u5316'
);

m = m.replace(
  "placeholder=\\\"\\u7c98\\u8d34Token...\\\"",
  "placeholder=\\\"\\u7c98\\u8d34Token \\u6216 \\u70b9\\u51fb\\u4e0b\\u65b9\\u5fae\\u4fe1\\u767b\\u5f55\\\""
);

m = m.replace(
  "</textarea>",
  "</textarea>\\n    <div style=\\\"margin-top:6px;display:flex;gap:8px\\\">\\n      <button class=\\\"btn-go\\\" style=\\\"flex:1;padding:8px;font-size:13px\\\" onclick=\\\"wxLogin()\\\">\\ud83d\\udd11 \\u5fae\\u4fe1\\u767b\\u5f55\\uff08\\u9700openid\\uff09</button>\\n    </div>"
);
console.log('5. wxLogin added:', m.includes("wxLogin") ? 'YES' : 'NO');

// === Update version ===
m = m.replace(/v16\.0/g, 'v17.0');

fs.writeFileSync('d:/Documents/code/badmintonbooker_solo/worker_v17.js', m);
console.log('Created worker_v17.js, length:', m.length);
