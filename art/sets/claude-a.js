/*
 * Claude 第 1、2 套。
 *
 * 每套由一个「风格渲染器」生成：八只动物共用同一套骨架和参数，只换耳朵形状、
 * 主色和一个记号。一套之内的统一性因此是构造出来的，不是靠逐个对齐眼睛位置。
 *
 * 全部按 41px 设计。stroke 一律 >= 4 单位（41px 下约 1.6px）。
 * 右下角 x=68..100 y=68..100 留给汉字，不放识别特征。
 */
(function () {
  window.SPRITE_SETS = window.SPRITE_SETS || [];

  const svg = (inner) => `<svg viewBox="0 0 100 100">${inner}</svg>`;

  // ---------------------------------------------------------------- 第 1 套

  /*
   * 圆脸卡通。幼态特征拉满：大圆头、大眼、宽眼距、眼睛偏低、没有嘴。
   * 区分完全靠耳朵剪影，颜色只是辅助。
   */
  const A = {
    ink: '#3b302a',
    cx: 46, cy: 50, r: 30,
    eyeL: 35, eyeR: 57, eyeY: 50, eyeR2: 6.5, pupil: 3.6,
  };

  function faceA(main, light, ears, mark) {
    return svg(
      ears +
      `<circle cx="${A.cx}" cy="${A.cy}" r="${A.r}" fill="${main}"/>` +
      `<ellipse cx="${A.cx}" cy="${A.cy + 13}" rx="15" ry="11" fill="${light}"/>` +
      (mark || '') +
      `<circle cx="${A.eyeL}" cy="${A.eyeY}" r="${A.eyeR2}" fill="#fff"/>` +
      `<circle cx="${A.eyeR}" cy="${A.eyeY}" r="${A.eyeR2}" fill="#fff"/>` +
      `<circle cx="${A.eyeL}" cy="${A.eyeY}" r="${A.pupil}" fill="${A.ink}"/>` +
      `<circle cx="${A.eyeR}" cy="${A.eyeY}" r="${A.pupil}" fill="${A.ink}"/>` +
      `<ellipse cx="${A.cx}" cy="${A.cy + 9}" rx="5" ry="4" fill="${A.ink}"/>`
    );
  }

  const earRound = (c, r, y) =>
    `<circle cx="20" cy="${y}" r="${r}" fill="${c}"/><circle cx="72" cy="${y}" r="${r}" fill="${c}"/>`;
  const earTri = (c, h) =>
    `<path d="M24 ${40 - h} L20 ${14} L42 ${30} Z" fill="${c}"/>` +
    `<path d="M68 ${40 - h} L72 ${14} L50 ${30} Z" fill="${c}"/>`;
  const earDrop = (c) =>
    `<ellipse cx="17" cy="52" rx="11" ry="19" fill="${c}"/>` +
    `<ellipse cx="75" cy="52" rx="11" ry="19" fill="${c}"/>`;

  const setA1 = {
    id: 'claude-1',
    author: 'Claude',
    name: '圆脸卡通',
    note: '幼态特征拉满：大圆头、大眼、宽眼距、没有嘴。八只全靠耳朵剪影区分。',
    palette: {
      grassMine: '#cfe4a0', grassMineAlt: '#c3da91',
      grassFoe: '#f4aeae', grassFoeAlt: '#eea1a1',
      earth: '#d3945c', earthAlt: '#c88a51',
      water: '#9ad4ef', trapBg: '#f2c25a',
      denMineBg: '#a9dc8e', denFoeBg: '#f7c4c1',
      boardEdge: '#b98d5f', card: '#fdf2d0',
      borderMine: '#3f8f36', borderFoe: '#cf3a34',
    },
    sprites: {
      rat: faceA('#aab3c2', '#e8eaf0', earRound('#aab3c2', 17, 26)),
      cat: faceA('#a786cc', '#efe4f8', earTri('#a786cc', 0)),
      dog: faceA('#e3a34c', '#fdf0d8', earDrop('#c98733')),
      wolf: faceA('#778a9d', '#e6ecf2',
        `<path d="M26 36 L18 8 L44 26 Z" fill="#778a9d"/><path d="M66 36 L74 8 L48 26 Z" fill="#778a9d"/>`),
      leopard: faceA('#e9a33b', '#fdf0d8', earRound('#e9a33b', 12, 30),
        `<circle cx="30" cy="34" r="4.5" fill="#7a4a12"/><circle cx="62" cy="32" r="4.5" fill="#7a4a12"/><circle cx="46" cy="28" r="4.5" fill="#7a4a12"/>`),
      tiger: faceA('#f07a35', '#fff1e0', earRound('#f07a35', 13, 28),
        `<path d="M34 28 v12 M46 25 v13 M58 28 v12" stroke="#5a2c10" stroke-width="5" stroke-linecap="round"/>`),
      lion: faceA('#e3a02d', '#fdf0d8',
        `<circle cx="46" cy="50" r="41" fill="#b9761c"/>` +
        `<circle cx="46" cy="50" r="41" fill="none" stroke="#a2660f" stroke-width="5" stroke-dasharray="13 9"/>`),
      elephant: faceA('#69a9cf', '#dff0f9',
        `<ellipse cx="12" cy="50" rx="15" ry="24" fill="#5896bb"/><ellipse cx="80" cy="50" rx="15" ry="24" fill="#5896bb"/>`,
        `<path d="M46 62 q0 22 -9 26" stroke="#4d88ad" stroke-width="11" fill="none" stroke-linecap="round"/>`),
      croc: svg(
        `<ellipse cx="50" cy="62" rx="42" ry="15" fill="#4f8f3a"/>` +
        `<path d="M8 62 q18 -14 40 -12" stroke="#3f7a2c" stroke-width="6" fill="none" stroke-linecap="round"/>` +
        `<circle cx="34" cy="46" r="9" fill="#4f8f3a"/><circle cx="66" cy="46" r="9" fill="#4f8f3a"/>` +
        `<circle cx="34" cy="46" r="5" fill="#fff"/><circle cx="66" cy="46" r="5" fill="#fff"/>` +
        `<circle cx="34" cy="47" r="2.8" fill="#2c2417"/><circle cx="66" cy="47" r="2.8" fill="#2c2417"/>`),
      lily: svg(
        `<circle cx="50" cy="50" r="34" fill="#7cc06a"/>` +
        `<path d="M50 50 L50 16" stroke="#5ea34b" stroke-width="6" stroke-linecap="round"/>` +
        `<circle cx="50" cy="50" r="12" fill="#f2a6c8"/>`),
      trap: svg(
        `<circle cx="50" cy="50" r="32" fill="none" stroke="#8a5a10" stroke-width="7"/>` +
        `<path d="M28 28 L72 72 M72 28 L28 72" stroke="#8a5a10" stroke-width="8" stroke-linecap="round"/>`),
      denMine: svg(
        `<path d="M50 14 L86 46 L86 88 L14 88 L14 46 Z" fill="#2f7a28"/>` +
        `<rect x="38" y="58" width="24" height="30" rx="5" fill="#1d4d19"/>`),
      denFoe: svg(
        `<path d="M50 14 L86 46 L86 88 L14 88 L14 46 Z" fill="#b62f28"/>` +
        `<rect x="38" y="58" width="24" height="30" rx="5" fill="#7d1a15"/>`),
    },
  };

  // ---------------------------------------------------------------- 第 2 套

  /*
   * 剪影徽章。纯色剪影压在同心圆徽章上，只留两只白眼。
   * 41px 下对比度最高的一套——代价是最不「可爱」，靠形状不靠表情。
   */
  function badge(ringColor, bodyColor, shape) {
    return svg(
      `<circle cx="50" cy="50" r="44" fill="${ringColor}"/>` +
      `<circle cx="50" cy="50" r="36" fill="#fdf6e4"/>` +
      shape.replace(/__C__/g, bodyColor)
    );
  }
  const sEyes = (lx, rx, y) =>
    `<circle cx="${lx}" cy="${y}" r="4.6" fill="#fdf6e4"/><circle cx="${rx}" cy="${y}" r="4.6" fill="#fdf6e4"/>`;

  const setA2 = {
    id: 'claude-2',
    author: 'Claude',
    name: '剪影徽章',
    note: '纯色剪影 + 同心圆徽章。41px 下对比度最高，靠形状不靠表情。',
    palette: {
      grassMine: '#d7e3bd', grassMineAlt: '#ccdaad',
      grassFoe: '#edc4bd', grassFoeAlt: '#e4b7ae',
      earth: '#c9a074', earthAlt: '#bd9166',
      water: '#8fc6dd', trapBg: '#e8bd63',
      denMineBg: '#b5d99c', denFoeBg: '#f0c4bd',
      boardEdge: '#8a6c4a', card: '#fdf6e4',
      borderMine: '#2f6b28', borderFoe: '#b23a30',
    },
    sprites: {
      rat: badge('#6b7385', '#6b7385',
        `<circle cx="26" cy="34" r="13" fill="__C__"/><circle cx="74" cy="34" r="13" fill="__C__"/>` +
        `<circle cx="50" cy="56" r="24" fill="__C__"/>` + sEyes(42, 58, 52)),
      cat: badge('#6d4c93', '#6d4c93',
        `<path d="M28 46 L24 20 L46 34 Z" fill="__C__"/><path d="M72 46 L76 20 L54 34 Z" fill="__C__"/>` +
        `<circle cx="50" cy="56" r="24" fill="__C__"/>` + sEyes(42, 58, 52)),
      dog: badge('#a86c1e', '#a86c1e',
        `<ellipse cx="24" cy="52" rx="10" ry="20" fill="__C__"/><ellipse cx="76" cy="52" rx="10" ry="20" fill="__C__"/>` +
        `<circle cx="50" cy="56" r="24" fill="__C__"/>` + sEyes(42, 58, 52)),
      wolf: badge('#4e5f72', '#4e5f72',
        `<path d="M30 42 L22 10 L48 32 Z" fill="__C__"/><path d="M70 42 L78 10 L52 32 Z" fill="__C__"/>` +
        `<circle cx="50" cy="56" r="24" fill="__C__"/>` + sEyes(42, 58, 52)),
      leopard: badge('#b8791c', '#b8791c',
        `<circle cx="28" cy="38" r="10" fill="__C__"/><circle cx="72" cy="38" r="10" fill="__C__"/>` +
        `<circle cx="50" cy="56" r="24" fill="__C__"/>` +
        `<circle cx="36" cy="44" r="5" fill="#fdf6e4"/><circle cx="64" cy="44" r="5" fill="#fdf6e4"/><circle cx="50" cy="38" r="5" fill="#fdf6e4"/>` +
        sEyes(42, 58, 56)),
      tiger: badge('#c9551a', '#c9551a',
        `<circle cx="28" cy="38" r="11" fill="__C__"/><circle cx="72" cy="38" r="11" fill="__C__"/>` +
        `<circle cx="50" cy="56" r="25" fill="__C__"/>` +
        `<path d="M38 40 v11 M50 37 v12 M62 40 v11" stroke="#fdf6e4" stroke-width="5" stroke-linecap="round"/>` +
        sEyes(41, 59, 58)),
      lion: badge('#a8760f', '#a8760f',
        `<circle cx="50" cy="52" r="33" fill="__C__"/>` +
        `<circle cx="50" cy="52" r="33" fill="none" stroke="#fdf6e4" stroke-width="5" stroke-dasharray="12 8"/>` +
        `<circle cx="50" cy="54" r="20" fill="__C__"/>` + sEyes(43, 57, 50)),
      elephant: badge('#3d7fa3', '#3d7fa3',
        `<ellipse cx="20" cy="50" rx="14" ry="22" fill="__C__"/><ellipse cx="80" cy="50" rx="14" ry="22" fill="__C__"/>` +
        `<circle cx="50" cy="50" r="23" fill="__C__"/>` +
        `<path d="M50 60 q0 20 -8 24" stroke="__C__" stroke-width="11" fill="none" stroke-linecap="round"/>` +
        sEyes(42, 58, 46)),
      croc: svg(
        `<ellipse cx="50" cy="60" rx="44" ry="14" fill="#2f6b33"/>` +
        `<path d="M10 50 l10 -10 l10 10 l10 -10 l10 10" stroke="#2f6b33" stroke-width="6" fill="none" stroke-linejoin="round"/>` +
        `<circle cx="66" cy="44" r="10" fill="#2f6b33"/><circle cx="66" cy="44" r="5" fill="#fdf6e4"/>`),
      lily: svg(`<circle cx="50" cy="50" r="33" fill="#5fa05a"/><path d="M50 50 L50 17" stroke="#8fc6dd" stroke-width="7"/>`),
      trap: svg(
        `<circle cx="50" cy="50" r="30" fill="#7a4f0c"/>` +
        `<circle cx="50" cy="50" r="14" fill="#e8bd63"/>`),
      denMine: svg(`<circle cx="50" cy="50" r="36" fill="#2f6b28"/><circle cx="50" cy="50" r="17" fill="#b5d99c"/>`),
      denFoe: svg(`<circle cx="50" cy="50" r="36" fill="#b23a30"/><circle cx="50" cy="50" r="17" fill="#f0c4bd"/>`),
    },
  };

  window.SPRITE_SETS.push(setA1, setA2);
})();
