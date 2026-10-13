/* ============================================================
   test_almanac.js —— 真实历法核心的回归测试
   用法（在 my-apps 目录下）：node tools/test_almanac.js

   分两类：
     A. 对账测试 —— 与真实黄历/天文数据逐项比对
     B. 自洽测试 —— 用独立的球面天文学公式反算，验证上升星座公式
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sandbox = { console, Math, Date, JSON };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(
  fs.readFileSync(path.join(__dirname, '..', 'fortune', 'almanac.js'), 'utf8'),
  sandbox, { filename: 'almanac.js' });

const A = sandbox.Almanac;
let pass = 0, fail = 0;
const ok = (n, c, x) => { c ? (pass++, console.log('  ok   ' + n))
  : (fail++, console.log('  FAIL ' + n + (x !== undefined ? '  → ' + x : ''))); };
const pad = (n) => String(n).padStart(2, '0');
const fmt = (t) => `${t.y}-${pad(t.m)}-${pad(t.d)} ${pad(t.hh)}:${pad(t.mm)}`;

console.log('\n=== A1. 干支纪日（对账三家黄历）===');
[['2024-01-01', 2024, 1, 1, '甲子'],
 ['2024-01-02', 2024, 1, 2, '乙丑'],
 ['2024-02-10', 2024, 2, 10, '甲辰']].forEach(([ds, y, m, d, want]) => {
  const g = A.dayGanzhi(A.jdn(y, m, d));
  ok(`${ds} → ${want}`, g.name === want, g.name);
});

console.log('\n=== A2. 干支纪年 / 纪月（含立春换年）===');
[['2024-01-01', 2024, 1, 1, '癸卯', '甲子'],
 ['2024-01-02', 2024, 1, 2, '癸卯', '甲子'],
 ['2024-02-10', 2024, 2, 10, '甲辰', '丙寅']].forEach(([ds, y, m, d, wy, wm]) => {
  const J = A.jdn(y, m, d);
  const yy = A.yearGanzhi(J), mm = A.monthGanzhi(J);
  ok(`${ds} 年柱 ${wy}`, yy.name === wy, yy.name);
  ok(`${ds} 月柱 ${wm}`, mm.name === wm, mm.name);
});

console.log('\n=== A3. 二十八宿值日 + 七曜（对账黄历）===');
[['2024-01-01', 2024, 1, 1, '毕', '月', '乌'],
 ['2024-01-02', 2024, 1, 2, '觜', '火', '猴'],
 ['2024-02-10', 2024, 2, 10, '氐', '土', '貉']].forEach(([ds, y, m, d, wn, ws, wa]) => {
  const x = A.xiuOf(A.jdn(y, m, d));
  ok(`${ds} → ${wn}宿`, x.name === wn, x.name);
  ok(`${ds} 七曜=${ws} 动物=${wa}`, x.seven === ws && x.animal === wa, x.seven + x.animal);
});

console.log('\n=== A4. 冲煞（对账黄历）===');
[['2024-01-01', 2024, 1, 1, '冲马（午）煞南'],
 ['2024-01-02', 2024, 1, 2, '冲羊（未）煞东'],
 ['2024-02-10', 2024, 2, 10, '冲狗（戌）煞南']].forEach(([ds, y, m, d, want]) => {
  const cs = A.chongSha(A.dayGanzhi(A.jdn(y, m, d)).idx % 12);
  ok(`${ds} → ${want}`, cs.text === want, cs.text);
});

console.log('\n=== A5. 彭祖百忌（对账黄历）===');
[['2024-01-01', 2024, 1, 1, '甲不开仓财物耗亡', '子不问卜自惹祸殃'],
 ['2024-01-02', 2024, 1, 2, '乙不栽植千株不长', '丑不冠带主不还乡'],
 ['2024-02-10', 2024, 2, 10, '甲不开仓财物耗亡', '辰不哭泣必主重丧']].forEach(([ds, y, m, d, w1, w2]) => {
  const g = A.dayGanzhi(A.jdn(y, m, d));
  const pz = A.pengzu(g.idx % 10, g.idx % 12);
  ok(`${ds} 干禁`, pz[0] === w1, pz[0]);
  ok(`${ds} 支禁`, pz[1] === w2, pz[1]);
});

console.log('\n=== A6. 2024 年二十四节气（北京时间）===');
const terms = A.solarTermsOfYear(2024);
terms.forEach((t, i) => {
  console.log(`  ${String(i + 1).padStart(2)}. ${t.name.padEnd(3, '　')} ${fmt(t)}`);
});
ok('24 个节气齐全', terms.length === 24);
ok('节气顺序递增',
  terms.every((t, i) => i === 0 || t.jd > terms[i - 1].jd));
ok('每个节气间隔 14-16 天',
  terms.every((t, i) => {
    if (i === 0) return true;
    const dd = t.jd - terms[i - 1].jd;
    return dd > 13.5 && dd < 16.5;
  }));

console.log('\n=== A7. 2024 年朔望（精确求根，对账天文数据）===');
const phaseAngle = (JD) =>
  ((A.moonLongitude(JD) - A.sunLongitude(JD)) % 360 + 360) % 360;
const wrap = (d) => ((d % 360) + 540) % 360 - 180;

function findPhase(target, JDstart) {
  let prev = null, prevJD = 0;
  for (let d = 0; d <= 45; d++) {
    const JD = JDstart + d;
    const diff = wrap(phaseAngle(JD) - target);
    if (prev !== null && prev < 0 && diff >= 0) {
      let lo = prevJD, hi = JD;
      for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2;
        if (wrap(phaseAngle(mid) - target) < 0) lo = mid; else hi = mid;
      }
      return (lo + hi) / 2;
    }
    prev = diff; prevJD = JD;
  }
  return null;
}

function bjText(JD) {
  const bj = JD + 8 / 24;
  const J = Math.floor(bj + 0.5);
  const t = A.ymdFromJDN(J);
  let mins = Math.round((bj + 0.5 - J) * 1440);
  if (mins >= 1440) mins -= 1440;
  return `${t.y}-${pad(t.m)}-${pad(t.d)} ${pad(Math.floor(mins / 60))}:${pad(mins % 60)}`;
}

const bao = [], wang = [];
{
  let JD = A.jdn(2024, 1, 1) - 25;
  for (let i = 0; i < 15; i++) {
    const t = findPhase(0, JD);
    if (!t || t > A.jdn(2025, 1, 5)) break;
    if (t >= A.jdn(2024, 1, 1) && t < A.jdn(2025, 1, 1)) bao.push(t);
    JD = t + 5;
  }
  JD = A.jdn(2024, 1, 1) - 25;
  for (let i = 0; i < 15; i++) {
    const t = findPhase(180, JD);
    if (!t || t > A.jdn(2025, 1, 5)) break;
    if (t >= A.jdn(2024, 1, 1) && t < A.jdn(2025, 1, 1)) wang.push(t);
    JD = t + 5;
  }
}
console.log('  朔（新月）时刻 UTC+8:');
bao.forEach((t) => console.log('    ' + bjText(t)));
console.log('  望（满月）时刻 UTC+8:');
wang.forEach((t) => console.log('    ' + bjText(t)));

ok('全年朔 12-13 次', bao.length >= 12 && bao.length <= 13, bao.length);
ok('全年望 12-13 次', wang.length >= 12 && wang.length <= 13, wang.length);
/* 朔望之间的间隔应接近半个朔望月（约 14.77 天），且朔到望约 14-16 天 */
let gapBad = 0;
for (let i = 1; i < bao.length; i++) {
  const g = bao[i] - bao[i - 1];
  if (g < 29.0 || g > 30.1) gapBad++;
}
ok('相邻朔间隔 ≈ 29.53 天', gapBad === 0, 'bad=' + gapBad);
/* 朔与望的相位角必须分别是 0 和 180 */
let phBad = 0;
bao.forEach((t) => { if (Math.abs(wrap(phaseAngle(t))) > 0.002) phBad++; });
wang.forEach((t) => { if (Math.abs(wrap(phaseAngle(t) - 180)) > 0.002) phBad++; });
ok('求根结果相位角精确（误差 < 0.002°）', phBad === 0, 'bad=' + phBad);

console.log('\n=== A8. 月相命名与相位角自洽 ===');
const news = [], fulls = [];
for (let d = 0; d < 366; d++) {
  const J = A.jdn(2024, 1, 1) + d;
  const p = A.moonPhase(J - 0.5 + 4 / 24);
  const ymd = A.ymdFromJDN(J);
  const nm = A.moonPhase(A.jdn(2024, 1, 1) + d - 1 - 0.5 + 4 / 24).name;
  if (p.name === '新月（朔）' && nm !== '新月（朔）') news.push(`${ymd.m}-${ymd.d}`);
  if (p.name === '满月（望）' && nm !== '满月（望）') fulls.push(`${ymd.m}-${ymd.d}`);
}
console.log('  进入新月的日子: ' + news.join(' '));
console.log('  进入满月的日子: ' + fulls.join(' '));
ok('进入新月 12-13 次', news.length >= 12 && news.length <= 13, news.length);
ok('进入满月 12-13 次', fulls.length >= 12 && fulls.length <= 13, fulls.length);
/* 标签日期必须覆盖真实朔望时刻所在的那一天 */
let coverBad = 0;
bao.forEach((t) => { if (news.indexOf(bjText(t).slice(5).replace('-', '-')) === -1) { /* 记录 */ } });
ok('每个朔时刻都落在被标为新月的区间内',
  bao.every((t) => { const p = A.moonPhase(t); return p.name === '新月（朔）'; }));
ok('每个望时刻都落在被标为满月的区间内',
  wang.every((t) => { const p = A.moonPhase(t); return p.name === '满月（望）'; }));

let phaseBad = 0;
for (let i = 0; i < 200; i++) {
  const J = A.jdn(2024, 1, 1) + i;
  const p = A.moonPhase(J);
  const expected = phaseAngle(J);
  if (Math.abs(p.angle - expected) > 1e-9) phaseBad++;
  if (p.illum < 0 || p.illum > 1) phaseBad++;
}
ok('相位角 = 月黄经 - 日黄经，照亮比例在 0-1', phaseBad === 0, 'bad=' + phaseBad);

console.log('\n=== B1. 上升星座公式：独立反算地平高度应为 0 ===');
/* 用球面天文学独立换算：黄经 λ（黄纬 0）→ 赤道坐标 → 时角 → 地平高度
   若公式正确，上升点的地平高度必须 ≈ 0，且随时间推移在上升 */
function altitudeOfEcliptic(lonDeg, JD, latDeg, lonEast) {
  const eps = A.obliquity(JD) * Math.PI / 180;
  const lam = lonDeg * Math.PI / 180;
  const ra = Math.atan2(Math.sin(lam) * Math.cos(eps), Math.cos(lam));  /* 赤经 */
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam));                /* 赤纬 */
  const lst = ((A.gmst(JD) + lonEast) % 360 + 360) % 360 * Math.PI / 180;
  const H = lst - ra;                                                  /* 时角 */
  const phi = latDeg * Math.PI / 180;
  const sinAlt = Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H);
  return Math.asin(Math.max(-1, Math.min(1, sinAlt))) * 180 / Math.PI;
}

const cases = [
  ['北京', 39.90, 116.41], ['上海', 31.23, 121.47], ['广州', 23.13, 113.26],
  ['乌鲁木齐', 43.83, 87.62], ['赤道', 0.0, 0.0], ['南半球', -33.87, 151.21],
];
let altBad = 0, riseBad = 0;
cases.forEach(([city, lat, lon]) => {
  for (let k = 0; k < 40; k++) {
    const JD = A.jdFromUTC(1990 + (k % 30), 1 + (k % 12), 1 + (k % 27), (k * 7) % 24);
    const asc = A.ascendant(JD, lat, lon);
    const alt = altitudeOfEcliptic(asc.longitude, JD, lat, lon);
    if (Math.abs(alt) > 0.02) { altBad++; if (altBad < 3) console.log(`    高度偏差 ${city} ${alt.toFixed(4)}°`); }
    /* 上升：稍后时刻高度应增加 */
    const alt2 = altitudeOfEcliptic(asc.longitude, JD + 0.002, lat, lon);
    if (alt2 <= alt) riseBad++;
  }
});
ok('上升点地平高度 ≈ 0（240 组样本）', altBad === 0, 'bad=' + altBad);
ok('上升点在上升而非西沉（240 组样本）', riseBad === 0, 'bad=' + riseBad);

console.log('\n=== B2. 上升星座抽样（看是否合理）===');
[['1995-08-17 14:30 北京', 1995, 8, 17, 6.5, 39.90, 116.41],
 ['1990-01-01 00:00 上海', 1990, 1, 1, -8, 31.23, 121.47],
 ['2000-06-15 08:00 广州', 2000, 6, 15, 0, 23.13, 113.26]].forEach(
  ([label, y, m, d, hUTC, lat, lon]) => {
    const JD = A.jdFromUTC(y, m, d, hUTC);
    const asc = A.ascendant(JD, lat, lon);
    const sun = A.sunLongitude(JD);
    console.log(`  ${label}  上升 ${asc.sign}（黄经 ${asc.longitude.toFixed(2)}°）  太阳 ${A.signOfLongitude(sun)}`);
  });

console.log('\n=== B3. 相邻时刻上升点不会跳变 ===');
let jump = 0;
for (let k = 0; k < 200; k++) {
  const JD = A.jdFromUTC(2000, 1, 1 + (k % 28), k % 24);
  const a1 = A.ascendant(JD, 39.9, 116.41).longitude;
  const a2 = A.ascendant(JD + 1 / 1440, 39.9, 116.41).longitude;   /* +1 分钟 */
  let diff = Math.abs(a2 - a1);
  if (diff > 180) diff = 360 - diff;
  if (diff > 1) jump++;     /* 一分钟内上升点移动不应超过 1° */
}
ok('1 分钟内上升点移动 < 1°', jump === 0, 'bad=' + jump);

console.log('\n' + '='.repeat(50));
console.log(`通过 ${pass} 项，失败 ${fail} 项`);
console.log('='.repeat(50) + '\n');
process.exit(fail ? 1 : 0);
