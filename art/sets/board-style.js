/*
 * 参照实体棋盘照片重建的一套。不是描摹 —— 那张照片是商品美术，有版权；
 * 这里复刻的是它的「画法系统」，形状和坐标全部重新定。
 *
 * 从照片里拆出来的系统（放大三倍看出来的，不是推理出来的）：
 *   1. 眼睛是极小的纯黑圆点，没有眼白。可爱来自反差，不是大眼睛。
 *   2. 口鼻是一大块浅色圆盘，占脸的 40% 以上 —— 全图第二大的形状。
 *   3. 鼻子是一个粗黑的「工」字标记，不是小椭圆。
 *   4. 胡须存在，三根粗短黑线，压在浅色口鼻上所以看得清。
 *   5. 头偏向一侧，另一侧留给竖排汉字，不是压在角上。
 *   6. 耳朵是唯一的区分手段。
 *
 * 颜色不照抄照片：那张照片室内暖光偏色，采出来发浑。取同色系的干净饱和值。
 *
 * 画布 0 0 100 100，动物占 x=4..74，右边 74..100 留给汉字。
 */
(function () {
  window.SPRITE_SETS = window.SPRITE_SETS || [];
  const svg = (inner) => `<svg viewBox="0 0 100 100">${inner}</svg>`;

  const INK = '#231d17';
  const CX = 39, CY = 50;          // 头心，偏左让出汉字条
  const HEAD = 34;                 // 头半径
  const MX = 38, MY = 62;          // 口鼻盘中心，比参考图更靠下
  const MRX = 26, MRY = 20;        // 放大：参考图里它是全脸第二大的形状
  const EYE_Y = 46, EYE_L = 27, EYE_R = 49, EYE_R2 = 5.2;  // 上移到口鼻上沿之上

  /* 「工」字鼻：一横一竖，全是粗块，41px 下还有 2px 宽 */
  const nose = () =>
    `<rect x="${MX - 6}" y="${MY - 2}" width="12" height="5" rx="2.5" fill="${INK}"/>` +
    `<rect x="${MX - 2.5}" y="${MY - 2}" width="5" height="11" rx="2.5" fill="${INK}"/>`;

  /* 胡须：压在浅色口鼻上，所以三根粗线也不会糊 */
  const whiskers = () =>
    `<path d="M13 60 h9 M13 69 h9 M63 60 h-9 M63 69 h-9"
      stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`;

  /* 一张脸 = 耳朵 + 圆头 + 浅口鼻 + 两点眼 + 工字鼻 (+ 可选花纹/胡须) */
  function face(ears, head, muzzle, extra, wh) {
    return svg(
      ears +
      `<rect x="${CX - HEAD}" y="${CY - HEAD}" width="${HEAD * 2}" height="${HEAD * 2}" rx="${HEAD * 0.82}" fill="${head}"/>` +
      (extra || '') +
      `<ellipse cx="${MX}" cy="${MY}" rx="${MRX}" ry="${MRY}" fill="${muzzle}"/>` +
      (wh ? whiskers() : '') +
      `<circle cx="${EYE_L}" cy="${EYE_Y}" r="${EYE_R2}" fill="${INK}"/>` +
      `<circle cx="${EYE_R}" cy="${EYE_Y}" r="${EYE_R2}" fill="${INK}"/>` +
      nose()
    );
  }

  const PINK = '#e86a86';          // 内耳粉，照片里每只都有
  const earRound = (c, r, cy, dx) => {
    const x = CX - (dx || 28), y = CX + (dx || 28);
    return `<circle cx="${x}" cy="${cy}" r="${r}" fill="${c}"/><circle cx="${y}" cy="${cy}" r="${r}" fill="${c}"/>` +
      `<circle cx="${x}" cy="${cy}" r="${r * 0.42}" fill="${PINK}"/><circle cx="${y}" cy="${cy}" r="${r * 0.42}" fill="${PINK}"/>`;
  };

  const set = {
    id: 'board-1',
    author: 'Claude',
    name: '实体棋盘复刻',
    note: '照着你那张实体棋盘拆出画法重建：针尖眼、大浅口鼻、工字鼻、粗胡须、耳朵区分。颜色取同色系干净饱和值，不照抄照片偏色。',
    pieceStyle: 'sideLabel',   // 汉字竖排在右边一条，不压在角上
    palette: {
      grassMine: '#b9d641', grassMineAlt: '#aecb36',   // 我方：亮柠檬绿
      grassFoe: '#e8436b', grassFoeAlt: '#dd3a62',     // 敌方：热粉
      earth: '#f0913f', earthAlt: '#e5842f',           // 河两侧：橙木纹
      water: '#6fc6e8', trapBg: '#f2b32c',
      denMineBg: '#8cc63f', denFoeBg: '#e8436b',
      boardEdge: '#0e7a8f', card: '#f7eeb4',
      borderMine: '#3c7a1e', borderFoe: '#a81f42',
    },
    sprites: {
      rat: face(earRound('#9b9aa6', 21, 21, 31), '#b4b2be', '#f2eef2', '', true),
      cat: face(
        `<path d="M14 36 L10 4 L38 24 Z" fill="#9b7ec4"/><path d="M64 36 L68 4 L40 24 Z" fill="#9b7ec4"/>` +
        `<path d="M17 31 L15 14 L29 24 Z" fill="${PINK}"/><path d="M61 31 L63 14 L49 24 Z" fill="${PINK}"/>`,
        '#ad8fd4', '#f4eefb', '', true),
      dog: face(
        `<ellipse cx="${CX - 32}" cy="56" rx="13" ry="25" fill="#d88f34"/><ellipse cx="${CX + 32}" cy="56" rx="13" ry="25" fill="#d88f34"/>`,
        '#eeab52', '#fdf3dc', '', true),
      wolf: face(
        `<path d="M19 34 L11 0 L34 22 Z" fill="#6d8091"/><path d="M59 34 L67 0 L44 22 Z" fill="#6d8091"/>` +
        `<path d="M21 30 L16 10 L30 22 Z" fill="#4f5f6d"/><path d="M57 30 L62 10 L48 22 Z" fill="#4f5f6d"/>`,
        '#8698a8', '#eef3f7', '', true),
      leopard: face(earRound('#d9902a', 11, 30, 25), '#f0b757', '#fdf2dd',
        `<circle cx="22" cy="34" r="5.5" fill="#8a5310"/><circle cx="56" cy="31" r="5.5" fill="#8a5310"/><circle cx="39" cy="25" r="5.5" fill="#8a5310"/>`,
        true),
      tiger: face(earRound('#dd6a22', 15, 26, 28), '#f4813a', '#fffaf0',
        `<path d="M27 22 v13 M39 19 v14 M51 22 v13" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>` +
        `<path d="M9 44 h9 M9 54 h9 M69 44 h-9 M69 54 h-9" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>`,
        false),
      lion: face(
        // 鬃毛：一圈带齿的深橙环，照片里是扇形刻痕
        `<circle cx="${CX}" cy="${CY}" r="40" fill="#c9491f"/>` +
        `<circle cx="${CX}" cy="${CY}" r="40" fill="none" stroke="#e8622c" stroke-width="7" stroke-dasharray="9 7"/>`,
        '#e0a13c', '#fff6e2', '', false),
      elephant: face(
        `<ellipse cx="${CX - 31}" cy="50" rx="14" ry="24" fill="#3f8fbd"/><ellipse cx="${CX + 31}" cy="50" rx="14" ry="24" fill="#3f8fbd"/>` +
        `<ellipse cx="${CX - 31}" cy="50" rx="6" ry="12" fill="${PINK}"/><ellipse cx="${CX + 31}" cy="50" rx="6" ry="12" fill="${PINK}"/>`,
        '#63b0d8', '#e3f2fa',
        '', false),
      croc: svg(
        `<ellipse cx="50" cy="60" rx="43" ry="14" fill="#4aa83f"/>` +
        `<path d="M10 48 l8 -9 l8 9 l8 -9 l8 9 l8 -9 l8 9" stroke="#3a8c31" stroke-width="6" fill="none" stroke-linejoin="round"/>` +
        `<ellipse cx="70" cy="62" rx="26" ry="12" fill="#5cbd4c"/>` +
        `<circle cx="62" cy="46" r="10" fill="#5cbd4c"/><circle cx="82" cy="46" r="10" fill="#5cbd4c"/>` +
        `<circle cx="62" cy="46" r="5" fill="#fff"/><circle cx="82" cy="46" r="5" fill="#fff"/>` +
        `<circle cx="62" cy="47" r="2.6" fill="${INK}"/><circle cx="82" cy="47" r="2.6" fill="${INK}"/>` +
        `<path d="M46 66 l6 6 l6 -6 l6 6 l6 -6" stroke="#fff" stroke-width="5" fill="none" stroke-linejoin="round"/>`),
      lily: svg(
        `<circle cx="50" cy="50" r="33" fill="#a8cc42"/>` +
        `<path d="M50 50 L50 17" stroke="#6fc6e8" stroke-width="8" stroke-linecap="round"/>` +
        `<path d="M50 50 L26 33 M50 50 L74 33 M50 50 L24 62 M50 50 L76 62 M50 50 L38 80 M50 50 L62 80"
          stroke="#8fb832" stroke-width="4" stroke-linecap="round"/>`),
      trap: svg(
        // 一副张开的捕兽夹：上下两排白尖齿对咬，中间橙色踏板
        `<path d="M12 26 h76 v10 h-76 Z" fill="#8d949c"/>` +
        `<path d="M18 36 l8 14 l8 -14 l8 14 l8 -14 l8 14 l8 -14 l8 14 l8 -14 Z" fill="#ffffff"/>` +
        `<path d="M12 84 h76 v-10 h-76 Z" fill="#8d949c"/>` +
        `<path d="M18 74 l8 -14 l8 14 l8 -14 l8 14 l8 -14 l8 14 l8 -14 l8 14 Z" fill="#ffffff"/>` +
        `<rect x="40" y="50" width="20" height="10" rx="5" fill="#e8622c"/>`),
      denMine: svg(
        `<path d="M50 10 L88 44 L88 88 L12 88 L12 44 Z" fill="#3c7a1e"/>` +
        `<path d="M50 10 L88 44 L12 44 Z" fill="#59a32c"/>` +
        `<circle cx="50" cy="66" r="15" fill="#f7eeb4"/>` +
        `<path d="M50 51 v30 M35 66 h30" stroke="#3c7a1e" stroke-width="5"/>`),
      denFoe: svg(
        `<path d="M50 10 L88 44 L88 88 L12 88 L12 44 Z" fill="#a81f42"/>` +
        `<path d="M50 10 L88 44 L12 44 Z" fill="#d13a5e"/>` +
        `<circle cx="50" cy="66" r="15" fill="#f7eeb4"/>` +
        `<path d="M50 51 v30 M35 66 h30" stroke="#a81f42" stroke-width="5"/>`),
    },
  };

  window.SPRITE_SETS.push(set);
})();
