(function () {
  'use strict';

  const D = window.MD;
  const root = document.documentElement;
  const STORE = 'mydevice.v1';
  const HOURS = 'mydevice.hours';
  const DESIGN = { landscape: [1920, 1080], portrait: [1080, 1920] };
  const STATUS = { detected: '已偵測', guess: '推測', manual: '已選擇', preset: '常見值', empty: '待選擇' };
  const GAUGE_LEN = 804.25;

  const $ = function (s, el) { return (el || document).querySelector(s); };
  const $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  let det = null;
  let detPromise = null;
  let state = null;
  let dlg = null;
  let scanRun = 0;
  let toastTimer = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function num(n) {
    if (n >= 100) return String(Math.round(n));
    if (n >= 10) return String(Math.round(n * 10) / 10).replace(/\.0$/, '');
    return String(Math.round(n * 10) / 10).replace(/\.0$/, '');
  }

  function wattText(a, b) {
    if (a === b) return num(a) + ' W';
    return num(a) + '–' + num(b) + ' W';
  }

  function stars(n) {
    return '★'.repeat(Math.max(1, Math.min(5, n)));
  }

  function bytes(n) {
    if (!n) return '0';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
    return (n >= 100 ? Math.round(n) : Math.round(n * 10) / 10) + ' ' + u[i];
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('is-show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove('is-show'); }, 2600);
  }

  function fit() {
    const a = document.activeElement;
    if (a && a.tagName === 'INPUT' && (a.type === 'search' || a.type === 'number') && root.getAttribute('data-device') === 'touch') return;
    const vv = window.visualViewport;
    if (vv && vv.scale > 1.01) return;
    const w = vv ? vv.width : window.innerWidth;
    const h = vv ? vv.height : window.innerHeight;
    const layout = w >= h ? 'landscape' : 'portrait';
    const size = DESIGN[layout];
    root.setAttribute('data-layout', layout);
    root.style.setProperty('--scale', Math.min(w / size[0], h / size[1]).toFixed(5));
  }

  function makeStars() {
    const box = $('#stars');
    let html = '';
    for (let i = 0; i < 90; i++) {
      html += '<span style="left:' + (Math.random() * 100).toFixed(2) + '%;top:' + (Math.random() * 100).toFixed(2) +
        '%;--s:' + (Math.random() * 2.2 + 0.8).toFixed(1) + 'px;--t:' + (Math.random() * 4 + 3).toFixed(1) +
        's;--d:-' + (Math.random() * 6).toFixed(1) + 's"></span>';
    }
    box.innerHTML = html;
  }

  function inlineEmblem() {
    const src = document.getElementById('emblem');
    const svg = $('.cover-emblem svg');
    if (src && svg) svg.innerHTML = src.innerHTML;
  }

  function boot() {
    const bar = $('#loaderBar');
    const pct = $('#loaderPct');
    let p = 0;
    const tick = setInterval(function () {
      p = Math.min(p + Math.random() * 14, 92);
      bar.style.width = p + '%';
      pct.textContent = Math.round(p) + '%';
    }, 120);
    const fonts = document.fonts && document.fonts.ready ? Promise.race([document.fonts.ready, wait(2500)]) : Promise.resolve();
    const loaded = document.readyState === 'complete' ? Promise.resolve() : Promise.race([
      new Promise(function (r) { window.addEventListener('load', r, { once: true }); }),
      wait(4000)
    ]);
    detPromise = window.MDDetect.run();
    Promise.all([fonts, loaded, wait(900)]).then(function () {
      clearInterval(tick);
      bar.style.width = '100%';
      pct.textContent = '100%';
      setTimeout(function () {
        $('#loader').classList.add('is-done');
        root.classList.add('ready');
      }, 280);
    });
  }

  function flash() {
    const f = document.createElement('div');
    f.className = 'flash';
    document.body.appendChild(f);
    setTimeout(function () { f.remove(); }, 650);
  }

  function go(name) {
    const cur = $('.scene.is-active');
    const next = $('.scene[data-scene="' + name + '"]');
    if (!next) return;
    closeModal();
    if (name === 'parts') renderParts(true);
    if (name === 'result') renderResult();
    if (cur !== next) {
      if (cur) cur.classList.remove('is-active');
      next.classList.add('is-active');
      flash();
    }
    root.setAttribute('data-scene', name);
    if (name === 'result') animateResult();
    if (name === 'scan') runScan();
  }

  function slotsFor(t) {
    return D.slots.filter(function (s) { return s.types.indexOf(t) >= 0; });
  }

  function optionsFor(slot, t) {
    return (slot.options || []).filter(function (o) { return o.types.indexOf(t) >= 0; });
  }

  function optById(slot, id) {
    return (slot.options || []).find(function (o) { return o.id === id; }) || null;
  }

  function slotName(slot, t) {
    return (slot.names && slot.names[t]) || slot.name;
  }

  function cleanGpu() {
    return det && det.gl && !det.gl.software && !det.gl.masked ? det.gl.clean : '';
  }

  function guessType() {
    const d = det;
    if (d.isIPhone || d.isAndroidMobile || (d.ud && d.ud.mobile)) return { id: 'mobile', status: 'detected' };
    if (d.isIPad || d.isAndroid) return { id: 'mobile', status: 'detected' };
    if (/laptop|max-q/i.test(cleanGpu())) return { id: 'laptop', status: 'detected' };
    if (d.battery && !d.battery.desktopLike) return { id: 'laptop', status: 'detected' };
    if (d.screen.touch > 1 && !d.isMac) return { id: 'laptop', status: 'guess' };
    return { id: 'desktop', status: 'guess' };
  }

  function appleChip() {
    const m = cleanGpu().toLowerCase().match(/apple m(\d+)\s*(pro|max|ultra)?/);
    return m ? (m[2] ? 'apple-' + m[2] : 'apple-m') : null;
  }

  function guessCpu(t) {
    const d = det;
    const s = cleanGpu().toLowerCase();
    if (t === 'mobile') {
      if (d.isIPhone) return { v: { id: 'soc-apple-a' }, status: 'detected' };
      if (d.isIPad) return { v: { id: appleChip() ? 'soc-apple-m' : 'soc-apple-a' }, status: 'guess' };
      const m = d.memory || 0;
      if (!m) return null;
      return { v: { id: m >= 8 ? 'soc-flag' : m >= 4 ? 'soc-mid' : 'soc-entry' }, status: 'guess' };
    }
    const chip = appleChip();
    if (chip) {
      if (chip === 'apple-ultra' && t === 'laptop') return { v: { id: 'apple-max' }, status: 'guess' };
      return { v: { id: chip }, status: 'detected' };
    }
    if (d.isMac && /apple/.test(s)) return { v: { id: 'apple-m' }, status: 'guess' };
    if (/adreno|snapdragon|qualcomm/.test(s) && t !== 'desktop') return { v: { id: 'lcpu-snap' }, status: 'detected' };
    const n = d.threads;
    if (!n) return null;
    let id;
    if (t === 'desktop') {
      id = n <= 8 ? 'dcpu-entry' : n <= 12 ? 'dcpu-main' : n <= 16 ? 'dcpu-r7' : n <= 20 ? 'dcpu-main-k' : n <= 28 ? 'dcpu-i7' : n <= 32 ? 'dcpu-r9' : 'dcpu-ws';
    } else {
      id = n <= 4 ? 'lcpu-n' : n <= 12 ? 'lcpu-u' : n <= 20 ? 'lcpu-h' : 'lcpu-hx';
    }
    return { v: { id: id }, status: 'guess' };
  }

  function guessGpu(t) {
    const d = det;
    const raw = cleanGpu();
    const s = raw.toLowerCase();
    const wg = d.gpu;
    if (!s) {
      if (wg && wg.vendor === 'apple') return { v: { id: 'igpu-apple' }, status: 'guess' };
      return null;
    }
    if (/apple/.test(s)) return { v: { id: 'igpu-apple' }, status: 'detected' };
    if (/adreno|mali|powervr|xclipse|immortalis/.test(s)) return { v: { id: 'igpu-soc' }, status: 'detected' };
    const laptopName = /laptop|mobile|max-q/.test(s);
    if (laptopName || (t === 'laptop' && /rtx|gtx|radeon rx|mx\s*\d/.test(s))) {
      let id = null;
      if (/rtx\s*\d0[89]0|rtx\s*[23]0[89]0/.test(s)) id = 'lgpu-high';
      else if (/rtx\s*\d0[67]0/.test(s)) id = 'lgpu-mid';
      else if (/rtx\s*\d050|gtx|mx\s*\d/.test(s)) id = 'lgpu-low';
      else if (/radeon/.test(s)) id = 'lgpu-amd';
      if (id && t !== 'desktop') return { v: { id: id }, status: 'detected' };
    }
    if (t !== 'laptop') {
      for (let i = 0; i < D.gpuMatchers.length; i++) {
        if (D.gpuMatchers[i].re.test(s)) return { v: { id: D.gpuMatchers[i].id }, status: 'detected' };
      }
    }
    const integrated = /intel/.test(s) ? 'igpu-intel' : /radeon|amd/.test(s) && !/\brx\b/.test(s) ? 'igpu-amd' : null;
    if (integrated) {
      if (wg && wg.vendor === 'nvidia' && t === 'laptop') return { v: { id: 'lgpu-mid' }, status: 'guess' };
      if (wg && wg.vendor === 'nvidia' && t !== 'laptop') return null;
      return { v: { id: integrated }, status: 'detected' };
    }
    return null;
  }

  function guessRam(t) {
    const m = det.memory;
    if (!m) return null;
    if (t === 'laptop' || appleChip() || det.isMac) {
      return { v: { counts: { onboard: m >= 8 ? 2 : Math.max(1, Math.round(m / 8)) } }, status: 'guess' };
    }
    return { v: { counts: { ddr4: m >= 8 ? 2 : 1 } }, status: 'guess' };
  }

  function guessMonitor() {
    const sc = det.screen;
    const pw = Math.max(sc.pw, sc.ph);
    const ph = Math.min(sc.pw, sc.ph);
    const ratio = pw / ph;
    let id;
    if (ratio >= 2.2) id = 'mon-34uw';
    else if (pw >= 3800) id = 'mon-27-4k';
    else if (pw >= 2500) id = 'mon-27';
    else id = 'mon-24';
    if (sc.extended) id = id === 'mon-27' || id === 'mon-27-4k' ? 'mon-2x27' : 'mon-2x24';
    return { v: { id: id }, status: 'guess' };
  }

  function guessPanel(t) {
    const sc = det.screen;
    if (t === 'laptop') {
      const id = det.refresh && det.refresh >= 120 ? 'pnl-16g' : sc.w <= 1536 ? 'pnl-13' : 'pnl-15';
      return { v: { id: id }, status: 'guess' };
    }
    const short = Math.min(sc.w, sc.h);
    const long = Math.max(sc.w, sc.h);
    let id;
    if (short < 600) id = long >= 900 ? 'pnl-phone-l' : 'pnl-phone';
    else id = short >= 1000 ? 'pnl-tab-l' : 'pnl-tab';
    return { v: { id: id }, status: 'guess' };
  }

  function guessCharge(t) {
    const b = det.battery;
    if (!b || b.desktopLike) return null;
    if (t === 'laptop') return { v: { id: b.charging ? 'chg-normal' : 'chg-none' }, status: 'guess' };
    if (t === 'mobile') return { v: { id: b.charging ? 'mchg-fast' : 'mchg-none' }, status: 'guess' };
    return null;
  }

  function guessSlot(slot, t) {
    if (!det) return null;
    switch (slot.id) {
      case 'cpu': return guessCpu(t);
      case 'gpu': return guessGpu(t);
      case 'ram': return guessRam(t);
      case 'monitor': return guessMonitor();
      case 'panel': return guessPanel(t);
      case 'charge': return guessCharge(t);
      default: return null;
    }
  }

  function validValue(slot, v, t) {
    if (!v || typeof v !== 'object') return false;
    if (v.custom) return isFinite(v.idle) && isFinite(v.max) && v.idle >= 0 && v.max >= v.idle;
    if (slot.kind === 'counter') return !!v.counts && typeof v.counts === 'object';
    const o = optById(slot, v.id);
    return !!o && o.types.indexOf(t) >= 0;
  }

  function loadSaved() {
    try {
      return JSON.parse(localStorage.getItem(STORE) || 'null');
    } catch (e) {
      return null;
    }
  }

  function save() {
    if (!state) return;
    const out = { type: state.type, typeManual: state.typeStatus === 'manual', byType: {} };
    Object.keys(state.byType).forEach(function (t) {
      const b = state.byType[t];
      const vals = {};
      Object.keys(b.values).forEach(function (k) {
        if (b.status[k] === 'manual' || b.status[k] === 'preset') vals[k] = { v: b.values[k], s: b.status[k] };
      });
      out.byType[t] = vals;
    });
    if (state.saved && state.saved.byType) {
      Object.keys(state.saved.byType).forEach(function (t) {
        if (!out.byType[t]) out.byType[t] = state.saved.byType[t];
      });
    }
    try {
      localStorage.setItem(STORE, JSON.stringify(out));
    } catch (e) {
      return;
    }
  }

  function initState() {
    const g = guessType();
    const saved = loadSaved();
    state = { type: g.id, typeStatus: g.status, guessType: g, byType: {}, saved: saved };
    if (saved && saved.typeManual && D.typeById[saved.type]) {
      state.type = saved.type;
      state.typeStatus = 'manual';
    }
    ensureType(state.type);
  }

  function ensureType(t) {
    if (state.byType[t]) return state.byType[t];
    const b = { values: {}, status: {} };
    slotsFor(t).forEach(function (slot) {
      const g = guessSlot(slot, t);
      if (g && validValue(slot, g.v, t)) {
        b.values[slot.id] = g.v;
        b.status[slot.id] = g.status;
      } else {
        b.status[slot.id] = 'empty';
      }
    });
    const sv = state.saved && state.saved.byType && state.saved.byType[t];
    if (sv) {
      Object.keys(sv).forEach(function (k) {
        const slot = D.slotById[k];
        if (slot && slot.types.indexOf(t) >= 0 && sv[k] && validValue(slot, sv[k].v, t)) {
          b.values[k] = sv[k].v;
          b.status[k] = sv[k].s === 'preset' ? 'preset' : 'manual';
        }
      });
    }
    state.byType[t] = b;
    return b;
  }

  function cur() {
    return ensureType(state.type);
  }

  function valueOf(slot, v) {
    if (!v) return null;
    if (v.custom) return { idle: +v.idle, max: +v.max };
    if (slot.kind === 'counter') {
      let i = 0;
      let m = 0;
      slot.items.forEach(function (it) {
        const c = v.counts[it.id] || 0;
        i += c * it.idle;
        m += c * it.max;
      });
      return { idle: i, max: m };
    }
    const o = optById(slot, v.id);
    if (!o) return null;
    return { idle: o.idle || 0, max: o.max || 0, eff: o.eff, opt: o };
  }

  function describe(slot, v) {
    if (!v) return { text: '尚未選擇', watt: '點擊選擇', rank: 1 };
    if (v.custom) return { text: '自訂瓦數', watt: wattText(+v.idle, +v.max), rank: 3 };
    if (slot.kind === 'counter') {
      const parts = [];
      slot.items.forEach(function (it) {
        const c = v.counts[it.id] || 0;
        if (c > 0) parts.push(it.short + ' ×' + c);
      });
      const val = valueOf(slot, v);
      const rank = val.max >= 40 ? 4 : val.max >= 15 ? 3 : val.max > 0 ? 2 : 1;
      return { text: parts.length ? parts.join('、') : '無', watt: wattText(val.idle, val.max), rank: rank };
    }
    const o = optById(slot, v.id);
    if (!o) return { text: '尚未選擇', watt: '點擊選擇', rank: 1 };
    if (slot.role === 'eff') return { text: o.name, watt: '轉換效率約 ' + Math.round(o.eff * 100) + '%', rank: o.rank };
    return { text: o.name, watt: wattText(o.idle, o.max), rank: o.rank };
  }

  function renderTypeBar() {
    let html = D.types.map(function (x) {
      return '<button type="button" class="type-btn' + (x.id === state.type ? ' is-on' : '') + '" data-type="' + x.id + '">' +
        '<i class="bi ' + x.icon + '"></i>' + x.name + '</button>';
    }).join('');
    const st = state.typeStatus;
    html += '<span class="type-status"><em class="badge b-' + st + '">' + (st === 'manual' ? '已選擇' : STATUS[st]) + '</em></span>';
    $('#typeBar').innerHTML = html;
  }

  function cardHtml(slot, i, animate) {
    const t = state.type;
    const b = cur();
    const st = b.status[slot.id] || 'empty';
    const v = b.values[slot.id];
    const info = describe(slot, v);
    const cls = 'slot r' + info.rank + (st === 'empty' ? ' is-empty' : '') + (animate ? ' rise' : '');
    return '<button type="button" class="' + cls + '" style="--i:' + (i + 2) + '" data-slot="' + slot.id + '">' +
      '<span class="slot-ico"><i class="bi ' + slot.icon + '"></i></span>' +
      '<span class="slot-name">' + esc(slotName(slot, t)) + '<em class="badge b-' + st + '">' + STATUS[st] + '</em></span>' +
      '<span class="slot-val">' + esc(info.text) + '</span>' +
      '<span class="slot-foot"><span class="slot-w">' + esc(info.watt) + '</span>' +
      (st === 'empty' ? '' : '<span class="stars">' + stars(info.rank) + '</span>') + '</span>' +
      '</button>';
  }

  function renderParts(animate) {
    if (!state) return;
    renderTypeBar();
    const list = slotsFor(state.type);
    const grid = $('#slotGrid');
    grid.classList.toggle('is-few', list.length <= 3);
    grid.innerHTML = list.map(function (s, i) { return cardHtml(s, i, animate); }).join('');
    updateHint();
  }

  function refreshCard(id) {
    const el = $('.slot[data-slot="' + id + '"]');
    if (!el) return;
    const slot = D.slotById[id];
    const i = slotsFor(state.type).indexOf(slot);
    const tmp = document.createElement('div');
    tmp.innerHTML = cardHtml(slot, i, false);
    el.replaceWith(tmp.firstChild);
    updateHint();
  }

  function emptySlots() {
    const b = cur();
    return slotsFor(state.type).filter(function (s) { return !b.values[s.id] || b.status[s.id] === 'empty'; });
  }

  function updateHint() {
    const n = emptySlots().length;
    const h = $('#partsHint');
    h.classList.toggle('is-ok', n === 0);
    h.innerHTML = n ? '還有<b>' + n + '</b>個零件讀不到，請點擊卡片自行選擇' : '<b><i class="bi bi-check-circle-fill"></i></b>零件都準備好了，可以計算電量';
    $('#btnCalc').classList.toggle('is-locked', n > 0);
  }

  function hintFor(slot, t) {
    const d = det;
    const lines = [];
    const g = guessSlot(slot, t);
    if (slot.id === 'cpu') {
      if (d.threads) lines.push('瀏覽器回報 <b>' + d.threads + ' 個執行緒</b>');
      if (appleChip()) lines.push('顯示晶片名稱是 <b>' + esc(cleanGpu()) + '</b>');
    }
    if (slot.id === 'gpu') {
      if (cleanGpu()) lines.push('偵測到 <b>' + esc(cleanGpu()) + '</b>');
      else if (d.gl && d.gl.software) lines.push('瀏覽器目前使用軟體繪圖，讀不到顯示卡');
      else lines.push('瀏覽器隱藏了顯示卡名稱');
      if (d.gpu && d.gpu.vendor) lines.push('WebGPU 高效能顯示卡：<b>' + esc(d.gpu.vendor) + (d.gpu.architecture ? ' · ' + esc(d.gpu.architecture) : '') + '</b>');
    }
    if (slot.id === 'ram' && d.memory) lines.push('瀏覽器回報約 <b>' + (d.memory >= 8 ? '8 GB 以上' : d.memory + ' GB') + '</b>');
    if (slot.id === 'storage' && d.storage) lines.push('瀏覽器可用空間約 <b>' + bytes(d.storage.quota) + '</b>（只是瀏覽器配額，不等於硬碟大小）');
    if (slot.id === 'monitor' || slot.id === 'panel') {
      lines.push('螢幕解析度 <b>' + d.screen.pw + '×' + d.screen.ph + '</b>' + (d.refresh ? '・更新率約 <b>' + d.refresh + ' Hz</b>' : '') + (d.screen.extended ? '・<b>偵測到多台螢幕</b>' : ''));
    }
    if (slot.id === 'charge' && d.battery && !d.battery.desktopLike) {
      lines.push('電池 <b>' + Math.round(d.battery.level * 100) + '%</b>・' + (d.battery.charging ? '<b>充電中</b>' : '<b>使用電池中</b>'));
    }
    if (g) lines.push((g.status === 'detected' ? '已幫你選好' : '推測是') + '標記的項目，' + (g.status === 'detected' ? '有需要再修改。' : '請確認是否正確。'));
    if (slot.tip) lines.push(slot.tip);
    return lines.join('<br>');
  }

  function openSlot(id) {
    const slot = D.slotById[id];
    const t = state.type;
    const b = cur();
    const v = b.values[id];
    const defCounts = slot.kind === 'counter' ? Object.assign({}, (slot.def && slot.def[t]) || {}) : null;
    dlg = {
      slot: slot,
      sel: v && !v.custom && v.id ? v.id : null,
      counts: v && v.counts ? Object.assign({}, v.counts) : defCounts,
      guess: guessSlot(slot, t)
    };
    $('#mIcon').className = 'bi ' + slot.icon;
    $('#mTitle').textContent = slotName(slot, t);
    $('#mHint').innerHTML = hintFor(slot, t);
    const search = $('#mSearch');
    search.value = '';
    $('#mSearchWrap').hidden = slot.kind === 'counter';
    search.placeholder = slot.ph || '搜尋關鍵字';
    const customOn = !!(v && v.custom);
    $('#mCustom').hidden = slot.role === 'eff';
    $('#mCustomOn').checked = customOn;
    const cv = v && v.custom ? v : valueOf(slot, v || (dlg.counts ? { counts: dlg.counts } : null));
    $('#mIdle').value = cv ? num(+cv.idle) : '';
    $('#mMax').value = cv ? num(+cv.max) : '';
    syncCustom();
    renderBody();
    const m = $('#modal');
    m.hidden = false;
    requestAnimationFrame(function () { requestAnimationFrame(function () { m.classList.add('is-open'); }); });
    const body = $('#mBody');
    const sel = $('.opt.is-sel', body);
    body.scrollTop = sel ? Math.max(0, sel.offsetTop - body.clientHeight / 2 + sel.offsetHeight / 2) : 0;
  }

  function closeModal() {
    const m = $('#modal');
    if (m.hidden) return;
    m.classList.remove('is-open');
    if (document.activeElement && m.contains(document.activeElement)) document.activeElement.blur();
    setTimeout(function () { if (!m.classList.contains('is-open')) m.hidden = true; }, 300);
    dlg = null;
  }

  function syncCustom() {
    const on = $('#mCustomOn').checked;
    $('#mIdle').disabled = !on;
    $('#mMax').disabled = !on;
    $('#mBody').style.opacity = on ? '.45' : '';
  }

  function renderBody() {
    const slot = dlg.slot;
    const t = state.type;
    const body = $('#mBody');
    if (slot.kind === 'counter') {
      body.innerHTML = slot.items.map(function (it) {
        const c = dlg.counts[it.id] || 0;
        return '<div class="ctr" data-item="' + it.id + '">' +
          '<p class="ctr-name">' + esc(it.name) + '<span class="ctr-w">每個 ' + wattText(it.idle, it.max) + '</span></p>' +
          '<div class="ctr-pad"><button type="button" data-step="-1" aria-label="減少"' + (c <= 0 ? ' disabled' : '') + '><i class="bi bi-dash-lg"></i></button>' +
          '<span class="ctr-num">' + c + '</span>' +
          '<button type="button" data-step="1" aria-label="增加"' + (c >= it.limit ? ' disabled' : '') + '><i class="bi bi-plus-lg"></i></button></div>' +
          '</div>';
      }).join('');
      return;
    }
    const q = $('#mSearch').value.trim().toLowerCase().replace(/\s+/g, ' ');
    const hit = function (o) {
      if (!q) return true;
      const hay = (o.name + ' ' + (o.desc || '') + ' ' + (o.key || '')).toLowerCase();
      const flat = hay.replace(/[\s\-／・、（）()]/g, '');
      return q.split(' ').every(function (w) { return hay.indexOf(w) >= 0 || flat.indexOf(w.replace(/[\-／・、（）()]/g, '')) >= 0; });
    };
    const opts = optionsFor(slot, t).filter(hit);
    if (!opts.length) {
      const others = [];
      (slot.options || []).filter(hit).forEach(function (o) {
        o.types.forEach(function (x) {
          if (x !== t && slot.types.indexOf(x) >= 0 && others.indexOf(x) < 0) others.push(x);
        });
      });
      const names = others.map(function (x) { return '「' + D.typeById[x].name + '」'; }).join('、');
      body.innerHTML = '<p class="opt-empty">' + (others.length
        ? '目前裝置類型是「' + esc(D.typeById[t].name) + '」，符合的項目在 ' + names + ' 裡，<br>切換裝置類型後就能選擇。'
        : '找不到符合的項目，可以改用下方的「自訂瓦數」。') + '</p>';
      return;
    }
    const groups = [];
    const map = {};
    opts.forEach(function (o) {
      const g = o.group || '';
      if (!map[g]) { map[g] = []; groups.push(g); }
      map[g].push(o);
    });
    const gid = dlg.guess && dlg.guess.v && dlg.guess.v.id;
    body.innerHTML = groups.map(function (g) {
      return (g && groups.length > 1 ? '<p class="opt-group">' + esc(g) + '</p>' : '') +
        '<div class="opt-grid">' + map[g].map(function (o) {
          const tag = o.id === gid ? '<em class="badge b-' + dlg.guess.status + '">' + STATUS[dlg.guess.status] + '</em>' : '';
          const w = slot.role === 'eff' ? '效率 ' + Math.round(o.eff * 100) + '%' : wattText(o.idle, o.max);
          return '<button type="button" class="opt r' + o.rank + (o.id === dlg.sel ? ' is-sel' : '') + '" data-opt="' + o.id + '">' +
            '<span class="opt-name">' + esc(o.name) + tag + '</span>' +
            '<span class="opt-w">' + w + '</span>' +
            '<span class="opt-desc">' + esc(o.desc || '') + '</span>' +
            '</button>';
        }).join('') + '</div>';
    }).join('');
  }

  function commit() {
    if (!dlg) return;
    const slot = dlg.slot;
    const b = cur();
    let v;
    if ($('#mCustomOn').checked && slot.role !== 'eff') {
      const idle = parseFloat($('#mIdle').value);
      const max = parseFloat($('#mMax').value);
      if (!isFinite(idle) || !isFinite(max) || idle < 0 || max < 0) { toast('請輸入最小與最大瓦數'); return; }
      if (max < idle) { toast('最大瓦數不能小於最小瓦數'); return; }
      if (max > 5000) { toast('瓦數太大了，請確認數值'); return; }
      v = { custom: true, idle: idle, max: max };
    } else if (slot.kind === 'counter') {
      v = { counts: Object.assign({}, dlg.counts) };
    } else {
      if (!dlg.sel) { toast('請先選擇一個項目'); return; }
      v = { id: dlg.sel };
    }
    b.values[slot.id] = v;
    b.status[slot.id] = 'manual';
    const id = slot.id;
    closeModal();
    refreshCard(id);
    save();
  }

  function quickFill() {
    const b = cur();
    const t = state.type;
    let n = 0;
    slotsFor(t).forEach(function (slot) {
      if (b.values[slot.id] && b.status[slot.id] !== 'empty') return;
      const def = slot.def && slot.def[t];
      if (def == null) return;
      b.values[slot.id] = slot.kind === 'counter' ? { counts: Object.assign({}, def) } : { id: def };
      b.status[slot.id] = 'preset';
      n++;
    });
    if (!n) { toast('沒有需要填入的項目'); return; }
    renderParts(false);
    save();
    toast('已填入 ' + n + ' 個常見值，可以再點卡片調整');
  }

  function resetType() {
    const t = state.type;
    if (state.saved && state.saved.byType) delete state.saved.byType[t];
    delete state.byType[t];
    ensureType(t);
    renderParts(false);
    save();
    toast('已清除，恢復成偵測結果');
  }

  function setType(t) {
    if (!D.typeById[t] || (t === state.type && state.typeStatus === 'manual')) return;
    state.type = t;
    state.typeStatus = 'manual';
    ensureType(t);
    renderParts(true);
    save();
  }

  function snap(list, need) {
    for (let i = 0; i < list.length; i++) if (list[i] >= need) return list[i];
    return Math.ceil(need / 100) * 100;
  }

  function compute() {
    const t = state.type;
    const b = cur();
    const base = D.base[t];
    let dcI = base.idle;
    let dcM = base.max;
    let wI = 0;
    let wM = 0;
    let effL = D.adapter[t] ? D.adapter[t].load : 0.85;
    let effI = D.adapter[t] ? D.adapter[t].idle : 0.77;
    const rows = [];
    if (base.max > 0) rows.push({ name: D.baseName[t], icon: 'bi-motherboard', idle: base.idle, max: base.max });
    slotsFor(t).forEach(function (slot) {
      const val = valueOf(slot, b.values[slot.id]);
      if (!val) return;
      if (slot.role === 'eff') {
        effL = val.eff;
        effI = Math.max(0.6, val.eff - 0.08);
        return;
      }
      const info = describe(slot, b.values[slot.id]);
      rows.push({ name: slotName(slot, t), sub: info.text, icon: slot.icon, idle: val.idle, max: val.max, wall: slot.role === 'wall' });
      if (slot.role === 'wall') { wI += val.idle; wM += val.max; } else { dcI += val.idle; dcM += val.max; }
    });
    const hostI = dcI / effI;
    const hostM = dcM / effL;
    rows.push({ name: '電源轉換損耗', sub: '效率約 ' + Math.round(effL * 100) + '%', icon: 'bi-fire', idle: hostI - dcI, max: hostM - dcM });
    let rec;
    if (t === 'desktop') {
      rec = { label: '建議電源供應器', value: snap([350, 450, 550, 650, 750, 850, 1000, 1200, 1300, 1600, 2000], dcM * 1.3), note: '主機滿載約 ' + num(dcM) + ' W，再預留 30% 餘裕' };
    } else if (t === 'mobile') {
      rec = { label: '建議充電器', value: snap([5, 10, 18, 20, 25, 30, 45, 65, 100], dcM), note: '機身滿載含充電約 ' + num(dcM) + ' W' };
    } else {
      rec = { label: '建議變壓器', value: snap([45, 65, 90, 100, 120, 140, 180, 200, 230, 240, 280, 330], dcM * 1.1), note: '機身滿載含充電約 ' + num(dcM) + ' W' };
    }
    return { min: hostI + wI, max: hostM + wM, rows: rows, rec: rec };
  }

  function rating(max) {
    const ranks = [[40, '微光節能', 1], [150, '輕巧省電', 2], [350, '均衡戰力', 3], [650, '高能爆發', 4], [Infinity, '傳說級電力', 5]];
    for (let i = 0; i < ranks.length; i++) if (max < ranks[i][0]) return { title: ranks[i][1], stars: ranks[i][2] };
    return { title: '', stars: 1 };
  }

  let lastResult = null;

  function renderResult() {
    if (!state) return;
    const r = compute();
    lastResult = r;
    const rt = rating(r.max);
    $('#rStars').textContent = '★'.repeat(rt.stars) + '☆'.repeat(5 - rt.stars);
    $('#rTitle').textContent = rt.title;
    $('#recLabel').textContent = r.rec.label;
    $('#recValue').textContent = r.rec.value;
    $('#recNote').textContent = r.rec.note;
    $('#vMin').textContent = '0';
    $('#vMax').textContent = '0';
    $('#gMin').style.strokeDashoffset = GAUGE_LEN;
    $('#gMax').style.strokeDashoffset = GAUGE_LEN;
    const rows = r.rows.filter(function (x) { return x.max > 0 || x.idle > 0; }).sort(function (a, b) { return b.max - a.max; });
    const top = rows.length ? rows[0].max : 1;
    $('#breakList').innerHTML = rows.map(function (x) {
      return '<li class="break-item"><i class="bi ' + x.icon + '"></i>' +
        '<p class="bi-name">' + esc(x.name) + (x.sub ? '<em>' + esc(x.sub) + '</em>' : '') + (x.wall ? '<em>另接插座</em>' : '') + '</p>' +
        '<p class="bi-w">' + wattText(x.idle, x.max) + '</p>' +
        '<div class="bi-bar"><span class="bm" data-w="' + (x.max / top * 100).toFixed(2) + '"></span><span class="bn" data-w="' + (x.idle / top * 100).toFixed(2) + '"></span></div>' +
        '</li>';
    }).join('');
    $('#breakList').scrollTop = 0;
    updateDaily();
  }

  function countUp(el, to) {
    const start = performance.now();
    const dur = 1300;
    function f(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = num(to * e);
      if (p < 1) requestAnimationFrame(f);
    }
    requestAnimationFrame(f);
  }

  function animateResult() {
    const r = lastResult;
    if (!r) return;
    const scale = Math.max(r.max * 1.12, 1);
    setTimeout(function () {
      $('#gMin').style.strokeDashoffset = GAUGE_LEN * (1 - Math.min(1, r.min / scale));
      $('#gMax').style.strokeDashoffset = GAUGE_LEN * (1 - Math.min(1, r.max / scale));
      countUp($('#vMin'), r.min);
      countUp($('#vMax'), r.max);
      $$('#breakList .bi-bar span').forEach(function (s) { s.style.width = s.getAttribute('data-w') + '%'; });
    }, 450);
  }

  function updateDaily() {
    const h = +$('#hours').value;
    $('#hoursOut').textContent = h;
    const r = lastResult;
    if (!r) return;
    const dMin = r.min * h / 1000;
    const dMax = r.max * h / 1000;
    const kwh = function (n) { return n >= 10 ? n.toFixed(1) : n >= 1 ? n.toFixed(2) : n.toFixed(3); };
    $('#dailyOut').innerHTML = '每天約 <b>' + kwh(dMin) + '～' + kwh(dMax) + '</b> 度<br>每月約 <b>' + kwh(dMin * 30) + '～' + kwh(dMax * 30) + '</b> 度';
  }

  function scanLines() {
    const d = det;
    const g = state.guessType;
    const gpu = cleanGpu();
    const lines = [];
    lines.push({ icon: d.os.icon, label: '作業系統', value: (d.os.name || '無法讀取') + (d.arch ? ' · ' + d.arch : ''), st: d.os.name ? 'ok' : 'fail' });
    lines.push({ icon: D.typeById[g.id].icon, label: '裝置類型', value: D.typeById[g.id].name, st: g.status === 'detected' ? 'ok' : 'part' });
    lines.push({ icon: 'bi-cpu', label: '處理器', value: d.threads ? d.threads + ' 個執行緒' : '無法讀取', st: d.threads ? 'part' : 'fail' });
    lines.push({ icon: 'bi-gpu-card', label: '顯示晶片', value: gpu || (d.gl && d.gl.software ? '軟體繪圖中，無法判斷' : '無法讀取'), st: gpu ? 'ok' : 'fail' });
    lines.push({ icon: 'bi-memory', label: '記憶體', value: d.memory ? (d.memory >= 8 ? '8 GB 以上' : '約 ' + d.memory + ' GB') : '無法讀取', st: d.memory ? 'part' : 'fail' });
    lines.push({ icon: 'bi-display', label: '螢幕', value: d.screen.pw + '×' + d.screen.ph + (d.refresh ? ' · ' + d.refresh + ' Hz' : '') + (d.screen.extended ? ' · 多螢幕' : ''), st: 'ok' });
    let bat = '無法讀取';
    let bst = 'fail';
    if (d.battery) {
      if (d.battery.desktopLike) { bat = '未偵測到電池（或已充飽）'; bst = 'part'; }
      else { bat = Math.round(d.battery.level * 100) + '% · ' + (d.battery.charging ? '充電中' : '使用電池中'); bst = 'ok'; }
    }
    lines.push({ icon: 'bi-battery-half', label: '電池', value: bat, st: bst });
    lines.push({ icon: 'bi-device-ssd', label: '儲存空間', value: d.storage ? '瀏覽器配額約 ' + bytes(d.storage.quota) : '無法讀取', st: 'fail' });
    lines.push({ icon: 'bi-hand-index', label: '觸控', value: d.screen.touch ? '支援 ' + d.screen.touch + ' 點觸控' : '不支援觸控', st: 'ok' });
    return lines;
  }

  async function runScan() {
    const id = ++scanRun;
    const scene = $('.scene-scan');
    const list = $('#scanList');
    const pct = $('#scanPct');
    const btn = $('#btnToParts');
    list.innerHTML = '';
    pct.textContent = '0';
    btn.disabled = true;
    $('#scanState').textContent = '掃描中';
    scene.classList.add('is-scanning');
    scene.classList.remove('is-done');
    if (state) save();
    if (!detPromise) detPromise = window.MDDetect.run();
    det = await detPromise;
    if (id !== scanRun) return;
    initState();
    await wait(500);
    const lines = scanLines();
    const st = { ok: '已讀取', part: '部分讀取', fail: '需手動選擇' };
    for (let i = 0; i < lines.length; i++) {
      if (id !== scanRun) return;
      const l = lines[i];
      const li = document.createElement('li');
      li.className = 'scan-item st-' + l.st;
      li.innerHTML = '<i class="bi ' + l.icon + '"></i><span class="si-label">' + esc(l.label) + '</span>' +
        '<span class="si-value" title="' + esc(l.value) + '">' + esc(l.value) + '</span><span class="si-state">' + st[l.st] + '</span>';
      list.appendChild(li);
      pct.textContent = Math.round((i + 1) / lines.length * 100);
      await wait(240);
    }
    if (id !== scanRun) return;
    scene.classList.remove('is-scanning');
    scene.classList.add('is-done');
    $('#scanState').textContent = '掃描完成';
    btn.disabled = false;
  }

  function rescan() {
    detPromise = window.MDDetect.run();
    go('scan');
  }

  function toggleFull() {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen().catch(function () { toast('這個瀏覽器不支援全螢幕'); });
  }

  function bind() {
    $('#btnStart').addEventListener('click', function () { go('scan'); });
    $('#btnToParts').addEventListener('click', function () { go('parts'); });
    $('#hudHome').addEventListener('click', function () { go('cover'); });
    $('#hudRescan').addEventListener('click', rescan);
    const full = $('#hudFull');
    if (!document.documentElement.requestFullscreen) full.hidden = true;
    full.addEventListener('click', toggleFull);
    document.addEventListener('fullscreenchange', function () {
      full.querySelector('i').className = 'bi ' + (document.fullscreenElement ? 'bi-fullscreen-exit' : 'bi-arrows-fullscreen');
    });

    $$('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.getAttribute('data-go')); });
    });

    $('#typeBar').addEventListener('click', function (e) {
      const b = e.target.closest('[data-type]');
      if (b) setType(b.getAttribute('data-type'));
    });

    $('#slotGrid').addEventListener('click', function (e) {
      const b = e.target.closest('[data-slot]');
      if (b) openSlot(b.getAttribute('data-slot'));
    });

    $('#btnQuick').addEventListener('click', quickFill);
    $('#btnReset').addEventListener('click', resetType);

    $('#btnCalc').addEventListener('click', function () {
      const empty = emptySlots();
      if (empty.length) {
        toast('還有 ' + empty.length + ' 個零件待選擇，或按「一鍵填入常見值」');
        empty.forEach(function (s) {
          const el = $('.slot[data-slot="' + s.id + '"]');
          if (!el) return;
          el.classList.remove('is-shake');
          void el.offsetWidth;
          el.classList.add('is-shake');
        });
        return;
      }
      go('result');
    });

    const modal = $('#modal');
    modal.addEventListener('click', function (e) {
      if (e.target.closest('[data-close]')) { closeModal(); return; }
      const o = e.target.closest('[data-opt]');
      if (o && dlg) {
        $('#mCustomOn').checked = false;
        syncCustom();
        dlg.sel = o.getAttribute('data-opt');
        $$('.opt', modal).forEach(function (x) { x.classList.toggle('is-sel', x === o); });
        const val = valueOf(dlg.slot, { id: dlg.sel });
        if (val && dlg.slot.role !== 'eff') {
          $('#mIdle').value = num(val.idle);
          $('#mMax').value = num(val.max);
        }
        return;
      }
      const s = e.target.closest('[data-step]');
      if (s && dlg) {
        $('#mCustomOn').checked = false;
        syncCustom();
        const id = s.closest('[data-item]').getAttribute('data-item');
        const it = dlg.slot.items.find(function (x) { return x.id === id; });
        const c = Math.max(0, Math.min(it.limit, (dlg.counts[id] || 0) + (+s.getAttribute('data-step'))));
        dlg.counts[id] = c;
        renderBody();
        const val = valueOf(dlg.slot, { counts: dlg.counts });
        $('#mIdle').value = num(val.idle);
        $('#mMax').value = num(val.max);
      }
    });
    modal.addEventListener('dblclick', function (e) {
      if (e.target.closest('[data-opt]')) commit();
    });
    $('#mOk').addEventListener('click', commit);
    $('#mCustomOn').addEventListener('change', syncCustom);
    $('#mSearch').addEventListener('input', function () { if (dlg) renderBody(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'Enter' && dlg && e.target && e.target.tagName === 'INPUT' && e.target.type === 'number') commit();
    });

    const hours = $('#hours');
    try {
      const saved = parseInt(localStorage.getItem(HOURS), 10);
      if (saved >= 1 && saved <= 24) hours.value = saved;
    } catch (e) {
      hours.value = 8;
    }
    hours.addEventListener('input', function () {
      updateDaily();
      try { localStorage.setItem(HOURS, hours.value); } catch (e) { return; }
    });

    window.addEventListener('resize', fit);
    window.addEventListener('orientationchange', function () { setTimeout(fit, 200); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);
    document.addEventListener('focusout', function () { setTimeout(fit, 300); });
  }

  fit();
  makeStars();
  inlineEmblem();
  bind();
  boot();
})();
