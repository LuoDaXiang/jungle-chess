/*
 * Claude 第 3、4、5 套。同样是「一个风格渲染器生成一整套」。
 */
(function () {
  window.SPRITE_SETS = window.SPRITE_SETS || [];
  const svg = (inner) => `<svg viewBox="0 0 100 100">${inner}</svg>`;

  // ---------------------------------------------------------------- 第 3 套

  /*
   * 厚描边贴纸。每个形状都套一圈 6 单位的深色轮廓，像儿童贴纸。
   * 轮廓本身承担了大部分对比度，所以在任何底色上都站得住。
   */
  const INK3 = '#33261d';
  const O = (d, fill) => `<path d="${d}" fill="${fill}" stroke="${INK3}" stroke-width="6" stroke-linejoin="round"/>`;
  const OC = (cx, cy, r, fill) =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${INK3}" stroke-width="6"/>`;
  const OE = (cx, cy, rx, ry, fill) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${INK3}" stroke-width="6"/>`;

  function stickerFace(ears, main, mark) {
    return svg(
      ears +
      OC(47, 52, 28, main) +
      (mark || '') +
      `<circle cx="37" cy="50" r="6" fill="${INK3}"/><circle cx="57" cy="50" r="6" fill="${INK3}"/>` +
      `<ellipse cx="47" cy="63" rx="6" ry="4.5" fill="${INK3}"/>`
    );
  }

  const set3 = {
    id: 'claude-3',
    author: 'Claude',
    name: '厚描边贴纸',
    note: '每个形状套一圈 6 单位深轮廓。轮廓承担对比度，放任何底色上都站得住。',
    palette: {
      grassMine: '#d9e8b0', grassMineAlt: '#cfe0a0',
      grassFoe: '#f7bcbc', grassFoeAlt: '#f1aeae',
      earth: '#deA46c', earthAlt: '#d2985f',
      water: '#a6dcf2', trapBg: '#f6cc6e',
      denMineBg: '#b7e59c', denFoeBg: '#fbd0cc',
      boardEdge: '#a87c52', card: '#fffbee',
      borderMine: '#3f8f36', borderFoe: '#cf3a34',
    },
    sprites: {
      rat: stickerFace(OC(22, 30, 15, '#c3cad6') + OC(72, 30, 15, '#c3cad6'), '#aab3c2'),
      cat: stickerFace(O('M26 44 L21 17 L44 32 Z', '#b795d8') + O('M68 44 L73 17 L50 32 Z', '#b795d8'), '#a786cc'),
      dog: stickerFace(OE(19, 54, 11, 20, '#c98733') + OE(75, 54, 11, 20, '#c98733'), '#e3a34c'),
      wolf: stickerFace(O('M28 40 L20 9 L46 30 Z', '#8b9dad') + O('M66 40 L74 9 L48 30 Z', '#8b9dad'), '#778a9d'),
      leopard: stickerFace(OC(24, 34, 11, '#e9a33b') + OC(70, 34, 11, '#e9a33b'), '#f0b757',
        `<circle cx="32" cy="36" r="5" fill="${INK3}"/><circle cx="62" cy="34" r="5" fill="${INK3}"/><circle cx="47" cy="30" r="5" fill="${INK3}"/>`),
      tiger: stickerFace(OC(24, 32, 12, '#f07a35') + OC(70, 32, 12, '#f07a35'), '#f89052',
        `<path d="M36 32 v12 M47 29 v13 M58 32 v12" stroke="${INK3}" stroke-width="6" stroke-linecap="round"/>`),
      lion: stickerFace(
        `<circle cx="47" cy="52" r="40" fill="#c98a1e" stroke="${INK3}" stroke-width="6"/>` +
        `<circle cx="47" cy="52" r="40" fill="none" stroke="${INK3}" stroke-width="6" stroke-dasharray="14 10"/>`,
        '#e8ab34'),
      elephant: stickerFace(OE(14, 52, 14, 23, '#5896bb') + OE(80, 52, 14, 23, '#5896bb'), '#7ab6d9',
        `<path d="M47 66 q0 20 -9 24" stroke="${INK3}" stroke-width="12" fill="none" stroke-linecap="round"/>` +
        `<path d="M47 66 q0 20 -9 24" stroke="#7ab6d9" stroke-width="6" fill="none" stroke-linecap="round"/>`),
      croc: svg(
        OE(50, 62, 40, 14, '#5aa346') +
        OC(36, 46, 10, '#5aa346') + OC(66, 46, 10, '#5aa346') +
        `<circle cx="36" cy="46" r="4" fill="${INK3}"/><circle cx="66" cy="46" r="4" fill="${INK3}"/>`),
      lily: svg(OC(50, 52, 31, '#7cc06a') + OC(50, 52, 12, '#f2a6c8')),
      trap: svg(
        OC(50, 50, 29, '#f6cc6e') +
        `<path d="M30 30 L70 70 M70 30 L30 70" stroke="${INK3}" stroke-width="8" stroke-linecap="round"/>`),
      denMine: svg(O('M50 12 L88 48 L88 88 L12 88 L12 48 Z', '#4fa244') + O('M38 60 L62 60 L62 88 L38 88 Z', '#24601d')),
      denFoe: svg(O('M50 12 L88 48 L88 88 L12 88 L12 48 Z', '#d8544a') + O('M38 60 L62 60 L62 88 L38 88 Z', '#8c211b')),
    },
  };

  // ---------------------------------------------------------------- 第 4 套

  /*
   * 几何拼块。只用圆、三角、矩形，像一盒木头玩具。没有一条曲线是手画的，
   * 全部由规则形状拼出来——这让「统一」成为数学事实而不是视觉判断。
   */
  function blockFace(ears, main, dark, mark) {
    return svg(
      ears +
      `<rect x="18" y="26" width="58" height="56" rx="10" fill="${main}"/>` +
      (mark || '') +
      `<rect x="30" y="46" width="10" height="12" rx="5" fill="#2e2a26"/>` +
      `<rect x="54" y="46" width="10" height="12" rx="5" fill="#2e2a26"/>` +
      `<rect x="39" y="66" width="16" height="8" rx="4" fill="${dark}"/>`
    );
  }

  const set4 = {
    id: 'claude-4',
    author: 'Claude',
    name: '几何拼块',
    note: '只用圆、三角、矩形，像一盒木头玩具。统一是数学事实，不是视觉判断。',
    palette: {
      grassMine: '#c8ddb0', grassMineAlt: '#bdd4a2',
      grassFoe: '#e8b5b5', grassFoeAlt: '#dfa8a8',
      earth: '#cfa070', earthAlt: '#c39463',
      water: '#93c9e0', trapBg: '#edc169',
      denMineBg: '#aed596', denFoeBg: '#f0c2bd',
      boardEdge: '#7d6247', card: '#fbf3df',
      borderMine: '#35722d', borderFoe: '#b83a30',
    },
    sprites: {
      rat: blockFace(`<circle cx="22" cy="24" r="16" fill="#9aa3b3"/><circle cx="72" cy="24" r="16" fill="#9aa3b3"/>`, '#aab3c2', '#6f7787'),
      cat: blockFace(`<path d="M18 30 L18 8 L40 26 Z" fill="#a786cc"/><path d="M76 30 L76 8 L54 26 Z" fill="#a786cc"/>`, '#b795d8', '#6d4c93'),
      dog: blockFace(`<rect x="6" y="34" width="18" height="40" rx="9" fill="#c98733"/><rect x="70" y="34" width="18" height="40" rx="9" fill="#c98733"/>`, '#e3a34c', '#8f5f1c'),
      wolf: blockFace(`<path d="M22 32 L16 2 L46 26 Z" fill="#778a9d"/><path d="M72 32 L78 2 L48 26 Z" fill="#778a9d"/>`, '#8b9dad', '#4e5f72'),
      leopard: blockFace(`<circle cx="24" cy="26" r="11" fill="#e9a33b"/><circle cx="70" cy="26" r="11" fill="#e9a33b"/>`, '#f0b757', '#8a5a12',
        `<circle cx="30" cy="36" r="5" fill="#8a5a12"/><circle cx="64" cy="34" r="5" fill="#8a5a12"/><circle cx="47" cy="31" r="5" fill="#8a5a12"/>`),
      tiger: blockFace(`<circle cx="24" cy="26" r="12" fill="#f07a35"/><circle cx="70" cy="26" r="12" fill="#f07a35"/>`, '#f89052', '#a8410e',
        `<rect x="32" y="30" width="6" height="13" rx="3" fill="#a8410e"/><rect x="44" y="28" width="6" height="14" rx="3" fill="#a8410e"/><rect x="56" y="30" width="6" height="13" rx="3" fill="#a8410e"/>`),
      lion: blockFace(
        `<circle cx="47" cy="54" r="42" fill="#c98a1e"/>` +
        `<circle cx="12" cy="30" r="9" fill="#c98a1e"/><circle cx="82" cy="30" r="9" fill="#c98a1e"/>` +
        `<circle cx="12" cy="78" r="9" fill="#c98a1e"/><circle cx="82" cy="78" r="9" fill="#c98a1e"/>`,
        '#e8ab34', '#96650c'),
      elephant: blockFace(`<rect x="0" y="30" width="22" height="46" rx="11" fill="#5896bb"/><rect x="72" y="30" width="22" height="46" rx="11" fill="#5896bb"/>`, '#7ab6d9', '#3d7fa3',
        `<rect x="41" y="62" width="12" height="30" rx="6" fill="#5896bb"/>`),
      croc: svg(
        `<rect x="8" y="52" width="84" height="22" rx="11" fill="#4f8f3a"/>` +
        `<rect x="26" y="36" width="18" height="18" rx="9" fill="#4f8f3a"/>` +
        `<rect x="58" y="36" width="18" height="18" rx="9" fill="#4f8f3a"/>` +
        `<circle cx="35" cy="45" r="4.5" fill="#2e2a26"/><circle cx="67" cy="45" r="4.5" fill="#2e2a26"/>`),
      lily: svg(`<circle cx="50" cy="50" r="32" fill="#6fb45c"/><rect x="44" y="18" width="12" height="32" rx="6" fill="#93c9e0"/><circle cx="50" cy="50" r="11" fill="#f2a6c8"/>`),
      trap: svg(
        `<rect x="20" y="20" width="60" height="60" rx="10" fill="none" stroke="#8a5a10" stroke-width="8"/>` +
        `<rect x="44" y="20" width="12" height="60" fill="#8a5a10"/><rect x="20" y="44" width="60" height="12" fill="#8a5a10"/>`),
      denMine: svg(`<rect x="14" y="40" width="72" height="48" rx="6" fill="#35722d"/><path d="M50 10 L92 44 L8 44 Z" fill="#4fa244"/><rect x="38" y="58" width="24" height="30" rx="4" fill="#1d4d19"/>`),
      denFoe: svg(`<rect x="14" y="40" width="72" height="48" rx="6" fill="#b83a30"/><path d="M50 10 L92 44 L8 44 Z" fill="#d8544a"/><rect x="38" y="58" width="24" height="30" rx="4" fill="#7d1a15"/>`),
    },
  };

  // ---------------------------------------------------------------- 第 5 套

  /*
   * 纸艺分层。每只动物是两三张「剪纸」叠出来的，底层略微露边当阴影。
   * 没有描边，靠色块边界本身分离——最柔和的一套。
   */
  function paperFace(back, ears, main, light, mark) {
    return svg(
      `<circle cx="50" cy="54" r="31" fill="${back}"/>` +
      ears +
      `<circle cx="47" cy="51" r="29" fill="${main}"/>` +
      `<ellipse cx="47" cy="64" rx="16" ry="11" fill="${light}"/>` +
      (mark || '') +
      `<circle cx="37" cy="49" r="5.5" fill="#4a3b2f"/><circle cx="57" cy="49" r="5.5" fill="#4a3b2f"/>` +
      `<ellipse cx="47" cy="60" rx="5" ry="4" fill="#4a3b2f"/>`
    );
  }

  const set5 = {
    id: 'claude-5',
    author: 'Claude',
    name: '纸艺分层',
    note: '每只动物是两三张剪纸叠出来的，底层露边当阴影。没有描边，靠色块边界分离。',
    palette: {
      grassMine: '#dde9c4', grassMineAlt: '#d3e0b6',
      grassFoe: '#f2cac4', grassFoeAlt: '#ebbdb6',
      earth: '#d9ab80', earthAlt: '#cd9f73',
      water: '#b3dced', trapBg: '#f2d089',
      denMineBg: '#c3e0aa', denFoeBg: '#f7d6d0',
      boardEdge: '#b39271', card: '#fffdf5',
      borderMine: '#4d8f42', borderFoe: '#d1554a',
    },
    sprites: {
      rat: paperFace('#8d96a6', `<circle cx="23" cy="30" r="16" fill="#8d96a6"/><circle cx="74" cy="30" r="16" fill="#8d96a6"/><circle cx="24" cy="31" r="15" fill="#b8c0cc"/><circle cx="73" cy="31" r="15" fill="#b8c0cc"/>`, '#aab3c2', '#e4e8ee'),
      cat: paperFace('#7e5da8', `<path d="M27 43 L22 16 L45 31 Z" fill="#7e5da8"/><path d="M70 43 L75 16 L52 31 Z" fill="#7e5da8"/>`, '#a786cc', '#eadff5'),
      dog: paperFace('#a8701f', `<ellipse cx="20" cy="54" rx="11" ry="20" fill="#a8701f"/><ellipse cx="76" cy="54" rx="11" ry="20" fill="#a8701f"/>`, '#e3a34c', '#fbeed6'),
      wolf: paperFace('#55687b', `<path d="M29 40 L21 9 L47 30 Z" fill="#55687b"/><path d="M68 40 L76 9 L50 30 Z" fill="#55687b"/>`, '#8b9dad', '#e6ecf2'),
      leopard: paperFace('#b8791c', `<circle cx="25" cy="34" r="12" fill="#b8791c"/><circle cx="72" cy="34" r="12" fill="#b8791c"/>`, '#f0b757', '#fdf0d8',
        `<circle cx="32" cy="37" r="5.5" fill="#8a5a12"/><circle cx="63" cy="35" r="5.5" fill="#8a5a12"/><circle cx="47" cy="30" r="5.5" fill="#8a5a12"/>`),
      tiger: paperFace('#c9551a', `<circle cx="25" cy="32" r="13" fill="#c9551a"/><circle cx="72" cy="32" r="13" fill="#c9551a"/>`, '#f89052', '#fff1e0',
        `<path d="M36 32 v12 M47 29 v13 M58 32 v12" stroke="#a8410e" stroke-width="5" stroke-linecap="round"/>`),
      lion: paperFace('#9c6a0d', `<circle cx="50" cy="54" r="41" fill="#c98a1e"/><circle cx="47" cy="51" r="38" fill="#dfa02b"/>`, '#f0bb46', '#fdf0d8'),
      elephant: paperFace('#3d7fa3', `<ellipse cx="15" cy="52" rx="15" ry="24" fill="#3d7fa3"/><ellipse cx="79" cy="52" rx="15" ry="24" fill="#5da3c8"/>`, '#7ab6d9', '#dff0f9',
        `<path d="M47 64 q0 22 -9 26" stroke="#5896bb" stroke-width="12" fill="none" stroke-linecap="round"/>`),
      croc: svg(
        `<ellipse cx="52" cy="64" rx="41" ry="15" fill="#3f7a2c"/>` +
        `<ellipse cx="50" cy="61" rx="40" ry="14" fill="#5aa346"/>` +
        `<circle cx="35" cy="47" r="10" fill="#3f7a2c"/><circle cx="67" cy="47" r="10" fill="#3f7a2c"/>` +
        `<circle cx="34" cy="46" r="9" fill="#5aa346"/><circle cx="66" cy="46" r="9" fill="#5aa346"/>` +
        `<circle cx="34" cy="46" r="4" fill="#2f4a22"/><circle cx="66" cy="46" r="4" fill="#2f4a22"/>`),
      lily: svg(`<circle cx="52" cy="53" r="32" fill="#5c9c4c"/><circle cx="50" cy="50" r="31" fill="#7cc06a"/><circle cx="51" cy="51" r="12" fill="#e090b8"/><circle cx="50" cy="50" r="11" fill="#f7bdd8"/>`),
      trap: svg(`<circle cx="52" cy="52" r="30" fill="#b3861f"/><circle cx="50" cy="50" r="29" fill="#f2d089"/><path d="M31 31 L69 69 M69 31 L31 69" stroke="#8a5a10" stroke-width="8" stroke-linecap="round"/>`),
      denMine: svg(`<path d="M52 16 L88 50 L88 90 L16 90 L16 50 Z" fill="#2f6b28"/><path d="M50 14 L86 48 L86 88 L14 88 L14 48 Z" fill="#4fa244"/><rect x="38" y="58" width="24" height="30" rx="5" fill="#24601d"/>`),
      denFoe: svg(`<path d="M52 16 L88 50 L88 90 L16 90 L16 50 Z" fill="#a8322a"/><path d="M50 14 L86 48 L86 88 L14 88 L14 48 Z" fill="#d8544a"/><rect x="38" y="58" width="24" height="30" rx="5" fill="#8c211b"/>`),
    },
  };

  window.SPRITE_SETS.push(set3, set4, set5);
})();
