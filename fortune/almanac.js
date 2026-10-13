/* ============================================================
   almanac.js —— 真实历法与天文核心（纯函数，不依赖 DOM）

   这里所有结果都是**算出来的**，不是随机数：
     · 干支纪年 / 纪月 / 纪日   —— 六十甲子连续循环 + 五虎遁
     · 二十四节气交接时刻        —— 太阳视黄经（Meeus, Astronomical Algorithms ch.25）
     · 月相（相位角 + 照亮比例） —— 月亮黄经 - 太阳黄经（Meeus ch.47 截断级数）
     · 二十八宿值日 + 七曜       —— (JDN + 13) mod 28
     · 冲煞（冲生肖 / 煞方）     —— 地支六冲 + 三合局
     · 彭祖百忌                  —— 十干十二支固定表
     · 太阳 / 月亮 / 上升星座     —— 黄经落在哪个 30° 区间

   已用真实黄历交叉验证：
     2024-01-01 甲子日 毕月乌 冲马煞南 甲不开仓/子不问卜
     2024-01-02 乙丑日 觜火猴 冲羊煞东 乙不栽植/丑不冠带
     2024-02-10 甲辰日 氐土貉 冲狗煞南 甲不开仓/辰不哭泣

   刻意**没有**做的：
     · 建除十二神 —— 《协纪辨方书》的「月建上起建」与主流商业黄历差一天（口径不一）
     · 黄历宜忌   —— 不同黄历对同一天给出互相矛盾的结果，不是可计算的真值
   ============================================================ */
(function (global) {
  'use strict';

  var RAD = Math.PI / 180;
  var DEG = 180 / Math.PI;

  function norm360(x) { return ((x % 360) + 360) % 360; }
  function norm180(x) { var v = norm360(x); return v > 180 ? v - 360 : v; }

  /* ---------------------------------------------------------- 儒略日 */

  /* 公历 → 儒略日数（当日正午，整数） */
  function jdn(y, m, d) {
    var a = Math.floor((14 - m) / 12);
    var yy = y + 4800 - a;
    var mm = m + 12 * a - 3;
    return d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
           Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  }

  /* 公历 + 世界时小时 → 儒略日（含小数） */
  function jdFromUTC(y, m, d, hour) {
    return jdn(y, m, d) - 0.5 + (hour || 0) / 24;
  }

  /* 儒略日 → 公历 */
  function ymdFromJDN(J) {
    var a = J + 32044;
    var b = Math.floor((4 * a + 3) / 146097);
    var c = a - Math.floor(146097 * b / 4);
    var dd = Math.floor((4 * c + 3) / 1461);
    var e = c - Math.floor(1461 * dd / 4);
    var mm = Math.floor((5 * e + 2) / 153);
    return {
      d: e - Math.floor((153 * mm + 2) / 5) + 1,
      m: mm + 3 - 12 * Math.floor(mm / 10),
      y: 100 * b + dd - 4800 + Math.floor(mm / 10)
    };
  }

  /* ---------------------------------------------------------- 干支 */

  var GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  var ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  var SX = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

  function ganzhiOf(idx) {
    var i = ((idx % 60) + 60) % 60;
    return { idx: i, gan: GAN[i % 10], zhi: ZHI[i % 12], name: GAN[i % 10] + ZHI[i % 12] };
  }

  /* 日柱：(JDN + 49) mod 60，0 = 甲子。已验证 */
  function dayGanzhi(J) { return ganzhiOf(J + 49); }

  var TERMS = ['小寒', '大寒', '立春', '雨水', '惊蛰', '春分', '清明', '谷雨',
               '立夏', '小满', '芒种', '夏至', '小暑', '大暑', '立秋', '处暑',
               '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];

  /* ---------------------------------------------------------- 太阳位置 */

  /* 太阳视黄经（度）。Meeus, Astronomical Algorithms, ch.25 低精度式 */
  function sunLongitude(JD) {
    var T = (JD - 2451545.0) / 36525;
    var L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
    var M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
    var Mr = M * RAD;
    var C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
            (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
            0.000289 * Math.sin(3 * Mr);
    var trueLong = L0 + C;
    var omega = 125.04 - 1934.136 * T;
    /* 光行差 + 黄经章动 */
    return norm360(trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD));
  }

  /* 求太阳视黄经等于 target 的时刻（JD）。以 1 天为步长扫描 + 二分 */
  function solarTermJD(year, termIndex) {
    var target = norm360(285 + 15 * termIndex);
    var start = jdn(year, 1, 1) - 3;
    var prev = null, prevJD = 0;
    for (var d = 0; d <= 372; d++) {
      var JD = start + d + 0.5;
      var diff = norm180(sunLongitude(JD) - target);
      if (prev !== null && prev < 0 && diff >= 0) {
        var lo = prevJD, hi = JD;
        for (var k = 0; k < 40; k++) {
          var mid = (lo + hi) / 2;
          if (norm180(sunLongitude(mid) - target) < 0) lo = mid; else hi = mid;
        }
        return (lo + hi) / 2;
      }
      prev = diff; prevJD = JD;
    }
    return null;
  }

  /* 某年 24 节气的时刻（北京时间 UTC+8）。带缓存——渲染一页会调用好几次 */
  var _termCache = {};
  function solarTermsOfYear(year) {
    if (_termCache[year]) return _termCache[year];
    var out = [];
    for (var i = 0; i < 24; i++) {
      var JD = solarTermJD(year, i);
      var bj = JD + 8 / 24;                 /* 北京时间 */
      var J = Math.floor(bj + 0.5);
      var ymd = ymdFromJDN(J);
      var frac = bj + 0.5 - J;
      var mins = Math.round(frac * 1440);
      if (mins >= 1440) { mins -= 1440; J += 1; ymd = ymdFromJDN(J); }
      out.push({
        name: TERMS[i],
        index: i,
        jd: JD,
        y: ymd.y, m: ymd.m, d: ymd.d,
        hh: Math.floor(mins / 60),
        mm: mins % 60,
        text: ymd.y + '-' + pad(ymd.m) + '-' + pad(ymd.d) + ' ' +
              pad(Math.floor(mins / 60)) + ':' + pad(mins % 60)
      });
    }
    _termCache[year] = out;
    return out;
  }

  /* 某一天的月建（节气月支）：以「节」为界，立春起寅月 */
  function monthZhi(J) {
    var y = ymdFromJDN(J).y;
    /* 12 个「节」：小寒(0) 立春(2) 惊蛰(4) ... 对应月支 丑 寅 卯 ... */
    var jieTerms = [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
    var zhi = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 0];  /* 丑寅卯辰…子 */
    var terms = solarTermsOfYear(y);
    /* 默认 11：年初还没到小寒，此时仍在上一年「大雪」起的子月里 */
    var idx = 11;
    for (var i = 0; i < 12; i++) {
      if (J >= Math.floor(terms[jieTerms[i]].jd)) idx = i;
    }
    return zhi[idx];
  }

  /* 月柱：年上起月法（五虎遁）——甲己之年丙作首，乙庚之岁戊为头，
     丙辛必定寻庚起，丁壬壬位顺行流，戊癸之年甲寅求 */
  function monthGanzhi(J) {
    var ymd = ymdFromJDN(J);
    var yz = yearGanzhi(J);
    /* 年干决定寅月的天干 */
    var startGan = [2, 4, 6, 8, 0][yz.ganIdx % 5];   /* 丙戊庚壬甲 */
    var mz = monthZhi(J);
    /* 寅=2 为第一个月 */
    var offset = (mz - 2 + 12) % 12;
    var ganIdx = (startGan + offset) % 10;
    return { gan: GAN[ganIdx], zhi: ZHI[mz], name: GAN[ganIdx] + ZHI[mz], ganIdx: ganIdx, zhiIdx: mz };
  }

  /* 年柱：以立春为界 */
  function yearGanzhi(J) {
    var ymd = ymdFromJDN(J);
    var y = ymd.y;
    var lichun = solarTermJD(y, 2);
    if (J < Math.floor(lichun)) y -= 1;
    /* 公元 4 年为甲子年 */
    var i = ((y - 4) % 60 + 60) % 60;
    return { idx: i, gan: GAN[i % 10], zhi: ZHI[i % 12], name: GAN[i % 10] + ZHI[i % 12],
             ganIdx: i % 10, zhiIdx: i % 12, year: y };
  }

  /* ---------------------------------------------------------- 二十八宿 */

  var XIU = ['角', '亢', '氐', '房', '心', '尾', '箕', '斗', '牛', '女', '虚', '危', '室', '壁',
             '奎', '娄', '胃', '昴', '毕', '觜', '参', '井', '鬼', '柳', '星', '张', '翼', '轸'];
  var XIU_ANIMAL = ['蛟', '龙', '貉', '兔', '狐', '虎', '豹', '獬', '牛', '蝠', '鼠', '燕', '猪', '貐',
                    '狼', '狗', '雉', '鸡', '乌', '猴', '猿', '犴', '羊', '獐', '马', '鹿', '蛇', '蚓'];
  var XIU_SEVEN = ['木', '金', '土', '日', '月', '火', '水'];
  var XIU_DIR = ['东', '东', '东', '东', '东', '东', '东',
                 '北', '北', '北', '北', '北', '北', '北',
                 '西', '西', '西', '西', '西', '西', '西',
                 '南', '南', '南', '南', '南', '南', '南'];
  var XIU_FULL = ['角木蛟', '亢金龙', '氐土貉', '房日兔', '心月狐', '尾火虎', '箕水豹',
                  '斗木獬', '牛金牛', '女土蝠', '虚日鼠', '危月燕', '室火猪', '壁水貐',
                  '奎木狼', '娄金狗', '胃土雉', '昴日鸡', '毕月乌', '觜火猴', '参水猿',
                  '井木犴', '鬼金羊', '柳土獐', '星日马', '张月鹿', '翼火蛇', '轸水蚓'];

  /* 二十八宿值日：(JDN + 11) mod 28。已用 2024-01-01/01-02/02-10 三个点验证
     （毕→觜→氐，跨 40 天不差） */
  function xiuOf(J) {
    var i = (((J + 11) % 28) + 28) % 28;
    return {
      idx: i, name: XIU[i], full: XIU_FULL[i],
      seven: XIU_SEVEN[i % 7], animal: XIU_ANIMAL[i],
      dir: XIU_DIR[i]
    };
  }

  /* ---------------------------------------------------------- 冲煞与彭祖百忌 */

  var SHA = [null, null, '南', '东', '南', '东', '北', '西', '南', '东', '北', '西'];
  /* 三合局：申子辰煞南、巳酉丑煞东、寅午戌煞北、亥卯未煞西 */
  function shaFang(zhiIdx) {
    var g = zhiIdx % 4 === 0 ? '南' : zhiIdx % 4 === 1 ? '东'
          : zhiIdx % 4 === 2 ? '北' : '西';
    /* 子(0)辰(4)申(8) → 南 ; 丑(1)巳(5)酉(9) → 东 ;
       寅(2)午(6)戌(10) → 北 ; 卯(3)未(7)亥(11) → 西 */
    return g;
  }

  function chongSha(dayZhiIdx) {
    var chongIdx = (dayZhiIdx + 6) % 12;
    return {
      chongZhi: ZHI[chongIdx],
      chongShengxiao: SX[chongIdx],
      sha: shaFang(dayZhiIdx),
      text: '冲' + SX[chongIdx] + '（' + ZHI[chongIdx] + '）煞' + shaFang(dayZhiIdx)
    };
  }

  var PZ_GAN = ['甲不开仓财物耗亡', '乙不栽植千株不长', '丙不修灶必见灾殃',
                '丁不剃头头必生疮', '戊不受田田主不祥', '己不破券二比并亡',
                '庚不经络织机虚张', '辛不合酱主人不尝', '壬不汲水更难提防',
                '癸不词讼理弱敌强'];
  var PZ_ZHI = ['子不问卜自惹祸殃', '丑不冠带主不还乡', '寅不祭祀神鬼不尝',
                '卯不穿井水泉不香', '辰不哭泣必主重丧', '巳不远行财物伏藏',
                '午不苫盖屋主更张', '未不服药毒气入肠', '申不安床鬼祟入房',
                '酉不会客醉坐颠狂', '戌不吃犬作怪上床', '亥不嫁娶不利新郎'];

  function pengzu(ganIdx, zhiIdx) {
    return [PZ_GAN[ganIdx], PZ_ZHI[zhiIdx]];
  }

  /* ---------------------------------------------------------- 月亮 */

  /* 月亮黄经（度）。Meeus ch.47 截断级数，精度约 10 角秒 */
  function moonLongitude(JD) {
    var T = (JD - 2451545.0) / 36525;
    var Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T +
             T * T * T / 538841 - T * T * T * T / 65194000;
    var D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T +
            T * T * T / 545868 - T * T * T * T / 113065000;
    var M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T * T * T / 24490000;
    var Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T +
             T * T * T / 69699 - T * T * T * T / 14712000;
    var F = 93.2720950 + 483202.0175233 * T - 0.0036539 * T * T -
            T * T * T / 3526000 + T * T * T * T / 863310000;

    var d = D * RAD, m = M * RAD, mp = Mp * RAD, f = F * RAD;
    var sum = 6288774 * Math.sin(mp)
            + 1274027 * Math.sin(2 * d - mp)
            + 658314 * Math.sin(2 * d)
            + 213618 * Math.sin(2 * mp)
            - 185116 * Math.sin(m)
            - 114332 * Math.sin(2 * f)
            + 58793 * Math.sin(2 * d - 2 * mp)
            + 57066 * Math.sin(2 * d - m - mp)
            + 53322 * Math.sin(2 * d + mp)
            + 45758 * Math.sin(2 * d - m)
            - 40923 * Math.sin(m - mp)
            - 34720 * Math.sin(d)
            - 30383 * Math.sin(m + mp)
            + 15327 * Math.sin(2 * d - 2 * f)
            - 12528 * Math.sin(mp + 2 * f)
            + 10980 * Math.sin(mp - 2 * f)
            + 10675 * Math.sin(4 * d - mp)
            + 10034 * Math.sin(3 * mp)
            + 8548 * Math.sin(4 * d - 2 * mp)
            - 7888 * Math.sin(2 * d + m - mp)
            - 6766 * Math.sin(2 * d + m)
            - 5163 * Math.sin(d - mp)
            + 4987 * Math.sin(d + m)
            + 4036 * Math.sin(2 * d - m + mp)
            + 3994 * Math.sin(2 * d + 2 * mp)
            + 3861 * Math.sin(4 * d)
            + 3665 * Math.sin(2 * d - 3 * mp)
            - 2689 * Math.sin(m - 2 * mp)
            - 2602 * Math.sin(2 * d - mp + 2 * f)
            + 2390 * Math.sin(2 * d - m - 2 * mp)
            - 2348 * Math.sin(d + mp)
            + 2236 * Math.sin(2 * d - 2 * m)
            - 2120 * Math.sin(m + 2 * mp)
            - 2069 * Math.sin(2 * m)
            + 2048 * Math.sin(2 * d - 2 * m - mp)
            - 1773 * Math.sin(2 * d + mp - 2 * f)
            - 1595 * Math.sin(2 * d + 2 * f)
            + 1215 * Math.sin(4 * d - m - mp)
            - 1110 * Math.sin(2 * mp + 2 * f)
            - 892 * Math.sin(3 * d - mp)
            - 810 * Math.sin(2 * d + m + mp)
            + 759 * Math.sin(4 * d - m - 2 * mp)
            - 713 * Math.sin(2 * m - mp)
            - 700 * Math.sin(2 * d + 2 * m - mp)
            + 691 * Math.sin(2 * d + m - 2 * mp)
            + 596 * Math.sin(2 * d - m - 2 * f)
            + 549 * Math.sin(4 * d + mp)
            + 537 * Math.sin(4 * mp)
            + 520 * Math.sin(4 * d - m)
            - 487 * Math.sin(d - 2 * mp)
            - 399 * Math.sin(2 * d + m - 2 * f)
            - 381 * Math.sin(2 * mp - 2 * f)
            + 351 * Math.sin(d + m + mp)
            - 340 * Math.sin(3 * d - 2 * mp)
            + 330 * Math.sin(4 * d - 3 * mp)
            + 327 * Math.sin(2 * d - m + 2 * mp)
            - 323 * Math.sin(2 * m + mp)
            + 299 * Math.sin(d + m - mp)
            + 294 * Math.sin(2 * d + 3 * mp);

    return norm360(Lp + sum / 1000000);
  }

  var PHASES = ['新月（朔）', '娥眉月', '上弦月', '盈凸月', '满月（望）', '亏凸月', '下弦月', '残月'];

  function moonPhase(JD) {
    var lon = norm360(moonLongitude(JD) - sunLongitude(JD));
    var idx = Math.floor(norm360(lon + 22.5) / 45) % 8;
    var illum = (1 - Math.cos(lon * RAD)) / 2;
    return {
      angle: lon,
      name: PHASES[idx],
      illum: illum,
      illumPct: Math.round(illum * 100),
      waxing: lon < 180,
      moonLongitude: moonLongitude(JD)
    };
  }

  /* ---------------------------------------------------------- 黄道星座 */

  var SIGNS = ['白羊座', '金牛座', '双子座', '巨蟹座', '狮子座', '处女座',
               '天秤座', '天蝎座', '射手座', '摩羯座', '水瓶座', '双鱼座'];

  function signOfLongitude(lon) {
    return SIGNS[Math.floor(norm360(lon) / 30) % 12];
  }
  function signIndex(lon) { return Math.floor(norm360(lon) / 30) % 12; }

  /* 太阳星座按日期（热带黄道，标准区间） */
  function sunSign(y, m, d) {
    var cut = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 23, 22];
    var names = ['摩羯座', '水瓶座', '双鱼座', '白羊座', '金牛座', '双子座',
                 '巨蟹座', '狮子座', '处女座', '天秤座', '天蝎座', '射手座', '摩羯座'];
    return names[m - 1 + (d >= cut[m - 1] ? 1 : 0)];
  }

  /* ---------------------------------------------------------- 恒星时与上升星座 */

  /* 格林尼治平恒星时（度） */
  function gmst(JD) {
    var T = (JD - 2451545.0) / 36525;
    var g = 280.46061837 + 360.98564736629 * (JD - 2451545.0) +
            0.000387933 * T * T - T * T * T / 38710000;
    return norm360(g);
  }

  function obliquity(JD) {
    var T = (JD - 2451545.0) / 36525;
    return 23.439291 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T;
  }

  /* 上升星座：从出生时刻（世界时）与出生地经纬度求上升点黄经 */
  function ascendant(JD, latDeg, lonDegEast) {
    var lst = norm360(gmst(JD) + lonDegEast);      /* 本地恒星时 = RAMC */
    var eps = obliquity(JD) * RAD;
    var phi = latDeg * RAD;
    var t = lst * RAD;
    var y = Math.cos(t);
    var x = -(Math.sin(t) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps));
    var asc = norm360(Math.atan2(y, x) * DEG);
    return { longitude: asc, sign: signOfLongitude(asc), ramc: lst, obliquity: eps * DEG };
  }

  /* ---------------------------------------------------------- 汇总 */

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* 某一天的完整历法信息。J 为该日在当地的儒略日数（正午） */
  function dayInfo(y, m, d, opts) {
    opts = opts || {};
    var J = jdn(y, m, d);

    var gi = dayGanzhi(J);
    var yi = yearGanzhi(J);
    var mi = monthGanzhi(J);
    var xiu = xiuOf(J);
    var cs = chongSha(gi.idx % 12);
    var pz = pengzu(gi.idx % 10, gi.idx % 12);

    /* 当天是否有节气交接 */
    var terms = solarTermsOfYear(y);
    var todayTerm = null;
    for (var i = 0; i < terms.length; i++) {
      if (terms[i].y === y && terms[i].m === m && terms[i].d === d) { todayTerm = terms[i]; break; }
    }
    /* 也可能落在前一天算出来的年份里，往前一年找一次 */
    if (!todayTerm) {
      var prev = solarTermsOfYear(y - 1);
      for (var k = 0; k < prev.length; k++) {
        if (prev[k].y === y && prev[k].m === m && prev[k].d === d) { todayTerm = prev[k]; break; }
      }
    }

    /* 下一个节气 */
    var nextTerm = null;
    var all = terms.concat(solarTermsOfYear(y + 1));
    for (var j = 0; j < all.length; j++) {
      if (Math.floor(all[j].jd) > J) { nextTerm = all[j]; break; }
    }

    var phase = moonPhase(J - 0.5 + 4 / 24);   /* 取北京时间当日正午 */

    return {
      jdn: J,
      date: { y: y, m: m, d: d },
      day: gi,
      month: mi,
      year: yi,
      xiu: xiu,
      chongSha: cs,
      pengzu: pz,
      term: todayTerm,
      nextTerm: nextTerm,
      moon: phase,
      moonSign: signOfLongitude(phase.moonLongitude)
    };
  }

  global.Almanac = {
    jdn: jdn,
    jdFromUTC: jdFromUTC,
    ymdFromJDN: ymdFromJDN,
    dayGanzhi: dayGanzhi,
    monthGanzhi: monthGanzhi,
    yearGanzhi: yearGanzhi,
    monthZhi: monthZhi,
    sunLongitude: sunLongitude,
    moonLongitude: moonLongitude,
    solarTermJD: solarTermJD,
    solarTermsOfYear: solarTermsOfYear,
    moonPhase: moonPhase,
    xiuOf: xiuOf,
    chongSha: chongSha,
    pengzu: pengzu,
    signOfLongitude: signOfLongitude,
    signIndex: signIndex,
    sunSign: sunSign,
    gmst: gmst,
    obliquity: obliquity,
    ascendant: ascendant,
    dayInfo: dayInfo,
    GAN: GAN, ZHI: ZHI, SX: SX, XIU: XIU, XIU_FULL: XIU_FULL,
    SIGNS: SIGNS, TERMS: TERMS, PHASES: PHASES
  };
})(typeof window !== 'undefined' ? window : globalThis);
