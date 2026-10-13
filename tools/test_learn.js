/* ============================================================
   test_learn.js —— 每日一课的结构与内容质量测试
   用法（在 my-apps 目录下）：node tools/test_learn.js

   分三块：
     A. 结构：课程库是否 180 课、模块是否轮转、字段是否齐全
     B. 内容质量：黑话、模板化、重复、空字段
     C. 逻辑：learn.js 的日期换算（含跨月、跨年、闰年）
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const DATA_FILE = path.join(ROOT, 'learn', 'course-data.js');
const DAYS_FILE = path.join(ROOT, 'learn', 'days.json');

if (!fs.existsSync(DATA_FILE)) {
  console.error('\n找不到 learn/course-data.js，请先运行：node tools/build_course.js\n');
  process.exit(1);
}

const sandbox = { console, Math, Date, JSON, String, Number, Array, Object, RegExp };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(DATA_FILE, 'utf8'), sandbox, { filename: 'course-data.js' });

const DATA = sandbox.COURSE_DATA;

let pass = 0, fail = 0;
const ok = (n, c, x) => { c ? (pass++, console.log('  ok   ' + n))
  : (fail++, console.log('  FAIL ' + n + (x !== undefined ? '  → ' + x : ''))); };

const ORDER = ['tech', 'method', 'practice', 'biz', 'soft'];
const PER_MODULE = 36;
const TOTAL = 180;

/* ============================================================
   A. 结构
   ============================================================ */
console.log('\n=== A1. 课程库结构 ===');
ok('总课数 180', DATA.totalDays === TOTAL, DATA.totalDays);
ok('lessons 长度 180', DATA.lessons.length === TOTAL, DATA.lessons.length);
ok('模块数 5', DATA.modules.length === 5, DATA.modules.length);
ok('模块顺序正确',
  DATA.modules.map((m) => m.id).join(',') === ORDER.join(','),
  DATA.modules.map((m) => m.id).join(','));

console.log('\n=== A2. 每模块 36 课 ===');
ORDER.forEach((id) => {
  const n = DATA.lessons.filter((L) => L.module === id).length;
  ok(`${id} 有 ${PER_MODULE} 课`, n === PER_MODULE, n);
});

console.log('\n=== A3. day 字段与模块轮转 ===');
let dayBad = 0, rotBad = 0, unitBad = 0;
DATA.lessons.forEach((L, i) => {
  if (L.day !== i + 1) dayBad++;
  if (L.module !== ORDER[i % ORDER.length]) rotBad++;
  if (L.unitIndex !== Math.floor(i / ORDER.length)) unitBad++;
});
ok('day 从 1 连续到 180', dayBad === 0, 'bad=' + dayBad);
ok('模块按 5 步轮转（不会连着 36 天同模块）', rotBad === 0, 'bad=' + rotBad);
ok('unitIndex = 模块内序号', unitBad === 0, 'bad=' + unitBad);

console.log('\n=== A4. id 唯一且格式正确 ===');
const PREFIX = { tech: 'T', method: 'M', practice: 'P', biz: 'B', soft: 'S' };
const seenId = new Set();
let idBad = 0;
DATA.lessons.forEach((L) => {
  if (seenId.has(L.id)) idBad++;
  seenId.add(L.id);
  const want = PREFIX[L.module] + String(L.unitIndex + 1).padStart(2, '0');
  if (L.id !== want) idBad++;
});
ok('180 个 id 唯一且与模块/序号对应', idBad === 0, 'bad=' + idBad);

console.log('\n=== A5. 必填字段完整 ===');
const REQUIRED = ['id', 'module', 'title', 'level', 'minutes', 'tags',
                  'def', 'why', 'points', 'example', 'pitfall', 'quiz'];
const FIELD_RANGE = {
  def: [18, 55], why: [35, 85], example: [70, 180], pitfall: [35, 95]
};
let missField = 0, lenBad = 0;
const lenBadList = [];
const cp = (s) => (s ? [...String(s)].length : 0);
DATA.lessons.forEach((L) => {
  REQUIRED.forEach((k) => { if (L[k] === undefined || L[k] === null) missField++; });
  Object.keys(FIELD_RANGE).forEach((k) => {
    const n = cp(L[k]);
    const [lo, hi] = FIELD_RANGE[k];
    if (n < lo || n > hi) { lenBad++; lenBadList.push(`${L.id}.${k}=${n}`); }
  });
  if (!Array.isArray(L.points) || L.points.length < 3 || L.points.length > 4) missField++;
  if (![1, 2, 3].includes(L.level)) missField++;
  if (!Number.isInteger(L.minutes) || L.minutes < 3 || L.minutes > 8) missField++;
  if (!Array.isArray(L.tags) || L.tags.length < 2) missField++;
});
ok('无缺字段', missField === 0, 'bad=' + missField);
ok('定义/为什么/例子/坑 字数都在区间内', lenBad === 0,
  lenBad ? lenBadList.slice(0, 8).join(' ') : '');

console.log('\n=== A6. 今日一题合法性 ===');
let quizBad = 0, ansDist = { 0: 0, 1: 0, 2: 0 };
DATA.lessons.forEach((L) => {
  const q = L.quiz;
  if (!q || !q.q || !q.explain) { quizBad++; return; }
  if (!Array.isArray(q.options) || q.options.length !== 3) { quizBad++; return; }
  if (![0, 1, 2].includes(q.answer)) { quizBad++; return; }
  if (q.options.some((o) => !o || !String(o).trim())) { quizBad++; return; }
  ansDist[q.answer]++;
});
ok('每题恰好 3 个选项、答案 0/1/2、有解析', quizBad === 0, 'bad=' + quizBad);
ok('正确答案在 0/1/2 上分布均衡（各 ≥40）',
  Object.values(ansDist).every((v) => v >= 40), JSON.stringify(ansDist));

console.log('\n=== A7. days.json（给快捷指令用） ===');
if (!fs.existsSync(DAYS_FILE)) {
  ok('days.json 存在', false, '文件缺失');
} else {
  const days = JSON.parse(fs.readFileSync(DAYS_FILE, 'utf8'));
  ok('days.json 是 180 个标题的数组',
    Array.isArray(days) && days.length === TOTAL, Array.isArray(days) ? days.length : 'not array');
  let mismatch = 0;
  days.forEach((t, i) => { if (t !== DATA.lessons[i].title) mismatch++; });
  ok('顺序与 lessons 完全一致', mismatch === 0, 'bad=' + mismatch);
}

/* ============================================================
   B. 内容质量
   ============================================================ */
console.log('\n=== B1. 黑话扫描 ===');
const BUZZ = /赋能|抓手|闭环|颗粒度|拉通|拉齐|组合拳|颠覆|革命性|生态化|护城河式|打法|对齐一下|沉淀一下|复用一下/;
const buzzHits = [];
DATA.lessons.forEach((L) => {
  const all = [L.def, L.why, L.example, L.pitfall, L.quiz.q, L.quiz.explain]
    .concat(L.points, L.quiz.options, [L.title]).join(' ');
  const m = all.match(BUZZ);
  if (m) buzzHits.push(`${L.id}:${m[0]}`);
});
ok('无空话黑话', buzzHits.length === 0, buzzHits.slice(0, 10).join(' '));

console.log('\n=== B2. 标题唯一 ===');
const titleMap = new Map();
let dupTitle = 0;
DATA.lessons.forEach((L) => {
  if (titleMap.has(L.title)) dupTitle++; else titleMap.set(L.title, L.id);
});
ok('180 个标题互不重复', dupTitle === 0, 'bad=' + dupTitle);

console.log('\n=== B3. 不是模板套出来的 ===');
/* 如果 why 大量以同一个词开头，说明是模板 */
function headDiversity(arr, n) {
  const m = new Map();
  arr.forEach((s) => {
    const h = [...String(s)].slice(0, n).join('');
    m.set(h, (m.get(h) || 0) + 1);
  });
  let max = 0, top = '';
  m.forEach((v, k) => { if (v > max) { max = v; top = k; } });
  return { max, top, distinct: m.size };
}
const whyHead = headDiversity(DATA.lessons.map((L) => L.why), 3);
const defHead = headDiversity(DATA.lessons.map((L) => L.def), 3);
ok('why 开头不过度雷同（最高重复 ≤12）', whyHead.max <= 12,
  `最高「${whyHead.top}」出现 ${whyHead.max} 次`);
ok('def 开头不过度雷同（最高重复 ≤12）', defHead.max <= 12,
  `最高「${defHead.top}」出现 ${defHead.max} 次`);
console.log(`  why 前 3 字去重 ${whyHead.distinct} 种 / def 前 3 字去重 ${defHead.distinct} 种`);

console.log('\n=== B4. 无整段复制粘贴 ===');
const exSet = new Map();
let dupEx = 0;
DATA.lessons.forEach((L) => {
  if (exSet.has(L.example)) dupEx++; else exSet.set(L.example, L.id);
});
const ptSet = new Map();
let dupPt = 0;
DATA.lessons.forEach((L) => {
  L.points.forEach((p) => {
    if (ptSet.has(p)) dupPt++; else ptSet.set(p, L.id);
  });
});
ok('例子无重复', dupEx === 0, 'bad=' + dupEx);
/* 跨课重复要点允许少量（同一概念会反复出现），但不该大面积重复 */
ok('要点重复率 < 3%', dupPt / 180 / 3.5 < 0.03, `${dupPt} 条重复`);

console.log('\n=== B5. 模块主题分布 ===');
const lvDist = { 1: 0, 2: 0, 3: 0 };
DATA.lessons.forEach((L) => { lvDist[L.level]++; });
ok('难度三档都有，且入门占多数', lvDist[1] > 40 && lvDist[2] > 40 && lvDist[3] > 10,
  JSON.stringify(lvDist));
let minTotal = 1e9, maxTotal = 0;
DATA.lessons.forEach((L) => {
  const n = cp(L.def) + cp(L.why) + cp(L.example) + cp(L.pitfall) +
            L.points.reduce((a, p) => a + cp(p), 0) + cp(L.quiz.explain);
  minTotal = Math.min(minTotal, n); maxTotal = Math.max(maxTotal, n);
});
ok('每课正文长度差异合理（最短 > 250 字）', minTotal > 250,
  `最短 ${minTotal} / 最长 ${maxTotal}`);

/* ============================================================
   C. learn.js 日期逻辑
   ============================================================ */
console.log('\n=== C. learn.js 日期换算 ===');
function fakeEl() {
  return {
    style: {}, dataset: {}, children: [], options: [], files: [],
    textContent: '', value: '', hidden: false, className: '',
    addEventListener() {}, appendChild(c) { return c; },
    setAttribute() {}, getAttribute() { return null; }, remove() {},
    querySelector() { return fakeEl(); }, querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {} }, click() {}, append() {}
  };
}
const L = Object.assign({}, sandbox, {
  document: {
    readyState: 'loading',
    getElementById: () => fakeEl(),
    createElement: () => fakeEl(),
    querySelector: () => fakeEl(),
    querySelectorAll: () => [],
    body: fakeEl(),
    addEventListener() {}
  },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: { userAgent: 'node' },
  location: { protocol: 'https:', href: 'https://x/learn/' },
  setTimeout, clearTimeout, Blob: function () {}, URL: { createObjectURL() {}, revokeObjectURL() {} },
  FileReader: function () {}, confirm: () => false, alert() {}
});
L.window = L; L.globalThis = L;
vm.createContext(L);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'learn', 'learn.js'), 'utf8'),
  L, { filename: 'learn.js' });
const C = L.LearnCore;

ok('LearnCore 已暴露', !!C);
ok('todayStr 格式正确', /^\d{4}-\d{2}-\d{2}$/.test(C.todayStr()), C.todayStr());

const cases = [
  ['2025-01-01', 1, '2025-01-02'],
  ['2025-01-31', 1, '2025-02-01'],
  ['2025-12-31', 1, '2026-01-01'],
  ['2024-02-28', 1, '2024-02-29'],   /* 闰年 */
  ['2024-02-29', 1, '2024-03-01'],
  ['2025-02-28', 1, '2025-03-01'],   /* 平年 */
  ['2025-03-01', -1, '2025-02-28']
];
let dateBad = 0;
cases.forEach(([from, n, want]) => { if (C.addDays(from, n) !== want) dateBad++; });
ok('addDays 跨月/跨年/闰年 全部正确', dateBad === 0, 'bad=' + dateBad);

ok('diffDays 同日 = 0', C.diffDays('2025-06-10', '2025-06-10') === 0);
ok('diffDays 隔天 = 1', C.diffDays('2025-06-10', '2025-06-11') === 1);
ok('diffDays 跨年正确', C.diffDays('2024-12-31', '2025-01-01') === 1);
ok('diffDays 一整年 = 366（2024 闰年）',
  C.diffDays('2024-01-01', '2025-01-01') === 366,
  C.diffDays('2024-01-01', '2025-01-01'));
ok('dateOfIndex 与 diffDays 互逆',
  C.diffDays('2025-01-01', C.dateOfIndex('2025-01-01', 179)) === 179,
  C.dateOfIndex('2025-01-01', 179));

console.log('\n=== C2. 课程查找 ===');
ok('findLesson 能按 id 找到', !!C.findLesson('T01'));
ok('findLesson 找不到时返回 null', C.findLesson('NOPE') === null);
ok('moduleOf 返回正确名称', C.moduleOf('tech').name === 'AI 技术基础', C.moduleOf('tech').name);

console.log('\n' + '='.repeat(52));
console.log(`通过 ${pass} 项，失败 ${fail} 项`);
console.log('='.repeat(52) + '\n');
process.exit(fail ? 1 : 0);
