/*
 * 参照实体棋盘重建 · 第二版。
 * 不是描摹 —— 那张照片是商品美术，有版权；这里复刻的是画法语汇
 * （风格不受保护），形状坐标全部重新定。
 *
 * 第一版被推翻的核心问题：我写了一个统一的 face()，八只动物共用同一个头矩形、
 * 同一个椭圆口鼻、同一组眼位。那是把「统一」实现成了「相同」，结果是
 * 「换耳朵的同一个角色」。参考图统一的是**简化程度**，不是形状 ——
 * 鼠上宽、狼下收、虎偏方、豹偏圆、象横展，头轮廓各不相同。
 *
 * 所以这一版只共用颜色、眼睛、鼻嘴这些小部件，**不共用头轮廓和口鼻区**。
 *
 * 布局：汉字在**上方**（参考图的陷阱和兽穴都是「字在顶、图在下」）。
 * 动物占 y=14..96，上面留给汉字。全部按 41px 设计，stroke 一律 >= 4。
 */
(function () {
  window.SPRITE_SETS = window.SPRITE_SETS || [];
  const svg = (inner) => `<svg viewBox="0 0 100 100">${inner}</svg>`;

  const INK = '#2a211a';
  const PINK = '#ea7b92';

  // ---------- 共用小部件。只共用这些。 ----------

  /* 眼睛：短椭圆豆点。不是针尖（那是我第一版的误判），也不是大圆。 */
  const eye = (x, y, r = 3.8) =>
    `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.15}" fill="${INK}"/>`;

  /* 鼻嘴：鼻块 + 短竖线 + 嘴弧。
     第一版用两个粗矩形拼「工」字，在 41px 下像汉字或螺丝槽。 */
  const snoutMark = (cx, cy, w = 9, mouth = 'arc') => {
    const nose = `<path d="M${cx - w / 2} ${cy} q${w / 2} ${w * 0.62} ${w} 0 Z" fill="${INK}"/>`;
    const stem = `<path d="M${cx} ${cy + w * 0.5} v5" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;
    const m =
      mouth === 'w'
        ? `<path d="M${cx - 9} ${cy + 10} q4.5 6 9 0 q4.5 6 9 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`
        : mouth === 'none'
          ? ''
          : `<path d="M${cx - 8} ${cy + 9} q8 7 16 0" stroke="${INK}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    return nose + stem + m;
  };

  /* 胡须只给鼠和猫科。狗、狼、象不该机械复用 —— 第一版八只全上了。 */
  const whisk = (cx, y1, y2, len = 9, dx = 24) =>
    `<path d="M${cx - dx} ${y1} h-${len} M${cx - dx} ${y2} h-${len} M${cx + dx} ${y1} h${len} M${cx + dx} ${y2} h${len}"
      stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;

  const innerEar = (x, y, rx, ry, rot) =>
    `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${PINK}" transform="rotate(${rot || 0} ${x} ${y})"/>`;

  // ---------- 八只动物，每只自己的头轮廓 ----------
  // 左右轻微不对称是故意的：参考图的耳朵和斑点都不完全镜像，
  // 那是「手工玩具」而不是「图标生成器」的来源。

  const rat = svg(
    `<circle cx="22" cy="44" r="16" fill="#9b9aa6"/><circle cx="78" cy="43" r="16.5" fill="#9b9aa6"/>` +
    innerEar(22, 44, 7, 7) + innerEar(78, 43, 7.4, 7.4) +
    // 上宽下窄
    `<path d="M50 24 q30 0 30 30 q0 26 -30 26 q-30 0 -30 -26 q0 -30 30 -30 Z" fill="#b4b2be"/>` +
    `<ellipse cx="50" cy="70" rx="19" ry="14" fill="#f4f1f5"/>` +
    whisk(50, 68, 76, 8, 19) +
    eye(39, 56) + eye(61, 56) +
    snoutMark(50, 66, 8, 'arc'),
  );

  const cat = svg(
    // 短而圆钝的三角耳，不是尖刀
    `<path d="M24 46 Q19 22 40 32 Z" fill="#9b7ec4"/><path d="M76 45 Q81 21 60 32 Z" fill="#9b7ec4"/>` +
    innerEar(28, 40, 5, 8, -25) + innerEar(72, 39, 5, 8, 25) +
    `<circle cx="50" cy="60" r="30" fill="#ad8fd4"/>` +
    // 双瓣腮，不是一块横椭圆
    `<circle cx="41" cy="72" r="13" fill="#f6f1fc"/><circle cx="59" cy="72" r="13" fill="#f6f1fc"/>` +
    whisk(50, 70, 78, 9, 22) +
    eye(39, 57) + eye(61, 57) +
    snoutMark(50, 66, 8, 'w'),
  );

  const dog = svg(
    // 短折耳贴头侧，不是两条垂到底的大耳朵。杏色脸块才是主角。
    `<path d="M20 40 q-8 22 6 32 q10 -14 8 -30 Z" fill="#c97f26"/>` +
    `<path d="M80 39 q8 22 -6 32 q-10 -14 -8 -30 Z" fill="#c97f26"/>` +
    `<path d="M50 26 q30 2 30 30 q0 28 -30 28 q-30 0 -30 -28 q0 -28 30 -30 Z" fill="#eeab52"/>` +
    `<ellipse cx="50" cy="71" rx="21" ry="15" fill="#fdf3dc"/>` +
    eye(38, 55) + eye(62, 55) +
    snoutMark(50, 66, 10, 'arc'),
  );

  const wolf = svg(
    `<path d="M26 44 L20 12 L44 32 Z" fill="#6d8091"/><path d="M74 43 L80 11 L56 32 Z" fill="#6d8091"/>` +
    innerEar(29, 34, 4.5, 8, -20) + innerEar(71, 33, 4.5, 8, 20) +
    // 圆钝五边形，下半收窄
    `<path d="M50 26 q28 2 28 28 q0 16 -12 26 q-8 6 -16 6 q-8 0 -16 -6 q-12 -10 -12 -26 q0 -26 28 -28 Z" fill="#8698a8"/>` +
    // 白色下脸做成倒梯形尖腮，不是椭圆
    `<path d="M34 62 L66 62 L58 82 Q50 88 42 82 Z" fill="#eef3f7"/>` +
    eye(38, 55) + eye(62, 55) +
    snoutMark(50, 65, 9, 'arc'),
  );

  const leopard = svg(
    // 小而高的圆耳；斑点多、小、大小不一，沿额头和脸缘分布，不侵占口鼻
    `<circle cx="26" cy="36" r="11" fill="#d9902a"/><circle cx="74" cy="35" r="11.5" fill="#d9902a"/>` +
    innerEar(26, 36, 4.6, 4.6) + innerEar(74, 35, 4.8, 4.8) +
    `<circle cx="50" cy="60" r="30" fill="#f0b757"/>` +
    `<circle cx="35" cy="42" r="5" fill="#8a5310"/><circle cx="50" cy="37" r="4" fill="#8a5310"/>` +
    `<circle cx="65" cy="43" r="5.4" fill="#8a5310"/><circle cx="26" cy="56" r="4.2" fill="#8a5310"/>` +
    `<circle cx="74" cy="58" r="3.6" fill="#8a5310"/><circle cx="29" cy="70" r="3.4" fill="#8a5310"/>` +
    `<ellipse cx="50" cy="71" rx="17" ry="13" fill="#fdf2dd"/>` +
    whisk(50, 69, 77, 8, 18) +
    eye(39, 57) + eye(61, 57) +
    snoutMark(50, 66, 8, 'arc'),
  );

  const tiger = svg(
    // 偏方的头；左右两块白腮，不是一个大白口罩；条纹短、断续、沿轮廓生长
    `<circle cx="25" cy="36" r="13" fill="#dd6a22"/><circle cx="75" cy="35" r="13.5" fill="#dd6a22"/>` +
    innerEar(25, 36, 5.5, 5.5) + innerEar(75, 35, 5.8, 5.8) +
    `<path d="M50 26 q31 0 31 30 q0 28 -31 28 q-31 0 -31 -28 q0 -30 31 -30 Z" fill="#f4813a"/>` +
    `<path d="M44 40 v11 M50 37 v12 M56 40 v11" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M21 52 l8 3 M20 62 l8 2 M79 51 l-8 3 M80 61 l-8 2" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` +
    `<circle cx="40" cy="70" r="13" fill="#fffaf0"/><circle cx="60" cy="70" r="13" fill="#fffaf0"/>` +
    whisk(50, 69, 77, 8, 22) +
    eye(39, 57) + eye(61, 57) +
    snoutMark(50, 65, 9, 'w'),
  );

  const lion = (() => {
    // 鬃毛：14 个宽而短的圆角毛瓣，长短交替。
    // 第一版用 stroke-dasharray 画锯齿，缩小后像齿轮或邮票齿孔。
    let mane = '';
    const N = 14;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 - Math.PI / 2;
      const len = i % 2 ? 15 : 18;
      const x = 50 + Math.cos(a) * 30, y = 60 + Math.sin(a) * 30;
      mane += `<rect x="${(x - 7).toFixed(1)}" y="${(y - len / 2).toFixed(1)}" width="14" height="${len}" rx="7"
        fill="#c9491f" transform="rotate(${((a * 180) / Math.PI + 90).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }
    return svg(
      mane +
      `<circle cx="50" cy="60" r="29" fill="#e0a13c"/>` +
      // 口鼻区缩小、暖奶油色，不是刺眼的大白盘
      `<ellipse cx="50" cy="70" rx="15" ry="11" fill="#fbe7c2"/>` +
      eye(40, 57) + eye(60, 57) +
      snoutMark(50, 66, 9, 'arc'),
    );
  })();

  const elephant = svg(
    // 完全脱离通用画法：宽头、大横耳、中央长鼻，没有口鼻盘。
    // 第一版漏了鼻子 —— 八只里最好认的特征漏掉了，缩小后像蓝熊。
    `<ellipse cx="17" cy="56" rx="16" ry="25" fill="#3f8fbd"/><ellipse cx="83" cy="55" rx="16" ry="25" fill="#3f8fbd"/>` +
    `<ellipse cx="17" cy="56" rx="7" ry="13" fill="${PINK}"/><ellipse cx="83" cy="55" rx="7" ry="13" fill="${PINK}"/>` +
    `<path d="M50 26 q28 0 28 26 q0 12 -6 20 l-44 0 q-6 -8 -6 -20 q0 -26 28 -26 Z" fill="#63b0d8"/>` +
    // 鼻子占头高约 40%，从两眼之间一直到下缘
    `<path d="M50 62 q0 20 -3 30" stroke="#4d9cc9" stroke-width="15" fill="none" stroke-linecap="round"/>` +
    `<path d="M41 78 q3 3 6 0 M41 86 q3 3 6 0" stroke="#3f8fbd" stroke-width="3.5" fill="none" stroke-linecap="round"/>` +
    `<path d="M38 74 q-4 8 -1 13" stroke="#fdf6e6" stroke-width="5" fill="none" stroke-linecap="round"/>` +
    `<path d="M64 73 q4 8 1 13" stroke="#fdf6e6" stroke-width="5" fill="none" stroke-linecap="round"/>` +
    eye(38, 54) + eye(62, 54),
  );

  const set = {
    id: 'board-2',
    author: 'Claude',
    name: '实体棋盘复刻 · 第二版',
    note: '拆掉统一脸模：八只各有头轮廓和口鼻区，只共用眼睛和鼻嘴。象补了鼻子，狮改 14 个毛瓣，工字鼻换成鼻块加嘴弧，汉字移到头顶，陷阱和兽穴照参考图重画。',
    labelOnTop: true,
    palette: {
      grassMine: '#b9d641', grassMineAlt: '#aecb36',
      grassFoe: '#e8436b', grassFoeAlt: '#dd3a62',
      earth: '#f0913f', earthAlt: '#e5842f',
      water: '#6fc6e8', trapBg: '#f2b32c',
      // 参考图里兽穴格底是青色（和外框同色），不是淡绿淡粉
      denMineBg: '#12869c', denFoeBg: '#12869c',
      boardEdge: '#0e7a8f', card: '#f7eeb4',
      borderMine: '#2f6b1c', borderFoe: '#a81f42',
    },
    sprites: {
      rat, cat, dog, wolf, leopard, tiger, lion, elephant,

      /* 鳄鱼照参考图重画：大头在右、眼睛长在头顶、粉色嘴、两颗白牙、尾部黄刺。
         第一版是个扁长条加两只小眼，头完全没做出来。 */
      croc: svg(
        // 尾部黄刺
        `<path d="M6 54 h8 v9 h-8 Z M6 66 h8 v9 h-8 Z M6 78 h7 v8 h-7 Z" fill="#f2c72e"/>` +
        // 身体/尾巴
        `<rect x="10" y="56" width="46" height="20" rx="9" fill="#1d7a8c"/>` +
        // 大头
        `<path d="M40 34 q34 0 44 12 q8 10 -2 16 l-42 0 q-10 -8 -8 -16 q2 -12 8 -12 Z" fill="#1d7a8c"/>` +
        // 下颚
        `<path d="M44 62 q30 2 44 -2 q4 8 -4 12 l-36 0 q-6 -4 -4 -10 Z" fill="#15606f"/>` +
        // 粉色嘴
        `<ellipse cx="78" cy="59" rx="9" ry="5" fill="#e8457a"/>` +
        // 两颗白牙
        `<path d="M52 62 l5 9 l5 -9 Z M62 62 l5 9 l5 -9 Z" fill="#ffffff"/>` +
        // 眼睛长在头顶，两只大白眼
        `<circle cx="62" cy="34" r="10" fill="#eef7fa"/><circle cx="80" cy="35" r="10" fill="#eef7fa"/>` +
        `<path d="M54 32 q8 -6 16 0" stroke="#15606f" stroke-width="4" fill="none" stroke-linecap="round"/>` +
        `<circle cx="62" cy="36" r="4" fill="#15303a"/><circle cx="80" cy="37" r="4" fill="#15303a"/>` +
        // 鼻孔
        `<circle cx="30" cy="44" r="3.4" fill="#15303a"/><circle cx="39" cy="43" r="3.4" fill="#15303a"/>`),

      lily: svg(
        `<circle cx="50" cy="50" r="33" fill="#a8cc42"/>` +
        `<path d="M50 50 L50 17" stroke="#6fc6e8" stroke-width="8" stroke-linecap="round"/>` +
        `<path d="M50 50 L26 33 M50 50 L74 33 M50 50 L24 62 M50 50 L76 62 M50 50 L38 80 M50 50 L62 80"
          stroke="#8fb832" stroke-width="4" stroke-linecap="round"/>`),

      /* 陷阱照参考图：灰色 V 形夹口 + 白色尖齿 + 橙色诱饵条 + 两侧墨绿草叶 + 底部圆压盘。
         第一版画成上下对咬的齿列，是凭印象编的。 */
      trapFoe: svg(
        `<path d="M14 62 q6 -12 10 -22 M86 62 q-6 -12 -10 -22" stroke="#1d7a72" stroke-width="7" fill="none" stroke-linecap="round"/>` +
        `<path d="M10 52 q8 -6 12 -16 M90 52 q-8 -6 -12 -16" stroke="#1d7a72" stroke-width="6" fill="none" stroke-linecap="round"/>` +
        `<path d="M18 26 L82 26 L64 72 L36 72 Z" fill="#8d949c"/>` +
        `<path d="M24 38 l7 12 l6 -12 l7 12 l6 -12 l7 12 l6 -12 l7 12 l5 -12 Z" fill="#ffffff"/>` +
        `<rect x="44" y="32" width="12" height="36" rx="6" fill="#e8622c"/>` +
        `<circle cx="50" cy="80" r="8" fill="#6f767e"/>`),
      // 我方（绿营）的陷阱转 180 度，夹口朝向自己这边
      trapMine: svg(
        `<g transform="rotate(180 50 50)">` +
        `<path d="M14 62 q6 -12 10 -22 M86 62 q-6 -12 -10 -22" stroke="#1d7a72" stroke-width="7" fill="none" stroke-linecap="round"/>` +
        `<path d="M10 52 q8 -6 12 -16 M90 52 q-8 -6 -12 -16" stroke="#1d7a72" stroke-width="6" fill="none" stroke-linecap="round"/>` +
        `<path d="M18 26 L82 26 L64 72 L36 72 Z" fill="#8d949c"/>` +
        `<path d="M24 38 l7 12 l6 -12 l7 12 l6 -12 l7 12 l6 -12 l7 12 l5 -12 Z" fill="#ffffff"/>` +
        `<rect x="44" y="32" width="12" height="36" rx="6" fill="#e8622c"/>` +
        `<circle cx="50" cy="80" r="8" fill="#6f767e"/>` +
        `</g>`),

      /* 兽穴照参考图：拱门 + 白色十字窗 + 四角草叶，门色分敌我 */
      denMine: svg(
        `<path d="M8 26 q6 16 2 30 M92 26 q-6 16 -2 30" stroke="#0a6275" stroke-width="6" fill="none" stroke-linecap="round"/>` +
        `<path d="M50 12 q26 0 26 28 L76 90 L24 90 L24 40 q0 -28 26 -28 Z" fill="#9ec72e"/>` +
        `<path d="M50 12 v78" stroke="#7fa81f" stroke-width="4"/>` +
        `<circle cx="50" cy="48" r="16" fill="#fdfaf0"/>` +
        `<path d="M50 32 v32 M34 48 h32" stroke="#9ec72e" stroke-width="5"/>` +
        `<path d="M10 78 q8 -12 6 -22 M90 78 q-8 -12 -6 -22" stroke="#b8e04a" stroke-width="7" fill="none" stroke-linecap="round"/>`),
      denFoe: svg(
        `<path d="M8 26 q6 16 2 30 M92 26 q-6 16 -2 30" stroke="#0a6275" stroke-width="6" fill="none" stroke-linecap="round"/>` +
        `<path d="M50 12 q26 0 26 28 L76 90 L24 90 L24 40 q0 -28 26 -28 Z" fill="#e0245e"/>` +
        `<path d="M50 12 v78" stroke="#bb1a4c" stroke-width="4"/>` +
        `<circle cx="50" cy="48" r="16" fill="#fdfaf0"/>` +
        `<path d="M50 32 v32 M34 48 h32" stroke="#e0245e" stroke-width="5"/>` +
        `<path d="M10 78 q8 -12 6 -22 M90 78 q-8 -12 -6 -22" stroke="#b8e04a" stroke-width="7" fill="none" stroke-linecap="round"/>`),

      /* 橙格木纹，三种变体轮换 —— 每格一样会露出机械感 */
      wood0: svg(`<path d="M8 30 q42 -10 84 4 M6 58 q46 12 88 -4" stroke="#d1691f" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="66" cy="74" rx="9" ry="5" fill="none" stroke="#d1691f" stroke-width="4"/>`),
      wood1: svg(`<path d="M6 42 q44 14 88 -6 M10 72 q40 -12 80 2" stroke="#d1691f" stroke-width="5" fill="none" stroke-linecap="round"/><ellipse cx="30" cy="22" rx="8" ry="5" fill="none" stroke="#d1691f" stroke-width="4"/>`),
      wood2: svg(`<path d="M4 24 q48 16 92 -2 M8 54 q42 -14 84 6 M6 82 q46 10 88 -6" stroke="#d1691f" stroke-width="5" fill="none" stroke-linecap="round"/>`),
    },
  };

  window.SPRITE_SETS.push(set);
})();
