(function () {
  'use strict';

  const D = window.MD;
  const root = document.documentElement;
  const STORE = 'mydevice.v2';
  const HOURS = 'mydevice.hours';
  const DESIGN = { landscape: [1920, 1080], portrait: [1080, 1920] };
  const GAUGE_LEN = 804.25;

  const $ = function (s, el) { return (el || document).querySelector(s); };
  const $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  const wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  let S = { type: null, ans: {} };
  let step = 0;
  let path = [];
  let query = '';
  let custom = false;
  let counts = null;
  let advanceTimer = null;
  let toastTimer = null;
  let lastResult = null;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function num(n) {
    if (n >= 100) return String(Math.round(n));
    return String(Math.round(n * 10) / 10).replace(/\.0$/, '');
  }

  function wattText(a, b) {
    return a === b ? num(a) + ' W' : num(a) + '–' + num(b) + ' W';
  }

  function stars(n) {
    return '★'.repeat(Math.max(1, Math.min(5, n)));
  }

  function pad(n) {
    return (n < 10 ? '0' : '') + n;
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
    let html = '';
    for (let i = 0; i < 90; i++) {
      html += '<span style="left:' + (Math.random() * 100).toFixed(2) + '%;top:' + (Math.random() * 100).toFixed(2) +
        '%;--s:' + (Math.random() * 2.2 + 0.8).toFixed(1) + 'px;--t:' + (Math.random() * 4 + 3).toFixed(1) +
        's;--d:-' + (Math.random() * 6).toFixed(1) + 's"></span>';
    }
    $('#stars').innerHTML = html;
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

  function load() {
    try {
      const v = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (v && typeof v === 'object' && v.ans && typeof v.ans === 'object') {
        S = { type: D.typeById[v.type] ? v.type : null, ans: v.ans };
      }
    } catch (e) {
      S = { type: null, ans: {} };
    }
  }

  function save() {
    try {
      localStorage.setItem(STORE, JSON.stringify(S));
    } catch (e) {
      return;
    }
    updateClear();
  }

  function hasSaved() {
    return !!S.type;
  }

  function updateClear() {
    $('#btnClear').hidden = !hasSaved();
  }

  function go(name) {
    const cur = $('.scene.is-active');
    const next = $('.scene[data-scene="' + name + '"]');
    if (!next) return;
    clearTimeout(advanceTimer);
    if (name === 'result') renderResult();
    if (cur !== next) {
      if (cur) cur.classList.remove('is-active');
      next.classList.add('is-active');
      flash();
    }
    root.setAttribute('data-scene', name);
    if (name === 'result') animateResult();
    if (name === 'cover') updateClear();
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

  function answers() {
    if (!S.type) return {};
    if (!S.ans[S.type]) S.ans[S.type] = {};
    return S.ans[S.type];
  }

  function getAns(id) {
    return answers()[id] || null;
  }

  function setAns(id, a) {
    answers()[id] = a;
    save();
  }

  function steps() {
    if (!S.type) return ['type'];
    return ['type'].concat(slotsFor(S.type).map(function (s) { return s.id; }));
  }

  function unique(list) {
    const out = [];
    list.forEach(function (x) { if (x && out.indexOf(x) < 0) out.push(x); });
    return out;
  }

  function tree(slot) {
    const opts = optionsFor(slot, S.type);
    const brands = unique(opts.map(function (o) { return o.brand; }));
    const useBrand = brands.length > 1;
    return { opts: opts, brands: brands, useBrand: useBrand };
  }

  function levelInfo(slot) {
    const tr = tree(slot);
    const sub = tr.useBrand && path[0] ? tr.opts.filter(function (o) { return o.brand === path[0]; }) : tr.opts;
    const groups = unique(sub.map(function (o) { return o.group; }));
    const useGroup = groups.length > 1;
    const gi = tr.useBrand ? 1 : 0;
    if (tr.useBrand && path.length === 0) return { kind: 'brand', tr: tr, depth: 0 };
    if (useGroup && path.length === gi) return { kind: 'group', tr: tr, groups: groups, sub: sub, depth: gi };
    const leaves = useGroup ? sub.filter(function (o) { return o.group === path[gi]; }) : sub;
    return { kind: 'leaf', tr: tr, leaves: leaves };
  }

  function pathFor(slot, a) {
    if (!a || a.s !== 'answered' || !a.v || !a.v.id) return [];
    const o = optById(slot, a.v.id);
    if (!o) return [];
    const tr = tree(slot);
    const p = [];
    if (tr.useBrand) p.push(o.brand);
    const sub = tr.useBrand ? tr.opts.filter(function (x) { return x.brand === o.brand; }) : tr.opts;
    if (unique(sub.map(function (x) { return x.group; })).length > 1) p.push(o.group);
    return p;
  }

  function enterStep(i) {
    const ids = steps();
    clearTimeout(advanceTimer);
    step = Math.max(0, Math.min(ids.length - 1, i));
    query = '';
    $('#wzSearch').value = '';
    custom = false;
    path = [];
    counts = null;
    const id = ids[step];
    if (id !== 'type') {
      const slot = D.slotById[id];
      const a = getAns(id);
      custom = !!(a && a.s === 'answered' && a.v && a.v.custom);
      if (slot.kind === 'counter') {
        counts = a && a.s === 'answered' && a.v && a.v.counts ? Object.assign({}, a.v.counts) : {};
      } else {
        path = pathFor(slot, a);
      }
    }
    renderStep(true);
  }

  function nodeState(id) {
    if (id === 'type') return S.type ? 'is-done' : '';
    const a = getAns(id);
    if (!a) return '';
    return a.s === 'answered' ? 'is-done' : 'is-skip';
  }

  function renderNodes() {
    const ids = steps();
    $('#wzStep').textContent = 'STEP ' + pad(step + 1) + (S.type ? ' / ' + pad(ids.length) : '');
    $('#wzNodes').innerHTML = ids.map(function (id, i) {
      const icon = id === 'type' ? (S.type ? D.typeById[S.type].icon : 'bi-question-lg') : D.slotById[id].icon;
      const name = id === 'type' ? '裝置類型' : slotName(D.slotById[id], S.type);
      return '<li><button type="button" class="wz-node ' + nodeState(id) + (i === step ? ' is-cur' : '') + '" data-node="' + i + '" title="' + esc(name) + '" aria-label="' + esc(name) + '"><i class="bi ' + icon + '"></i></button></li>';
    }).join('');
  }

  function chCard(attr, o, opts) {
    opts = opts || {};
    const rank = o.rank || 3;
    const side = opts.more
      ? '<span class="ch-side"><i class="bi bi-chevron-right ch-arrow"></i></span>'
      : opts.side != null
        ? '<span class="ch-side"><span class="ch-w">' + opts.side + '</span>' + (opts.noStars ? '' : '<span class="stars">' + stars(rank) + '</span>') + '</span>'
        : '';
    return '<button type="button" class="ch r' + rank + (opts.sel ? ' is-sel' : '') + (opts.cls ? ' ' + opts.cls : '') + '" ' + attr + '>' +
      (opts.icon ? '<span class="ch-ico"><i class="bi ' + opts.icon + '"></i></span>' : '') +
      '<span class="ch-text"><span class="ch-name">' + esc(o.name) + '</span>' +
      (o.desc ? '<span class="ch-desc">' + esc(o.desc) + '</span>' : '') + '</span>' +
      side + '</button>';
  }

  function grid(cards, n, big) {
    return '<div class="ch-grid' + (big ? ' is-big' : '') + '" style="--n:' + n + '">' + cards.join('') + '</div>';
  }

  function leafCards(slot, leaves) {
    const a = getAns(slot.id);
    const sel = a && a.s === 'answered' && a.v && a.v.id;
    const big = leaves.length <= 4;
    const cards = leaves.map(function (o) {
      const side = slot.role === 'eff' ? '效率 ' + Math.round(o.eff * 100) + '%' : wattText(o.idle, o.max);
      return chCard('data-opt="' + o.id + '"', o, { sel: o.id === sel, side: side, icon: big ? slot.icon : null });
    });
    if (slot.role !== 'eff') cards.push(customCard(big));
    return grid(cards, cards.length, big && cards.length <= 5);
  }

  function customCard(big) {
    return chCard('data-custom="1"', { name: '自己輸入瓦數', desc: '知道確切耗電時使用', rank: 1 }, { cls: 'ch-custom', icon: big ? 'bi-pencil-square' : 'bi-pencil-square', more: true });
  }

  function hit(o, q) {
    const hay = (o.name + ' ' + (o.desc || '') + ' ' + (o.key || '') + ' ' + (o.brand || '') + ' ' + (o.group || '')).toLowerCase();
    const flat = hay.replace(/[\s\-／・、（）()]/g, '');
    return q.split(' ').every(function (w) {
      return hay.indexOf(w) >= 0 || flat.indexOf(w.replace(/[\-／・、（）()]/g, '')) >= 0;
    });
  }

  function renderSearch(slot) {
    const q = query.toLowerCase().replace(/\s+/g, ' ').trim();
    const list = optionsFor(slot, S.type).filter(function (o) { return hit(o, q); });
    if (list.length) {
      const a = getAns(slot.id);
      const sel = a && a.s === 'answered' && a.v && a.v.id;
      return grid(list.map(function (o) {
        return chCard('data-opt="' + o.id + '"', { name: o.name, desc: (o.brand ? o.brand + (o.group ? '・' + o.group : '') + '｜' : '') + o.desc, rank: o.rank }, { sel: o.id === sel, side: wattText(o.idle, o.max) });
      }), 3, false);
    }
    const others = [];
    (slot.options || []).filter(function (o) { return hit(o, q); }).forEach(function (o) {
      o.types.forEach(function (x) {
        if (x !== S.type && slot.types.indexOf(x) >= 0 && others.indexOf(x) < 0) others.push(x);
      });
    });
    if (others.length) {
      return '<p class="wz-empty">目前裝置類型是「' + esc(D.typeById[S.type].name) + '」，符合的項目在 ' +
        others.map(function (x) { return '「' + D.typeById[x].name + '」'; }).join('、') + ' 裡。<br>可以回到第一步換裝置類型，或改用「自己輸入瓦數」。</p>' + grid([customCard(false)], 1, false);
    }
    return '<p class="wz-empty">找不到符合的項目，可以換個關鍵字，或改用「自己輸入瓦數」。</p>' + grid([customCard(false)], 1, false);
  }

  function renderCustom(slot) {
    const a = getAns(slot.id);
    let idle = '';
    let max = '';
    if (a && a.s === 'answered' && a.v) {
      if (a.v.custom) { idle = num(a.v.idle); max = num(a.v.max); }
      else {
        const val = valueOf(slot, a.v);
        if (val) { idle = num(val.idle); max = num(val.max); }
      }
    }
    return '<div class="custom-box">' +
      '<p class="custom-tip">輸入這個零件待機（最小）與滿載（最大）時的耗電</p>' +
      '<div class="custom-row">' +
      '<label class="custom-field">最小<input type="number" id="cIdle" min="0" max="5000" step="0.1" inputmode="decimal" value="' + idle + '">W</label>' +
      '<label class="custom-field">最大<input type="number" id="cMax" min="0" max="5000" step="0.1" inputmode="decimal" value="' + max + '">W</label>' +
      '</div></div>';
  }

  function renderCounter(slot) {
    return '<div class="ctr-list">' + slot.items.map(function (it) {
      const c = counts[it.id] || 0;
      return '<div class="ctr" data-item="' + it.id + '">' +
        '<p class="ctr-name">' + esc(it.name) + '<span class="ctr-w">每個 ' + wattText(it.idle, it.max) + '</span></p>' +
        '<div class="ctr-pad"><button type="button" data-step="-1" aria-label="減少"' + (c <= 0 ? ' disabled' : '') + '><i class="bi bi-dash-lg"></i></button>' +
        '<span class="ctr-num">' + c + '</span>' +
        '<button type="button" data-step="1" aria-label="增加"' + (c >= it.limit ? ' disabled' : '') + '><i class="bi bi-plus-lg"></i></button></div>' +
        '</div>';
    }).join('') + '</div>' + '<div class="ctr-more">' + grid([customCard(false)], 1, false) + '</div>';
  }

  function renderStep(animate) {
    const ids = steps();
    const id = ids[step];
    renderNodes();
    const main = $('#wzMain');
    if (animate) {
      main.classList.remove('is-in');
      void main.offsetWidth;
      main.classList.add('is-in');
    }
    const last = step === ids.length - 1 && S.type;
    $('#wzNextLabel').textContent = last ? '查看結果' : '下一步';
    $('#wzBack').disabled = step === 0 && !path.length && !custom && !query;
    let q = '';
    let crumb = '';
    let help = '';
    let body = '';
    let search = false;
    let ph = '';
    if (id === 'type') {
      q = '你要計算哪一種裝置？';
      help = '選好之後，會依裝置類型一題一題問你；每一題都可以略過。';
      body = grid(D.types.map(function (t) {
        return chCard('data-type="' + t.id + '"', { name: t.name, desc: t.desc, rank: S.type === t.id ? 5 : 3 }, { sel: S.type === t.id, icon: t.icon });
      }), 4, true);
      $('#wzSkip').hidden = true;
    } else {
      const slot = D.slotById[id];
      $('#wzSkip').hidden = false;
      help = typeof slot.help === 'string' ? slot.help : (slot.help[S.type] || '');
      if (custom) {
        q = slotName(slot, S.type) + '耗電多少？';
        crumb = '自己輸入瓦數';
        body = renderCustom(slot);
      } else if (slot.kind === 'counter') {
        q = slot.qs[0];
        body = renderCounter(slot);
      } else {
        search = !!slot.search;
        ph = slot.ph || '';
        if (search && query.trim()) {
          q = slot.qs[slot.qs.length - 1];
          crumb = '搜尋「' + query.trim() + '」';
          body = renderSearch(slot);
        } else {
          const lv = levelInfo(slot);
          crumb = path.join(' › ');
          if (lv.kind === 'brand') {
            q = slot.qs[0];
            const big = lv.tr.brands.length <= 4;
            body = grid(lv.tr.brands.map(function (b) {
              const meta = D.brands[b] || { icon: slot.icon, desc: '' };
              return chCard('data-brand="' + esc(b) + '"', { name: b, desc: meta.desc, rank: 3 }, { icon: meta.icon, more: !big });
            }).concat(big ? [] : [customCard(false)]), lv.tr.brands.length, big);
          } else if (lv.kind === 'group') {
            q = slot.qs[Math.min(lv.depth, slot.qs.length - 1)];
            body = grid(lv.groups.map(function (g) {
              const n = lv.sub.filter(function (o) { return o.group === g; });
              const top = n.reduce(function (m, o) { return Math.max(m, o.rank); }, 1);
              return chCard('data-group="' + esc(g) + '"', { name: g, desc: n.slice(0, 3).map(function (o) { return o.name.replace(/^(GeForce|Radeon)\s/, ''); }).join('、') + (n.length > 3 ? ' 等 ' + n.length + ' 款' : ''), rank: top }, { more: true, icon: slot.icon });
            }), 3, false);
          } else {
            q = slot.qs[slot.qs.length - 1];
            body = leafCards(slot, lv.leaves);
          }
        }
      }
    }
    $('#wzQ').textContent = q;
    $('#wzCrumb').textContent = crumb;
    $('#wzHelp').textContent = help;
    $('#wzSearchWrap').hidden = !search;
    $('#wzSearch').placeholder = ph;
    $('#wzBody').innerHTML = body;
    $('#wzBody').scrollTop = 0;
    const sel = $('#wzBody .ch.is-sel');
    if (sel) {
      const b = $('#wzBody');
      b.scrollTop = Math.max(0, sel.offsetTop - b.clientHeight / 2 + sel.offsetHeight / 2);
    }
  }

  function advance() {
    const ids = steps();
    if (step >= ids.length - 1) {
      if (!S.type) { toast('請先選擇裝置類型'); return; }
      go('result');
      return;
    }
    enterStep(step + 1);
  }

  function commitCustom(slot) {
    const idle = parseFloat(($('#cIdle') || {}).value);
    const max = parseFloat(($('#cMax') || {}).value);
    if (!isFinite(idle) || !isFinite(max) || idle < 0 || max < 0) { toast('請輸入最小與最大瓦數'); return false; }
    if (max < idle) { toast('最大瓦數不能小於最小瓦數'); return false; }
    if (max > 5000) { toast('瓦數太大了，請確認數值'); return false; }
    setAns(slot.id, { s: 'answered', v: { custom: true, idle: idle, max: max } });
    return true;
  }

  function onNext() {
    const id = steps()[step];
    if (id === 'type') {
      if (!S.type) { toast('請先選擇裝置類型'); return; }
      advance();
      return;
    }
    const slot = D.slotById[id];
    if (custom) {
      if (commitCustom(slot)) advance();
      return;
    }
    if (slot.kind === 'counter') {
      setAns(slot.id, { s: 'answered', v: { counts: Object.assign({}, counts) } });
      advance();
      return;
    }
    const a = getAns(slot.id);
    if (!a || a.s !== 'answered') { toast('請選一個項目，或按「略過這題」'); return; }
    advance();
  }

  function onBack() {
    clearTimeout(advanceTimer);
    if (custom) { custom = false; renderStep(true); return; }
    if (query) { query = ''; $('#wzSearch').value = ''; renderStep(true); return; }
    if (path.length) { path.pop(); renderStep(true); return; }
    if (step > 0) enterStep(step - 1);
  }

  function onSkip() {
    const id = steps()[step];
    if (id === 'type') return;
    setAns(id, { s: 'skipped' });
    advance();
  }

  function onBodyClick(e) {
    const t = e.target.closest('[data-type]');
    if (t) {
      const id = t.getAttribute('data-type');
      if (S.type !== id) { S.type = id; answers(); save(); }
      renderStep(false);
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(advance, 380);
      return;
    }
    const b = e.target.closest('[data-brand]');
    if (b) { path = [b.getAttribute('data-brand')]; renderStep(true); return; }
    const g = e.target.closest('[data-group]');
    if (g) { path.push(g.getAttribute('data-group')); renderStep(true); return; }
    const c = e.target.closest('[data-custom]');
    if (c) { custom = true; renderStep(true); setTimeout(function () { const i = $('#cIdle'); if (i && root.getAttribute('data-device') !== 'touch') i.focus(); }, 60); return; }
    const o = e.target.closest('[data-opt]');
    if (o) {
      const id = steps()[step];
      setAns(id, { s: 'answered', v: { id: o.getAttribute('data-opt') } });
      $$('#wzBody .ch').forEach(function (x) { x.classList.toggle('is-sel', x === o); });
      renderNodes();
      clearTimeout(advanceTimer);
      advanceTimer = setTimeout(advance, 380);
      return;
    }
    const s = e.target.closest('[data-step]');
    if (s && counts) {
      const slot = D.slotById[steps()[step]];
      const iid = s.closest('[data-item]').getAttribute('data-item');
      const it = slot.items.find(function (x) { return x.id === iid; });
      counts[iid] = Math.max(0, Math.min(it.limit, (counts[iid] || 0) + (+s.getAttribute('data-step'))));
      const row = s.closest('.ctr');
      $('.ctr-num', row).textContent = counts[iid];
      $('[data-step="-1"]', row).disabled = counts[iid] <= 0;
      $('[data-step="1"]', row).disabled = counts[iid] >= it.limit;
    }
  }

  function valueOf(slot, v) {
    if (!v) return null;
    if (v.custom) return { idle: +v.idle, max: +v.max };
    if (slot.kind === 'counter') {
      let i = 0;
      let m = 0;
      slot.items.forEach(function (it) {
        const c = (v.counts && v.counts[it.id]) || 0;
        i += c * it.idle;
        m += c * it.max;
      });
      return { idle: i, max: m };
    }
    const o = optById(slot, v.id);
    if (!o || o.types.indexOf(S.type) < 0) return null;
    return { idle: o.idle || 0, max: o.max || 0, eff: o.eff };
  }

  function describe(slot, v) {
    if (v.custom) return '自己輸入';
    if (slot.kind === 'counter') {
      const parts = [];
      slot.items.forEach(function (it) {
        const c = (v.counts && v.counts[it.id]) || 0;
        if (c > 0) parts.push(it.short + ' ×' + c);
      });
      return parts.length ? parts.join('、') : '無';
    }
    const o = optById(slot, v.id);
    return o ? o.name : '';
  }

  function snap(list, need) {
    for (let i = 0; i < list.length; i++) if (list[i] >= need) return list[i];
    return Math.ceil(need / 100) * 100;
  }

  function compute() {
    const t = S.type;
    const A = answers();
    const base = D.base[t];
    let dcI = base.idle;
    let dcM = base.max;
    let effL = D.adapter[t].load;
    let effI = D.adapter[t].idle;
    let effGuess = t === 'desktop';
    const rows = [];
    const skipped = [];
    let filled = 0;
    if (base.max > 0) rows.push({ name: D.baseName[t], icon: 'bi-motherboard', idle: base.idle, max: base.max });
    slotsFor(t).forEach(function (slot) {
      const a = A[slot.id];
      const val = a && a.s === 'answered' ? valueOf(slot, a.v) : null;
      if (!val) { skipped.push(slot); return; }
      filled++;
      if (slot.role === 'eff') {
        effL = val.eff;
        effI = Math.max(0.6, val.eff - 0.08);
        effGuess = false;
        return;
      }
      rows.push({ id: slot.id, name: slotName(slot, t), sub: describe(slot, a.v), icon: slot.icon, idle: val.idle, max: val.max });
      dcI += val.idle;
      dcM += val.max;
    });
    const hostI = dcI / effI;
    const hostM = dcM / effL;
    rows.push({ name: '電源轉換損耗', sub: '效率約 ' + Math.round(effL * 100) + '%' + (effGuess && t === 'desktop' ? '（未填，以銅牌估算）' : ''), icon: 'bi-fire', idle: hostI - dcI, max: hostM - dcM });
    const rec = t === 'desktop'
      ? { value: snap([350, 450, 550, 650, 750, 850, 1000, 1200, 1300, 1600, 2000], dcM * 1.3), note: '主機滿載約 ' + num(dcM) + ' W，再預留 30% 餘裕' }
      : null;
    return { min: hostI, max: hostM, rows: rows, skipped: skipped, filled: filled, rec: rec };
  }

  function rating(max) {
    const ranks = [[40, '微光節能', 1], [150, '輕巧省電', 2], [350, '均衡戰力', 3], [650, '高能爆發', 4], [Infinity, '傳說級電力', 5]];
    for (let i = 0; i < ranks.length; i++) if (max < ranks[i][0]) return { title: ranks[i][1], stars: ranks[i][2] };
    return { title: '', stars: 1 };
  }

  function renderResult() {
    if (!S.type) return;
    const r = compute();
    lastResult = r;
    const rt = rating(r.max);
    $('#rStars').textContent = '★'.repeat(rt.stars) + '☆'.repeat(5 - rt.stars);
    $('#rTitle').textContent = rt.title;
    $('.card-rec').hidden = !r.rec;
    $('.res-cards').classList.toggle('is-two', !r.rec);
    if (r.rec) {
      $('#recValue').textContent = r.rec.value;
      $('#recNote').textContent = r.rec.note;
    }
    $('#vMin').textContent = '0';
    $('#vMax').textContent = '0';
    $('#gMin').style.strokeDashoffset = GAUGE_LEN;
    $('#gMax').style.strokeDashoffset = GAUGE_LEN;
    const rows = r.rows.filter(function (x) { return x.max > 0 || x.idle > 0; }).sort(function (a, b) { return b.max - a.max; });
    const top = rows.length ? rows[0].max : 1;
    let html = rows.map(function (x) {
      return '<li class="break-item"' + (x.id ? ' data-jump="' + x.id + '" title="修改這一題"' : '') + '><i class="bi ' + x.icon + '"></i>' +
        '<p class="bi-name">' + esc(x.name) + (x.sub ? '<em>' + esc(x.sub) + '</em>' : '') + '</p>' +
        '<p class="bi-w">' + wattText(x.idle, x.max) + '</p>' +
        '<div class="bi-bar"><span class="bm" data-w="' + (x.max / top * 100).toFixed(2) + '"></span><span class="bn" data-w="' + (x.idle / top * 100).toFixed(2) + '"></span></div>' +
        '</li>';
    }).join('');
    html += r.skipped.map(function (s) {
      return '<li class="break-skip"><i class="bi ' + s.icon + '"></i><p class="bi-name">' + esc(slotName(s, S.type)) + '<em>未填寫，不計入</em></p>' +
        '<button type="button" class="skip-btn" data-jump="' + s.id + '"><i class="bi bi-pencil"></i>補填</button></li>';
    }).join('');
    $('#breakList').innerHTML = html;
    $('#breakList').scrollTop = 0;
    $('#breakNote').textContent = (r.filled === 0 ? '你還沒有填任何零件，按「修改答案」開始填寫。' : '') +
      '最大電量是所有零件同時滿載的理論值，實際使用通常介於兩者之間。數值為估算，僅供參考。點項目可以修改。';
    updateDaily();
  }

  function countUp(el, to) {
    const start = performance.now();
    function f(now) {
      const p = Math.min(1, (now - start) / 1300);
      el.textContent = num(to * (1 - Math.pow(1 - p, 3)));
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

  function jumpTo(id) {
    const i = steps().indexOf(id);
    if (i < 0) return;
    go('wizard');
    enterStep(i);
  }

  function toggleFull() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(function () { toast('這個瀏覽器不支援全螢幕'); });
  }

  function bind() {
    $('#btnStart').addEventListener('click', function () {
      go('wizard');
      enterStep(0);
    });
    $('#btnClear').addEventListener('click', function () {
      S = { type: null, ans: {} };
      save();
      toast('已清除上次的答案');
    });
    $('#hudHome').addEventListener('click', function () { go('cover'); });
    const full = $('#hudFull');
    if (!document.documentElement.requestFullscreen) full.hidden = true;
    full.addEventListener('click', toggleFull);
    document.addEventListener('fullscreenchange', function () {
      $('i', full).className = 'bi ' + (document.fullscreenElement ? 'bi-fullscreen-exit' : 'bi-arrows-fullscreen');
    });
    $$('[data-go]').forEach(function (b) {
      b.addEventListener('click', function () { go(b.getAttribute('data-go')); });
    });
    $('#btnEdit').addEventListener('click', function () {
      go('wizard');
      enterStep(1);
    });
    $('#breakList').addEventListener('click', function (e) {
      const j = e.target.closest('[data-jump]');
      if (j) jumpTo(j.getAttribute('data-jump'));
    });

    $('#wzBody').addEventListener('click', onBodyClick);
    $('#wzNodes').addEventListener('click', function (e) {
      const n = e.target.closest('[data-node]');
      if (!n) return;
      const i = +n.getAttribute('data-node');
      if (i > 0 && !S.type) return;
      enterStep(i);
    });
    $('#wzNext').addEventListener('click', onNext);
    $('#wzBack').addEventListener('click', onBack);
    $('#wzSkip').addEventListener('click', onSkip);
    $('#wzSearch').addEventListener('input', function () {
      query = this.value;
      clearTimeout(advanceTimer);
      renderStep(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT' && e.target.type === 'number' && custom) {
        e.preventDefault();
        onNext();
      }
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
  load();
  makeStars();
  inlineEmblem();
  bind();
  updateClear();
  boot();
})();
