/* ============================================================
   fortune.js —— 每日运势（页面逻辑）

   分成两层，界面上也分开标注：
     ① 真实推算层：干支、节气、月相、二十八宿、冲煞、彭祖百忌、
        太阳/月亮/上升星座 —— 全部来自 almanac.js 的真实算法
     ② 娱乐内容层：评分、宜忌、建议 —— 由 (日期|昵称|生日|时间|地点)
        做种子的确定性伪随机，从**本人星座专属**的内容池里取
        （内容池在 signs-data.js）
   ============================================================ */
(function () {
  'use strict';

  var A = window.Almanac;
  var SIGN_DATA = window.SIGN_DATA || {};
  var ZODIAC_DATA = window.ZODIAC_DATA || {};

  var K_PROFILE = 'fortune.profile.v2';
  var TZ = 8;                       /* 北京时间 */

  /* ---------------- 城市（出生地） ---------------- */
  var CITIES = [
    ['北京', 39.90, 116.41], ['上海', 31.23, 121.47], ['广州', 23.13, 113.26],
    ['深圳', 22.54, 114.06], ['天津', 39.13, 117.20], ['重庆', 29.56, 106.55],
    ['成都', 30.57, 104.07], ['杭州', 30.27, 120.16], ['南京', 32.06, 118.80],
    ['武汉', 30.59, 114.31], ['西安', 34.34, 108.94], ['苏州', 31.30, 120.58],
    ['长沙', 28.23, 112.94], ['郑州', 34.75, 113.63], ['青岛', 36.07, 120.38],
    ['沈阳', 41.81, 123.43], ['大连', 38.91, 121.61], ['哈尔滨', 45.80, 126.53],
    ['长春', 43.82, 125.32], ['济南', 36.65, 117.12], ['合肥', 31.82, 117.23],
    ['福州', 26.07, 119.30], ['厦门', 24.48, 118.09], ['南昌', 28.68, 115.86],
    ['昆明', 24.88, 102.83], ['贵阳', 26.65, 106.63], ['南宁', 22.82, 108.32],
    ['海口', 20.04, 110.32], ['兰州', 36.06, 103.83], ['太原', 37.87, 112.55],
    ['石家庄', 38.04, 114.51], ['呼和浩特', 40.84, 111.75], ['银川', 38.49, 106.23],
    ['西宁', 36.62, 101.78], ['乌鲁木齐', 43.83, 87.62], ['拉萨', 29.65, 91.14],
    ['香港', 22.32, 114.17], ['澳门', 22.20, 113.54], ['台北', 25.03, 121.57],
    ['东京', 35.68, 139.69], ['首尔', 37.57, 126.98], ['新加坡', 1.35, 103.82],
    ['悉尼', -33.87, 151.21], ['伦敦', 51.51, -0.13], ['纽约', 40.71, -74.01],
    ['洛杉矶', 34.05, -118.24], ['温哥华', 49.28, -123.12], ['多伦多', 43.65, -79.38]
  ].map(function (c) { return { name: c[0], lat: c[1], lon: c[2] }; });

  /* ---------------- 幸运项内容池 ---------------- */
  var LUCKY_COLORS = [
    { n: '朱红', hex: '#e5484d' }, { n: '鸽灰', hex: '#8b95a8' },
    { n: '藏蓝', hex: '#2f4b9b' }, { n: '松绿', hex: '#12a150' },
    { n: '琥珀', hex: '#e8a33d' }, { n: '藕粉', hex: '#e8a7c0' },
    { n: '墨黑', hex: '#1c1c22' }, { n: '月白', hex: '#e8eef6' },
    { n: '赭石', hex: '#a4552f' }, { n: '黛紫', hex: '#6d3df5' },
    { n: '青竹', hex: '#4f9e7a' }, { n: '奶黄', hex: '#f0d98c' },
    { n: '雾蓝', hex: '#7fa8d8' }, { n: '砖红', hex: '#b8503c' },
    { n: '橄榄', hex: '#7c8a3f' }, { n: '雪青', hex: '#b9a7e0' },
    { n: '沙棕', hex: '#c9a06a' }, { n: '炭灰', hex: '#4a4f5a' },
    { n: '湖蓝', hex: '#2a9db5' }, { n: '绛紫', hex: '#7a1f4a' },
    { n: '柠檬', hex: '#d9e04f' }, { n: '珊瑚', hex: '#f0806a' },
    { n: '青铜', hex: '#8c7a4b' }, { n: '银白', hex: '#c9d1d9' }
  ];
  var LUCKY_DIRECTIONS = ['正东', '东南', '正南', '西南', '正西', '西北', '正北', '东北',
                          '东偏南', '西偏北', '东南偏东', '西北偏西'];
  var LUCKY_PERIODS = ['清晨 5-7 点', '早上 7-9 点', '上午 9-11 点', '正午 11-13 点',
                       '午后 13-15 点', '下午 15-17 点', '傍晚 17-19 点', '黄昏 18-20 点',
                       '夜晚 19-21 点', '深夜 21-23 点', '子夜前', '凌晨 1-3 点'];
  var DIMENSIONS = ['事业', '财运', '感情', '健康'];

  /* ---------------- 确定性伪随机 ---------------- */
  function xmur3(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return h >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function makeRng(seedStr) { return mulberry32(xmur3(seedStr)()); }

  function buildSeed(dateStr, p) {
    return ['fortune.v2', dateStr, p.name, p.birthday, p.time || '-', p.city || '-'].join('|');
  }
  function nextInt(rng, n) { return Math.floor(rng() * n); }
  function pick(rng, arr) { return arr[nextInt(rng, arr.length)]; }
  function pickN(rng, arr, n) {
    var out = [], used = {}, guard = 0;
    n = Math.min(n, arr.length);
    while (out.length < n && guard++ < 300) {
      var i = nextInt(rng, arr.length);
      if (!used[i]) { used[i] = 1; out.push(arr[i]); }
    }
    return out;
  }

  /* ---------------- 工具 ---------------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function ymdStr(y, m, d) { return y + '-' + pad2(m) + '-' + pad2(d); }
  function todayStr() {
    var now = new Date();
    /* 用北京时间的"今天" */
    var bj = new Date(now.getTime() + (TZ * 60 + now.getTimezoneOffset()) * 60000);
    return ymdStr(bj.getFullYear(), bj.getMonth() + 1, bj.getDate());
  }
  function addDays(dateStr, n) {
    var p = dateStr.split('-').map(Number);
    var J = A.jdn(p[0], p[1], p[2]) + n;
    var t = A.ymdFromJDN(J);
    return ymdStr(t.y, t.m, t.d);
  }
  function cityByName(name) {
    if (!name) return null;
    for (var i = 0; i < CITIES.length; i++) if (CITIES[i].name === name) return CITIES[i];
    return null;
  }

  /* ---------------- 出生时刻与星盘 ---------------- */

  /* 出生时刻的儒略日（世界时） */
  function birthJD(p) {
    var b = p.birthday.split('-').map(Number);
    var t = (p.time || '12:00').split(':').map(Number);
    var hh = t[0] + (t[1] || 0) / 60;
    return A.jdn(b[0], b[1], b[2]) - 0.5 + (hh - TZ) / 24;
  }

  /* 解析出生地：优先用存的经纬度，其次按城市名查完整城市表，最后查内置兜底表 */
  function placeOf(p) {
    if (p && isFinite(p.lat) && isFinite(p.lon)) {
      return { name: p.city || '自定义地点', lat: Number(p.lat), lon: Number(p.lon) };
    }
    if (p && p.city) {
      if (window.CityKit) {
        var hit = window.CityKit.lookup(p.city);
        if (hit) return { name: hit.name, lat: hit.lat, lon: hit.lon };
      }
      var old = cityByName(p.city);
      if (old) return { name: old.name, lat: old.lat, lon: old.lon };
    }
    return null;
  }

  function chartOf(p) {
    var JD = birthJD(p);
    var hasTime = !!p.time;
    var place = placeOf(p);

    var sunLon = A.sunLongitude(JD);
    var moonLon = A.moonLongitude(JD);

    var out = {
      sun: A.signOfLongitude(sunLon),
      moon: A.signOfLongitude(moonLon),
      moonApprox: !hasTime,
      asc: null,
      ascNote: '',
      latitude: place ? place.lat : null,
      longitude: place ? place.lon : null,
      cityName: place ? place.name : ''
    };

    if (!hasTime) {
      out.ascNote = '没填出生时间，算不出上升星座（它每两小时左右换一个）。';
    } else if (!place) {
      out.ascNote = '没填出生地，算不出上升星座。点「改资料」补一下就有。';
    } else {
      out.asc = A.ascendant(JD, place.lat, place.lon).sign;
    }
    return out;
  }

  /* ---------------- 运势生成 ---------------- */
  function generateFortune(dateStr, p) {
    var seed = buildSeed(dateStr, p);
    var rng = makeRng(seed);

    var chart = chartOf(p);
    var sign = chart.sun;
    var sd = SIGN_DATA[sign] || null;

    /* 生肖按立春换年（与干支年柱一致） */
    var bj = birthJD(p);
    var zodiac = A.SX[A.yearGanzhi(bj).zhiIdx];
    var zd = ZODIAC_DATA[zodiac] || null;

    /* --- 分项评分（固定顺序取数，保证可复现） --- */
    var scores = DIMENSIONS.map(function () { return 32 + nextInt(rng, 69); });
    var avg = scores.reduce(function (a, b) { return a + b; }, 0) / scores.length;
    var stars, tier;
    if (avg >= 84) { stars = 5; tier = 'high'; }
    else if (avg >= 70) { stars = 4; tier = 'high'; }
    else if (avg >= 56) { stars = 3; tier = 'mid'; }
    else if (avg >= 43) { stars = 2; tier = 'low'; }
    else { stars = 1; tier = 'low'; }

    /* --- 文案：优先取本人星座专属池，缺失时才回退 --- */
    var fallback = {
      verdicts: { high: ['今天顺，可以做点想做的事。'], mid: ['不好不坏，按计划走就行。'], low: ['今天别硬推，先收个尾。'] },
      advice: { high: ['按自己的节奏来就好。'], mid: ['把手上的一件事做完再开新的。'], low: ['把期待放低一点，先把最简单的那件事做完。'] },
      good: ['按计划走'], bad: ['硬撑'], traits: [], strength: '', weakness: '',
      element: '', ruler: '', bestMatch: [], hardMatch: []
    };
    var src = sd || fallback;
    var zsrc = zd || { good: [], bad: [] };

    var verdict = pick(rng, src.verdicts[tier]);
    var advice = pick(rng, src.advice[tier]);

    /* 宜忌：3 条星座专属 + 1 条生肖专属 */
    var goodSign = pickN(rng, src.good, Math.min(3, src.good.length));
    var goodZod = pickN(rng, zsrc.good || [], Math.min(1, (zsrc.good || []).length));
    var badSign = pickN(rng, src.bad, Math.min(3, src.bad.length));
    var badZod = pickN(rng, zsrc.bad || [], Math.min(1, (zsrc.bad || []).length));

    var color = pick(rng, LUCKY_COLORS);
    var number = 1 + nextInt(rng, 99);
    var direction = pick(rng, LUCKY_DIRECTIONS);
    var period = pick(rng, LUCKY_PERIODS);

    return {
      dateStr: dateStr,
      seed: seed,
      chart: chart,
      sign: sign,
      signData: sd,
      zodiac: zodiac,
      zodiacData: zd,
      scores: scores,
      total: Math.round(avg),
      stars: stars,
      tier: tier,
      verdict: verdict,
      advice: advice,
      good: goodSign.concat(goodZod),
      bad: badSign.concat(badZod),
      goodFromSign: goodSign.length,
      badFromSign: badSign.length,
      lucky: { color: color, number: number, direction: direction, period: period },
      almanac: A.dayInfo(
        +dateStr.slice(0, 4), +dateStr.slice(5, 7), +dateStr.slice(8, 10))
    };
  }

  /* ============================================================
     渲染
     ============================================================ */
  var els = {};
  ['setupView', 'fortuneView', 'setupForm', 'nameInput', 'birthInput',
   'timeInput', 'cityInput', 'cityHits', 'cityChosen', 'latInput', 'lonInput',
   'editBtn', 'daybar', 'headDate', 'headLine',
   'headHello', 'stars', 'verdict', 'scores', 'goodList', 'badList', 'luck',
   'advice', 'adviceSrc', 'almList', 'termNote', 'chartTriple', 'chartNote',
   'signBadge', 'signMeta', 'traits', 'strength', 'weakness', 'bestMatch',
   'worstMatch', 'toast'].forEach(function (id) { els[id] = document.getElementById(id); });

  function $(id) { return els[id]; }
  function setText(id, s) { if ($(id)) $(id).textContent = s; }
  function clear(id) { if ($(id)) $(id).textContent = ''; }
  function addPill(parent, text, cls) {
    var s = document.createElement('span');
    s.className = 'pill' + (cls ? ' ' + cls : '');
    s.textContent = text;
    parent.appendChild(s);
  }

  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }

  /* ---------------- 资料 ---------------- */
  function loadProfile() {
    try {
      var raw = localStorage.getItem(K_PROFILE);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || !p.name || !p.birthday) return null;
      return p;
    } catch (e) { return null; }
  }
  function saveProfile(p) {
    try { localStorage.setItem(K_PROFILE, JSON.stringify(p)); } catch (e) { /* ignore */ }
  }

  function initCitySelect() {
    if (window.CityKit) {
      window.CityKit.init({
        input: 'cityInput', hits: 'cityHits', chosen: 'cityChosen',
        lat: 'latInput', lon: 'lonInput'
      });
    }
  }

  /* ---------------- 视图切换 ---------------- */
  function showSetup(prefill) {
    $('setupView').hidden = false;
    $('fortuneView').hidden = true;
    $('editBtn').hidden = true;
    initCitySelect();
    if (prefill) {
      $('nameInput').value = prefill.name || '';
      $('birthInput').value = prefill.birthday || '';
      $('timeInput').value = prefill.time || '';
      if (window.CityKit) window.CityKit.restore(prefill);
    }
    $('birthInput').max = todayStr();
  }

  function showFortune(p, dateStr) {
    $('setupView').hidden = true;
    $('fortuneView').hidden = false;
    $('editBtn').hidden = false;

    var f = generateFortune(dateStr, p);
    render(f, p);
    markDayButton(dateStr);

    if (window.scrollY > 40) window.scrollTo(0, 0);
  }

  function markDayButton(dateStr) {
    var today = todayStr();
    var btns = document.querySelectorAll('.day-btn');
    for (var i = 0; i < btns.length; i++) {
      var off = parseInt(btns[i].getAttribute('data-offset'), 10);
      btns[i].classList.toggle('on', addDays(today, off) === dateStr);
    }
  }

  /* ---------------- 主渲染 ---------------- */
  function render(f, p) {
    var a = f.almanac;
    var d = a.date;

    /* 顶部 */
    var week = ['日', '一', '二', '三', '四', '五', '六'][
      new Date(d.y, d.m - 1, d.d).getDay()];
    setText('headDate', d.y + ' 年 ' + d.m + ' 月 ' + d.d + ' 日 · 周' + week);
    setText('headLine', f.sign + ' · 属' + f.zodiac +
      (f.signData && f.signData.element ? ' · ' + f.signData.element : ''));
    var today = todayStr();
    var rel = f.dateStr === today ? '今天' :
      (f.dateStr === addDays(today, -1) ? '昨天' :
       (f.dateStr === addDays(today, 1) ? '明天' : f.dateStr));
    setText('headHello', p.name + '，这是' + rel + '的运势');

    /* 总评 */
    var st = $('stars');
    st.textContent = '';
    st.setAttribute('aria-label', '今日总评 ' + f.stars + ' 星');
    for (var i = 1; i <= 5; i++) {
      var s = document.createElement('span');
      s.className = 'star' + (i <= f.stars ? ' on' : '');
      s.textContent = i <= f.stars ? '★' : '☆';
      st.appendChild(s);
    }
    setText('verdict', f.verdict);

    /* 分项 */
    var sc = $('scores');
    sc.textContent = '';
    DIMENSIONS.forEach(function (name, i) {
      var v = f.scores[i];
      var band = v >= 72 ? 'high' : (v >= 50 ? 'mid' : 'low');
      var row = document.createElement('div');
      row.className = 'score-row';
      var head = document.createElement('div');
      head.className = 'score-head';
      var n = document.createElement('span'); n.textContent = name;
      var num = document.createElement('span'); num.className = 'score-num'; num.textContent = v;
      head.appendChild(n); head.appendChild(num);
      var bar = document.createElement('div'); bar.className = 'bar';
      var fill = document.createElement('div');
      fill.className = 'bar-fill';
      fill.setAttribute('data-band', band);
      fill.style.width = v + '%';
      bar.appendChild(fill);
      row.appendChild(head); row.appendChild(bar);
      sc.appendChild(row);
    });

    /* 宜 / 忌 */
    var gl = $('goodList'), bl = $('badList');
    gl.textContent = ''; bl.textContent = '';
    f.good.forEach(function (t, i) {
      addPill(gl, t, i < f.goodFromSign ? '' : 'zod');
    });
    f.bad.forEach(function (t, i) {
      addPill(bl, t, i < f.badFromSign ? '' : 'zod');
    });

    /* 幸运指数 */
    var lk = $('luck');
    lk.textContent = '';
    var cells = [
      ['幸运色', f.lucky.color.n, f.lucky.color.hex],
      ['幸运数字', String(f.lucky.number), null],
      ['幸运方位', f.lucky.direction, null],
      ['幸运时段', f.lucky.period, null]
    ];
    cells.forEach(function (c) {
      var cell = document.createElement('div');
      cell.className = 'luck-cell';
      var lab = document.createElement('div');
      lab.className = 'luck-label';
      lab.textContent = c[0];
      var val = document.createElement('div');
      val.className = 'luck-value';
      if (c[2]) {
        var sw = document.createElement('span');
        sw.className = 'swatch';
        sw.style.background = c[2];
        val.appendChild(sw);
      }
      val.appendChild(document.createTextNode(c[1]));
      cell.appendChild(lab); cell.appendChild(val);
      lk.appendChild(cell);
    });

    /* 建议 + 来源说明 */
    setText('advice', f.advice);
    setText('adviceSrc', '这段建议取自「' + f.sign + '」专属内容池' +
      (f.signData ? '（' + f.signData.element + '，守护星' + f.signData.ruler + '）' : '') +
      '，不是通用话术。');

    renderAlmanac(a);
    renderChart(f, p);
  }

  /* ---------------- 真实历法 ---------------- */
  function renderAlmanac(a) {
    var box = $('almList');
    box.textContent = '';

    function row(k, v, hint) {
      var r = document.createElement('div');
      r.className = 'alm-row';
      var kk = document.createElement('div');
      kk.className = 'alm-k';
      kk.textContent = k;
      var vv = document.createElement('div');
      vv.className = 'alm-v';
      vv.textContent = v;
      if (hint) {
        var h = document.createElement('span');
        h.className = 'alm-hint';
        h.textContent = hint;
        vv.appendChild(h);
      }
      r.appendChild(kk); r.appendChild(vv);
      box.appendChild(r);
    }

    row('干支', a.year.name + '年 · ' + a.month.name + '月 · ' + a.day.name + '日');
    row('值日星宿', a.xiu.full + '（' + a.xiu.dir + '方 · ' + a.xiu.seven + '）');
    row('冲煞', a.chongSha.text);
    row('彭祖百忌', a.pengzu[0] + ' · ' + a.pengzu[1]);
    row('月相', a.moon.name + ' · 照亮 ' + a.moon.illumPct + '%' +
      (a.moon.waxing ? ' · 渐盈' : ' · 渐亏'));

    if (a.term) {
      row('今日节气', a.term.name + ' ' + pad2(a.term.hh) + ':' + pad2(a.term.mm),
        '交接时刻');
    }

    var note = '';
    if (a.nextTerm) {
      var t = a.nextTerm;
      var days = Math.max(Math.round(t.jd - a.jdn), 0);
      note = '下一个节气：' + t.name + ' · ' + t.m + '月' + t.d + '日 ' +
        pad2(t.hh) + ':' + pad2(t.mm) + '（约 ' + days + ' 天后）';
    }
    setText('termNote', note);
  }

  /* ---------------- 星盘 ---------------- */
  function renderChart(f, p) {
    var c = f.chart;
    var box = $('chartTriple');
    box.textContent = '';

    function triple(k, v, sub) {
      var d = document.createElement('div');
      d.className = 'triple';
      var kk = document.createElement('div'); kk.className = 'triple-k'; kk.textContent = k;
      var vv = document.createElement('div'); vv.className = 'triple-v'; vv.textContent = v;
      var ss = document.createElement('div'); ss.className = 'triple-s muted small';
      ss.textContent = sub || '';
      d.appendChild(kk); d.appendChild(vv); d.appendChild(ss);
      box.appendChild(d);
    }

    triple('太阳', c.sun, '你的核心性格');
    triple('月亮', c.moon, c.moonApprox ? '按生日推算，可能偏一位' : '你的内在情绪');
    triple('上升', c.asc || '—', c.asc ? '别人第一眼看到的你' : '缺出生时间');

    var notes = [];
    if (c.ascNote) notes.push(c.ascNote);
    if (c.moonApprox) notes.push('月亮约 2.5 天换一个星座，没有出生时间时按当天正午估算。');
    notes.push('出生地：' + c.cityName + '（' + c.latitude.toFixed(2) + '°, ' +
      c.longitude.toFixed(2) + '°）');
    setText('chartNote', notes.join(' '));

    /* 星座档案 */
    var sd = f.signData;
    if (!sd) return;
    setText('signBadge', f.sign);
    setText('signMeta', sd.element + ' · 守护星 ' + sd.ruler);

    var tr = $('traits');
    tr.textContent = '';
    (sd.traits || []).forEach(function (t) { addPill(tr, t); });

    setText('strength', sd.strength || '—');
    setText('weakness', sd.weakness || '—');

    var bm = $('bestMatch'), wm = $('worstMatch');
    bm.textContent = ''; wm.textContent = '';
    (sd.bestMatch || []).forEach(function (s) { addPill(bm, s); });
    (sd.hardMatch || []).forEach(function (s) { addPill(wm, s); });
  }

  /* ============================================================
     事件
     ============================================================ */
  function bind() {
    $('setupForm').addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = $('nameInput').value.trim();
      var birthday = $('birthInput').value;
      var time = $('timeInput').value;
      var place = window.CityKit ? window.CityKit.resolve() : null;

      if (!name) { toast('请先填一个昵称'); return; }
      if ([].slice.call(name).length > 20) { toast('昵称太长了，20 字以内'); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) { toast('请选择一个出生日期'); return; }
      if (birthday > todayStr()) { toast('出生日期不能晚于今天'); return; }
      if (time && !/^\d{2}:\d{2}$/.test(time)) { toast('出生时间格式不对'); return; }

      var p = {
        name: name, birthday: birthday, time: time,
        city: place ? place.name : '',
        lat: place ? place.lat : null,
        lon: place ? place.lon : null
      };
      saveProfile(p);
      showFortune(p, todayStr());
      toast(place ? '已生成，同一天结果不会变' : '已生成（没选出生地，上升星座暂时算不出）');
    });

    $('editBtn').addEventListener('click', function () {
      showSetup(loadProfile());
    });

    var btns = document.querySelectorAll('.day-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        var p = loadProfile();
        if (!p) { showSetup(null); return; }
        var off = parseInt(this.getAttribute('data-offset'), 10);
        showFortune(p, addDays(todayStr(), off));
      });
    }
  }

  /* ============================================================
     对外暴露（便于 node 回归测试，也方便日后调试）
     ============================================================ */
  window.Fortune = {
    xmur3: xmur3, mulberry32: mulberry32, makeRng: makeRng,
    buildSeed: buildSeed, generateFortune: generateFortune,
    chartOf: chartOf, birthJD: birthJD,
    todayStr: todayStr, addDays: addDays,
    CITIES: CITIES,
    libs: {
      colors: LUCKY_COLORS, directions: LUCKY_DIRECTIONS,
      periods: LUCKY_PERIODS, dimensions: DIMENSIONS
    }
  };

  /* ============================================================
     启动
     ============================================================ */
  function init() {
    initCitySelect();
    bind();
    var p = loadProfile();
    if (p) showFortune(p, todayStr());
    else showSetup(null);

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('../sw.js').catch(function () {});
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
