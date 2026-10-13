/* ============================================================
   learn.js —— 每日一课（页面逻辑）

   数据分两份：
     · course-data.js  课程库（由 tools/build_course.js 生成，只读）
     · localStorage    你的进度、收藏、笔记（只在本机）

   每日课程按「你第一次打开那天」起算：第 1 天 = 第 1 课。
   课程库本身是模块轮转排序的（技术 → 方法论 → 实践 → 商业 → 软技能），
   所以不会连着几十天只讲一个方向。
   ============================================================ */
(function () {
  'use strict';

  var DATA = window.COURSE_DATA;
  var K_STATE = 'learn.state.v1';

  var els = {};
  ['viewToday', 'viewArchive', 'viewAll', 'viewMine', 'todayBody', 'archiveStat',
   'archiveList', 'allBody', 'mineStat', 'moduleProgress', 'favList', 'favCount',
   'noteList', 'noteCount', 'exportBtn', 'importBtn', 'fileInput', 'resetBtn',
   'tabbar', 'toast', 'todayBtn', 'pageTitle'].forEach(function (id) {
    els[id] = document.getElementById(id);
  });
  function $(id) { return els[id]; }

  /* ============================================================
     状态
     ============================================================ */
  var state = null;
  var viewingDay = null;          /* 非 null 时表示正在看某一课（0 基） */
  var currentTab = 'today';

  function defaultState() {
    return { v: 1, startedAt: todayStr(), read: {}, fav: {}, notes: {}, quiz: {} };
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(K_STATE);
      if (!raw) return defaultState();
      var s = JSON.parse(raw);
      if (!s || typeof s !== 'object') return defaultState();
      s.read = s.read || {}; s.fav = s.fav || {};
      s.notes = s.notes || {}; s.quiz = s.quiz || {};
      if (!/^\d{4}-\d{2}-\d{2}$/.test(s.startedAt || '')) s.startedAt = todayStr();
      return s;
    } catch (e) { return defaultState(); }
  }

  function saveState() {
    try { localStorage.setItem(K_STATE, JSON.stringify(state)); }
    catch (e) { toast('保存失败：本地存储已满，请先导出备份'); }
  }

  /* ============================================================
     日期
     ============================================================ */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function parseD(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(s, n) {
    var d = parseD(s); d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function diffDays(a, b) {
    return Math.round((parseD(b) - parseD(a)) / 86400000);
  }
  function fmtDate(s) {
    var d = parseD(s);
    return (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }
  function fmtDateFull(s) {
    var d = parseD(s);
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function weekday(s) { return '日一二三四五六'[parseD(s).getDay()]; }

  /* 第 i 天（0 基）对应的日期 */
  function dateOfIndex(i) { return addDays(state.startedAt, i); }
  /* 今天对应第几天（0 基），可能超出总课数 */
  function todayIndex() { return diffDays(state.startedAt, todayStr()); }

  /* ============================================================
     工具
     ============================================================ */
  var toastTimer = null;
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function moduleOf(id) {
    var ms = DATA.modules;
    for (var i = 0; i < ms.length; i++) if (ms[i].id === id) return ms[i];
    return { id: id, name: id, color: 'var(--accent)', desc: '' };
  }
  function lessonAt(i) { return DATA.lessons[i]; }
  function total() { return DATA.totalDays; }

  function readCount() { return Object.keys(state.read).length; }
  function favCount() { return Object.keys(state.fav).length; }
  function noteCount() {
    var n = 0;
    for (var k in state.notes) if (state.notes[k] && state.notes[k].trim()) n++;
    return n;
  }
  /* 连续学习天数：从今天往回数，只要有某天标记过已学就算 */
  function streak() {
    var days = {};
    for (var id in state.read) {
      var d = new Date(state.read[id]);
      days[d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())] = 1;
    }
    var n = 0, cur = todayStr();
    /* 今天还没学不算断，从今天开始往前看 */
    while (days[cur]) { n++; cur = addDays(cur, -1); }
    if (n === 0) {
      cur = addDays(todayStr(), -1);
      while (days[cur]) { n++; cur = addDays(cur, -1); }
    }
    return n;
  }

  /* ============================================================
     渲染：今日 / 单课
     ============================================================ */
  function renderToday() {
    var box = $('todayBody');
    box.textContent = '';

    var today = todayIndex();
    var idx = viewingDay === null ? today : viewingDay;

    /* 全部学完 */
    if (idx >= total()) {
      var f = el('div', 'card finish');
      f.appendChild(el('div', 'big', '🎉 180 课全部推完了'));
      f.appendChild(el('p', 'muted small',
        '从 ' + state.startedAt + ' 开始，你已经走完整个课程表。' +
        '可以去「全部」里随便翻，或者去「我的」里回顾笔记和收藏。'));
      box.appendChild(f);
      if (viewingDay === null && today > total()) {
        var again = el('button', 'btn block', '从最后一课再看一遍');
        again.type = 'button';
        again.style.marginTop = '12px';
        again.addEventListener('click', function () { goLesson(total() - 1); });
        box.appendChild(again);
      }
      updateTodayBtn();
      return;
    }

    var L = lessonAt(idx);
    if (!L) {
      box.appendChild(el('p', 'empty', '课程数据缺失，请检查 course-data.js 是否正确部署。'));
      return;
    }
    var mod = moduleOf(L.module);
    var dateStr = dateOfIndex(idx);

    box.appendChild(buildLesson(L, mod, dateStr, idx));
    updateTodayBtn();
  }

  function buildLesson(L, mod, dateStr, idx) {
    var card = el('div', 'card');

    /* 头部 */
    var head = el('div', 'lesson-head');
    var mp = el('span', 'mod-pill', mod.name);
    mp.style.background = mod.color;
    head.appendChild(mp);
    head.appendChild(el('span', 'day-pill', '第 ' + L.day + ' / ' + total() + ' 课'));
    head.appendChild(el('span', 'day-pill', L.level === 1 ? '入门' : L.level === 2 ? '进阶' : '深入'));
    card.appendChild(head);

    card.appendChild(el('div', 'arow-date',
      fmtDateFull(dateStr) + ' 周' + weekday(dateStr) +
      (idx === todayIndex() ? ' · 今天' : '')));

    card.appendChild(el('h2', 'lesson-title', L.title));
    card.appendChild(el('p', 'lede', L.def));

    var why = el('div', 'block why');
    why.appendChild(el('div', 'block-k', '为什么产品经理要知道'));
    why.appendChild(el('p', null, L.why));
    card.appendChild(why);

    var pts = el('div', 'block');
    pts.appendChild(el('div', 'block-k', '核心要点'));
    var ul = el('ul', 'points');
    L.points.forEach(function (p) { ul.appendChild(el('li', null, p)); });
    pts.appendChild(ul);
    card.appendChild(pts);

    var exa = el('div', 'block exa');
    exa.appendChild(el('div', 'block-k', '一个例子'));
    exa.appendChild(el('p', null, L.example));
    card.appendChild(exa);

    var pit = el('div', 'block pit');
    pit.appendChild(el('div', 'block-k', '常见的坑'));
    pit.appendChild(el('p', null, L.pitfall));
    card.appendChild(pit);

    card.appendChild(buildQuiz(L));

    /* 标签 */
    var tags = el('div', 'tags');
    (L.tags || []).forEach(function (t) {
      tags.appendChild(el('span', 'pill', '#' + t));
    });
    card.appendChild(tags);

    /* 操作 */
    var act = el('div', 'actions');
    var readBtn = el('button', 'btn' + (state.read[L.id] ? ' done' : ''), 
      state.read[L.id] ? '✓ 已学' : '标记已学');
    readBtn.type = 'button';
    readBtn.addEventListener('click', function () {
      if (state.read[L.id]) delete state.read[L.id];
      else state.read[L.id] = Date.now();
      saveState();
      renderToday();
      renderMine();
      renderAll();
    });
    var favBtn = el('button', 'btn' + (state.fav[L.id] ? ' done' : ''),
      state.fav[L.id] ? '★ 已收藏' : '☆ 收藏');
    favBtn.type = 'button';
    favBtn.addEventListener('click', function () {
      if (state.fav[L.id]) delete state.fav[L.id];
      else state.fav[L.id] = Date.now();
      saveState();
      renderToday();
      renderMine();
    });
    act.appendChild(readBtn);
    act.appendChild(favBtn);
    card.appendChild(act);

    /* 笔记 */
    var nb = el('div', 'note-block');
    nb.appendChild(el('div', 'block-k', '我的笔记'));
    var ta = el('textarea', 'note-input');
    ta.placeholder = '写下你的理解、你项目里的对应场景、或者要问的问题…';
    ta.value = state.notes[L.id] || '';
    var hint = el('p', 'muted small note-hint', '自动保存，只存在本机');
    var timer = null;
    ta.addEventListener('input', function () {
      clearTimeout(timer);
      hint.textContent = '正在输入…';
      timer = setTimeout(function () {
        var v = ta.value;
        if (v.trim()) state.notes[L.id] = v; else delete state.notes[L.id];
        saveState();
        hint.textContent = '已保存 · ' + new Date().toTimeString().slice(0, 5);
        renderMine();
      }, 500);
    });
    nb.appendChild(ta);
    nb.appendChild(hint);
    card.appendChild(nb);

    /* 上一课 / 下一课 */
    var nav = el('div', 'lesson-nav');
    var prev = el('button', 'btn', '‹ 上一课');
    prev.type = 'button';
    prev.disabled = idx <= 0;
    prev.addEventListener('click', function () { goLesson(idx - 1); });
    var next = el('button', 'btn', '下一课 ›');
    next.type = 'button';
    next.disabled = idx >= total() - 1;
    next.addEventListener('click', function () { goLesson(idx + 1); });
    nav.appendChild(prev);
    nav.appendChild(next);
    card.appendChild(nav);

    return card;
  }

  function buildQuiz(L) {
    var wrap = el('div', 'block quiz');
    wrap.appendChild(el('div', 'block-k', '今日一题'));
    wrap.appendChild(el('p', 'q', L.quiz.q));

    var opts = el('div', 'opts');
    var picked = state.quiz[L.id];
    var answered = typeof picked === 'number';
    var letters = ['A', 'B', 'C'];

    L.quiz.options.forEach(function (text, i) {
      var b = el('button', 'opt', letters[i] + '. ' + text);
      b.type = 'button';
      if (answered) {
        b.disabled = true;
        if (i === L.quiz.answer) b.classList.add('correct');
        else if (i === picked) b.classList.add('wrong');
      } else {
        b.addEventListener('click', function () {
          state.quiz[L.id] = i;
          saveState();
          renderToday();
        });
      }
      opts.appendChild(b);
    });
    wrap.appendChild(opts);

    if (answered) {
      var okk = picked === L.quiz.answer;
      var ex = el('div', 'explain');
      var head = el('b', null, okk ? '答对了 · ' : '再想想 · ');
      ex.appendChild(head);
      ex.appendChild(document.createTextNode('正确答案 ' + letters[L.quiz.answer] + '。'));
      ex.appendChild(el('div', null, L.quiz.explain));
      wrap.appendChild(ex);
    }
    return wrap;
  }

  function goLesson(i) {
    viewingDay = Math.max(0, Math.min(i, total() - 1));
    switchTab('today');
    renderToday();
    window.scrollTo(0, 0);
  }

  function updateTodayBtn() {
    var b = $('todayBtn');
    if (!b) return;
    b.hidden = viewingDay === null;
    $('pageTitle').textContent = viewingDay === null
      ? '每日一课'
      : '第 ' + lessonAt(viewingDay).day + ' 课';
  }

  /* ============================================================
     渲染：存档
     ============================================================ */
  function renderArchive() {
    var today = todayIndex();
    var lastIdx = Math.min(today, total() - 1);

    var st = $('archiveStat');
    st.textContent = '';
    st.appendChild(statGrid());

    var box = $('archiveList');
    box.textContent = '';
    box.className = 'alist';

    if (lastIdx < 0) {
      box.appendChild(el('p', 'empty', '还没有开始。回到「今日」看看第一课。'));
      return;
    }

    for (var i = lastIdx; i >= 0; i--) {
      var L = lessonAt(i);
      if (!L) continue;
      var dateStr = dateOfIndex(i);
      var isToday = i === today;

      var row = el('div', 'arow' + (isToday ? ' is-today' : ''));
      row.appendChild(el('span', 'dot' + (state.read[L.id] ? ' read' : '')));

      var main = el('div', 'arow-main');
      main.appendChild(el('div', 'arow-date',
        '第 ' + L.day + ' 天 · ' + fmtDate(dateStr) + ' 周' + weekday(dateStr) +
        (isToday ? ' · 今天' : '')));
      main.appendChild(el('div', 'arow-title', L.title));
      row.appendChild(main);

      var marks = '';
      if (state.fav[L.id]) marks += '★';
      if (state.notes[L.id] && state.notes[L.id].trim()) marks += '✎';
      row.appendChild(el('span', 'arow-marks', marks));

      (function (idx) {
        row.addEventListener('click', function () { goLesson(idx); });
      })(i);
      box.appendChild(row);
    }
  }

  function statGrid() {
    var g = el('div', 'stat-grid');
    [
      [readCount(), '已学'],
      [streak(), '连续天'],
      [favCount(), '收藏'],
      [noteCount(), '笔记']
    ].forEach(function (c) {
      var cell = el('div', 'stat-cell');
      cell.appendChild(el('div', 'stat-n', String(c[0])));
      cell.appendChild(el('div', 'stat-k', c[1]));
      g.appendChild(cell);
    });
    return g;
  }

  /* ============================================================
     渲染：全部
     ============================================================ */
  function renderAll() {
    var box = $('allBody');
    box.textContent = '';

    DATA.modules.forEach(function (mod) {
      var list = DATA.lessons.filter(function (L) { return L.module === mod.id; })
        .sort(function (a, b) { return a.unitIndex - b.unitIndex; });
      var done = list.filter(function (L) { return state.read[L.id]; }).length;

      var blk = el('div', 'mod-block');
      var head = el('div', 'mod-head');
      var dot = el('span', 'mod-pill', mod.name);
      dot.style.background = mod.color;
      head.appendChild(dot);
      head.appendChild(el('span', 'mod-meta', done + ' / ' + list.length));
      blk.appendChild(head);
      blk.appendChild(el('p', 'mod-desc muted', mod.desc));

      var bar = el('div', 'mod-bar');
      var fill = el('i');
      fill.style.width = (list.length ? done / list.length * 100 : 0) + '%';
      fill.style.background = mod.color;
      bar.appendChild(fill);
      blk.appendChild(bar);

      var card = el('div', 'card');
      list.forEach(function (L) {
        var row = el('div', 'trow' + (state.read[L.id] ? ' read' : ''));
        row.appendChild(el('span', 'trow-n', 'D' + L.day));
        row.appendChild(el('span', 'trow-t', L.title));
        if (state.fav[L.id]) row.appendChild(el('span', 'trow-flag', '★'));
        (function (day) {
          row.addEventListener('click', function () { goLesson(day - 1); });
        })(L.day);
        card.appendChild(row);
      });
      blk.appendChild(card);
      box.appendChild(blk);
    });
  }

  /* ============================================================
     渲染：我的
     ============================================================ */
  function renderMine() {
    var st = $('mineStat');
    st.textContent = '';
    st.appendChild(statGrid());
    var pct = Math.round(readCount() / total() * 100);
    st.appendChild(el('p', 'muted small',
      '总进度 ' + readCount() + ' / ' + total() + ' 课（' + pct + '%）· ' +
      '开始于 ' + state.startedAt));

    /* 模块进度 */
    var mp = $('moduleProgress');
    mp.textContent = '';
    DATA.modules.forEach(function (mod, i) {
      var list = DATA.lessons.filter(function (L) { return L.module === mod.id; });
      var done = list.filter(function (L) { return state.read[L.id]; }).length;
      var row = el('div', 'score-row');
      row.style.marginTop = i ? '14px' : '0';
      var head = el('div', 'score-head');
      head.appendChild(el('span', null, mod.name));
      head.appendChild(el('span', 'score-num', done + ' / ' + list.length));
      row.appendChild(head);
      var bar = el('div', 'mod-bar');
      var fill = el('i');
      fill.style.width = (list.length ? done / list.length * 100 : 0) + '%';
      fill.style.background = mod.color;
      bar.appendChild(fill);
      row.appendChild(bar);
      mp.appendChild(row);
    });

    /* 收藏 */
    var favIds = Object.keys(state.fav);
    $('favCount').textContent = favIds.length ? '(' + favIds.length + ')' : '';
    var fl = $('favList');
    fl.textContent = '';
    if (!favIds.length) {
      fl.appendChild(el('p', 'empty', '还没有收藏。在课程页点「☆ 收藏」就会出现在这里。'));
    } else {
      favIds.sort(function (a, b) { return state.fav[a] - state.fav[b]; })
        .forEach(function (id) {
          var L = findLesson(id);
          if (!L) return;
          var row = el('div', 'nrow');
          row.appendChild(el('div', 'nrow-t', 'D' + L.day + ' · ' + L.title));
          row.appendChild(el('div', 'nrow-m', '第 ' + L.day + ' / ' + total() + ' 课 · 点开复习'));
          row.addEventListener('click', function () { goLesson(L.day - 1); });
          fl.appendChild(row);
        });
    }

    /* 笔记 */
    var noteIds = Object.keys(state.notes).filter(function (k) {
      return state.notes[k] && state.notes[k].trim();
    });
    $('noteCount').textContent = noteIds.length ? '(' + noteIds.length + ')' : '';
    var nl = $('noteList');
    nl.textContent = '';
    if (!noteIds.length) {
      var c = el('div', 'card');
      c.appendChild(el('p', 'empty', '还没有笔记。课程页往下滑就有笔记框，边看边写。'));
      nl.appendChild(c);
    } else {
      noteIds.sort().forEach(function (id) {
        var L = findLesson(id);
        var row = el('div', 'nrow');
        row.appendChild(el('div', 'nrow-t', (L ? 'D' + L.day + ' · ' + L.title : id)));
        row.appendChild(el('p', 'nrow-b', state.notes[id]));
        if (L) row.appendChild(el('div', 'nrow-m', '点开回到这一课'));
        if (L) row.addEventListener('click', function () { goLesson(L.day - 1); });
        nl.appendChild(row);
      });
    }
  }

  function findLesson(id) {
    for (var i = 0; i < DATA.lessons.length; i++) {
      if (DATA.lessons[i].id === id) return DATA.lessons[i];
    }
    return null;
  }

  /* ============================================================
     标签切换
     ============================================================ */
  var RENDER = {
    today: renderToday, archive: renderArchive,
    all: renderAll, mine: renderMine
  };

  function switchTab(name) {
    currentTab = name;
    ['today', 'archive', 'all', 'mine'].forEach(function (t) {
      $('view' + t.charAt(0).toUpperCase() + t.slice(1)).hidden = (t !== name);
    });
    var tabs = $('tabbar').querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].classList.toggle('on', tabs[i].getAttribute('data-tab') === name);
    }
    RENDER[name]();
    updateTodayBtn();
  }

  /* ============================================================
     导出 / 导入 / 重置
     ============================================================ */
  function backupText() {
    return JSON.stringify({
      app: 'learn', version: 1,
      exportedAt: new Date().toISOString(),
      courseVersion: DATA.version,
      startedAt: state.startedAt,
      readCount: readCount(), favCount: favCount(), noteCount: noteCount(),
      read: state.read, fav: state.fav, notes: state.notes, quiz: state.quiz
    }, null, 2);
  }

  function exportFile() {
    var name = 'learn-backup-' + todayStr() + '.json';
    var blob = new Blob([backupText()], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    toast('已导出 ' + name);
  }

  function importFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var p;
      try { p = JSON.parse(String(reader.result)); }
      catch (e) { toast('文件不是合法 JSON'); return; }
      if (!p || typeof p !== 'object') { toast('备份格式不对'); return; }
      var n = p.read ? Object.keys(p.read).length : 0;
      if (!confirm('导入备份？\n将用备份里的进度覆盖当前进度。\n\n备份包含：已学 ' +
        n + ' 课、收藏 ' + (p.fav ? Object.keys(p.fav).length : 0) +
        ' 条、笔记 ' + (p.notes ? Object.keys(p.notes).length : 0) + ' 条')) return;
      state = {
        v: 1,
        startedAt: p.startedAt || state.startedAt || todayStr(),
        read: p.read || {}, fav: p.fav || {},
        notes: p.notes || {}, quiz: p.quiz || {}
      };
      saveState();
      switchTab('today');
      toast('已导入');
    };
    reader.onerror = function () { toast('文件读取失败'); };
    reader.readAsText(file);
  }

  /* ============================================================
     启动
     ============================================================ */
  function init() {
    if (!DATA || !DATA.lessons || !DATA.lessons.length) {
      $('todayBody').appendChild(el('p', 'empty',
        '课程数据没加载上。请确认 learn/course-data.js 已正确部署。'));
      return;
    }

    state = loadState();
    saveState();          /* 首次打开会把 startedAt 落盘 */

    $('tabbar').addEventListener('click', function (e) {
      var btn = e.target.closest('.tab');
      if (!btn) return;
      viewingDay = null;                 /* 切标签时回到今天 */
      switchTab(btn.getAttribute('data-tab'));
      window.scrollTo(0, 0);
    });

    $('todayBtn').addEventListener('click', function () {
      viewingDay = null;
      renderToday();
      window.scrollTo(0, 0);
    });

    $('exportBtn').addEventListener('click', exportFile);
    $('importBtn').addEventListener('click', function () { $('fileInput').click(); });
    $('fileInput').addEventListener('change', function () {
      var f = $('fileInput').files && $('fileInput').files[0];
      if (f) importFile(f);
      $('fileInput').value = '';
    });
    $('resetBtn').addEventListener('click', function () {
      if (!confirm('重置全部进度？收藏和笔记也会一起清掉。')) return;
      if (!confirm('真的确定吗？建议先导出备份。这一步无法撤销。')) return;
      state = defaultState();
      saveState();
      viewingDay = null;
      switchTab('today');
      toast('已重置');
    });

    switchTab('today');

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('../sw.js').catch(function () {});
      });
    }
  }

  /* 便于 node 回归测试 */
  window.LearnCore = {
    defaultState: defaultState,
    todayStr: todayStr, addDays: addDays, diffDays: diffDays,
    dateOfIndex: function (s, i) { return addDays(s, i); },
    findLesson: findLesson,
    moduleOf: moduleOf
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
