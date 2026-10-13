/* ============================================================
   test_jobs.js —— 在 node 里跑简历匹配引擎的回归测试
   用法（在 my-apps 目录下）：
       node tools/test_jobs.js
   用 vm 造一个最小 DOM 桩，加载 roles.js + jobs.js，
   然后调用 window.JOBS_CORE 里的纯函数做断言。
   ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ---------- 最小 DOM 桩 ---------- */
function fakeEl() {
  return {
    style: {}, dataset: {}, children: [],
    textContent: '', value: '', hidden: false, className: '', type: '',
    addEventListener() {}, removeEventListener() {},
    appendChild(c) { this.children.push(c); return c; },
    setAttribute() {}, removeAttribute() {}, remove() {},
    focus() {}, click() {}, select() {}, setSelectionRange() {},
    querySelector() { return fakeEl(); },
    classList: { add() {}, remove() {}, toggle() {} }
  };
}

function makeSandbox() {
  const els = new Map();
  const store = new Map();
  const sandbox = {
    console,
    setTimeout, clearTimeout,
    document: {
      getElementById(id) {
        if (!els.has(id)) els.set(id, fakeEl());
        return els.get(id);
      },
      createElement() { return fakeEl(); },
      body: fakeEl(),
      addEventListener() {},
      execCommand() { return true; }
    },
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k)
    },
    navigator: { userAgent: 'node', clipboard: null },
    location: { protocol: 'https:', href: 'https://example.test/jobs/' },
    sessionStorage: { getItem: () => null, setItem: () => {} },
    matchMedia: () => ({ matches: false })
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);

  const root = path.join(__dirname, '..');
  vm.runInContext(fs.readFileSync(path.join(root, 'jobs/roles.js'), 'utf8'),
    sandbox, { filename: 'roles.js' });
  vm.runInContext(fs.readFileSync(path.join(root, 'jobs/jobs.js'), 'utf8'),
    sandbox, { filename: 'jobs.js' });
  return sandbox;
}

/* ---------- 断言 ---------- */
let pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (extra ? '  → ' + extra : '')); }
}

const sb = makeSandbox();
const C = sb.JOBS_CORE;

console.log('\n=== 1. 短英文关键词边界（防误命中）===');
const H = (t) => C.makeHay(t);
ok("'java' 不命中 javascript", C.hit(H('熟悉 javascript 与 es6'), 'java') === false);
ok("'java' 命中 java 开发", C.hit(H('3 年 java 开发经验'), 'java') === true);
ok("'ai' 不命中 email", C.hit(H('请 email 联系我'), 'ai') === false);
ok("'ai' 命中 AI 设计", C.hit(H('负责 AI 设计稿'), 'ai') === true);
ok("'hr' 不命中 through", C.hit(H('worked through the night'), 'hr') === false);
ok("'hr' 命中 HR 专员", C.hit(H('HR 专员'), 'hr') === true);
ok("'gin' 不命中 login", C.hit(H('实现 login 登录'), 'gin') === false);
ok("'gin' 命中 Gin 框架", C.hit(H('使用 Gin 框架'), 'gin') === true);
ok("'hive' 不命中 archive", C.hit(H('archive 归档'), 'hive') === false);
ok("'excel' 不命中 excellent", C.hit(H('excellent communication'), 'excel') === false);
ok("'rag' 不命中 storage", C.hit(H('storage 层'), 'rag') === false);
ok("'bert' 不命中 robert", C.hit(H('robert 负责'), 'bert') === false);

console.log('\n=== 2. 数字/符号后缀仍能命中 ===');
ok("'mysql' 命中 MySQL8.0", C.hit(H('MySQL8.0'), 'mysql') === true);
ok("'vue' 命中 Vue3", C.hit(H('Vue3 + Vite'), 'vue') === true);
ok("'html' 命中 HTML5", C.hit(H('HTML5 / CSS3'), 'html') === true);
ok("'c++' 命中 C++", C.hit(H('熟悉 C++ 与 STL'), 'c++') === true);
ok("'spring boot' 命中 SpringBoot", C.hit(H('基于 SpringBoot 开发'), 'spring boot') === true);
ok("'elasticsearch' 命中 ES", C.hit(H('使用 ElasticSearch'), 'elasticsearch') === true);

console.log('\n=== 3. 简历画像抽取 ===');
const feResume = `2019.07 - 2023.05  XX科技有限公司  前端开发工程师
· 负责电商中台 Vue 项目开发，独立完成订单与售后模块
· 主导首屏性能优化，加载时间从 3.4s 降到 1.2s
· 熟悉 TypeScript、Webpack、Vite，有小程序开发经验，了解 Node.js
技能：JavaScript、Vue、React、HTML、CSS
学历：本科  软件工程`;
ok('前端简历：年限约 3.8 年', C.extractYears(feResume) >= 3.5 && C.extractYears(feResume) <= 4.2,
  'got ' + C.extractYears(feResume));
ok('前端简历：学历本科', C.extractEdu(feResume) === '本科', 'got ' + C.extractEdu(feResume));
const feTop = C.scoreRoles(feResume);
ok('前端简历：第一名是前端开发工程师',
  feTop.length > 0 && feTop[0].role.id === 'frontend',
  'got ' + (feTop[0] && feTop[0].role.title));
ok('前端简历：识别到 >=10 个技能词', C.collectSkills(feResume).length >= 10,
  'got ' + C.collectSkills(feResume).length);

const javaResume = `后端开发工程师，5 年经验，本科学历
· 使用 Java / Spring Boot / MyBatis 开发交易系统，日均 3000 万请求
· 负责微服务拆分与分布式事务，QPS 峰值 8000，用 Kafka 削峰
· 使用 MySQL 分库分表、Redis 缓存、JVM 调优，Docker 部署`;
const javaTop = C.scoreRoles(javaResume);
ok('Java 简历：第一名是 Java 后端',
  javaTop.length > 0 && javaTop[0].role.id === 'java',
  'got ' + (javaTop[0] && javaTop[0].role.title));
ok('Java 简历：年限 5', C.extractYears(javaResume) === 5, 'got ' + C.extractYears(javaResume));

const finResume = `财务主管 · 8 年经验 · 本科 · 中级会计师
· 负责集团月度报表编制与合并报表，独立完成税务申报与汇算清缴
· 主导年度预算编制与成本核算，费用报销流程线上化
· 熟练使用用友 / 金蝶与 Excel，持有中级会计师证书`;
const finTop = C.scoreRoles(finResume);
ok('财务简历：第一名是财务 / 会计',
  finTop.length > 0 && finTop[0].role.id === 'finance',
  'got ' + (finTop[0] && finTop[0].role.title));
ok('财务简历：学历本科', C.extractEdu(finResume) === '本科', 'got ' + C.extractEdu(finResume));

const opResume = `用户运营 · 4 年经验
· 负责私域社群运营，用户分层与留存策略，社群 20 万用户
· 策划活动运营方案，拉新与转化率提升，GMV 月均 300 万
· 内容运营：公众号选题与文案，数据复盘`;
const opTop = C.scoreRoles(opResume);
ok('运营简历：第一名是用户 / 内容运营',
  opTop.length > 0 && opTop[0].role.id === 'operation',
  'got ' + (opTop[0] && opTop[0].role.title));

console.log('\n=== 4. 年限解析的几种写法 ===');
ok('「2019.07 - 2023.05」≈ 3.8 年',
  Math.abs(C.extractYears('2019.07 - 2023.05 在某公司') - 3.8) < 0.06,
  'got ' + C.extractYears('2019.07 - 2023.05 在某公司'));
ok('「2019年7月-2023年5月」≈ 3.8 年',
  Math.abs(C.extractYears('2019年7月-2023年5月 任职') - 3.8) < 0.06,
  'got ' + C.extractYears('2019年7月-2023年5月 任职'));
ok('「2019 - 2023」= 4.0 年',
  Math.abs(C.extractYears('2019 - 2023 就读') - 4.0) < 0.06,
  'got ' + C.extractYears('2019 - 2023 就读'));
ok('「2018.03 - 至今」>= 6 年',
  C.extractYears('2018.03 - 至今 在职') >= 6,
  'got ' + C.extractYears('2018.03 - 至今 在职'));
ok('两段经历累加（2020.01-2022.01 + 2022.02-2024.02）≈ 4.0 年',
  Math.abs(C.extractYears('2020.01-2022.01 A公司；2022.02-2024.02 B公司') - 4.0) < 0.15,
  'got ' + C.extractYears('2020.01-2022.01 A公司；2022.02-2024.02 B公司'));
ok('明写的「8 年经验」优先于区间',
  C.extractYears('8 年经验。2019.07 - 2023.05 在某公司') === 8,
  'got ' + C.extractYears('8 年经验。2019.07 - 2023.05 在某公司'));

console.log('\n=== 5. 噪音文本不应产生方向 ===');
ok('无意义文本不产生岗位', C.scoreRoles('今天天气不错，心情很好，出去走了走').length === 0);
ok('空文本不产生岗位', C.scoreRoles('').length === 0);

console.log('\n=== 6. JD 对比 ===');
const feJd = `岗位职责：
1. 负责公司 Web 前端开发，使用 Vue / React 完成业务需求；
2. 参与前端工程化建设，优化 Webpack 构建与首屏性能；
3. 要求熟悉 TypeScript、HTML、CSS，了解 Node.js。
加分项：有微前端、SSR、低代码平台经验，了解 Java 或 Python 亦可。`;
const jdFe = C.jdCompare(feResume, feJd);
ok('前端简历 vs 前端 JD：覆盖率 >= 50%', jdFe.percent >= 50, 'got ' + jdFe.percent + '%');
ok('前端 JD：命中含 vue', jdFe.hit.map((s) => s.toLowerCase()).includes('vue'));
ok('前端 JD：缺口含 java 或 python',
  jdFe.miss.some((s) => s === 'java' || s === 'python'));

const javaJd = `岗位要求：
1. 精通 Java，熟悉 Spring Boot / Spring Cloud 微服务架构；
2. 熟悉 MySQL、Redis、Kafka，有高并发与分布式经验；
3. 熟悉 JVM 调优，了解 Docker、Kubernetes。`;
const jdCross = C.jdCompare(feResume, javaJd);
ok('前端简历 vs Java JD：覆盖率 < 40%', jdCross.percent < 40, 'got ' + jdCross.percent + '%');
ok('Java JD：缺口里有 java', jdCross.miss.indexOf('java') !== -1);

console.log('\n=== 7. 搜索关键词 ===');
const groups = C.buildSearch(feTop, 4, '杭州');
ok('搜索词组数 = min(3, 命中的方向数)',
  groups.length === Math.min(3, feTop.length) && groups.length >= 1,
  'got ' + groups.length + ' / 方向数 ' + feTop.length);
const allTerms = groups.reduce((a, g) => a.concat(g.terms), []);
ok('搜索词里带上了城市', allTerms.some((t) => t.indexOf('杭州') === 0));
ok('搜索词里带上了年限', allTerms.some((t) => t.indexOf('4年') !== -1));
ok('搜索词无重复', new Set(allTerms).size === allTerms.length);

console.log('\n=== 8. 抽样输出（人工看一眼是否合理）===');
[['前端', feResume], ['Java', javaResume], ['财务', finResume], ['运营', opResume]]
  .forEach(([label, text]) => {
    const top = C.scoreRoles(text).slice(0, 3);
    console.log('  ' + label + ' → ' + top.map((t) =>
      t.role.title + '(' + t.percent + '%)').join('  '));
  });

console.log('\n' + '='.repeat(46));
console.log('通过 ' + pass + ' 项，失败 ' + fail + ' 项');
console.log('='.repeat(46) + '\n');
process.exit(fail ? 1 : 0);
