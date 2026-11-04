window.MDDetect = (function () {
  'use strict';

  function timeout(promise, ms) {
    return Promise.race([promise, new Promise(function (r) { setTimeout(function () { r(null); }, ms); })]);
  }

  function cleanRenderer(raw) {
    let s = String(raw || '');
    const angle = s.match(/^ANGLE \((.*)\)$/);
    if (angle) {
      const parts = angle[1].split(', ');
      s = parts.length >= 2 ? parts[1] : angle[1];
    }
    s = s.replace(/ANGLE Metal Renderer:\s*/i, '')
      .replace(/\(0x[0-9a-f]+\)/ig, '')
      .replace(/Direct3D\S*.*$/i, '')
      .replace(/vs_\d_\d.*$/i, '')
      .replace(/\((TM|R)\)/ig, '')
      .replace(/,?\s*Unspecified Version/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    return s;
  }

  function webgl() {
    try {
      const c = document.createElement('canvas');
      const gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
      if (!gl) return null;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = String((ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) || '');
      const vendor = String((ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)) || '');
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      const clean = cleanRenderer(renderer);
      return {
        renderer: renderer,
        vendor: vendor,
        clean: clean,
        software: /swiftshader|llvmpipe|softpipe|basic render|software/i.test(renderer),
        masked: !clean || /^(webkit webgl|mozilla|generic renderer)$/i.test(clean)
      };
    } catch (e) {
      return null;
    }
  }

  async function webgpu() {
    if (!navigator.gpu) return null;
    try {
      const a = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!a) return null;
      let info = a.info;
      if (!info && a.requestAdapterInfo) info = await a.requestAdapterInfo();
      if (!info) return null;
      return {
        vendor: String(info.vendor || '').toLowerCase(),
        architecture: String(info.architecture || ''),
        description: String(info.description || '')
      };
    } catch (e) {
      return null;
    }
  }

  async function uaData() {
    const d = navigator.userAgentData;
    if (!d) return null;
    let h = {};
    try {
      h = await d.getHighEntropyValues(['platform', 'platformVersion', 'architecture', 'bitness', 'model']);
    } catch (e) {
      h = {};
    }
    return {
      mobile: !!d.mobile,
      platform: h.platform || d.platform || '',
      platformVersion: h.platformVersion || '',
      architecture: h.architecture || '',
      bitness: h.bitness || '',
      model: h.model || ''
    };
  }

  async function battery() {
    if (!navigator.getBattery) return null;
    try {
      const b = await navigator.getBattery();
      const desktopLike = b.charging && b.level === 1 && b.chargingTime === 0 && !isFinite(b.dischargingTime);
      return { level: b.level, charging: b.charging, desktopLike: desktopLike };
    } catch (e) {
      return null;
    }
  }

  async function storage() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const e = await navigator.storage.estimate();
        if (e && e.quota) return { quota: e.quota, usage: e.usage || 0 };
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  function refreshRate() {
    return new Promise(function (resolve) {
      if (!window.requestAnimationFrame || document.hidden) return resolve(null);
      let n = 0;
      let start = 0;
      function frame(t) {
        if (!start) start = t;
        n++;
        if (t - start < 800) {
          requestAnimationFrame(frame);
          return;
        }
        const fps = (n - 1) * 1000 / (t - start);
        const common = [30, 48, 50, 60, 72, 75, 90, 100, 120, 144, 165, 170, 180, 200, 240, 280, 360];
        let best = common[0];
        common.forEach(function (c) { if (Math.abs(c - fps) < Math.abs(best - fps)) best = c; });
        resolve(fps > 20 ? best : null);
      }
      requestAnimationFrame(frame);
    });
  }

  function osInfo(ua, ud, touch) {
    const p = ud ? ud.platform : '';
    const v = ud ? ud.platformVersion : '';
    if (/Windows/i.test(p)) {
      const major = parseInt(v, 10);
      return { name: v ? (major >= 13 ? 'Windows 11' : 'Windows 10') : 'Windows', icon: 'bi-windows' };
    }
    if (/macOS/i.test(p)) return { name: 'macOS' + (v ? ' ' + v.split('.').slice(0, 2).join('.') : ''), icon: 'bi-apple' };
    if (/Android/i.test(p)) return { name: 'Android' + (v ? ' ' + v.split('.')[0] : ''), icon: 'bi-android2' };
    if (/Chrome ?OS/i.test(p)) return { name: 'ChromeOS', icon: 'bi-browser-chrome' };
    if (/Linux/i.test(p)) return { name: 'Linux', icon: 'bi-ubuntu' };
    let m;
    if ((m = ua.match(/(iPhone|iPad|iPod).*? OS (\d+)[_.](\d+)/))) return { name: (m[1] === 'iPad' ? 'iPadOS ' : 'iOS ') + m[2] + '.' + m[3], icon: 'bi-apple' };
    if (/Macintosh/.test(ua) && touch > 1) return { name: 'iPadOS', icon: 'bi-apple' };
    if ((m = ua.match(/Android (\d+)/))) return { name: 'Android ' + m[1], icon: 'bi-android2' };
    if (/Windows NT 10/.test(ua)) return { name: 'Windows 10／11', icon: 'bi-windows' };
    if (/Windows/.test(ua)) return { name: 'Windows', icon: 'bi-windows' };
    if ((m = ua.match(/Mac OS X (\d+)[._](\d+)/))) return { name: 'macOS', icon: 'bi-apple' };
    if (/CrOS/.test(ua)) return { name: 'ChromeOS', icon: 'bi-browser-chrome' };
    if (/Linux/.test(ua)) return { name: 'Linux', icon: 'bi-ubuntu' };
    return { name: '', icon: 'bi-question-circle' };
  }

  function archInfo(ua, ud) {
    if (ud && ud.architecture) {
      const a = ud.architecture === 'x86' ? (ud.bitness === '64' ? 'x64' : 'x86') : (ud.architecture === 'arm' ? (ud.bitness === '64' ? 'ARM64' : 'ARM') : ud.architecture);
      return a;
    }
    if (/Win64|x64|x86_64|amd64/i.test(ua)) return 'x64';
    if (/aarch64|arm64/i.test(ua)) return 'ARM64';
    return '';
  }

  async function run() {
    const ua = navigator.userAgent || '';
    const touch = navigator.maxTouchPoints || 0;
    const results = await Promise.all([
      timeout(uaData(), 1500),
      timeout(webgpu(), 2000),
      timeout(battery(), 1500),
      timeout(storage(), 1500),
      timeout(refreshRate(), 1500)
    ]);
    const ud = results[0];
    const gl = webgl();
    const dpr = window.devicePixelRatio || 1;
    const sw = screen.width || window.innerWidth;
    const sh = screen.height || window.innerHeight;
    const isIPhone = /iPhone|iPod/.test(ua);
    const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && touch > 1);
    const isAndroid = /Android/i.test(ua);
    const isMac = /Macintosh/.test(ua) && touch <= 1;
    return {
      ua: ua,
      ud: ud,
      os: osInfo(ua, ud, touch),
      arch: archInfo(ua, ud),
      threads: navigator.hardwareConcurrency || null,
      memory: navigator.deviceMemory || null,
      gl: gl,
      gpu: results[1],
      battery: results[2],
      storage: results[3],
      refresh: results[4],
      screen: {
        w: sw,
        h: sh,
        dpr: dpr,
        pw: Math.round(sw * dpr),
        ph: Math.round(sh * dpr),
        extended: screen.isExtended === true,
        touch: touch
      },
      isIPhone: isIPhone,
      isIPad: isIPad,
      isAndroid: isAndroid,
      isAndroidMobile: isAndroid && /Mobile/i.test(ua),
      isMac: isMac
    };
  }

  return { run: run };
})();
