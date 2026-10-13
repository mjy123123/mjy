/* ============================================================
   test_fortune.js —— 运势层的回归测试
   用法（在 my-apps 目录下）：node tools/test_fortune.js

   历法与天文本身在 test_almanac.js 里测；这里测的是上层：
     · 确定性（同一天同一人结果必须一模一样）
     · 星座专属（文案必须真的来自本人星座的内容池，不是通用话术）
     · 星盘（上升星座在缺出生时间时必须诚实返回"算不出"）
     · 组合完整性与分数区间
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function fakeEl() {
  return {
    style: {}, dataset: {}, children: [],
    textContent: '', value: '', hidden: false, className: '', options: [],
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { this.children.push(c); return c; },
    setAttribute() {}, getAttribute() { return null; }, remove() {},
    focus() {}, click() {}, select() {}, setSelectionRange() {},
    querySelector() { return fakeEl(); }, querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {} }
  };
}

const els = new Map();
const store = new Map();
const sandbox = {
  console, setTimeout, clearTimeout, Math, Date, JSON, String, Number, Array, Object,
  document: {
    readyState: 'loading',                       /* 让 init() 不跑 */
    getElementById(id) {
      if (!els.has(id)) els.set(id, fakeEl());
      return els.get(id);
    },
    createElement() { return fakeEl(); },
    querySelector() { return fakeEl(); },
    querySelectorAll() { return []; },
    body: fakeEl(),
    addEventListener() {}
  },
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k)
  },
  navigator: { userAgent: 'node' },
  location: { protocol: 'https:', href: 'https://x/fortune/' },
  matchMedia: () => ({ matches: false }),
  sessionStorage: { getItem: () => null, setItem: () => {} }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const root = path.join(__dirname, '..', 'fortune');
['almanac.js', 'signs-data.js', 'fortune.js'].forEach((f) => {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sandbox, { filename: f });
});

const F = sandbox.Fortune;
const A = sandbox.Almanac;
const SIGN = sandbox.SIGN_DATA;
const ZOD = sandbox.ZODIAC_DATA;

let pass = 0, fail = 0;
const ok = (n, c, x) => { c ? (pass++, console.log('  ok   ' + n))
  : (fail++, console.log('  FAIL ' + n + (x !== undefined ? '  → ' + x : ''))); };
const J = (o) => JSON.stringify(o);

const PROFILES = [
  { name: '小林', birthday: '1995-03-01', time: '14:30', city: '北京' },   /* 双鱼 */
  { name: '阿May', birthday: '1992-03-25', time: '08:15', city: '上海' },  /* 白羊 */
  { name: '老王', birthday: '1988-11-05', time: '', city: '广州' },        /* 天蝎，无时间 */
  { name: 'K', birthday: '2000-01-05', time: '23:50', city: '乌鲁木齐' },  /* 摩羯 */
  { name: '大熊', birthday: '1990-08-01', time: '06:00', city: '哈尔滨' }, /* 狮子 */
  { name: '小满', birthday: '1998-02-01', time: '12:00', city: '悉尼' }    /* 水瓶 */
];

console.log('\n=== 1. 确定性 ===');
const base = F.generateFortune('2025-06-10', PROFILES[0]);
ok('同一输入跑两遍 → 结果完全一致',
  J(base) === J(F.generateFortune('2025-06-10', PROFILES[0])));
ok('换日期 → 结果不同',
  J(base) !== J(F.generateFortune('2025-06-11', PROFILES[0])));
ok('换昵称 → 结果不同',
  J(base) !== J(F.generateFortune('2025-06-10',
    Object.assign({}, PROFILES[0], { name: '别人' }))));
ok('换出生时间 → 结果不同（上升会变）',
  J(base) !== J(F.generateFortune('2025-06-10',
    Object.assign({}, PROFILES[0], { time: '03:00' }))));

let stable = true;
for (let i = 0; i < 200; i++) {
  const d = F.addDays('2025-01-01', i);
  const p = PROFILES[i % PROFILES.length];
  if (J(F.generateFortune(d, p)) !== J(F.generateFortune(d, p))) { stable = false; break; }
}
ok('200 天 × 6 个人各跑两遍全部一致', stable);

console.log('\n=== 2. 星座判定与星盘 ===');
const expectSign = { '小林': '双鱼座', '阿May': '白羊座', '老王': '天蝎座',
                     'K': '摩羯座', '大熊': '狮子座', '小满': '水瓶座' };
PROFILES.forEach((p) => {
  const f = F.generateFortune('2025-06-10', p);
  ok(`${p.name}（${p.birthday}）→ ${expectSign[p.name]}`, f.sign === expectSign[p.name], f.sign);
});
PROFILES.forEach((p) => {
  const f = F.generateFortune('2025-06-10', p);
  ok(`${p.name} 月亮星座是合法星座`, A.SIGNS.indexOf(f.chart.moon) !== -1, f.chart.moon);
  ok(`${p.name} 上升星座${p.time ? '有值' : '为 null'}`,
    p.time ? A.SIGNS.indexOf(f.chart.asc) !== -1 : f.chart.asc === null,
    String(f.chart.asc));
});
ok('没有出生时间时给出明确说明',
  F.generateFortune('2025-06-10', PROFILES[2]).chart.ascNote.length > 0);
ok('月亮星座标记为近似（无出生时间）',
  F.generateFortune('2025-06-10', PROFILES[2]).chart.moonApprox === true);
ok('有出生时间时月亮星座不标近似',
  F.generateFortune('2025-06-10', PROFILES[0]).chart.moonApprox === false);

console.log('\n=== 3. 内容必须真的来自本人星座的池子 ===');
let notInPool = 0, verdictBad = 0, adviceBad = 0, genericPool = 0;
for (let i = 0; i < 400; i++) {
  const p = PROFILES[i % PROFILES.length];
  const d = F.addDays('2025-01-01', i % 360);
  const f = F.generateFortune(d, p);
  const sd = SIGN[f.sign];
  const zd = ZOD[f.zodiac];
  const okPool = new Set([].concat(sd.good, zd.good));
  const badPool = new Set([].concat(sd.bad, zd.bad));
  f.good.forEach((t) => { if (!okPool.has(t)) notInPool++; });
  f.bad.forEach((t) => { if (!badPool.has(t)) notInPool++; });
  if (sd.verdicts[f.tier].indexOf(f.verdict) === -1) verdictBad++;
  if (sd.advice[f.tier].indexOf(f.advice) === -1) adviceBad++;
  if (!sd || !f.signData) genericPool++;
}
ok('400 次抽样，宜忌全部落在本人星座/生肖池内', notInPool === 0, 'bad=' + notInPool);
ok('总评短句全部来自本人星座对应档位', verdictBad === 0, 'bad=' + verdictBad);
ok('建议全部来自本人星座对应档位', adviceBad === 0, 'bad=' + adviceBad);
ok('每次都带上了星座专属数据', genericPool === 0);

/* 跨星座池必须互不相交，否则"专属"就是假的 */
console.log('\n=== 4. 跨星座内容池互不相交（"专属"的硬证据）===');
const signNames = Object.keys(SIGN);
let overlap = 0, overlapPair = '';
for (let i = 0; i < signNames.length; i++) {
  for (let j = i + 1; j < signNames.length; j++) {
    const a = new Set(SIGN[signNames[i]].good.concat(SIGN[signNames[i]].bad));
    const b = SIGN[signNames[j]].good.concat(SIGN[signNames[j]].bad);
    const hit = b.filter((t) => a.has(t));
    if (hit.length) { overlap += hit.length; overlapPair = signNames[i] + '/' + signNames[j] + ':' + hit[0]; }
  }
}
ok('12 星座两两之间无重复条目', overlap === 0, overlapPair);

console.log('\n=== 5. 分数与星级 ===');
let rangeBad = 0, starBad = 0, lenBad = 0;
const tierSeen = { high: 0, mid: 0, low: 0 };
const starSeen = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
for (let i = 0; i < 2000; i++) {
  const p = PROFILES[i % PROFILES.length];
  const d = F.addDays('2024-01-01', i % 700);
  const f = F.generateFortune(d, p);
  if (f.scores.length !== 4) lenBad++;
  f.scores.forEach((v) => { if (v < 32 || v > 100) rangeBad++; });
  if (f.stars < 1 || f.stars > 5) starBad++;
  starSeen[f.stars]++; tierSeen[f.tier]++;
  if (f.good.length !== 4 || f.bad.length !== 4) lenBad++;
}
ok('4 个分项、宜忌各 4 条', lenBad === 0, 'bad=' + lenBad);
ok('分数都在 32-100', rangeBad === 0, 'bad=' + rangeBad);
ok('星级都在 1-5', starBad === 0, 'bad=' + starBad);
ok('1-5 星都出现过', Object.values(starSeen).every((v) => v > 0), J(starSeen));
ok('高中低三档都出现过', Object.values(tierSeen).every((v) => v > 0), J(tierSeen));
console.log('  星级分布 ' + J(starSeen));

console.log('\n=== 6. 幸运项 ===');
let luckyBad = 0;
for (let i = 0; i < 500; i++) {
  const f = F.generateFortune(F.addDays('2025-01-01', i % 300), PROFILES[i % 6]);
  const L = f.lucky;
  if (!L.color || !/^#[0-9a-f]{6}$/i.test(L.color.hex)) luckyBad++;
  if (!(L.number >= 1 && L.number <= 99)) luckyBad++;
  if (F.libs.directions.indexOf(L.direction) === -1) luckyBad++;
  if (F.libs.periods.indexOf(L.period) === -1) luckyBad++;
}
ok('幸运色/数字/方位/时段全部合法', luckyBad === 0, 'bad=' + luckyBad);

console.log('\n=== 7. 内嵌历法与 almanac 一致 ===');
let almBad = 0;
for (let i = 0; i < 100; i++) {
  const d = F.addDays('2025-01-01', i);
  const f = F.generateFortune(d, PROFILES[0]);
  const direct = A.dayInfo(+d.slice(0, 4), +d.slice(5, 7), +d.slice(8, 10));
  if (f.almanac.day.name !== direct.day.name) almBad++;
  if (f.almanac.xiu.name !== direct.xiu.name) almBad++;
  if (f.almanac.moon.name !== direct.moon.name) almBad++;
  if (f.almanac.chongSha.text !== direct.chongSha.text) almBad++;
}
ok('100 天：干支日/星宿/月相/冲煞 与 Almanac 完全一致', almBad === 0, 'bad=' + almBad);

console.log('\n=== 8. 内容库规模 ===');
ok('12 星座齐全', Object.keys(SIGN).length === 12, Object.keys(SIGN).length);
ok('12 生肖齐全', Object.keys(ZOD).length === 12, Object.keys(ZOD).length);
let minGood = 99;
Object.keys(SIGN).forEach((k) => { minGood = Math.min(minGood, SIGN[k].good.length); });
ok('每个星座至少 10 条宜', minGood >= 10, 'min=' + minGood);
ok('幸运色 >= 20 种', F.libs.colors.length >= 20, F.libs.colors.length);
ok('城市表 >= 40 个', F.CITIES.length >= 40, F.CITIES.length);

console.log('\n=== 9. 同一星座不同人 → 内容不同（说明不是固定一份）===');
{
  const a = F.generateFortune('2025-06-10', { name: '甲', birthday: '1995-03-01', time: '09:00', city: '北京' });
  const b = F.generateFortune('2025-06-10', { name: '乙', birthday: '1992-03-05', time: '09:00', city: '北京' });
  ok('两个双鱼座的人结果不同', J(a.good) !== J(b.good) || a.verdict !== b.verdict || a.stars !== b.stars);
}

console.log('\n' + '='.repeat(50));
console.log(`通过 ${pass} 项，失败 ${fail} 项`);
console.log('='.repeat(50) + '\n');
process.exit(fail ? 1 : 0);
