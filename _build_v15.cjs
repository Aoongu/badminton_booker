const fs = require('fs');
const c = fs.readFileSync('d:/Documents/code/badmintonbooker_solo/worker_v12.js', 'utf8');

// === FIX 1: getSlotFen - return -1 for booked slots (not in priceMap) ===
const oldGetSlotFen = "function getSlotFen(courtIdx, timeIdx) {\\n  const key = courtIdx + '-' + timeIdx;\\n  return D.priceMap[key] || slotPrice(S.dayOffset, D.allTimes[timeIdx] || '18:00');\\n}";
const newGetSlotFen = "function getSlotFen(courtIdx, timeIdx) {\\n  const key = courtIdx + '-' + timeIdx;\\n  if (!(key in D.priceMap)) return -1;\\n  return D.priceMap[key];\\n}";
let modified = c.replace(oldGetSlotFen, newGetSlotFen);
console.log(modified === c ? 'WARN: getSlotFen replace failed' : 'OK: getSlotFen now returns -1 for booked slots');

// === FIX 2: buildGrid - show ALL times (including closed), mark booked/closed, skip last row (22-22) ===
// Key fix: only show up to N-1 times, so the last time slot (e.g. 22:00) is not shown as a row
const oldBuildGrid = "function buildGrid() {\\n  const head = document.getElementById('gridHead');\\n  const body = document.getElementById('gridBody');\\n  const courts = D.loaded ? D.courtOrder : [];\\n  const times  = D.loaded ? D.times : [];\\n\\n  let hHTML = '<th class=\\\"th-time\\\"></th>';\\n  courts.forEach(c => {\\n    hHTML += `<th id=\\\"ch_${c}\\\" onclick=\\\"toggleCourt('${c}')\\\">${c}</th>`;\\n  });\\n  head.innerHTML = hHTML;\\n  body.innerHTML = '';\\n\\n  times.forEach((t, ti) => {\\n    const nextH = times[ti + 1] || '22:00';\\n    const tid   = t.replace(':', '');\\n    const tr    = document.createElement('tr');\\n    const labelTxt = parseInt(t) + '-' + parseInt(nextH);\\n    let rHTML = `<td class=\\\"time-label\\\" id=\\\"tl_${tid}\\\" onclick=\\\"toggleTime('${t}')\\\">${labelTxt}</td>`;\\n    courts.forEach((c, ci) => {\\n      const timeIdx = D.slotIdx[t];\\n      const fen = D.loaded ? getSlotFen(ci, timeIdx) : slotPrice(S.dayOffset, t);\\n      const pClass = fen === 1000 ? 'cheap' : 'exp';\\n      const pLabel = fen === 1000 ? '10' : '40';\\n      rHTML += `<td class=\\\"slot ${pClass}\\\" id=\\\"slot_${c}_${tid}\\\"\\n        onclick=\\\"toggleCell('${c}','${t}')\\\" data-fen=\\\"${fen}\\\">${pLabel}</td>`;\\n    });\\n    tr.innerHTML = rHTML;\\n    body.appendChild(tr);\\n  });\\n}";

const newBuildGrid = "function buildGrid() {\\n  const head = document.getElementById('gridHead');\\n  const body = document.getElementById('gridBody');\\n  const courts = D.loaded ? D.courtOrder : [];\\n  const allTimes = D.loaded ? D.allTimes : [];\\n  const timeList = D.loaded ? D.timeList : [];\\n\\n  let hHTML = '<th class=\\\"th-time\\\"></th>';\\n  courts.forEach(c => {\\n    hHTML += `<th id=\\\"ch_${c}\\\" onclick=\\\"toggleCourt('${c}')\\\">${c}</th>`;\\n  });\\n  head.innerHTML = hHTML;\\n  body.innerHTML = '';\\n\\n  allTimes.forEach((t, ti) => {\\n    if (ti >= allTimes.length - 1) return;\\n    const tInfo = timeList[ti] || {};\\n    const isClosed = tInfo.status === '1';\\n    const nextT = allTimes[ti + 1];\\n    const tid = t.replace(':', '');\\n    const tr = document.createElement('tr');\\n    const labelTxt = parseInt(t) + '-' + parseInt(nextT);\\n    let rHTML = `<td class=\\\"time-label\\\" id=\\\"tl_${tid}\\\" onclick=\\\"toggleTime('${t}')\\\">${labelTxt}</td>`;\\n    courts.forEach((c, ci) => {\\n      const timeIdx = ti;\\n      const fen = D.loaded ? getSlotFen(ci, timeIdx) : slotPrice(S.dayOffset, t);\\n      let cellClass, cellLabel;\\n      if (isClosed) {\\n        cellClass = 'closed'; cellLabel = '';\\n      } else if (fen === -1) {\\n        cellClass = 'booked'; cellLabel = '满';\\n      } else {\\n        cellClass = fen === 1000 ? 'cheap' : 'exp';\\n        cellLabel = fen === 1000 ? '10' : '40';\\n      }\\n      const onclick = (isClosed || fen === -1) ? '' : `onclick=\\\"toggleCell('${c}','${t}')\\\"`;\\n      rHTML += `<td class=\\\"slot ${cellClass}\\\" id=\\\"slot_${c}_${tid}\\\"\\n        ${onclick} data-fen=\\\"${fen}\\\">${cellLabel}</td>`;\\n    });\\n    tr.innerHTML = rHTML;\\n    body.appendChild(tr);\\n  });\\n}";

modified = modified.replace(oldBuildGrid, newBuildGrid);
console.log(modified === c ? 'WARN: buildGrid replace failed' : 'OK: buildGrid now shows all times, marks booked/closed, skips last row');

// === FIX 3: applySchedule - FIX x/y swap + add conflictList processing ===
// Server uses x=timeIdx, y=courtIdx (verified by React code Booking.tsx)
// priceMap key is "courtIdx-timeIdx", so we need p.y + '-' + p.x
const oldApply = "function applySchedule(rd) {\\n  D.courts = {};\\n  D.courtOrder = [];\\n  D.times = [];\\n  D.allTimes = [];\\n  D.slotIdx = {};\\n  D.timeList = rd.timeList || [];\\n  D.priceMap = {};\\n\\n  (rd.nodeList || []).forEach((n, i) => {\\n    D.courts[n.sitename] = n.nodeid;\\n    D.courtOrder.push(n.sitename);\\n  });\\n\\n  (rd.timeList || []).forEach((t, i) => {\\n    D.allTimes.push(t.time);\\n    D.slotIdx[t.time] = i;\\n    if (t.status === '0') D.times.push(t.time);\\n  });\\n\\n  (rd.priceList || []).forEach(p => {\\n    D.priceMap[p.x + '-' + p.y] = parseInt(p.price) * 100;\\n  });\\n\\n  D.loaded = true;\\n  selected.clear();\\n  closedSet.clear();\\n  bookedSet.clear();\\n  buildGrid();\\n\\n  D.timeList.forEach(t => {\\n    if (t.status === '1') {\\n      D.courtOrder.forEach(court => {\\n        const tid = t.time.replace(':', '');\\n        const cell = document.getElementById(`slot_${court}_${tid}`);\\n        if (cell) {\\n          cell.classList.remove('on', 'cheap', 'exp');\\n          cell.classList.add('closed');\\n          cell.textContent = '';\\n          closedSet.add(court + '-' + t.time);\\n        }\\n      });\\n    }\\n  });\\n  updateSummary();\\n}";

const newApply = "function applySchedule(rd) {\\n  D.courts = {};\\n  D.courtOrder = [];\\n  D.times = [];\\n  D.allTimes = [];\\n  D.slotIdx = {};\\n  D.timeList = rd.timeList || [];\\n  D.priceMap = {};\\n\\n  (rd.nodeList || []).forEach((n, i) => {\\n    D.courts[n.sitename] = n.nodeid;\\n    D.courtOrder.push(n.sitename);\\n  });\\n\\n  (rd.timeList || []).forEach((t, i) => {\\n    D.allTimes.push(t.time);\\n    D.slotIdx[t.time] = i;\\n    if (t.status === '0') D.times.push(t.time);\\n  });\\n\\n  (rd.priceList || []).forEach(p => {\\n    D.priceMap[p.y + '-' + p.x] = parseInt(p.price) * 100;\\n  });\\n\\n  D.loaded = true;\\n  selected.clear();\\n  closedSet.clear();\\n  bookedSet.clear();\\n\\n  (rd.conflictList || []).forEach(item => {\\n    const parts = item.split('-');\\n    const courtIdx = parseInt(parts[0]);\\n    const timeIdx = parseInt(parts[1]);\\n    const courtName = D.courtOrder[courtIdx];\\n    const timeStr = D.allTimes[timeIdx];\\n    if (courtName && timeStr) bookedSet.add(courtName + '-' + timeStr);\\n  });\\n\\n  buildGrid();\\n  updateSummary();\\n}";

modified = modified.replace(oldApply, newApply);
console.log(modified === c ? 'WARN: applySchedule replace failed' : 'OK: applySchedule x/y swap fixed + conflictList processing added');

// === FIX 4: toggleCell - skip booked cells ===
const oldToggleCell = "function toggleCell(court, time) {\\n  if (closedSet.has(court + '-' + time)) return;\\n  const key = court + '-' + time;";

const newToggleCell = "function toggleCell(court, time) {\\n  if (closedSet.has(court + '-' + time) || bookedSet.has(court + '-' + time)) return;\\n  const key = court + '-' + time;";

modified = modified.replace(oldToggleCell, newToggleCell);
console.log(modified === c ? 'WARN: toggleCell replace failed' : 'OK: toggleCell skips booked cells');

// === FIX 5: refreshPriceClasses - skip booked cells ===
const oldRefresh = "function refreshPriceClasses() {\\n  if (!D.loaded) return;\\n  document.querySelectorAll('.slot').forEach(cell => {\\n    if (cell.classList.contains('closed')) return;\\n    if (cell.classList.contains('on')) return;";

const newRefresh = "function refreshPriceClasses() {\\n  if (!D.loaded) return;\\n  document.querySelectorAll('.slot').forEach(cell => {\\n    if (cell.classList.contains('closed') || cell.classList.contains('booked')) return;\\n    if (cell.classList.contains('on')) return;";

modified = modified.replace(oldRefresh, newRefresh);
console.log(modified === c ? 'WARN: refreshPriceClasses replace failed' : 'OK: refreshPriceClasses skips booked cells');

// === FIX 6: Add booked CSS style (red background matching actual app) ===
const oldBookedCSS = '.closed { background:#e0e0e0; color:#999; cursor:not-allowed; }';
const newBookedCSS = '.closed { background:#e0e0e0; color:#999; cursor:not-allowed; } .booked { background:#7f1d1d; color:#fca5a5; cursor:not-allowed; font-size:10px; } .leg-dot.booked { background:#7f1d1d; }';

modified = modified.replace(oldBookedCSS, newBookedCSS);
console.log(modified === c ? 'WARN: booked CSS replace failed' : 'OK: Added .booked CSS style');

// === FIX 7: Update version ===
modified = modified.replace(/v12\.0/g, 'v15.0');

fs.writeFileSync('d:/Documents/code/badmintonbooker_solo/worker_v15.js', modified);
console.log('Created worker_v15.js, length:', modified.length);