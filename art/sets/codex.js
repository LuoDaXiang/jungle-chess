(function () {
  'use strict';

  window.SPRITE_SETS = window.SPRITE_SETS || [];

  const animals = ['rat', 'cat', 'dog', 'wolf', 'leopard', 'tiger', 'lion', 'elephant'];
  const animalNames = { rat: '鼠', cat: '猫', dog: '犬', wolf: '狼', leopard: '豹', tiger: '虎', lion: '狮', elephant: '象' };

  function svg(body) {
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  }

  // Each head path owns a recognisable outer contour; details are deliberately kept above y=68.
  const contours = {
    rat: 'M19 38C8 31 10 14 23 13C34 12 38 22 35 31C43 27 57 27 65 31C62 22 66 12 77 13C90 14 92 31 81 38C86 46 84 66 74 76C63 87 37 87 26 76C16 66 14 46 19 38Z',
    cat: 'M20 37L17 12L38 27C46 24 54 24 62 27L83 12L80 38C87 48 84 69 74 78C62 88 38 88 26 78C16 69 13 48 20 37Z',
    dog: 'M29 30C20 13 7 17 10 37C12 50 19 56 25 54C18 67 28 83 50 85C72 83 82 67 75 54C81 56 88 50 90 37C93 17 80 13 71 30C60 24 40 24 29 30Z',
    wolf: 'M22 42L28 7L43 29C48 27 52 27 57 29L72 7L78 42C84 56 80 72 68 81L50 89L32 81C20 72 16 56 22 42Z',
    leopard: 'M27 32C20 28 21 18 29 16C37 14 41 21 39 28C46 25 54 25 61 28C59 21 63 14 71 16C79 18 80 28 73 32C82 42 80 63 70 75C60 86 40 86 30 75C20 63 18 42 27 32Z',
    tiger: 'M20 35C11 28 15 15 27 14C37 13 42 20 39 28C46 24 54 24 61 28C58 20 63 13 73 14C85 15 89 28 80 35L87 44L80 49L86 58L78 63C78 75 66 85 50 88C34 85 22 75 22 63L14 58L20 49L13 44Z',
    lion: 'M50 8L61 15L73 14L79 25L90 31L87 44L92 55L84 65L82 78L69 81L60 90L50 85L40 90L31 81L18 78L16 65L8 55L13 44L10 31L21 25L27 14L39 15Z',
    elephant: 'M22 28C6 24 5 41 10 57C14 70 24 75 33 66C37 71 40 74 41 79L42 91L55 91L56 72C59 69 64 66 67 62C76 75 87 69 91 56C96 40 92 24 77 28C65 19 34 19 22 28Z'
  };

  const earsOnly = {
    rat: '<circle cx="23" cy="25" r="10"/><circle cx="77" cy="25" r="10"/>',
    cat: '<path d="M20 36L18 13L38 28ZM80 36L82 13L62 28Z"/>',
    dog: '<path d="M29 31C19 14 8 20 11 40C13 51 19 55 26 53ZM71 31C81 14 92 20 89 40C87 51 81 55 74 53Z"/>',
    wolf: '<path d="M23 42L29 8L44 31ZM77 42L71 8L56 31Z"/>',
    leopard: '<circle cx="29" cy="26" r="9"/><circle cx="71" cy="26" r="9"/>',
    tiger: '<circle cx="28" cy="26" r="10"/><circle cx="72" cy="26" r="10"/>',
    lion: '', elephant: '<path d="M33 34C15 20 6 31 10 53C13 69 24 75 35 62ZM67 34C85 20 94 31 90 53C87 69 76 75 65 62Z"/>'
  };

  function faceDetails(key, stroke, fill, extra) {
    let marks = '<path d="M33 49L39 48M61 48L67 49" fill="none" stroke="' + stroke + '" stroke-width="6"/>' +
      '<path d="M44 61Q50 66 56 61Q55 73 50 75Q45 73 44 61Z" fill="' + fill + '"/>';
    if (key === 'leopard') marks += '<circle cx="30" cy="59" r="5" fill="' + fill + '"/><circle cx="70" cy="59" r="5" fill="' + fill + '"/><circle cx="50" cy="39" r="5" fill="' + fill + '"/>';
    if (key === 'tiger') marks += '<path d="M40 32L44 44M50 30V43M60 32L56 44" fill="none" stroke="' + stroke + '" stroke-width="6"/>';
    if (key === 'lion') marks += '<ellipse cx="50" cy="51" rx="25" ry="29" fill="none" stroke="' + stroke + '" stroke-width="5"/>';
    if (key === 'elephant') marks = '<path d="M33 48L39 47M61 47L67 48" fill="none" stroke="' + stroke + '" stroke-width="6"/><path d="M48 55C45 67 44 83 50 89C57 85 58 70 54 55Z" fill="' + fill + '"/>';
    return marks + (extra || '');
  }

  function woodcutAnimal(key) {
    const cuts = key === 'elephant' ? '' : '<path d="M26 42Q38 35 45 39M74 42Q62 35 55 39M30 72Q39 78 43 76" fill="none" stroke="#f2d6a2" stroke-width="5"/>';
    return svg('<path d="' + contours[key] + '" fill="#542f22" stroke="#241712" stroke-width="5"/>' +
      '<g fill="#d9913d">' + earsOnly[key] + '</g>' + cuts + faceDetails(key, '#f2d6a2', '#f2d6a2'));
  }

  function porcelainAnimal(key) {
    return svg('<path d="' + contours[key] + '" fill="#f8f1dc" stroke="#174f82" stroke-width="5"/>' +
      '<g fill="#85b8c9" stroke="#174f82" stroke-width="4">' + earsOnly[key] + '</g>' +
      '<path d="M25 55Q50 38 75 55M30 69Q50 56 70 69" fill="none" stroke="#85b8c9" stroke-width="5"/>' +
      faceDetails(key, '#174f82', '#d34a3a'));
  }

  function crayonAnimal(key) {
    return svg('<path d="' + contours[key] + '" fill="#efb94f" stroke="#41382f" stroke-width="7"/>' +
      '<path d="M21 48L38 34M20 61L43 39M59 39L79 52M59 52L77 65" fill="none" stroke="#dd6f47" stroke-width="5"/>' +
      faceDetails(key, '#41382f', '#41382f'));
  }

  function puppetAnimal(key) {
    return svg('<path d="' + contours[key] + '" fill="#b86d43" stroke="#3c2922" stroke-width="5"/>' +
      '<g fill="#e3a85f" stroke="#3c2922" stroke-width="4">' + earsOnly[key] + '</g>' +
      '<circle cx="27" cy="55" r="6" fill="#e3a85f" stroke="#3c2922" stroke-width="4"/><circle cx="73" cy="55" r="6" fill="#e3a85f" stroke="#3c2922" stroke-width="4"/>' +
      '<path d="M37 38Q50 30 63 38M35 75Q50 82 65 75" fill="none" stroke="#7d452f" stroke-width="5"/>' +
      faceDetails(key, '#2a211e', '#2a211e'));
  }

  function tapestryAnimal(key) {
    return svg('<path d="' + contours[key] + '" fill="#315f55" stroke="#172f2b" stroke-width="6"/>' +
      '<path d="M18 45L28 40L36 45L44 40L52 45L60 40L68 45L78 40M22 72L32 67L42 72L52 67L62 72L73 67" fill="none" stroke="#e0b853" stroke-width="5"/>' +
      faceDetails(key, '#f1dfba', '#c65d4b'));
  }

  function terrain(style) {
    const c = {
      wood: ['#542f22', '#f2d6a2', '#d9913d'],
      china: ['#174f82', '#f8f1dc', '#d34a3a'],
      crayon: ['#41382f', '#efb94f', '#dd6f47'],
      puppet: ['#3c2922', '#b86d43', '#e3a85f'],
      textile: ['#172f2b', '#315f55', '#e0b853']
    }[style];
    const outline = c[0], main = c[1], accent = c[2];
    return {
      croc: svg('<path d="M10 54L20 43L17 33L32 37L42 25L51 36L65 24L70 39L88 36L82 50L91 60L74 64L65 77L52 68L38 78L32 65L15 68Z" fill="' + main + '" stroke="' + outline + '" stroke-width="6"/><path d="M25 53H76M34 43L40 50M63 43L58 50" fill="none" stroke="' + accent + '" stroke-width="5"/>'),
      lily: svg('<path d="M12 54C19 25 48 14 68 34C83 49 73 74 48 80C28 84 7 72 12 54Z" fill="' + main + '" stroke="' + outline + '" stroke-width="5"/><path d="M49 79L47 52L68 34" fill="none" stroke="' + outline + '" stroke-width="5"/><path d="M47 50C29 43 29 26 46 20C56 31 57 42 47 50Z" fill="' + accent + '" stroke="' + outline + '" stroke-width="4"/>'),
      trap: svg('<path d="M18 22L82 22L72 79L28 79Z" fill="none" stroke="' + outline + '" stroke-width="7"/><path d="M24 34L76 34M27 48L73 48M30 62L70 62M36 24L32 76M50 24V78M64 24L68 76" fill="none" stroke="' + accent + '" stroke-width="5"/>'),
      denMine: denSvg(outline, main, accent, false),
      denFoe: denSvg(outline, main, accent, true)
    };
  }

  function denSvg(outline, main, accent, foe) {
    const flag = foe ? '<path d="M66 19L82 27L66 35Z" fill="' + accent + '" stroke="' + outline + '" stroke-width="4"/>' : '<circle cx="72" cy="27" r="8" fill="' + accent + '" stroke="' + outline + '" stroke-width="4"/>';
    return svg('<path d="M15 76H83M22 76V48L50 22L78 48V76M37 76V57Q50 44 63 57V76" fill="' + main + '" stroke="' + outline + '" stroke-width="6"/>' + flag);
  }

  const palettes = [
    { grassMine:'#b9cf8a',grassMineAlt:'#adc47d',grassFoe:'#d9a28f',grassFoeAlt:'#cf947f',earth:'#bd8757',earthAlt:'#ac784c',water:'#78b8c8',trapBg:'#deb45a',denMineBg:'#9cc47e',denFoeBg:'#dfa79d',boardEdge:'#6b4934',card:'#ead1a0',borderMine:'#406d45',borderFoe:'#984838' },
    { grassMine:'#c8d9ba',grassMineAlt:'#b9cfad',grassFoe:'#e6beb6',grassFoeAlt:'#dcaea6',earth:'#cba77b',earthAlt:'#bd976c',water:'#9bcbd9',trapBg:'#e6c269',denMineBg:'#b4d2a7',denFoeBg:'#ecc9c1',boardEdge:'#315d80',card:'#f8f1dc',borderMine:'#246d6a',borderFoe:'#b64b42' },
    { grassMine:'#c6d77d',grassMineAlt:'#b8ca70',grassFoe:'#efad84',grassFoeAlt:'#e49c75',earth:'#cf995b',earthAlt:'#bd884e',water:'#79bfd0',trapBg:'#e7bb4f',denMineBg:'#b7d886',denFoeBg:'#efba9f',boardEdge:'#54483b',card:'#f4d98b',borderMine:'#4e7440',borderFoe:'#b8523d' },
    { grassMine:'#aeca88',grassMineAlt:'#9fbd7b',grassFoe:'#dca18d',grassFoeAlt:'#d0937f',earth:'#aa704b',earthAlt:'#98613f',water:'#72acb5',trapBg:'#d5a74f',denMineBg:'#9bc47e',denFoeBg:'#dfaa9c',boardEdge:'#4c3027',card:'#d9a260',borderMine:'#3d6745',borderFoe:'#914637' },
    { grassMine:'#a9c49b',grassMineAlt:'#9ab68c',grassFoe:'#d8a18f',grassFoeAlt:'#ca927f',earth:'#b17f58',earthAlt:'#a1704c',water:'#70aeb3',trapBg:'#d3ad54',denMineBg:'#94bd8b',denFoeBg:'#dfaea1',boardEdge:'#263f39',card:'#d8c58f',borderMine:'#315f55',borderFoe:'#9d4d43' }
  ];

  const configs = [
    ['codex-1','木刻刻线','深色整版轮廓配合宽阔留白刻痕，像儿童木刻版画。','wood',woodcutAnimal],
    ['codex-2','青花陶绘','乳白釉面、钴蓝双线与朱红点彩组成温润陶绘。','china',porcelainAnimal],
    ['codex-3','蜡笔排线','粗粝深边与方向鲜明的宽蜡笔排线保留手绘力度。','crayon',crayonAnimal],
    ['codex-4','木偶关节','木色面块、外露圆轴和榫接弧线构成玩具木偶语言。','puppet',puppetAnimal],
    ['codex-5','织毯针脚','深色织底上以大号锯齿针脚和暖色线迹塑造纹样。','textile',tapestryAnimal]
  ];

  configs.forEach(function (cfg, index) {
    const sprites = {};
    animals.forEach(function (key) { sprites[key] = cfg[4](key); });
    Object.assign(sprites, terrain(cfg[3]));
    window.SPRITE_SETS.push({ id: cfg[0], author: 'Codex', name: cfg[1], note: cfg[2], palette: palettes[index], sprites: sprites });
  });
}());
