/* ============================================================
   answer.js —— 答案之书
   答案库 240 条，每条 { text, tag }，逐条手写、互不重复。
   抽签用 Math.random()，不做确定性处理。
   ============================================================ */
(function () {
  'use strict';

  var ANSWERS = [
    /* ---------- 行动 24 ---------- */
    { text: '先迈出最小的一步。', tag: '行动' },
    { text: '今天先做一点，别等状态。', tag: '行动' },
    { text: '想清楚就动手，别再拖。', tag: '行动' },
    { text: '把大问题切小，再挑一块。', tag: '行动' },
    { text: '先去试一试，再谈喜不喜欢。', tag: '行动' },
    { text: '与其反复想，不如写下来。', tag: '行动' },
    { text: '现在就做那件最怕的事。', tag: '行动' },
    { text: '先完成，再打磨。', tag: '行动' },
    { text: '写下来，你就看清一半了。', tag: '行动' },
    { text: '把第一步缩到五分钟。', tag: '行动' },
    { text: '不用准备好才开始。', tag: '行动' },
    { text: '列出来，逐条划掉。', tag: '行动' },
    { text: '去问一句，比猜十遍有用。', tag: '行动' },
    { text: '先做完手边这一件。', tag: '行动' },
    { text: '把决定变成一个动作。', tag: '行动' },
    { text: '今天只推进一步就够。', tag: '行动' },
    { text: '不确定就先小范围试。', tag: '行动' },
    { text: '把犹豫换成一次预约。', tag: '行动' },
    { text: '先解决最容易的那块。', tag: '行动' },
    { text: '动手之后，答案会变清楚。', tag: '行动' },
    { text: '别等灵感，先坐下开始。', tag: '行动' },
    { text: '把想法落成一个日期。', tag: '行动' },
    { text: '先空出时间，事情才会来。', tag: '行动' },
    { text: '做一次，胜过想一百次。', tag: '行动' },

    /* ---------- 等待 24 ---------- */
    { text: '等一等，还没到时候。', tag: '等待' },
    { text: '再等三天，答案会自己浮现。', tag: '等待' },
    { text: '先让消息沉一沉再回。', tag: '等待' },
    { text: '有些事，时间会替你筛。', tag: '等待' },
    { text: '今天不做决定也可以。', tag: '等待' },
    { text: '再观察一阵，不必着急。', tag: '等待' },
    { text: '让子弹飞一会儿。', tag: '等待' },
    { text: '时机比速度更重要。', tag: '等待' },
    { text: '先放一放，明天再说。', tag: '等待' },
    { text: '等情绪过去再谈这件事。', tag: '等待' },
    { text: '慢一点，你并没有落后。', tag: '等待' },
    { text: '先攒够力气再动身。', tag: '等待' },
    { text: '该来的，不必去催。', tag: '等待' },
    { text: '这周先什么都不做。', tag: '等待' },
    { text: '等一个更好的时机。', tag: '等待' },
    { text: '先让事情自己发展一段。', tag: '等待' },
    { text: '不回应也是一种回应。', tag: '等待' },
    { text: '再过一晚，感受会不同。', tag: '等待' },
    { text: '先停一停，别急着下结论。', tag: '等待' },
    { text: '耐心一点，它在路上。', tag: '等待' },
    { text: '留出空档，别把日子排满。', tag: '等待' },
    { text: '先别催，让它自然收尾。', tag: '等待' },
    { text: '时候到了，你自然会知道。', tag: '等待' },
    { text: '再等等，别提前失望。', tag: '等待' },

    /* ---------- 沟通 24 ---------- */
    { text: '答案在你说出口之后。', tag: '沟通' },
    { text: '把话说开，别让它发酵。', tag: '沟通' },
    { text: '先问一句，再下判断。', tag: '沟通' },
    { text: '直接说出来，对方猜不到。', tag: '沟通' },
    { text: '换一种说法，再试一次。', tag: '沟通' },
    { text: '先听后说，顺序别反。', tag: '沟通' },
    { text: '找那个人聊一聊，就现在。', tag: '沟通' },
    { text: '说出你的需要，不丢人。', tag: '沟通' },
    { text: '把抱怨改成一个请求。', tag: '沟通' },
    { text: '少解释，多确认。', tag: '沟通' },
    { text: '先承认对方的感受。', tag: '沟通' },
    { text: '让对方把话说完。', tag: '沟通' },
    { text: '写下来，会比说更清楚。', tag: '沟通' },
    { text: '问清楚，别替别人回答。', tag: '沟通' },
    { text: '先说出你真正在意的那句。', tag: '沟通' },
    { text: '找一个合适的时机再谈。', tag: '沟通' },
    { text: '你开口，局面才会松动。', tag: '沟通' },
    { text: '把问题放在桌面上说。', tag: '沟通' },
    { text: '少说，多听，再回应。', tag: '沟通' },
    { text: '别用暗示，用清楚的话。', tag: '沟通' },
    { text: '先约一次见面聊聊。', tag: '沟通' },
    { text: '道歉要具体，不要含糊。', tag: '沟通' },
    { text: '把沉默变成一句话。', tag: '沟通' },
    { text: '你问的方式，决定听到什么。', tag: '沟通' },

    /* ---------- 直觉 24 ---------- */
    { text: '你的第一反应是对的。', tag: '直觉' },
    { text: '心里的那点不安，值得听。', tag: '直觉' },
    { text: '别说服自己，你早就知道。', tag: '直觉' },
    { text: '相信那个让你放松的选项。', tag: '直觉' },
    { text: '你身体的感觉没骗你。', tag: '直觉' },
    { text: '不用逻辑了，你已经知道。', tag: '直觉' },
    { text: '先问问自己真正想要什么。', tag: '直觉' },
    { text: '让你反复犹豫的，就是答案。', tag: '直觉' },
    { text: '相信你第一次想到的那个。', tag: '直觉' },
    { text: '细小的迟疑，是重要的提示。', tag: '直觉' },
    { text: '别问别人，先问你自己。', tag: '直觉' },
    { text: '你心里其实早有答案。', tag: '直觉' },
    { text: '想想你真正在躲什么。', tag: '直觉' },
    { text: '让你眼睛一亮的，就是它。', tag: '直觉' },
    { text: '安静下来，你会听见。', tag: '直觉' },
    { text: '相信那个不勉强的选择。', tag: '直觉' },
    { text: '答案不在外面，在里面。', tag: '直觉' },
    { text: '哪条路让你松一口气。', tag: '直觉' },
    { text: '你的直觉一直在给你发信号。', tag: '直觉' },
    { text: '别急着分析，先感觉一下。', tag: '直觉' },
    { text: '问自己：如果没人看着呢。', tag: '直觉' },
    { text: '心里的答案最诚实。', tag: '直觉' },
    { text: '顺着让你舒服的方向走。', tag: '直觉' },
    { text: '你不必再找第二个理由。', tag: '直觉' },

    /* ---------- 放下 24 ---------- */
    { text: '松开手，它才不会勒住你。', tag: '放下' },
    { text: '这件事可以到此为止了。', tag: '放下' },
    { text: '不必让所有人都满意。', tag: '放下' },
    { text: '先原谅自己一次。', tag: '放下' },
    { text: '别再把那件事翻出来看。', tag: '放下' },
    { text: '接受它已经发生了。', tag: '放下' },
    { text: '得不到的，先放回原位。', tag: '放下' },
    { text: '把力气从过去收回来。', tag: '放下' },
    { text: '你不需要那个解释了。', tag: '放下' },
    { text: '停止在心里重演一遍。', tag: '放下' },
    { text: '降低一点你的期待。', tag: '放下' },
    { text: '有些答案就是没有答案。', tag: '放下' },
    { text: '先放下评判，才能看清。', tag: '放下' },
    { text: '允许自己做得不够好。', tag: '放下' },
    { text: '不用一直证明给别人看。', tag: '放下' },
    { text: '把它交给时间处理。', tag: '放下' },
    { text: '删掉那句反复编辑的话。', tag: '放下' },
    { text: '你可以选择不追究。', tag: '放下' },
    { text: '先照顾自己，再谈其他。', tag: '放下' },
    { text: '不喜欢就承认不喜欢。', tag: '放下' },
    { text: '别再为它消耗今天。', tag: '放下' },
    { text: '把注意力收回到自己身上。', tag: '放下' },
    { text: '你值得松一口气。', tag: '放下' },
    { text: '有些关系，淡了就好。', tag: '放下' },

    /* ---------- 坚持 24 ---------- */
    { text: '再往前一点，就快到了。', tag: '坚持' },
    { text: '别在中途改主意。', tag: '坚持' },
    { text: '继续做，别急着看结果。', tag: '坚持' },
    { text: '每天十分钟也够。', tag: '坚持' },
    { text: '这次请不要放弃。', tag: '坚持' },
    { text: '慢没关系，别停下。', tag: '坚持' },
    { text: '先把这件做完再说。', tag: '坚持' },
    { text: '熬过这段，就会不同。', tag: '坚持' },
    { text: '你已经走了很远了。', tag: '坚持' },
    { text: '重复本身就是答案。', tag: '坚持' },
    { text: '别用一次失败做总结。', tag: '坚持' },
    { text: '把节奏稳住，比冲刺重要。', tag: '坚持' },
    { text: '再坚持一轮，不要现在收手。', tag: '坚持' },
    { text: '你不需要每天都状态好。', tag: '坚持' },
    { text: '把标准降一点，继续往前。', tag: '坚持' },
    { text: '别停在第 99 步。', tag: '坚持' },
    { text: '让习惯替你做决定。', tag: '坚持' },
    { text: '今天也不缺席。', tag: '坚持' },
    { text: '持续比用力更有效。', tag: '坚持' },
    { text: '给自己一个更长的时间线。', tag: '坚持' },
    { text: '别急着换方向。', tag: '坚持' },
    { text: '回头看看你走过的路。', tag: '坚持' },
    { text: '再试一次，真的就一次。', tag: '坚持' },
    { text: '你比你以为的更能熬。', tag: '坚持' },

    /* ---------- 改变 24 ---------- */
    { text: '换个方式，会有不同结果。', tag: '改变' },
    { text: '先改一件小事试试。', tag: '改变' },
    { text: '不必等别人先改变。', tag: '改变' },
    { text: '旧的答案配不上现在的你。', tag: '改变' },
    { text: '试一条你没走过的路。', tag: '改变' },
    { text: '把顺序调一下，也许就成了。', tag: '改变' },
    { text: '该更新的是你的方法。', tag: '改变' },
    { text: '别用老办法解决新问题。', tag: '改变' },
    { text: '先换环境，再谈自律。', tag: '改变' },
    { text: '从一个新习惯开始。', tag: '改变' },
    { text: '允许自己重新开始。', tag: '改变' },
    { text: '这次换你主动一点。', tag: '改变' },
    { text: '你可以选择不一样的做法。', tag: '改变' },
    { text: '把不会的变成正在学的。', tag: '改变' },
    { text: '先改掉一个最小的毛病。', tag: '改变' },
    { text: '换个人聊，视角会变。', tag: '改变' },
    { text: '试着说一次不。', tag: '改变' },
    { text: '把范围缩小一点。', tag: '改变' },
    { text: '先调整节奏，别改目标。', tag: '改变' },
    { text: '你不必一直是同一个人。', tag: '改变' },
    { text: '试试看，不行再换回来。', tag: '改变' },
    { text: '把问题换个问法。', tag: '改变' },
    { text: '别守着过期的计划。', tag: '改变' },
    { text: '改变可以从今天开始。', tag: '改变' },

    /* ---------- 边界 24 ---------- */
    { text: '可以说不，这没有错。', tag: '边界' },
    { text: '你的时间也需要被尊重。', tag: '边界' },
    { text: '不必每次都答应。', tag: '边界' },
    { text: '先划清你能接受的范围。', tag: '边界' },
    { text: '别替别人承担他的情绪。', tag: '边界' },
    { text: '这次先照顾自己的感受。', tag: '边界' },
    { text: '拒绝也是一种负责。', tag: '边界' },
    { text: '把底线说清楚。', tag: '边界' },
    { text: '不用解释你的拒绝。', tag: '边界' },
    { text: '保持一点距离也健康。', tag: '边界' },
    { text: '有些事不是你的责任。', tag: '边界' },
    { text: '累了就说累，别硬撑。', tag: '边界' },
    { text: '先问自己愿不愿意。', tag: '边界' },
    { text: '别人的评价归别人。', tag: '边界' },
    { text: '你可以退出这段对话。', tag: '边界' },
    { text: '把丑话说在前面。', tag: '边界' },
    { text: '不要让工作占满你。', tag: '边界' },
    { text: '留一点只属于你的空间。', tag: '边界' },
    { text: '沉默可以是一种回答。', tag: '边界' },
    { text: '你不必随时都在线。', tag: '边界' },
    { text: '先停下，再决定要不要帮。', tag: '边界' },
    { text: '划一条线，关系会更清楚。', tag: '边界' },
    { text: '一次让步不等于永远让步。', tag: '边界' },
    { text: '你的底线不用别人批准。', tag: '边界' },

    /* ---------- 当下 24 ---------- */
    { text: '先过好今天再谈以后。', tag: '当下' },
    { text: '把注意力放回眼前。', tag: '当下' },
    { text: '这一刻才是你能用的。', tag: '当下' },
    { text: '先做完手头这一件。', tag: '当下' },
    { text: '别为还没发生的事焦虑。', tag: '当下' },
    { text: '深呼吸三次，再继续。', tag: '当下' },
    { text: '今天的天气也值得看一眼。', tag: '当下' },
    { text: '停下来，感受一下此刻。', tag: '当下' },
    { text: '先解决眼前这顿饭。', tag: '当下' },
    { text: '你只需要走好这一步。', tag: '当下' },
    { text: '把手机放下一会儿。', tag: '当下' },
    { text: '此刻的感受也算数。', tag: '当下' },
    { text: '别让明天偷走今天。', tag: '当下' },
    { text: '一次只做一件事。', tag: '当下' },
    { text: '去做那件让你放松的小事。', tag: '当下' },
    { text: '先把自己安顿好。', tag: '当下' },
    { text: '现在的你，已经够用了。', tag: '当下' },
    { text: '慢下来，你才看得见。', tag: '当下' },
    { text: '把日程留一点空白。', tag: '当下' },
    { text: '别急着给今天打分。', tag: '当下' },
    { text: '先听，再看，后说。', tag: '当下' },
    { text: '这一刻不解决也可以。', tag: '当下' },
    { text: '把心收回到这里。', tag: '当下' },
    { text: '好好休息，也是进度。', tag: '当下' },

    /* ---------- 信任 24 ---------- */
    { text: '相信你自己能处理。', tag: '信任' },
    { text: '把这件事交给时间。', tag: '信任' },
    { text: '你可以相信一次。', tag: '信任' },
    { text: '先相信对方的善意。', tag: '信任' },
    { text: '你已经做得很好了。', tag: '信任' },
    { text: '不必检查第三遍。', tag: '信任' },
    { text: '让专业的人去做专业的事。', tag: '信任' },
    { text: '相信这段关系扛得住。', tag: '信任' },
    { text: '先信任，再验证。', tag: '信任' },
    { text: '你比自己想的更稳。', tag: '信任' },
    { text: '把担心换成一次托付。', tag: '信任' },
    { text: '可以稍微依赖别人一点。', tag: '信任' },
    { text: '相信积累不会白费。', tag: '信任' },
    { text: '接受帮助并不丢人。', tag: '信任' },
    { text: '先松一口气，没事的。', tag: '信任' },
    { text: '相信你的判断没有错。', tag: '信任' },
    { text: '让别人也有机会做好。', tag: '信任' },
    { text: '不必事事都自己扛。', tag: '信任' },
    { text: '你做的准备已经足够。', tag: '信任' },
    { text: '相信明天还有机会。', tag: '信任' },
    { text: '先允许事情顺利发生。', tag: '信任' },
    { text: '放下控制，事情也在走。', tag: '信任' },
    { text: '你被支持着，不用怀疑。', tag: '信任' },
    { text: '相信过程，不必盯结果。', tag: '信任' }
  ];

  var lastIndex = -1;

  function randomIndex() {
    if (ANSWERS.length < 2) return 0;
    var i = Math.floor(Math.random() * ANSWERS.length);
    while (i === lastIndex) {
      i = Math.floor(Math.random() * ANSWERS.length);
    }
    return i;
  }

  var els = {
    ask: document.getElementById('ask'),
    answer: document.getElementById('answer'),
    book: document.getElementById('book'),
    openBtn: document.getElementById('open'),
    againBtn: document.getElementById('again'),
    closeBtn: document.getElementById('close'),
    text: document.getElementById('text'),
    tag: document.getElementById('tag'),
    q: document.getElementById('q'),
    shakeBtn: document.getElementById('shake'),
    shakeState: document.getElementById('shake-state')
  };

  var toastEl = null;
  var toastTimer = 0;

  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      if (toastEl) toastEl.hidden = true;
    }, 2200);
  }

  /* ---------- 抽签 ---------- */
  function pick() {
    var i = randomIndex();
    lastIndex = i;
    return ANSWERS[i];
  }

  function showAnswer() {
    var item = pick();
    els.text.textContent = item.text;
    els.tag.textContent = item.tag;

    els.ask.hidden = true;
    els.answer.hidden = false;

    // 重启动画（隐藏元素不触发 transition，所以用 animation）
    els.text.style.animation = 'none';
    void els.text.offsetWidth;
    els.text.style.animation = '';

    window.scrollTo(0, 0);
  }

  function closeBook() {
    els.answer.hidden = true;
    els.ask.hidden = false;

    els.book.classList.remove('flip');
    void els.book.offsetWidth;
    els.book.classList.add('flip');

    if (els.q) els.q.value = ''; // 问题不保存，合上即忘
    window.scrollTo(0, 0);
  }

  els.openBtn.addEventListener('click', showAnswer);
  els.againBtn.addEventListener('click', showAnswer);
  els.closeBtn.addEventListener('click', closeBook);

  /* ---------- 摇一摇 ---------- */
  var SHAKE_DELTA = 18;
  var SHAKE_COOLDOWN = 1200;
  var listening = false;
  var lastShake = 0;

  function onMotion(e) {
    var a = e.accelerationIncludingGravity || e.acceleration;
    if (!a) return;
    var x = a.x || 0, y = a.y || 0, z = a.z || 0;
    var delta = Math.abs(x) + Math.abs(y) + Math.abs(z) - 9.8;
    if (delta < SHAKE_DELTA) return;

    var now = Date.now();
    if (now - lastShake < SHAKE_COOLDOWN) return;
    lastShake = now;

    showAnswer();
    toast('摇到一条答案');
  }

  function startListen() {
    if (listening) return;
    listening = true;
    window.addEventListener('devicemotion', onMotion);
  }

  function markEnabled(msg) {
    startListen();
    els.shakeBtn.disabled = true;
    els.shakeBtn.textContent = '摇一摇已开启';
    els.shakeState.textContent = msg;
  }

  function onShakeClick() {
    var DM = window.DeviceMotionEvent;

    if (!DM) {
      els.shakeBtn.hidden = true;
      els.shakeState.textContent = '这台设备不支持摇一摇，用「翻开」吧。';
      toast('不支持摇一摇，用按钮也一样');
      return;
    }

    if (typeof DM.requestPermission === 'function') {
      // iOS 必须在用户手势里申请权限
      els.shakeBtn.disabled = true;
      DM.requestPermission().then(function (state) {
        els.shakeBtn.disabled = false;
        if (state === 'granted') {
          markEnabled('摇一摇已开启，晃动手机试试。');
          toast('摇一摇已开启');
        } else {
          els.shakeState.textContent = '没有拿到权限，可以继续用「翻开」。';
          toast('未获得权限，用按钮也一样');
        }
      }).catch(function () {
        els.shakeBtn.disabled = false;
        els.shakeState.textContent = '这台设备不支持摇一摇，用「翻开」吧。';
        toast('不支持摇一摇，用按钮也一样');
      });
      return;
    }

    markEnabled('摇一摇已开启，晃动手机试试。');
  }

  if (els.shakeBtn) {
    els.shakeBtn.addEventListener('click', onShakeClick);
  }

  /* ---------- 共享 Service Worker（子目录要用上一级） ---------- */
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('../sw.js').catch(function () {});
    });
  }
})();
