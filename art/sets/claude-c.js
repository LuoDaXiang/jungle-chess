/*
 * 第三批 5 套。原计划交给 Claude Design，但它产出的是设计画布，
 * 给不出画廊需要的 13 个 SVG 精灵数据，并排比不了。所以仍由 Claude 生成，
 * 但走五个和前两批都不重叠的方向。作者标注如实。
 */
(function () {
  window.SPRITE_SETS = window.SPRITE_SETS || [];
  const svg = (inner) => `<svg viewBox="0 0 100 100">${inner}</svg>`;

  // ---------------------------------------------------------------- 11 水墨写意

  /*
   * 一笔一个形。全部用粗到 10-16 单位的圆头笔画堆出来，不填色块。
   * 41px 下笔画本身就有 4-6px 宽，是所有方案里最抗缩小的。
   */
  const INK = '#2f3a33';
  const brush = (d, w, c) =>
    `<path d="${d}" stroke="${c || INK}" stroke-width="${w}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

  function inkFace(ears, accent, mark) {
    return svg(
      ears +
      brush('M22 52 a25 25 0 1 1 50 0 a25 25 0 1 1 -50 0', 9, accent) +
      (mark || '') +
      `<circle cx="37" cy="49" r="5" fill="${INK}"/><circle cx="57" cy="49" r="5" fill="${INK}"/>` +
      brush('M47 60 l0 5', 7)
    );
  }

  const set11 = {
    id: 'claude-11', author: 'Claude', name: '水墨写意',
    note: '不填色块，全部用 9-16 单位的粗笔画堆形。41px 下笔画仍有 4px 宽，最抗缩小。',
    palette: {
      grassMine: '#e4e9d5', grassMineAlt: '#dae0c7', grassFoe: '#eddad6', grassFoeAlt: '#e5cec9',
      earth: '#d8c3a5', earthAlt: '#ccb695', water: '#cfe0e6', trapBg: '#e8d9a8',
      denMineBg: '#d3e0c0', denFoeBg: '#eed8d2', boardEdge: '#8f8778', card: '#fdfbf4',
      borderMine: '#4a6b3f', borderFoe: '#a8453a',
    },
    sprites: {
      rat: inkFace(brush('M24 32 a13 13 0 1 1 1 0', 9, '#7b8a94') + brush('M71 32 a13 13 0 1 1 1 0', 9, '#7b8a94'), '#7b8a94'),
      cat: inkFace(brush('M27 42 L23 19 L44 33', 9, '#7a5f96') + brush('M67 42 L71 19 L50 33', 9, '#7a5f96'), '#7a5f96'),
      dog: inkFace(brush('M20 38 L20 68', 14, '#a8762f') + brush('M74 38 L74 68', 14, '#a8762f'), '#a8762f'),
      wolf: inkFace(brush('M28 40 L21 12 L45 31', 9, '#5a6d7c') + brush('M66 40 L73 12 L49 31', 9, '#5a6d7c'), '#5a6d7c'),
      leopard: inkFace(brush('M26 34 a10 10 0 1 1 1 0', 9, '#b07e26') + brush('M69 34 a10 10 0 1 1 1 0', 9, '#b07e26'), '#b07e26',
        `<circle cx="33" cy="37" r="5" fill="#b07e26"/><circle cx="62" cy="35" r="5" fill="#b07e26"/><circle cx="47" cy="31" r="5" fill="#b07e26"/>`),
      tiger: inkFace(brush('M26 32 a11 11 0 1 1 1 0', 9, '#bd5c22') + brush('M69 32 a11 11 0 1 1 1 0', 9, '#bd5c22'), '#bd5c22',
        brush('M36 33 l0 11', 6, '#bd5c22') + brush('M47 30 l0 12', 6, '#bd5c22') + brush('M58 33 l0 11', 6, '#bd5c22')),
      lion: inkFace(brush('M47 51 m-38 0 a38 38 0 1 1 76 0 a38 38 0 1 1 -76 0', 10, '#b08320') +
        brush('M12 32 L2 24 M82 32 L92 24 M12 70 L2 78 M82 70 L92 78', 8, '#b08320'), '#d09a2a'),
      elephant: inkFace(brush('M16 36 L16 68', 16, '#4d7f99') + brush('M78 36 L78 68', 16, '#4d7f99'), '#4d7f99',
        brush('M47 62 q0 22 -9 26', 11, '#4d7f99')),
      croc: svg(brush('M10 62 L90 62', 16, '#4e7a44') + brush('M32 47 a9 9 0 1 1 1 0', 8, '#4e7a44') + brush('M66 47 a9 9 0 1 1 1 0', 8, '#4e7a44') +
        `<circle cx="32" cy="47" r="4" fill="${INK}"/><circle cx="66" cy="47" r="4" fill="${INK}"/>`),
      lily: svg(brush('M50 50 m-28 0 a28 28 0 1 1 56 0 a28 28 0 1 1 -56 0', 10, '#6f9b58') + brush('M50 50 L50 20', 8, '#6f9b58')),
      trap: svg(brush('M28 28 L72 72 M72 28 L28 72', 11, '#9c7a20') + brush('M50 50 m-30 0 a30 30 0 1 1 60 0 a30 30 0 1 1 -60 0', 7, '#9c7a20')),
      denMine: svg(brush('M14 50 L50 16 L86 50', 11, '#4a6b3f') + brush('M24 50 L24 86 M76 50 L76 86 M24 86 L76 86', 10, '#4a6b3f')),
      denFoe: svg(brush('M14 50 L50 16 L86 50', 11, '#a8453a') + brush('M24 50 L24 86 M76 50 L76 86 M24 86 L76 86', 10, '#a8453a')),
    },
  };

  // ---------------------------------------------------------------- 12 夜光描边

  /*
   * 深色卡片 + 亮色描边。唯一一套反转明暗的方案：棋子是深底亮线，
   * 在浅色棋盘上像发光的牌子。对比度靠明暗反差，不靠色相。
   */
  function neon(ears, glow, mark) {
    return svg(
      `<rect x="4" y="4" width="92" height="92" rx="20" fill="#232a33"/>` +
      ears +
      `<circle cx="47" cy="52" r="25" fill="none" stroke="${glow}" stroke-width="6"/>` +
      (mark || '') +
      `<circle cx="38" cy="50" r="5" fill="${glow}"/><circle cx="56" cy="50" r="5" fill="${glow}"/>`
    );
  }
  const nStroke = (d, c, w) => `<path d="${d}" stroke="${c}" stroke-width="${w || 6}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;

  const set12 = {
    id: 'claude-12', author: 'Claude', name: '夜光描边',
    note: '唯一反转明暗的一套：深底亮线，在浅棋盘上像发光的牌子。靠明暗差不靠色相。',
    palette: {
      grassMine: '#cfe4a0', grassMineAlt: '#c3da91', grassFoe: '#f4aeae', grassFoeAlt: '#eea1a1',
      earth: '#d3945c', earthAlt: '#c88a51', water: '#9ad4ef', trapBg: '#f2c25a',
      denMineBg: '#a9dc8e', denFoeBg: '#f7c4c1', boardEdge: '#3b4450', card: '#232a33',
      borderMine: '#7ee08a', borderFoe: '#ff8b7a',
    },
    sprites: {
      rat: neon(nStroke('M24 32 a12 12 0 1 1 1 0 M70 32 a12 12 0 1 1 1 0', '#9fd2e8'), '#9fd2e8'),
      cat: neon(nStroke('M28 42 L24 20 L44 33 M66 42 L70 20 L50 33', '#c9a6f0'), '#c9a6f0'),
      dog: neon(nStroke('M21 40 L21 66 M73 40 L73 66', '#f5c46a', 10), '#f5c46a'),
      wolf: neon(nStroke('M29 40 L22 12 L45 30 M65 40 L72 12 L49 30', '#9ab6d4'), '#9ab6d4'),
      leopard: neon(nStroke('M26 34 a10 10 0 1 1 1 0 M68 34 a10 10 0 1 1 1 0', '#f0c060'), '#f0c060',
        `<circle cx="34" cy="38" r="4.5" fill="#f0c060"/><circle cx="61" cy="36" r="4.5" fill="#f0c060"/><circle cx="47" cy="32" r="4.5" fill="#f0c060"/>`),
      tiger: neon(nStroke('M26 32 a11 11 0 1 1 1 0 M68 32 a11 11 0 1 1 1 0', '#ff9d5c'), '#ff9d5c',
        nStroke('M37 34 v10 M47 32 v11 M57 34 v10', '#ff9d5c', 5)),
      lion: neon(nStroke('M47 52 m-37 0 a37 37 0 1 1 74 0 a37 37 0 1 1 -74 0', '#ffd166', 6) +
        nStroke('M10 34 L2 28 M84 34 L92 28 M10 70 L2 76 M84 70 L92 76', '#ffd166'), '#ffd166'),
      elephant: neon(nStroke('M16 38 L16 66 M78 38 L78 66', '#7fd4f0', 12), '#7fd4f0',
        nStroke('M47 64 q0 20 -9 24', '#7fd4f0', 8)),
      croc: svg(`<rect x="4" y="40" width="92" height="42" rx="18" fill="#232a33"/>` +
        nStroke('M12 62 L88 62', '#8ce08a', 8) + nStroke('M34 48 a8 8 0 1 1 1 0 M66 48 a8 8 0 1 1 1 0', '#8ce08a')),
      lily: svg(nStroke('M50 50 m-27 0 a27 27 0 1 1 54 0 a27 27 0 1 1 -54 0', '#2f4a3a', 8) +
        nStroke('M50 50 m-27 0 a27 27 0 1 1 54 0 a27 27 0 1 1 -54 0', '#9ae8b0', 5)),
      trap: svg(nStroke('M30 30 L70 70 M70 30 L30 70', '#5a3f08', 9) + nStroke('M50 50 m-28 0 a28 28 0 1 1 56 0 a28 28 0 1 1 -56 0', '#5a3f08', 6)),
      denMine: svg(`<path d="M50 14 L86 48 L86 88 L14 88 L14 48 Z" fill="#232a33"/>` + nStroke('M32 60 L32 88 M68 60 L68 88 M32 60 L68 60', '#7ee08a')),
      denFoe: svg(`<path d="M50 14 L86 48 L86 88 L14 88 L14 48 Z" fill="#232a33"/>` + nStroke('M32 60 L32 88 M68 60 L68 88 M32 60 L68 60', '#ff8b7a')),
    },
  };

  // ---------------------------------------------------------------- 13 圆点拼图

  /*
   * 全部由圆点组成，像磁力珠拼出来的。没有任何线和多边形。
   * 点直径一律 >= 9，缩到 24px 也不会糊成一团。
   */
  const dot = (x, y, r, c) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
  function dots(list, main) {
    return svg(list.map(([x, y, r, c]) => dot(x, y, r, c || main)).join(''));
  }
  const FACE13 = (m, l) => [
    [47, 52, 27, m],
    [37, 48, 6, '#33302c'], [57, 48, 6, '#33302c'],
    [47, 62, 10, l], [47, 60, 4.5, '#33302c'],
  ];

  const set13 = {
    id: 'claude-13', author: 'Claude', name: '圆点拼图',
    note: '全部由圆点组成，像磁力珠拼的。没有线也没有多边形，点直径一律不小于 9。',
    palette: {
      grassMine: '#d2e6b4', grassMineAlt: '#c7dca6', grassFoe: '#f3bdbd', grassFoeAlt: '#ecb0b0',
      earth: '#d8a878', earthAlt: '#cc9c6b', water: '#a0d6ea', trapBg: '#f0c86e',
      denMineBg: '#b8e0a0', denFoeBg: '#f8d0cb', boardEdge: '#9b7a58', card: '#fffaea',
      borderMine: '#3f8f36', borderFoe: '#cf3a34',
    },
    sprites: {
      rat: dots([[22, 30, 16, '#9aa3b3'], [72, 30, 16, '#9aa3b3'], ...FACE13('#aab3c2', '#e4e8ee')]),
      cat: dots([[25, 32, 12, '#8f6cbd'], [69, 32, 12, '#8f6cbd'], ...FACE13('#a786cc', '#eadff5')]),
      dog: dots([[19, 54, 13, '#c98733'], [75, 54, 13, '#c98733'], [19, 66, 10, '#c98733'], [75, 66, 10, '#c98733'], ...FACE13('#e3a34c', '#fbeed6')]),
      wolf: dots([[27, 30, 11, '#67798a'], [22, 18, 8, '#67798a'], [67, 30, 11, '#67798a'], [72, 18, 8, '#67798a'], ...FACE13('#8b9dad', '#e6ecf2')]),
      leopard: dots([[25, 33, 11, '#c98d22'], [69, 33, 11, '#c98d22'], ...FACE13('#f0b757', '#fdf0d8'),
        [33, 40, 5.5, '#8a5a12'], [61, 38, 5.5, '#8a5a12'], [47, 33, 5.5, '#8a5a12']]),
      tiger: dots([[25, 31, 12, '#d4611c'], [69, 31, 12, '#d4611c'], ...FACE13('#f89052', '#fff1e0'),
        [36, 36, 5, '#a8410e'], [47, 33, 5, '#a8410e'], [58, 36, 5, '#a8410e']]),
      lion: dots([[47, 52, 40, '#c98a1e'], [10, 30, 10, '#c98a1e'], [84, 30, 10, '#c98a1e'],
        [10, 74, 10, '#c98a1e'], [84, 74, 10, '#c98a1e'], [47, 8, 10, '#c98a1e'], ...FACE13('#f0bb46', '#fdf0d8')]),
      elephant: dots([[14, 52, 17, '#5896bb'], [80, 52, 17, '#5896bb'], ...FACE13('#7ab6d9', '#dff0f9'),
        [45, 74, 9, '#5896bb'], [42, 86, 8, '#5896bb']]),
      croc: dots([[20, 62, 14, '#4f8f3a'], [38, 62, 15, '#4f8f3a'], [58, 62, 15, '#4f8f3a'], [78, 62, 13, '#4f8f3a'],
        [36, 46, 10, '#4f8f3a'], [66, 46, 10, '#4f8f3a'], [36, 46, 4.5, '#2b3a24'], [66, 46, 4.5, '#2b3a24']]),
      lily: dots([[50, 50, 30, '#6fb45c'], [50, 50, 12, '#f2a6c8'], [50, 22, 7, '#6fb45c']]),
      trap: dots([[50, 50, 30, '#8a5a10'], [50, 50, 14, '#f0c86e'], [50, 26, 6, '#8a5a10'], [50, 74, 6, '#8a5a10'], [26, 50, 6, '#8a5a10'], [74, 50, 6, '#8a5a10']]),
      denMine: dots([[50, 46, 34, '#35722d'], [50, 70, 26, '#35722d'], [50, 68, 13, '#1d4d19']]),
      denFoe: dots([[50, 46, 34, '#b83a30'], [50, 70, 26, '#b83a30'], [50, 68, 13, '#7d1a15']]),
    },
  };

  // ---------------------------------------------------------------- 14 民间剪纸

  /*
   * 单色剪纸。每只动物只有一种颜色，靠镂空的白缝表达内部结构，
   * 像窗花。颜色只区分敌我阵营，动物之间纯靠轮廓 —— 剪影测试的极端版本。
   */
  function paper(color, shape) {
    return svg(shape.replace(/__C__/g, color));
  }
  const cut = (d) => `<path d="${d}" fill="__C__" fill-rule="evenodd"/>`;

  const set14 = {
    id: 'claude-14', author: 'Claude', name: '民间剪纸',
    note: '单色窗花。动物之间纯靠轮廓区分，颜色只分敌我 —— 剪影测试的极端版本。',
    palette: {
      grassMine: '#e8ead9', grassMineAlt: '#dee1cc', grassFoe: '#f0e0dc', grassFoeAlt: '#e7d4cf',
      earth: '#ddcdb4', earthAlt: '#d2c1a6', water: '#cddfe4', trapBg: '#ecdcae',
      denMineBg: '#d8e3c8', denFoeBg: '#f0dcd6', boardEdge: '#8c8375', card: '#fffdf6',
      borderMine: '#2f6b28', borderFoe: '#b23a30',
    },
    sprites: {
      rat: paper('#c0392b', `<circle cx="22" cy="30" r="16" fill="__C__"/><circle cx="72" cy="30" r="16" fill="__C__"/><circle cx="47" cy="54" r="27" fill="__C__"/><circle cx="37" cy="50" r="6" fill="#fffdf6"/><circle cx="57" cy="50" r="6" fill="#fffdf6"/><ellipse cx="47" cy="66" rx="9" ry="6" fill="#fffdf6"/>`),
      cat: paper('#c0392b', `<path d="M27 44 L22 18 L45 33 Z" fill="__C__"/><path d="M67 44 L72 18 L49 33 Z" fill="__C__"/><circle cx="47" cy="54" r="27" fill="__C__"/><circle cx="37" cy="50" r="6" fill="#fffdf6"/><circle cx="57" cy="50" r="6" fill="#fffdf6"/><ellipse cx="47" cy="66" rx="9" ry="6" fill="#fffdf6"/>`),
      dog: paper('#c0392b', `<ellipse cx="19" cy="54" rx="12" ry="21" fill="__C__"/><ellipse cx="75" cy="54" rx="12" ry="21" fill="__C__"/><circle cx="47" cy="54" r="26" fill="__C__"/><circle cx="37" cy="50" r="6" fill="#fffdf6"/><circle cx="57" cy="50" r="6" fill="#fffdf6"/><ellipse cx="47" cy="66" rx="9" ry="6" fill="#fffdf6"/>`),
      wolf: paper('#c0392b', `<path d="M29 42 L21 8 L47 31 Z" fill="__C__"/><path d="M65 42 L73 8 L47 31 Z" fill="__C__"/><circle cx="47" cy="56" r="26" fill="__C__"/><circle cx="37" cy="52" r="6" fill="#fffdf6"/><circle cx="57" cy="52" r="6" fill="#fffdf6"/><path d="M39 68 L55 68 L47 78 Z" fill="#fffdf6"/>`),
      leopard: paper('#c0392b', `<circle cx="25" cy="33" r="12" fill="__C__"/><circle cx="69" cy="33" r="12" fill="__C__"/><circle cx="47" cy="54" r="27" fill="__C__"/><circle cx="33" cy="40" r="5.5" fill="#fffdf6"/><circle cx="61" cy="38" r="5.5" fill="#fffdf6"/><circle cx="47" cy="33" r="5.5" fill="#fffdf6"/><circle cx="37" cy="54" r="5.5" fill="#fffdf6"/><circle cx="57" cy="54" r="5.5" fill="#fffdf6"/><ellipse cx="47" cy="68" rx="8" ry="5" fill="#fffdf6"/>`),
      tiger: paper('#c0392b', `<circle cx="25" cy="31" r="13" fill="__C__"/><circle cx="69" cy="31" r="13" fill="__C__"/><circle cx="47" cy="55" r="28" fill="__C__"/><path d="M34 34 v12 M47 31 v13 M60 34 v12" stroke="#fffdf6" stroke-width="6" stroke-linecap="round"/><circle cx="37" cy="55" r="6" fill="#fffdf6"/><circle cx="57" cy="55" r="6" fill="#fffdf6"/><ellipse cx="47" cy="70" rx="8" ry="5" fill="#fffdf6"/>`),
      lion: paper('#c0392b', `<circle cx="47" cy="52" r="40" fill="__C__"/><circle cx="47" cy="52" r="40" fill="none" stroke="#fffdf6" stroke-width="6" stroke-dasharray="13 9"/><circle cx="47" cy="54" r="23" fill="__C__"/><circle cx="38" cy="50" r="6" fill="#fffdf6"/><circle cx="56" cy="50" r="6" fill="#fffdf6"/><ellipse cx="47" cy="65" rx="8" ry="5" fill="#fffdf6"/>`),
      elephant: paper('#c0392b', `<ellipse cx="14" cy="50" rx="15" ry="25" fill="__C__"/><ellipse cx="80" cy="50" rx="15" ry="25" fill="__C__"/><circle cx="47" cy="50" r="24" fill="__C__"/><path d="M47 60 q0 24 -10 28" stroke="__C__" stroke-width="12" fill="none" stroke-linecap="round"/><circle cx="38" cy="46" r="6" fill="#fffdf6"/><circle cx="56" cy="46" r="6" fill="#fffdf6"/>`),
      croc: paper('#2f6b28', `<ellipse cx="50" cy="62" rx="42" ry="14" fill="__C__"/><path d="M12 50 l9 -9 l9 9 l9 -9 l9 9" stroke="__C__" stroke-width="6" fill="none" stroke-linejoin="round"/><circle cx="36" cy="46" r="10" fill="__C__"/><circle cx="66" cy="46" r="10" fill="__C__"/><circle cx="36" cy="46" r="4.5" fill="#cddfe4"/><circle cx="66" cy="46" r="4.5" fill="#cddfe4"/>`),
      lily: paper('#2f6b28', `<circle cx="50" cy="50" r="31" fill="__C__"/><path d="M50 50 L50 19" stroke="#cddfe4" stroke-width="7"/><circle cx="50" cy="50" r="11" fill="#cddfe4"/>`),
      trap: paper('#8a5a10', `<circle cx="50" cy="50" r="30" fill="__C__"/><path d="M30 30 L70 70 M70 30 L30 70" stroke="#ecdcae" stroke-width="9" stroke-linecap="round"/>`),
      denMine: paper('#2f6b28', `<path d="M50 14 L86 48 L86 88 L14 88 L14 48 Z" fill="__C__"/><rect x="37" y="58" width="26" height="30" rx="5" fill="#d8e3c8"/>`),
      denFoe: paper('#b23a30', `<path d="M50 14 L86 48 L86 88 L14 88 L14 48 Z" fill="__C__"/><rect x="37" y="58" width="26" height="30" rx="5" fill="#f0dcd6"/>`),
    },
  };

  // ---------------------------------------------------------------- 15 毛绒玩偶

  /*
   * 最圆最软的一套。所有角都圆到极限，加一圈缝线暗示布料。
   * 幼态特征推到最满：头占满整格，眼睛最大，鼻子最小。
   */
  function plush(ears, main, light, mark) {
    return svg(
      ears +
      `<circle cx="47" cy="52" r="31" fill="${main}"/>` +
      `<circle cx="47" cy="52" r="31" fill="none" stroke="${light}" stroke-width="4" stroke-dasharray="5 6" stroke-linecap="round"/>` +
      `<ellipse cx="47" cy="64" rx="17" ry="12" fill="${light}"/>` +
      (mark || '') +
      `<circle cx="35" cy="48" r="7.5" fill="#3a322c"/><circle cx="59" cy="48" r="7.5" fill="#3a322c"/>` +
      `<ellipse cx="47" cy="60" rx="5" ry="4" fill="#3a322c"/>`
    );
  }
  const pEar = (c, l) =>
    `<circle cx="21" cy="30" r="15" fill="${c}"/><circle cx="73" cy="30" r="15" fill="${c}"/>` +
    `<circle cx="21" cy="30" r="7" fill="${l}"/><circle cx="73" cy="30" r="7" fill="${l}"/>`;

  const set15 = {
    id: 'claude-15', author: 'Claude', name: '毛绒玩偶',
    note: '最圆最软。一圈缝线暗示布料，幼态特征推满：头占满格、眼睛最大、鼻子最小。',
    palette: {
      grassMine: '#dcebc0', grassMineAlt: '#d2e3b2', grassFoe: '#f7c9c5', grassFoeAlt: '#f0bcb7',
      earth: '#e0b48c', earthAlt: '#d5a87f', water: '#aadcee', trapBg: '#f5cf82',
      denMineBg: '#bfe5a8', denFoeBg: '#fbd7d2', boardEdge: '#b08f6e', card: '#fffdf2',
      borderMine: '#4d9642', borderFoe: '#d4544a',
    },
    sprites: {
      rat: plush(pEar('#aab3c2', '#e0c4cc'), '#b8c0cc', '#eef0f4'),
      cat: plush(`<path d="M26 42 L22 20 L44 33 Z" fill="#b795d8"/><path d="M68 42 L72 20 L50 33 Z" fill="#b795d8"/><path d="M28 40 L26 28 L38 34 Z" fill="#e8d5f5"/><path d="M66 40 L68 28 L56 34 Z" fill="#e8d5f5"/>`, '#c1a4de', '#f2e9fa'),
      dog: plush(`<ellipse cx="18" cy="54" rx="12" ry="21" fill="#d99a44"/><ellipse cx="76" cy="54" rx="12" ry="21" fill="#d99a44"/>`, '#eab469', '#fdf2dd'),
      wolf: plush(`<path d="M28 40 L21 11 L46 30 Z" fill="#8b9dad"/><path d="M66 40 L73 11 L48 30 Z" fill="#8b9dad"/><path d="M30 38 L26 20 L40 31 Z" fill="#d8e2ea"/><path d="M64 38 L68 20 L54 31 Z" fill="#d8e2ea"/>`, '#9fb0bf', '#e9eff4'),
      leopard: plush(pEar('#e9a33b', '#f7ddb0'), '#f2bd68', '#fdf2e0',
        `<circle cx="33" cy="38" r="5.5" fill="#a8701a"/><circle cx="61" cy="36" r="5.5" fill="#a8701a"/><circle cx="47" cy="32" r="5.5" fill="#a8701a"/>`),
      tiger: plush(pEar('#f07a35', '#fbd0b4'), '#f89963', '#fff2e6',
        `<path d="M35 34 v11 M47 31 v12 M59 34 v11" stroke="#b8481a" stroke-width="6" stroke-linecap="round"/>`),
      lion: plush(`<circle cx="47" cy="52" r="42" fill="#d99b25"/><circle cx="47" cy="52" r="42" fill="none" stroke="#f5d98a" stroke-width="5" stroke-dasharray="12 9"/>`, '#f0bb46', '#fdf2dd'),
      elephant: plush(`<ellipse cx="13" cy="50" rx="16" ry="25" fill="#6aa8cc"/><ellipse cx="81" cy="50" rx="16" ry="25" fill="#6aa8cc"/><ellipse cx="13" cy="50" rx="8" ry="14" fill="#cfe8f4"/><ellipse cx="81" cy="50" rx="8" ry="14" fill="#cfe8f4"/>`, '#89c0dd', '#e4f2f9',
        `<path d="M47 64 q0 22 -10 26" stroke="#6aa8cc" stroke-width="12" fill="none" stroke-linecap="round"/>`),
      croc: svg(`<ellipse cx="50" cy="62" rx="41" ry="15" fill="#63ab4f"/><ellipse cx="50" cy="62" rx="41" ry="15" fill="none" stroke="#bfe5a8" stroke-width="4" stroke-dasharray="5 6"/><circle cx="36" cy="46" r="11" fill="#63ab4f"/><circle cx="66" cy="46" r="11" fill="#63ab4f"/><circle cx="36" cy="46" r="5" fill="#3a322c"/><circle cx="66" cy="46" r="5" fill="#3a322c"/>`),
      lily: svg(`<circle cx="50" cy="50" r="31" fill="#7cc06a"/><circle cx="50" cy="50" r="31" fill="none" stroke="#d6f0c8" stroke-width="4" stroke-dasharray="5 6"/><circle cx="50" cy="50" r="12" fill="#f7b8d4"/>`),
      trap: svg(`<circle cx="50" cy="50" r="30" fill="#c79425"/><circle cx="50" cy="50" r="30" fill="none" stroke="#fbe6b4" stroke-width="4" stroke-dasharray="5 6"/><path d="M31 31 L69 69 M69 31 L31 69" stroke="#7d5a10" stroke-width="8" stroke-linecap="round"/>`),
      denMine: svg(`<path d="M50 14 L86 48 L86 88 L14 88 L14 48 Z" fill="#4d9642"/><path d="M50 14 L86 48 L86 88 L14 88 L14 48 Z" fill="none" stroke="#c9ebb6" stroke-width="4" stroke-dasharray="5 6" stroke-linejoin="round"/><rect x="37" y="58" width="26" height="30" rx="8" fill="#2b6423"/>`),
      denFoe: svg(`<path d="M50 14 L86 48 L86 88 L14 88 L14 48 Z" fill="#d4544a"/><path d="M50 14 L86 48 L86 88 L14 88 L14 48 Z" fill="none" stroke="#fbd7d2" stroke-width="4" stroke-dasharray="5 6" stroke-linejoin="round"/><rect x="37" y="58" width="26" height="30" rx="8" fill="#8f251d"/>`),
    },
  };

  window.SPRITE_SETS.push(set11, set12, set13, set14, set15);
})();
