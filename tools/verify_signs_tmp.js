/* 临时校验脚本：只读 signs-data.js，不做任何修改 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const FILE = path.join(__dirname, '..', 'fortune', 'signs-data.js');
const code = fs.readFileSync(FILE, 'utf8');
const size = fs.statSync(FILE).size;

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(code, sandbox, { filename: FILE });

const SIGN = sandbox.window.SIGN_DATA;
const ZOD = sandbox.window.ZODIAC_DATA;

const ALL_SIGNS = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座',
  '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];
const ALL_ZOD = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

const len = s => Array.from(String(s)).length;
const out = [];
const log = s => out.push(s);

log('文件: ' + FILE);
log('大小: ' + size + ' bytes (' + (size / 1024).toFixed(1) + ' KB)');

/* ---- 星座齐全 ---- */
const signKeys = Object.keys(SIGN);
log('\n== 1. 星座齐全性 ==');
log('实际数量: ' + signKeys.length + ' / 12');
log('缺失: ' + (ALL_SIGNS.filter(k => !signKeys.includes(k)).join(',') || '无'));
log('多余: ' + (signKeys.filter(k => !ALL_SIGNS.includes(k)).join(',') || '无'));
log('顺序一致: ' + (JSON.stringify(signKeys) === JSON.stringify(ALL_SIGNS)));

/* ---- 条数统计 ---- */
log('\n== 2. 各库条数（最低要求 good/bad 14, verdicts 6, advice 6）==');
log('星座 | element | ruler | traits | good | bad | v.high | v.mid | v.low | a.high | a.mid | a.low | match | hard');
let countFail = [];
for (const k of ALL_SIGNS) {
  const d = SIGN[k];
  const v = d.verdicts, a = d.advice;
  log([k, d.element, d.ruler, d.traits.length, d.good.length, d.bad.length,
    v.high.length, v.mid.length, v.low.length,
    a.high.length, a.mid.length, a.low.length,
    d.bestMatch.length, d.hardMatch.length].join(' | '));
  if (d.good.length < 14) countFail.push(k + ':good=' + d.good.length);
  if (d.bad.length < 14) countFail.push(k + ':bad=' + d.bad.length);
  if (d.traits.length < 6) countFail.push(k + ':traits=' + d.traits.length);
  for (const t of ['high', 'mid', 'low']) {
    if (v[t].length < 6) countFail.push(k + ':verdicts.' + t + '=' + v[t].length);
    if (a[t].length < 6) countFail.push(k + ':advice.' + t + '=' + a[t].length);
  }
  if (d.bestMatch.length < 2 || d.bestMatch.length > 4) countFail.push(k + ':bestMatch len');
  if (d.hardMatch.length < 2 || d.hardMatch.length > 4) countFail.push(k + ':hardMatch len');
}
log('条数不达标: ' + (countFail.length ? countFail.join('; ') : '无'));

/* ---- 基准信息核对 ---- */
log('\n== 3. 四象 / 守护星核对 ==');
const BASE = {
  '白羊座': ['火象', '火星'], '金牛座': ['土象', '金星'], '双子座': ['风象', '水星'],
  '巨蟹座': ['水象', '月亮'], '狮子座': ['火象', '太阳'], '处女座': ['土象', '水星'],
  '天秤座': ['风象', '金星'], '天蝎座': ['水象', '冥王星'], '射手座': ['火象', '木星'],
  '摩羯座': ['土象', '土星'], '水瓶座': ['风象', '天王星'], '双鱼座': ['水象', '海王星']
};
let baseBad = [];
for (const k of ALL_SIGNS) {
  if (SIGN[k].element !== BASE[k][0]) baseBad.push(k + '.element=' + SIGN[k].element);
  if (SIGN[k].ruler !== BASE[k][1]) baseBad.push(k + '.ruler=' + SIGN[k].ruler);
}
log('四象/守护星错误: ' + (baseBad.length ? baseBad.join('; ') : '无'));

/* ---- 字数检查 ---- */
log('\n== 4. 字数检查 ==');
const adviceBad = [];
for (const k of ALL_SIGNS) {
  for (const t of ['high', 'mid', 'low']) {
    SIGN[k].advice[t].forEach((s, i) => {
      const n = len(s);
      if (n < 60 || n > 120) adviceBad.push(`${k}.advice.${t}[${i}] = ${n}字: ${s.slice(0, 22)}…`);
    });
  }
}
log('advice 超出 60-120 字范围: ' + adviceBad.length + ' 条');
adviceBad.forEach(x => log('  ! ' + x));
const adviceLens = [];
for (const k of ALL_SIGNS) for (const t of ['high', 'mid', 'low'])
  SIGN[k].advice[t].forEach(s => adviceLens.push(len(s)));
log('advice 字数区间: ' + Math.min(...adviceLens) + ' - ' + Math.max(...adviceLens));

/* verdicts 15-40 */
const verdictBad = [];
for (const k of ALL_SIGNS) for (const t of ['high', 'mid', 'low'])
  SIGN[k].verdicts[t].forEach((s, i) => {
    const n = len(s);
    if (n < 15 || n > 40) verdictBad.push(`${k}.verdicts.${t}[${i}] = ${n}字: ${s}`);
  });
log('verdicts 超出 15-40 字范围: ' + verdictBad.length + ' 条');
verdictBad.forEach(x => log('  ! ' + x));

/* good/bad 长度 3-10 */
const shortBad = [];
for (const k of ALL_SIGNS) {
  const scan = (arr, tag) => arr.forEach((s, i) => {
    const n = len(s);
    if (n < 3 || n > 10) shortBad.push(`${k}.${tag}[${i}] = ${n}字: ${s}`);
  });
  scan(SIGN[k].good, 'good'); scan(SIGN[k].bad, 'bad');
  scan(ZOD[k] ? ZOD[k].good : [], 'z.good'); scan(ZOD[k] ? ZOD[k].bad : [], 'z.bad');
}
log('good/bad（星座+生肖）超出 3-10 字范围: ' + shortBad.length + ' 条');
shortBad.forEach(x => log('  ! ' + x));

/* traits 2-6 */
const traitBad = [];
for (const k of ALL_SIGNS) SIGN[k].traits.forEach(t => { if (len(t) < 2 || len(t) > 6) traitBad.push(k + ': ' + t + '(' + len(t) + ')'); });
for (const k of ALL_ZOD) ZOD[k].traits.forEach(t => { if (len(t) < 2 || len(t) > 6) traitBad.push(k + ': ' + t + '(' + len(t) + ')'); });
log('traits 超出 2-6 字: ' + (traitBad.length ? traitBad.join('; ') : '无'));

/* strength / weakness 10-20 */
const swBad = [];
for (const k of ALL_SIGNS) {
  const a = len(SIGN[k].strength), b = len(SIGN[k].weakness);
  if (a < 10 || a > 20) swBad.push(k + '.strength=' + a);
  if (b < 10 || b > 20) swBad.push(k + '.weakness=' + b);
}
log('strength/weakness 超出 10-20 字: ' + (swBad.length ? swBad.join('; ') : '无'));

/* ---- 重复检查 ---- */
log('\n== 5. 重复检查 ==');
function dupsWithin(arr) {
  const seen = new Map(), d = [];
  arr.forEach((s, i) => { if (seen.has(s)) d.push(s + ' (#' + seen.get(s) + ',#' + i + ')'); else seen.set(s, i); });
  return d;
}
let dupAny = false;
for (const k of ALL_SIGNS) {
  for (const tag of ['good', 'bad']) {
    const d = dupsWithin(SIGN[k][tag]);
    if (d.length) { dupAny = true; log(`  [内部重复] ${k}.${tag}: ` + d.join(', ')); }
  }
  for (const t of ['high', 'mid', 'low']) {
    const dv = dupsWithin(SIGN[k].verdicts[t]);
    if (dv.length) { dupAny = true; log(`  [内部重复] ${k}.verdicts.${t}: ` + dv.join(', ')); }
    const da = dupsWithin(SIGN[k].advice[t]);
    if (da.length) { dupAny = true; log(`  [内部重复] ${k}.advice.${t}: ` + da.join(', ')); }
  }
  const dt = dupsWithin(SIGN[k].traits);
  if (dt.length) { dupAny = true; log(`  [内部重复] ${k}.traits: ` + dt.join(', ')); }
}
for (const k of ALL_ZOD) {
  const dz = dupsWithin(ZOD[k].traits);
  if (dz.length) { dupAny = true; log(`  [内部重复] 生肖${k}.traits: ` + dz.join(', ')); }
}
/* 跨星座重复 */
for (const tag of ['good', 'bad']) {
  const map = new Map();
  for (const k of ALL_SIGNS) for (const s of SIGN[k][tag]) {
    if (!map.has(s)) map.set(s, []);
    map.get(s).push(k);
  }
  const cross = [...map.entries()].filter(([, v]) => v.length > 1);
  if (cross.length) { dupAny = true; cross.forEach(([s, v]) => log(`  [跨星座重复] ${tag}: 「${s}」 -> ${v.join('/')}`)); }
  else log(`  跨星座 ${tag} 重复: 无`);
}
/* 跨生肖重复 */
for (const tag of ['good', 'bad']) {
  const map = new Map();
  for (const k of ALL_ZOD) for (const s of ZOD[k][tag]) {
    if (!map.has(s)) map.set(s, []);
    map.get(s).push(k);
  }
  const cross = [...map.entries()].filter(([, v]) => v.length > 1);
  if (cross.length) { dupAny = true; cross.forEach(([s, v]) => log(`  [跨生肖重复] ${tag}: 「${s}」 -> ${v.join('/')}`)); }
  else log(`  跨生肖 ${tag} 重复: 无`);
}
/* 星座 vs 生肖 交叉重复 */
for (const tag of ['good', 'bad']) {
  const sset = new Map();
  for (const k of ALL_SIGNS) for (const s of SIGN[k][tag]) sset.set(s, k);
  const cross = [];
  for (const k of ALL_ZOD) for (const s of ZOD[k][tag]) if (sset.has(s)) cross.push(`${tag}: 「${s}」 (${sset.get(s)} / 生肖${k})`);
  if (cross.length) { dupAny = true; cross.forEach(x => log('  [星座-生肖交叉重复] ' + x)); }
}
if (!dupAny) log('  未发现任何重复项');
/* 与 fortune.js 通用池的重复 */
const fj = fs.readFileSync(path.join(__dirname, '..', 'fortune', 'fortune.js'), 'utf8');
const pool = new Set();
for (const m of fj.matchAll(/'([^']{2,12})'/g)) pool.add(m[1]);
const overlap = [];
for (const k of ALL_SIGNS) for (const tag of ['good', 'bad'])
  for (const s of SIGN[k][tag]) if (pool.has(s)) overlap.push(`${s} (${k}.${tag})`);
log('  与 fortune.js 通用池完全同名的条目: ' + overlap.length + (overlap.length ? ' -> ' + overlap.join(', ') : ''));

/* ---- 配对合法性 ---- */
log('\n== 6. bestMatch / hardMatch 合法性 ==');
const badMatch = [];
for (const k of ALL_SIGNS) {
  for (const tag of ['bestMatch', 'hardMatch']) {
    const arr = SIGN[k][tag];
    const seen = new Set();
    for (const s of arr) {
      if (!ALL_SIGNS.includes(s)) badMatch.push(`${k}.${tag} 非法星座: ${s}`);
      if (s === k) badMatch.push(`${k}.${tag} 含自己: ${s}`);
      if (seen.has(s)) badMatch.push(`${k}.${tag} 自重复: ${s}`);
      seen.add(s);
    }
  }
}
log('非法配对: ' + (badMatch.length ? badMatch.join('; ') : '无'));

/* ---- 违规词扫描 ---- */
log('\n== 7. 违规词扫描 ==');
const RE = /发财|暴富|赚到|一定会|必定|生病|吃药|看病|投资|股票|买彩票/g;
const hits = [];
const scanText = (s, loc) => { const m = String(s).match(RE); if (m) hits.push(`${loc}: 「${s}」 命中 ${[...new Set(m)].join(',')}`); };
for (const k of ALL_SIGNS) {
  const d = SIGN[k];
  scanText(d.strength, k + '.strength'); scanText(d.weakness, k + '.weakness');
  d.traits.forEach((s, i) => scanText(s, `${k}.traits[${i}]`));
  d.good.forEach((s, i) => scanText(s, `${k}.good[${i}]`));
  d.bad.forEach((s, i) => scanText(s, `${k}.bad[${i}]`));
  for (const t of ['high', 'mid', 'low']) {
    d.verdicts[t].forEach((s, i) => scanText(s, `${k}.verdicts.${t}[${i}]`));
    d.advice[t].forEach((s, i) => scanText(s, `${k}.advice.${t}[${i}]`));
  }
}
for (const k of ALL_ZOD) {
  ZOD[k].traits.forEach((s, i) => scanText(s, `生肖${k}.traits[${i}]`));
  ZOD[k].good.forEach((s, i) => scanText(s, `生肖${k}.good[${i}]`));
  ZOD[k].bad.forEach((s, i) => scanText(s, `生肖${k}.bad[${i}]`));
}
log('违规词命中: ' + hits.length + ' 条');
hits.forEach(x => log('  ! ' + x));

/* 额外：医疗/健康类敏感词 */
const RE2 = /(医院|药|医生|体检|手术|治疗|疗愈|偏方|养生|理财|基金|炒股|贷款|博彩|中奖|转运|开运|化解|风水|命中注定)/g;
const hits2 = [];
const scan2 = (s, loc) => { const m = String(s).match(RE2); if (m) hits2.push(`${loc}: 「${s}」 命中 ${[...new Set(m)].join(',')}`); };
for (const k of ALL_SIGNS) {
  const d = SIGN[k];
  [...d.good, ...d.bad, ...d.traits, d.strength, d.weakness].forEach(s => scan2(s, k));
  for (const t of ['high', 'mid', 'low']) { d.verdicts[t].forEach(s => scan2(s, k + '.verdicts.' + t)); d.advice[t].forEach(s => scan2(s, k + '.advice.' + t)); }
}
for (const k of ALL_ZOD) [...ZOD[k].traits, ...ZOD[k].good, ...ZOD[k].bad].forEach(s => scan2(s, '生肖' + k));
log('扩展敏感词命中: ' + hits2.length + ' 条');
hits2.forEach(x => log('  ! ' + x));

/* ---- 生肖 ---- */
log('\n== 8. 生肖齐全性 ==');
const zodKeys = Object.keys(ZOD);
log('实际数量: ' + zodKeys.length + ' / 12');
log('缺失: ' + (ALL_ZOD.filter(k => !zodKeys.includes(k)).join(',') || '无'));
log('多余: ' + (zodKeys.filter(k => !ALL_ZOD.includes(k)).join(',') || '无'));
log('顺序一致: ' + (JSON.stringify(zodKeys) === JSON.stringify(ALL_ZOD)));
const zodFail = [];
for (const k of ALL_ZOD) {
  const z = ZOD[k];
  if (z.traits.length < 6) zodFail.push(k + ':traits=' + z.traits.length);
  if (z.good.length < 8) zodFail.push(k + ':good=' + z.good.length);
  if (z.bad.length < 8) zodFail.push(k + ':bad=' + z.bad.length);
}
log('条数不达标: ' + (zodFail.length ? zodFail.join('; ') : '无'));
log('生肖条数: ' + ALL_ZOD.map(k => `${k}(t${ZOD[k].traits.length}/g${ZOD[k].good.length}/b${ZOD[k].bad.length})`).join(' '));

fs.writeFileSync(path.join(__dirname, 'signs-data-report.txt'), out.join('\n'), 'utf8');
console.log(out.join('\n'));
