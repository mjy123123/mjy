/* ============================================================
   build_course.js —— 把 5 个模块的 JSON 装配成 learn/course-data.js
   用法（在 my-apps 目录下）：node tools/build_course.js

   做四件事：
     1. 校验每个模块的 JSON（结构、条数、id 连续、字段长度、题目合法性）
     2. 按「模块轮转」交错排序 → 每日课程序列
        （否则会是 36 天纯技术、36 天纯方法论……）
     3. 给每课写入 day（第几天，1 起）和 unitIndex（模块内序号）
     4. 写出 learn/course-data.js

   校验不通过会以非 0 退出，并列出所有问题。
   ============================================================ */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PARTS = path.join(__dirname, 'course-parts');
const OUT = path.join(ROOT, 'learn', 'course-data.js');

/* 模块顺序 = 轮转顺序，也是首页展示顺序 */
const ORDER = ['tech', 'method', 'practice', 'biz', 'soft'];
const PER_MODULE = 36;

/* 字数范围：只用来抓「占位符太短」和「失控太长」两类真问题，
   不是精确指标——差一两个字没有意义，所以下限放得比理想值低一些。 */
const RULES = {
  def: [18, 55], why: [35, 85], example: [70, 180], pitfall: [35, 95],
  'quiz.q': [14, 55], 'quiz.explain': [28, 75]
};

const problems = [];
const warn = [];
function bad(msg) { problems.push(msg); }

function cpLen(s) { return s ? [...String(s)].length : 0; }

function get(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

/* ---------------- 读 + 校验 ---------------- */

const parts = {};
ORDER.forEach((id) => {
  const file = path.join(PARTS, id + '.json');
  if (!fs.existsSync(file)) { bad(`缺少文件: ${id}.json`); return; }
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    bad(`${id}.json 不是合法 JSON: ${e.message}`);
    return;
  }
  parts[id] = data;
});

ORDER.forEach((id) => {
  const p = parts[id];
  if (!p) return;

  if (!p.module || p.module.id !== id) bad(`${id}.json 的 module.id 不是 "${id}"`);
  if (!p.module || !p.module.name) bad(`${id}.json 缺 module.name`);
  if (!Array.isArray(p.lessons)) { bad(`${id}.json 的 lessons 不是数组`); return; }

  if (p.lessons.length !== PER_MODULE) {
    bad(`${id}.json 课程数 ${p.lessons.length}，应为 ${PER_MODULE}`);
  }

  const prefix = { tech: 'T', method: 'M', practice: 'P', biz: 'B', soft: 'S' }[id];

  p.lessons.forEach((L, i) => {
    const tag = `${id}[${i}]`;
    const wantId = prefix + String(i + 1).padStart(2, '0');
    if (L.id !== wantId) bad(`${tag} id 应为 ${wantId}，实际 ${L.id}`);
    if (L.module !== id) bad(`${tag} module 应为 ${id}`);
    if (!L.title) bad(`${tag} 缺 title`);

    Object.keys(RULES).forEach((key) => {
      const v = get(L, key);
      const [lo, hi] = RULES[key];
      if (typeof v !== 'string') { bad(`${tag} 缺字段 ${key}`); return; }
      const n = cpLen(v);
      if (n < lo || n > hi) bad(`${tag} ${key} 长度 ${n}，应在 ${lo}-${hi}`);
    });

    if (!Array.isArray(L.points) || L.points.length < 3 || L.points.length > 4) {
      bad(`${tag} points 应为 3-4 条，实际 ${L.points ? L.points.length : 0}`);
    } else {
      L.points.forEach((t, k) => {
        const n = cpLen(t);
        if (n < 15 || n > 40) warn.push(`${tag} points[${k}] 长度 ${n}，建议 15-40`);
      });
    }

    if (!Array.isArray(L.tags) || L.tags.length < 2 || L.tags.length > 3) {
      warn.push(`${tag} tags 建议 2-3 个，实际 ${L.tags ? L.tags.length : 0}`);
    }
    if (![1, 2, 3].includes(L.level)) bad(`${tag} level 应为 1/2/3，实际 ${L.level}`);
    if (!Number.isInteger(L.minutes) || L.minutes < 3 || L.minutes > 8) {
      bad(`${tag} minutes 应为 3-8 的整数，实际 ${L.minutes}`);
    }

    if (!L.quiz) { bad(`${tag} 缺 quiz`); return; }
    if (!Array.isArray(L.quiz.options) || L.quiz.options.length !== 3) {
      bad(`${tag} quiz.options 应恰好 3 个`);
    } else {
      L.quiz.options.forEach((o, k) => {
        const n = cpLen(o);
        if (n < 8 || n > 30) warn.push(`${tag} quiz.options[${k}] 长度 ${n}，建议 8-30`);
      });
    }
    if (![0, 1, 2].includes(L.quiz.answer)) {
      bad(`${tag} quiz.answer 应为 0/1/2，实际 ${L.quiz.answer}`);
    }
  });
});

/* 跨模块标题重复 */
const seenTitle = new Map();
ORDER.forEach((id) => {
  (parts[id] ? parts[id].lessons : []).forEach((L) => {
    if (seenTitle.has(L.title)) bad(`标题重复: 「${L.title}」 出现在 ${seenTitle.get(L.title)} 和 ${id}`);
    else seenTitle.set(L.title, id);
  });
});

if (problems.length) {
  console.error('\n装配失败，发现 ' + problems.length + ' 个问题：\n');
  problems.slice(0, 80).forEach((p) => console.error('  ✗ ' + p));
  if (problems.length > 80) console.error(`  … 还有 ${problems.length - 80} 个`);
  process.exit(1);
}

/* ---------------- 交错排序 ---------------- */

/* 第 n 天（0 基）→ 第 n%5 个模块的第 floor(n/5) 课 */
const lessons = [];
const totalDays = ORDER.length * PER_MODULE;
for (let n = 0; n < totalDays; n++) {
  const modId = ORDER[n % ORDER.length];
  const unitIndex = Math.floor(n / ORDER.length);
  const src = parts[modId].lessons[unitIndex];
  lessons.push(Object.assign({}, src, { day: n + 1, unitIndex: unitIndex }));
}

/* ---------------- 产出 ---------------- */

const modules = ORDER.map((id) => {
  const m = parts[id].module;
  return { id: m.id, name: m.name, color: m.color, desc: m.desc, count: PER_MODULE };
});

const payload = {
  version: 1,
  totalDays: totalDays,
  modules: modules,
  lessons: lessons
};

const header = `/* 由 tools/build_course.js 自动生成，请勿手改。
   改内容请改 tools/course-parts/*.json 然后重新运行装配脚本。
   生成时间：${new Date().toISOString()}
   共 ${totalDays} 课，${ORDER.length} 个模块，按模块轮转排序 */\n`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, header + 'window.COURSE_DATA = ' + JSON.stringify(payload) + ';\n', 'utf8');

/* 另出一份极简的「每日标题」表，给 iOS 快捷指令抓取用（体积小、好解析）：
   一个扁平数组，index 0 = 第 1 天。 */
const daysOut = path.join(ROOT, 'learn', 'days.json');
fs.writeFileSync(daysOut, JSON.stringify(lessons.map((L) => L.title)), 'utf8');

/* ---------------- 报告 ---------------- */

const byModule = {};
lessons.forEach((L) => { byModule[L.module] = (byModule[L.module] || 0) + 1; });

console.log('\n装配完成 → learn/course-data.js');
console.log('  总课数     : ' + totalDays);
console.log('  文件大小   : ' + (fs.statSync(OUT).size / 1024).toFixed(1) + ' KB');
console.log('  模块分布   : ' + ORDER.map((m) => `${parts[m].module.name} ${byModule[m]}`).join(' / '));
console.log('  前 10 天顺序:');
lessons.slice(0, 10).forEach((L) => {
  console.log(`    D${String(L.day).padStart(3)}  [${L.module}]  ${L.title}`);
});

const ansDist = { 0: 0, 1: 0, 2: 0 };
const lvDist = { 1: 0, 2: 0, 3: 0 };
lessons.forEach((L) => { ansDist[L.quiz.answer]++; lvDist[L.level]++; });
console.log('  答案分布   : ' + JSON.stringify(ansDist));
console.log('  难度分布   : ' + JSON.stringify(lvDist));

let totalChars = 0;
lessons.forEach((L) => {
  totalChars += cpLen(L.def) + cpLen(L.why) + cpLen(L.example) + cpLen(L.pitfall) +
                cpLen(L.quiz.q) + cpLen(L.quiz.explain) +
                L.points.reduce((a, p) => a + cpLen(p), 0);
});
console.log('  正文总字数 : 约 ' + totalChars.toLocaleString() + ' 字');

if (warn.length) {
  console.log('\n  ⚠ ' + warn.length + ' 条轻微越界（不阻塞）：');
  warn.slice(0, 12).forEach((w) => console.log('    · ' + w));
  if (warn.length > 12) console.log(`    … 还有 ${warn.length - 12} 条`);
}
console.log('');
