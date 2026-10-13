/* ============================================================
   jobs.js —— 简历 → 岗位方向匹配（纯本地，无后端、无 API）
   思路：拿 roles.js 里的岗位词典在简历文本里做关键词命中，
        按「核心词 ×3 + 加分项 ×1」算强度，再排序。
        另外支持把一段 JD 粘进来做交集对比。
   注意：这是粗糙的关键词匹配，不是 AI 判断，只用来找投递方向。
   ============================================================ */
(function () {
  'use strict';

  var ROLES = window.ROLES || [];
  var K_RESUME = 'jobs.resume.v1';
  var K_CITY = 'jobs.city.v1';
  var K_JD = 'jobs.jd.v1';

  var els = {
    inputPane: document.getElementById('inputPane'),
    resultPane: document.getElementById('resultPane'),
    resume: document.getElementById('resume'),
    city: document.getElementById('city'),
    analyzeBtn: document.getElementById('analyzeBtn'),
    editBtn: document.getElementById('editBtn'),
    profileCard: document.getElementById('profileCard'),
    roleList: document.getElementById('roleList'),
    jd: document.getElementById('jd'),
    jdBtn: document.getElementById('jdBtn'),
    jdResult: document.getElementById('jdResult'),
    searchCard: document.getElementById('searchCard'),
    copyReport: document.getElementById('copyReport'),
    toast: document.getElementById('toast')
  };

  var state = { resume: '', city: '', roles: [], profile: null };

  /* ---------------- 文本归一化 ---------------- */

  // 全角 → 半角，统一大小写，压缩空白
  function normalize(s) {
    return String(s || '')
      .replace(/[\uFF01-\uFF5E]/g, function (c) {
        return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
      })
      .replace(/\u3000/g, ' ')
      .toLowerCase()
      .replace(/\s+/g, ' ');
  }
  function noSpace(s) { return s.replace(/\s+/g, ''); }

  function makeHay(text) {
    var h = normalize(text);
    return { spaced: h, packed: noSpace(h) };
  }

  function hit(hay, kw) {
    var k = normalize(kw);
    if (!k) return false;

    // 纯 ASCII 的短词（<=5）要求词边界，否则会大量误命中：
    // java 命中 javascript、ai 命中 email、hr 命中 through、gin 命中 login、hive 命中 archive
    // 数字和其它字符不算边界字符，所以 mysql8 / vue3 / html5 / c++ 依然能命中
    if (k.length <= 5 && /^[\x20-\x7E]+$/.test(k)) {
      if (bounded(hay.spaced, k)) return true;
      var kp0 = noSpace(k);
      return kp0 !== k && bounded(hay.packed, kp0);
    }

    if (hay.spaced.indexOf(k) !== -1) return true;
    var kp = noSpace(k);
    return kp !== k && hay.packed.indexOf(kp) !== -1;
  }

  function bounded(text, kw) {
    var n = text.length, klen = kw.length, from = 0, idx;
    while ((idx = text.indexOf(kw, from)) !== -1) {
      var before = idx > 0 ? text.charAt(idx - 1) : '';
      var after = idx + klen < n ? text.charAt(idx + klen) : '';
      if (!/[a-z]/.test(before) && !/[a-z]/.test(after)) return true;
      from = idx + 1;
    }
    return false;
  }

  /* ---------------- 简历画像 ---------------- */

  function extractYears(text) {
    var n = normalize(text);
    var m = n.match(/(\d+(?:\.\d+)?)\s*年(?:以上)?(?:的)?(?:工作)?经验/) ||
            n.match(/经验\s*[:：]?\s*(\d+(?:\.\d+)?)\s*年/) ||
            n.match(/工作年限\s*[:：]?\s*(\d+(?:\.\d+)?)/) ||
            n.match(/(\d+)\s*年(?:以上)?(?:开发|测试|运营|设计|销售|管理|从业)/);
    if (m) return Math.min(parseFloat(m[1]), 50);

    // 没有明写年限，就从「2020.03 - 2023.06」「2019年7月-2023年5月」这类区间累加
    var months = 0, found = false, mm;

    var addSpan = function (y1, m1, y2, m2) {
      var span = (y2 - y1) * 12 + (m2 - m1);
      if (span > 0 && span < 600) months += span;
    };

    // 有明确结束年份的区间。月份缺省时用 1，这样「2019 - 2023」= 4 年，符合直觉
    var reY = /(20\d{2})\s*[.\-/年]?\s*(\d{1,2})?\s*月?\s*[-–~至到]+\s*(20\d{2})\s*[.\-/年]?\s*(\d{1,2})?\s*月?/g;
    while ((mm = reY.exec(n)) !== null) {
      found = true;
      addSpan(+mm[1], mm[2] ? +mm[2] : 1, +mm[3], mm[4] ? +mm[4] : 1);
    }

    // 结束时间是「至今」的区间
    var reNow = /(20\d{2})\s*[.\-/年]?\s*(\d{1,2})?\s*月?\s*[-–~至到]+\s*(至今|现在|今)/g;
    while ((mm = reNow.exec(n)) !== null) {
      found = true;
      var d = new Date();
      addSpan(+mm[1], mm[2] ? +mm[2] : 1, d.getFullYear(), d.getMonth() + 1);
    }

    if (found && months > 0) return Math.min(Math.round(months / 12 * 10) / 10, 50);
    return null;
  }

  var EDU_ORDER = [
    ['博士', ['博士', 'phd', 'doctor']],
    ['硕士', ['硕士', '研究生', 'mba', 'master']],
    ['本科', ['本科', '学士', 'bachelor', '统招']],
    ['大专', ['大专', '专科', '高职']],
    ['高中', ['高中', '中专', '技校']]
  ];

  function extractEdu(text) {
    var n = normalize(text);
    for (var i = 0; i < EDU_ORDER.length; i++) {
      var label = EDU_ORDER[i][0], alts = EDU_ORDER[i][1];
      for (var j = 0; j < alts.length; j++) {
        if (n.indexOf(alts[j]) !== -1) return label;
      }
    }
    return null;
  }

  // 岗位命中情况
  function scoreRoles(text) {
    var hay = makeHay(text);
    var out = [];

    ROLES.forEach(function (role) {
      var coreHit = role.core.filter(function (k) { return hit(hay, k); });
      var bonusHit = role.bonus.filter(function (k) { return hit(hay, k); });
      if (coreHit.length < 2) return;          // 只命中一两个词不算方向
      var raw = coreHit.length * 3 + bonusHit.length;
      out.push({
        role: role,
        coreHit: coreHit,
        bonusHit: bonusHit,
        raw: raw,
        percent: Math.min(100, Math.round(raw / 28 * 100))
      });
    });

    out.sort(function (a, b) { return b.raw - a.raw; });
    return out;
  }

  function collectSkills(text) {
    var hay = makeHay(text);
    var seen = {}, list = [];
    ROLES.forEach(function (role) {
      role.core.concat(role.bonus).forEach(function (k) {
        var key = normalize(k);
        if (!seen[key] && hit(hay, k)) { seen[key] = 1; list.push(k); }
      });
    });
    return list;
  }

  /* ---------------- JD 对比 ---------------- */

  function jdCompare(resumeText, jdText) {
    var rh = makeHay(resumeText), jh = makeHay(jdText);
    var jdSkills = [], resumeSkills = {};

    ROLES.forEach(function (role) {
      role.core.concat(role.bonus).forEach(function (k) {
        var key = normalize(k);
        if (!resumeSkills[key] && hit(rh, k)) resumeSkills[key] = k;
        if (jdSkills.indexOf(k) === -1 && hit(jh, k)) jdSkills.push(k);
      });
    });

    var hitList = [], missList = [];
    jdSkills.forEach(function (k) {
      if (resumeSkills[normalize(k)]) hitList.push(k); else missList.push(k);
    });

    return {
      total: jdSkills.length,
      hit: hitList,
      miss: missList,
      percent: jdSkills.length ? Math.round(hitList.length / jdSkills.length * 100) : 0
    };
  }

  /* ---------------- 搜索关键词 ---------------- */

  function buildSearch(topRoles, years, city) {
    var groups = [];
    topRoles.slice(0, 3).forEach(function (item) {
      var terms = [];
      var title = item.role.title.replace(/（.*?）/g, '');
      var yr = years ? ' ' + years + '年' : '';
      var ct = city ? city + ' ' : '';

      item.role.search.forEach(function (s) {
        terms.push(ct + s + yr);
      });
      var top = item.coreHit.slice(0, 3)
        .map(function (s) { return s.replace(/\b\w/g, function (c) { return c.toUpperCase(); }); });
      if (top.length) terms.push(ct + title + ' ' + top.join(' '));

      groups.push({
        title: item.role.title,
        tip: item.role.tip,
        terms: uniq(terms)
      });
    });
    return groups;
  }

  function uniq(a) {
    var seen = {}, out = [];
    a.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } });
    return out;
  }

  /* ---------------- 渲染 ---------------- */

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function renderProfile(p) {
    var box = els.profileCard;
    box.textContent = '';

    var head = el('div', 'spread');
    head.appendChild(el('strong', null, '简历画像'));
    if (p.years != null) head.appendChild(el('span', 'pill on', p.years + ' 年经验'));
    else if (p.edu) head.appendChild(el('span', 'pill on', p.edu));
    box.appendChild(head);

    var facts = [];
    if (p.years != null) facts.push('经验约 ' + p.years + ' 年');
    if (p.edu) facts.push('学历 ' + p.edu);
    facts.push('识别到 ' + p.skills.length + ' 个技能关键词');
    box.appendChild(el('p', 'muted small', facts.join(' · ')));

    if (p.skills.length) {
      var wrap = el('div', 'pills');
      p.skills.slice(0, 40).forEach(function (s) { wrap.appendChild(el('span', 'pill', s)); });
      if (p.skills.length > 40) wrap.appendChild(el('span', 'pill', '…'));
      box.appendChild(wrap);
    } else {
      box.appendChild(el('p', 'muted small',
        '没有识别到关键词。简历里请把技能、工具、项目名称写全（比如具体的框架、软件、证书名）。'));
    }
  }

  function bar(percent) {
    var wrap = el('div', 'bar');
    var fill = el('div', 'bar-fill');
    fill.style.width = percent + '%';
    wrap.appendChild(fill);
    return wrap;
  }

  function renderRoles(list) {
    var box = els.roleList;
    box.textContent = '';

    if (!list.length) {
      box.appendChild(el('p', 'muted small',
        '没能匹配到合适的岗位方向。建议在简历里补上具体的技能名、软件名、工具名和项目产出。'));
      return;
    }

    list.slice(0, 6).forEach(function (item, idx) {
      var card = el('div', 'card role');

      var top = el('div', 'spread');
      var left = el('div');
      left.appendChild(el('strong', null, (idx + 1) + '. ' + item.role.title));
      top.appendChild(left);
      top.appendChild(el('span', 'pct', item.percent + '%'));
      card.appendChild(top);

      card.appendChild(bar(item.percent));
      card.appendChild(el('p', 'muted small',
        '命中核心词 ' + item.coreHit.length + ' 个、加分项 ' + item.bonusHit.length + ' 个'));

      var tags = el('div', 'pills');
      item.coreHit.forEach(function (k) { tags.appendChild(el('span', 'pill on', k)); });
      item.bonusHit.forEach(function (k) { tags.appendChild(el('span', 'pill', k)); });
      card.appendChild(tags);

      card.appendChild(el('p', 'tip', '💡 ' + item.role.tip));
      box.appendChild(card);
    });
  }

  function renderSearch(groups) {
    var box = els.searchCard;
    box.textContent = '';
    if (!groups.length) { box.appendChild(el('p', 'muted small', '暂无建议。')); return; }

    groups.forEach(function (g) {
      var sec = el('div', 'sgroup');
      sec.appendChild(el('strong', null, g.title));

      var wrap = el('div', 'pills');
      g.terms.forEach(function (t) {
        var b = el('button', 'pill tap', t);
        b.type = 'button';
        b.addEventListener('click', function () { copy(t, '已复制：' + t); });
        wrap.appendChild(b);
      });
      sec.appendChild(wrap);
      sec.appendChild(el('p', 'muted small', '点任意词即可复制，直接粘到招聘平台搜索框。'));
      sec.appendChild(el('p', 'tip', '💡 ' + g.tip));
      box.appendChild(sec);
    });
  }

  function renderJd(res) {
    var box = els.jdResult;
    box.textContent = '';

    if (!res.total) {
      box.appendChild(el('p', 'muted small',
        '这条 JD 里没识别到已知关键词，可能岗位比较特殊或描述太短。'));
      return;
    }

    var card = el('div', 'card');
    var top = el('div', 'spread');
    top.appendChild(el('strong', null, '关键词覆盖率'));
    top.appendChild(el('span', 'pct', res.percent + '%'));
    card.appendChild(top);
    card.appendChild(bar(res.percent));

    var verdict = res.percent >= 70 ? '匹配度很高，值得优先投递。'
      : res.percent >= 45 ? '有一定匹配度，简历里补上缺的关键词再投更好。'
      : '差距比较明显，建议先补技能或换方向。';
    card.appendChild(el('p', 'small', verdict));

    card.appendChild(el('p', 'label', 'JD 要求 · 你已有 (' + res.hit.length + ')'));
    var hw = el('div', 'pills');
    if (res.hit.length) {
      res.hit.forEach(function (k) { hw.appendChild(el('span', 'pill on', k)); });
    } else {
      hw.appendChild(el('span', 'muted small', '无'));
    }
    card.appendChild(hw);

    card.appendChild(el('p', 'label', 'JD 要求 · 你缺 (' + res.miss.length + ')'));
    var mw = el('div', 'pills');
    if (res.miss.length) {
      res.miss.forEach(function (k) { mw.appendChild(el('span', 'pill miss', k)); });
    } else {
      mw.appendChild(el('span', 'muted small', '没有明显缺口'));
    }
    card.appendChild(mw);

    if (res.miss.length) {
      card.appendChild(el('p', 'muted small',
        '缺的词如果确实不会，别硬写进简历；如果只是没写出来，补上具体的工具名和项目名。'));
    }

    box.appendChild(card);
  }

  /* ---------------- 主流程 ---------------- */

  function analyze() {
    var text = els.resume.value.trim();
    if (text.length < 20) { toast('简历内容太短了，再多粘贴一些'); return; }

    state.resume = text;
    state.city = els.city.value.trim();
    try {
      localStorage.setItem(K_RESUME, state.resume);
      localStorage.setItem(K_CITY, state.city);
    } catch (e) { /* 存不下也不影响本次分析 */ }

    state.profile = {
      years: extractYears(text),
      edu: extractEdu(text),
      skills: collectSkills(text)
    };
    state.roles = scoreRoles(text);

    renderProfile(state.profile);
    renderRoles(state.roles);
    renderSearch(buildSearch(state.roles, state.profile.years, state.city));

    els.inputPane.hidden = true;
    els.resultPane.hidden = false;
    els.editBtn.hidden = false;
    window.scrollTo(0, 0);
  }

  function showInput() {
    els.inputPane.hidden = false;
    els.resultPane.hidden = true;
    els.editBtn.hidden = true;
    els.resume.focus();
  }

  function runJd() {
    var jd = els.jd.value.trim();
    if (jd.length < 20) { toast('把 JD 完整粘进来再对比'); return; }
    try { localStorage.setItem(K_JD, jd); } catch (e) { /* ignore */ }
    renderJd(jdCompare(state.resume, jd));
  }

  function reportText() {
    var p = state.profile, lines = [];
    lines.push('【简历画像】');
    if (p.years != null) lines.push('经验：约 ' + p.years + ' 年');
    if (p.edu) lines.push('学历：' + p.edu);
    lines.push('技能关键词：' + p.skills.slice(0, 30).join('、'));
    lines.push('');
    lines.push('【推荐投递方向】');
    state.roles.slice(0, 6).forEach(function (r, i) {
      lines.push((i + 1) + '. ' + r.role.title + '  ' + r.percent + '%');
      lines.push('   命中：' + r.coreHit.concat(r.bonusHit).join('、'));
      lines.push('   建议：' + r.role.tip);
    });
    lines.push('');
    lines.push('【搜索关键词】');
    buildSearch(state.roles, p.years, state.city).forEach(function (g) {
      lines.push(g.title + '：' + g.terms.join(' / '));
    });
    return lines.join('\n');
  }

  /* ---------------- 工具 ---------------- */

  var toastTimer = null;
  function toast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { els.toast.hidden = true; }, 2000);
  }

  function copy(text, okMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () { toast(okMsg || '已复制'); },
        function () { fallbackCopy(text, okMsg); });
    } else {
      fallbackCopy(text, okMsg);
    }
  }

  function fallbackCopy(text, okMsg) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, ta.value.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    toast(ok ? (okMsg || '已复制') : '复制失败，请长按选中');
  }

  /* ---------------- 事件 ---------------- */

  els.analyzeBtn.addEventListener('click', analyze);
  els.editBtn.addEventListener('click', showInput);
  els.jdBtn.addEventListener('click', runJd);
  els.copyReport.addEventListener('click', function () {
    if (state.profile) copy(reportText(), '已复制完整报告');
  });
  els.resume.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') analyze();
  });

  /* ---------------- 启动 ---------------- */

  try {
    els.resume.value = localStorage.getItem(K_RESUME) || '';
    els.city.value = localStorage.getItem(K_CITY) || '';
    els.jd.value = localStorage.getItem(K_JD) || '';
  } catch (e) { /* ignore */ }

  if (els.resume.value.trim().length >= 20) analyze();

  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('../sw.js').catch(function () {});
    });
  }

  /* 把纯函数暴露出来：一是方便 tools/test_jobs.js 在 node 里自测，
     二是你想换个界面、或把匹配逻辑搬到别处时可以直接复用。 */
  window.JOBS_CORE = {
    normalize: normalize,
    hit: hit,
    makeHay: makeHay,
    extractYears: extractYears,
    extractEdu: extractEdu,
    collectSkills: collectSkills,
    scoreRoles: scoreRoles,
    jdCompare: jdCompare,
    buildSearch: buildSearch
  };
})();
