/* ============================================================
   citykit.js —— 出生地搜索（逻辑层，数据在 cities.js）
   cities.js 由脚本生成，只放数据：window.CITY_DATA = { note, list }
   这里放交互与解析逻辑，两边分开，互不干扰。

   用法：
     CityKit.init({ input:'cityInput', hits:'cityHits', chosen:'cityChosen',
                    lat:'latInput', lon:'lonInput' });
     CityKit.restore(profile);      // 回填已保存的资料
     CityKit.resolve();             // → { name, lat, lon } 或 null
   ============================================================ */
(function () {
  'use strict';

  /* 兜底城市表：万一 cities.js 没加载上，或者用户在国外 */
  var FALLBACK = [
    ['北京', '北京', 39.90, 116.41], ['上海', '上海', 31.23, 121.47],
    ['广州', '广东', 23.13, 113.26], ['深圳', '广东', 22.54, 114.06],
    ['成都', '四川', 30.57, 104.07], ['杭州', '浙江', 30.27, 120.16],
    ['武汉', '湖北', 30.59, 114.31], ['西安', '陕西', 34.34, 108.94],
    ['南京', '江苏', 32.06, 118.80], ['重庆', '重庆', 29.56, 106.55],
    ['香港', '', 22.32, 114.17], ['澳门', '', 22.20, 113.54],
    ['台北', '台湾', 25.03, 121.57], ['东京', '日本', 35.68, 139.69],
    ['首尔', '韩国', 37.57, 126.98], ['新加坡', '新加坡', 1.35, 103.82],
    ['悉尼', '澳大利亚', -33.87, 151.21], ['伦敦', '英国', 51.51, -0.13],
    ['纽约', '美国', 40.71, -74.01], ['洛杉矶', '美国', 34.05, -118.24],
    ['温哥华', '加拿大', 49.28, -123.12], ['多伦多', '加拿大', 43.65, -79.38],
    ['巴黎', '法国', 48.86, 2.35], ['柏林', '德国', 52.52, 13.40],
    ['迪拜', '阿联酋', 25.20, 55.27], ['曼谷', '泰国', 13.76, 100.50]
  ];

  var cities = [];          /* { name, province, lat, lon } */
  var byName = {};          /* 按城市名查，同名只取第一个 */
  var byKey = {};           /* 按「省|城市」去重，避免跨省同名被误删 */
  var sel = null;           /* 当前选中的城市 */
  var els = {};
  var MAX_HITS = 60;

  function push(name, province, lat, lon) {
    if (!name || typeof lat !== 'number' || typeof lon !== 'number') return;
    var prov = province || '';
    var key = prov + '|' + name;
    if (byKey[key]) return;                   /* 同省同名才去重 */
    var c = { name: name, province: prov, lat: lat, lon: lon };
    byKey[key] = c;
    cities.push(c);
    if (!byName[name]) byName[name] = c;      /* 名字重名时取先到的那个 */
  }

  function load() {
    var cd = window.CITY_DATA;
    if (cd && Array.isArray(cd.list)) {
      cd.list.forEach(function (r) { push(r[1], r[0], r[2], r[3]); });
    }
    FALLBACK.forEach(function (r) { push(r[0], r[1], r[2], r[3]); });
    cities.sort(function (a, b) { return a.name.localeCompare(b.name, 'zh'); });
  }

  /* 精确查名 */
  function lookup(name) {
    if (!name) return null;
    var q = String(name).trim();
    if (!q) return null;
    if (byName[q]) return byName[q];
    /* 去掉「市 / 地区 / 自治州」这类后缀再试一次 */
    var short = q.replace(/(市|地区|自治州|自治县|盟|特别行政区)$/, '');
    if (short && byName[short]) return byName[short];
    return null;
  }

  /* 模糊搜索：名字包含关键词，最多返回 MAX_HITS 条 */
  function search(q) {
    q = String(q || '').trim();
    if (!q) return [];
    var out = [], i;
    /* 前缀命中的排前面 */
    for (i = 0; i < cities.length && out.length < MAX_HITS; i++) {
      if (cities[i].name.indexOf(q) === 0) out.push(cities[i]);
    }
    for (i = 0; i < cities.length && out.length < MAX_HITS; i++) {
      var c = cities[i];
      if (c.name.indexOf(q) > 0 || (c.province && c.province.indexOf(q) === 0)) {
        if (out.indexOf(c) === -1) out.push(c);
      }
    }
    return out;
  }

  function el(id) {
    return typeof id === 'string' ? document.getElementById(id) : id;
  }

  function clearHits() {
    if (!els.hits) return;
    els.hits.hidden = true;
    els.hits.textContent = '';
  }

  function renderHits(list, query) {
    var box = els.hits;
    if (!box) return;
    box.textContent = '';
    if (!list.length) {
      var e = document.createElement('div');
      e.className = 'city-empty';
      e.textContent = '没找到「' + query + '」。这里是地级市列表，县级市请填它所属的地级市' +
        '（比如昆山 → 苏州）；也可以展开下面手动填经纬度。';
      box.appendChild(e);
    } else {
      list.forEach(function (c) {
        var row = document.createElement('div');
        row.className = 'city-hit';
        var b = document.createElement('b');
        b.textContent = c.name;
        row.appendChild(b);
        if (c.province && c.province !== c.name) {
          var s = document.createElement('span');
          s.textContent = c.province;
          row.appendChild(s);
        }
        var em = document.createElement('em');
        em.textContent = c.lat.toFixed(2) + ', ' + c.lon.toFixed(2);
        row.appendChild(em);
        row.addEventListener('mousedown', function (ev) { ev.preventDefault(); });
        row.addEventListener('click', function () { choose(c); });
        box.appendChild(row);
      });
    }
    box.hidden = false;
  }

  function showChosen() {
    if (!els.chosen) return;
    var manual = manualPair();
    if (manual) {
      els.chosen.textContent = '将使用手动经纬度：' +
        manual.lat.toFixed(2) + ', ' + manual.lon.toFixed(2);
      els.chosen.className = 'city-chosen on';
      return;
    }
    if (sel) {
      els.chosen.textContent = '已选：' + sel.name +
        (sel.province && sel.province !== sel.name ? '（' + sel.province + '）' : '') +
        ' · ' + sel.lat.toFixed(2) + ', ' + sel.lon.toFixed(2);
      els.chosen.className = 'city-chosen on';
      return;
    }
    els.chosen.textContent = els.input && els.input.value.trim()
      ? '还没从列表里选一个，或者展开下面手动填经纬度'
      : '不填也可以，只是算不出上升星座';
    els.chosen.className = 'city-chosen';
  }

  function manualPair() {
    if (!els.lat || !els.lon) return null;
    var rawLat = String(els.lat.value == null ? '' : els.lat.value).trim();
    var rawLon = String(els.lon.value == null ? '' : els.lon.value).trim();
    if (rawLat === '' || rawLon === '') return null;
    var a = parseFloat(rawLat), b = parseFloat(rawLon);
    if (!isFinite(a) || !isFinite(b)) return null;
    if (Math.abs(a) > 90 || Math.abs(b) > 180) return null;
    return { lat: a, lon: b };
  }

  function choose(c) {
    sel = c;
    if (els.input) els.input.value = c.name;
    clearHits();
    showChosen();
  }

  function onInput() {
    var q = els.input.value.trim();
    if (sel && q !== sel.name) sel = null;     /* 改了文字就取消选中 */
    if (!q) { clearHits(); showChosen(); return; }
    var exact = lookup(q);
    if (exact && exact.name === q) { sel = exact; clearHits(); showChosen(); return; }
    renderHits(search(q), q);
    showChosen();
  }

  function init(opts) {
    if (els.input) return;                     /* 已经初始化过，避免重复绑定事件 */
    opts = opts || {};
    els.input = el(opts.input);
    els.hits = el(opts.hits);
    els.chosen = el(opts.chosen);
    els.lat = el(opts.lat);
    els.lon = el(opts.lon);
    if (!els.input) return;

    load();

    els.input.addEventListener('input', onInput);
    els.input.addEventListener('focus', function () {
      if (els.input.value.trim() && !sel) onInput();
    });
    els.input.addEventListener('blur', function () {
      setTimeout(clearHits, 180);              /* 让点击先落地 */
    });
    if (els.lat) els.lat.addEventListener('input', showChosen);
    if (els.lon) els.lon.addEventListener('input', showChosen);
    showChosen();
  }

  /* 读界面 → 出生地；解析不出来返回 null */
  function resolve() {
    var m = manualPair();
    if (m) {
      var nm = (els.input && els.input.value.trim()) || '自定义地点';
      return { name: nm, province: '', lat: m.lat, lon: m.lon, manual: true };
    }
    if (sel) return { name: sel.name, province: sel.province, lat: sel.lat, lon: sel.lon };
    if (els.input) {
      var hit = lookup(els.input.value);
      if (hit) return { name: hit.name, province: hit.province, lat: hit.lat, lon: hit.lon };
    }
    return null;
  }

  /* 回填已保存的资料 */
  function restore(profile) {
    if (!profile) return;
    if (isFinite(profile.lat) && isFinite(profile.lon)) {
      if (els.lat) els.lat.value = profile.lat;
      if (els.lon) els.lon.value = profile.lon;
      if (els.input && profile.city) els.input.value = profile.city;
    } else if (profile.city) {
      var hit = lookup(profile.city);
      if (hit) { sel = hit; if (els.input) els.input.value = hit.name; }
      else if (els.input) els.input.value = profile.city;
    }
    showChosen();
  }

  window.CityKit = {
    init: init,
    resolve: resolve,
    restore: restore,
    lookup: lookup,
    search: search,
    count: function () { return cities.length; }
  };
})();
