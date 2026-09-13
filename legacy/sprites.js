/*
 * Inline SVG artwork. Kept as strings in a plain script (no external files, no
 * fetch) so the whole game still runs by double-clicking index.html.
 *
 * Every sprite draws inside viewBox 0 0 100 100 and is colour-matched to the
 * physical board this was copied from: tiger orange, lion with a mane,
 * elephant blue, cat purple, wolf grey, leopard spotted.
 */
(function (root) {
  'use strict';

  // Shared face parts so all eight animals read as one set.
  function eyes(lx, rx, y, r) {
    r = r || 7;
    return '<circle cx="' + lx + '" cy="' + y + '" r="' + r + '" fill="#fff"/>' +
           '<circle cx="' + rx + '" cy="' + y + '" r="' + r + '" fill="#fff"/>' +
           '<circle cx="' + lx + '" cy="' + (y + 1) + '" r="' + (r * 0.55) + '" fill="#2f2a26"/>' +
           '<circle cx="' + rx + '" cy="' + (y + 1) + '" r="' + (r * 0.55) + '" fill="#2f2a26"/>' +
           '<circle cx="' + (lx - 1.6) + '" cy="' + (y - 1.4) + '" r="' + (r * 0.2) + '" fill="#fff"/>' +
           '<circle cx="' + (rx - 1.6) + '" cy="' + (y - 1.4) + '" r="' + (r * 0.2) + '" fill="#fff"/>';
  }
  function svg(inner) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' + inner + '</svg>';
  }

  var SPRITES = {
    rat: svg(
      '<circle cx="26" cy="30" r="16" fill="#b9bcc9"/><circle cx="74" cy="30" r="16" fill="#b9bcc9"/>' +
      '<circle cx="26" cy="30" r="9" fill="#f0c2cd"/><circle cx="74" cy="30" r="9" fill="#f0c2cd"/>' +
      '<circle cx="50" cy="58" r="31" fill="#aeb2c1"/>' +
      '<ellipse cx="50" cy="70" rx="19" ry="13" fill="#e8e9ef"/>' +
      eyes(39, 61, 54, 6.5) +
      '<ellipse cx="50" cy="67" rx="5" ry="3.6" fill="#e07a90"/>' +
      '<path d="M50 71 v4" stroke="#8d8fa0" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M28 66 h12 M28 72 h12 M60 66 h12 M60 72 h12" stroke="#c9ccd6" stroke-width="2" stroke-linecap="round"/>'
    ),

    cat: svg(
      '<path d="M22 40 L26 12 L46 28 Z" fill="#b28fd4"/><path d="M78 40 L74 12 L54 28 Z" fill="#b28fd4"/>' +
      '<path d="M27 34 L29 20 L39 29 Z" fill="#e6c9f2"/><path d="M73 34 L71 20 L61 29 Z" fill="#e6c9f2"/>' +
      '<circle cx="50" cy="58" r="32" fill="#b28fd4"/>' +
      '<ellipse cx="50" cy="70" rx="20" ry="13" fill="#f2e8fa"/>' +
      eyes(38, 62, 53) +
      '<path d="M45 66 h10 l-5 5 Z" fill="#e07a90"/>' +
      '<path d="M50 71 v3 M50 74 q-5 4 -9 1 M50 74 q5 4 9 1" stroke="#8a6aa8" stroke-width="2.2" fill="none" stroke-linecap="round"/>' +
      '<path d="M24 62 h13 M24 69 h13 M63 62 h13 M63 69 h13" stroke="#d9c6ea" stroke-width="2" stroke-linecap="round"/>'
    ),

    dog: svg(
      '<ellipse cx="20" cy="52" rx="13" ry="22" fill="#d99340"/><ellipse cx="80" cy="52" rx="13" ry="22" fill="#d99340"/>' +
      '<circle cx="50" cy="55" r="33" fill="#f0b45a"/>' +
      '<ellipse cx="50" cy="69" rx="21" ry="15" fill="#fdf0d8"/>' +
      eyes(38, 62, 50) +
      '<ellipse cx="50" cy="64" rx="7" ry="5" fill="#4a3526"/>' +
      '<path d="M50 69 v4 M50 73 q-6 5 -11 1 M50 73 q6 5 11 1" stroke="#8a6234" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="30" cy="63" r="4" fill="#e8a24a" opacity=".7"/><circle cx="70" cy="63" r="4" fill="#e8a24a" opacity=".7"/>'
    ),

    wolf: svg(
      '<path d="M20 42 L24 10 L46 30 Z" fill="#8d99a8"/><path d="M80 42 L76 10 L54 30 Z" fill="#8d99a8"/>' +
      '<path d="M26 36 L28 19 L39 31 Z" fill="#c3ccd6"/><path d="M74 36 L72 19 L61 31 Z" fill="#c3ccd6"/>' +
      '<circle cx="50" cy="57" r="32" fill="#9aa8b5"/>' +
      '<path d="M50 44 q-17 14 -12 30 q12 9 24 0 q5 -16 -12 -30 Z" fill="#eef2f6"/>' +
      eyes(37, 63, 52, 6.5) +
      '<ellipse cx="50" cy="66" rx="6" ry="4.4" fill="#3c4652"/>' +
      '<path d="M50 70 v4 M50 74 q-6 5 -10 0 M50 74 q6 5 10 0" stroke="#6b7885" stroke-width="2.3" fill="none" stroke-linecap="round"/>'
    ),

    leopard: svg(
      '<circle cx="24" cy="28" r="14" fill="#e0913c"/><circle cx="76" cy="28" r="14" fill="#e0913c"/>' +
      '<circle cx="24" cy="28" r="7" fill="#f7d9a8"/><circle cx="76" cy="28" r="7" fill="#f7d9a8"/>' +
      '<circle cx="50" cy="56" r="33" fill="#f0a552"/>' +
      '<ellipse cx="50" cy="69" rx="21" ry="14" fill="#fdeed4"/>' +
      '<circle cx="30" cy="44" r="4.5" fill="#7a4a1e" opacity=".85"/>' +
      '<circle cx="70" cy="44" r="4.5" fill="#7a4a1e" opacity=".85"/>' +
      '<circle cx="24" cy="60" r="4" fill="#7a4a1e" opacity=".85"/>' +
      '<circle cx="76" cy="60" r="4" fill="#7a4a1e" opacity=".85"/>' +
      '<circle cx="50" cy="36" r="4" fill="#7a4a1e" opacity=".85"/>' +
      eyes(38, 62, 52) +
      '<path d="M44 64 h12 l-6 5 Z" fill="#5c3a1c"/>' +
      '<path d="M50 69 v4 M50 73 q-6 5 -10 1 M50 73 q6 5 10 1" stroke="#a8703a" stroke-width="2.3" fill="none" stroke-linecap="round"/>'
    ),

    tiger: svg(
      '<circle cx="24" cy="27" r="14" fill="#e8743a"/><circle cx="76" cy="27" r="14" fill="#e8743a"/>' +
      '<circle cx="24" cy="27" r="7" fill="#fbdcc0"/><circle cx="76" cy="27" r="7" fill="#fbdcc0"/>' +
      '<circle cx="50" cy="56" r="33" fill="#f5883c"/>' +
      '<ellipse cx="50" cy="68" rx="22" ry="15" fill="#fff3e2"/>' +
      '<path d="M50 24 l-4 12 M50 24 l4 12" stroke="#3a2a1a" stroke-width="4" stroke-linecap="round"/>' +
      '<path d="M26 46 h10 M24 56 h10 M74 46 h-10 M76 56 h-10" stroke="#3a2a1a" stroke-width="4" stroke-linecap="round"/>' +
      eyes(38, 62, 52) +
      '<path d="M44 63 h12 l-6 5 Z" fill="#7a3a1a"/>' +
      '<path d="M50 68 v4 M50 72 q-7 5 -12 1 M50 72 q7 5 12 1" stroke="#c2622c" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    ),

    lion: svg(
      '<g fill="#e08a2e">' +
      '<circle cx="50" cy="14" r="12"/><circle cx="22" cy="28" r="12"/><circle cx="78" cy="28" r="12"/>' +
      '<circle cx="12" cy="56" r="12"/><circle cx="88" cy="56" r="12"/>' +
      '<circle cx="22" cy="82" r="12"/><circle cx="78" cy="82" r="12"/><circle cx="50" cy="92" r="12"/>' +
      '</g>' +
      '<circle cx="50" cy="53" r="34" fill="#f2a03d"/>' +
      '<circle cx="50" cy="53" r="27" fill="#ffd98a"/>' +
      '<ellipse cx="50" cy="65" rx="18" ry="12" fill="#fff2d4"/>' +
      eyes(40, 60, 49, 6.5) +
      '<path d="M45 60 h10 l-5 5 Z" fill="#8a4a1e"/>' +
      '<path d="M50 65 v3 M50 68 q-5 4 -9 1 M50 68 q5 4 9 1" stroke="#c2822c" stroke-width="2.2" fill="none" stroke-linecap="round"/>'
    ),

    elephant: svg(
      '<ellipse cx="18" cy="50" rx="16" ry="22" fill="#5f9fc9"/><ellipse cx="82" cy="50" rx="16" ry="22" fill="#5f9fc9"/>' +
      '<ellipse cx="19" cy="50" rx="10" ry="15" fill="#9fd0ea"/><ellipse cx="81" cy="50" rx="10" ry="15" fill="#9fd0ea"/>' +
      '<circle cx="50" cy="52" r="31" fill="#7ab8dd"/>' +
      '<path d="M42 62 q-2 18 8 26 q10 -4 6 -14" fill="none" stroke="#7ab8dd" stroke-width="13" stroke-linecap="round"/>' +
      eyes(38, 62, 48, 6.5) +
      '<path d="M36 72 q4 6 9 5 M64 72 q-4 6 -9 5" stroke="#5f9fc9" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    ),

    // --- terrain ---
    croc: svg(
      // Side-on crocodile: long snout to the left, tail to the right,
      // eyes riding on top the way they do in the water.
      '<path d="M84 58 q10 -8 15 -2 q-3 8 -9 9 q6 4 2 9 q-8 1 -12 -8 Z" fill="#3d9448"/>' +
      '<ellipse cx="52" cy="62" rx="33" ry="14" fill="#63c46d"/>' +
      '<path d="M26 54 q-22 3 -22 9 q0 6 22 9 Z" fill="#63c46d"/>' +
      '<path d="M4 63 h44" stroke="#2f7a3a" stroke-width="2.4" stroke-linecap="round"/>' +
      '<g fill="#fff">' +
      '<path d="M9 63 l3.5 6 l3.5 -6 Z"/><path d="M19 63 l3.5 6 l3.5 -6 Z"/>' +
      '<path d="M29 63 l3.5 6 l3.5 -6 Z"/><path d="M14 63 l3.5 -6 l3.5 6 Z"/>' +
      '<path d="M24 63 l3.5 -6 l3.5 6 Z"/><path d="M34 63 l3.5 -6 l3.5 6 Z"/>' +
      '</g>' +
      '<g fill="#4fae5a">' +
      '<path d="M42 49 l6 -9 l6 9 Z"/><path d="M56 48 l6 -9 l6 9 Z"/><path d="M70 50 l6 -8 l6 8 Z"/>' +
      '</g>' +
      '<circle cx="34" cy="45" r="9" fill="#63c46d"/>' +
      '<circle cx="34" cy="43" r="5.6" fill="#fff"/>' +
      '<circle cx="34" cy="44" r="2.8" fill="#2f2a26"/>' +
      '<circle cx="48" cy="46" r="7.5" fill="#63c46d"/>' +
      '<circle cx="48" cy="44" r="4.6" fill="#fff"/>' +
      '<circle cx="48" cy="45" r="2.4" fill="#2f2a26"/>' +
      '<circle cx="60" cy="66" r="3" fill="#4fae5a"/><circle cx="72" cy="64" r="2.6" fill="#4fae5a"/>'
    ),

    trap: svg(
      // Open leg-hold trap: two toothed jaws around a bait, on a round plate.
      '<ellipse cx="50" cy="80" rx="34" ry="9" fill="#6f757e"/>' +
      '<ellipse cx="50" cy="76" rx="34" ry="9" fill="#9aa1aa"/>' +
      '<path d="M16 74 q34 -40 68 0" fill="none" stroke="#8c9198" stroke-width="7" stroke-linecap="round"/>' +
      '<g fill="#fff">' +
      '<path d="M22 62 l4 12 l6 -10 Z"/><path d="M34 50 l3 13 l7 -9 Z"/>' +
      '<path d="M50 45 l0 14 l7 -11 Z"/><path d="M66 50 l-3 13 l-7 -9 Z"/>' +
      '<path d="M78 62 l-4 12 l-6 -10 Z"/>' +
      '</g>' +
      '<g fill="#fff">' +
      '<path d="M26 78 l4 -9 l5 8 Z"/><path d="M40 80 l3 -9 l5 8 Z"/>' +
      '<path d="M55 80 l3 -9 l5 8 Z"/><path d="M69 78 l3 -9 l5 8 Z"/>' +
      '</g>' +
      '<circle cx="50" cy="74" r="8" fill="#f0a552"/>' +
      '<circle cx="50" cy="74" r="4" fill="#d97f2e"/>'
    ),

    // Two dens, coloured by owner: the child is aiming at the RED house and
    // defending the GREEN one, so the goal is readable without being told.
    denMine: svg(
      '<path d="M50 8 L94 46 H6 Z" fill="#3f8f36"/>' +
      '<path d="M50 8 L94 46 H6 Z" fill="none" stroke="#2f6f28" stroke-width="3" stroke-linejoin="round"/>' +
      '<rect x="17" y="46" width="66" height="44" rx="6" fill="#7cc06a"/>' +
      '<rect x="17" y="46" width="66" height="6" fill="#5da84c"/>' +
      '<circle cx="29" cy="62" r="6" fill="#f2ffd9"/>' +
      '<circle cx="71" cy="62" r="6" fill="#f2ffd9"/>' +
      '<path d="M38 90 V72 a12 12 0 0 1 24 0 v18 Z" fill="#2f6f28"/>' +
      '<circle cx="57" cy="80" r="2.6" fill="#ffe9a8"/>' +
      '<path d="M50 8 v-4" stroke="#2f6f28" stroke-width="4" stroke-linecap="round"/>'
    ),

    denFoe: svg(
      '<path d="M50 8 L94 46 H6 Z" fill="#c9352f"/>' +
      '<path d="M50 8 L94 46 H6 Z" fill="none" stroke="#9e2621" stroke-width="3" stroke-linejoin="round"/>' +
      '<rect x="17" y="46" width="66" height="44" rx="6" fill="#ea8a86"/>' +
      '<rect x="17" y="46" width="66" height="6" fill="#d4706c"/>' +
      '<circle cx="29" cy="62" r="6" fill="#fff3d4"/>' +
      '<circle cx="71" cy="62" r="6" fill="#fff3d4"/>' +
      '<path d="M38 90 V72 a12 12 0 0 1 24 0 v18 Z" fill="#8f2a25"/>' +
      '<circle cx="57" cy="80" r="2.6" fill="#ffe9a8"/>' +
      '<path d="M50 8 v-4" stroke="#9e2621" stroke-width="4" stroke-linecap="round"/>'
    ),

    lily: svg(
      // Lily pad: round leaf with the notch cut out of one side.
      '<path d="M50 16 A34 34 0 1 1 49 16 L50 50 Z" fill="#8ec63f"/>' +
      '<path d="M50 50 L50 18 M50 50 L78 33 M50 50 L80 60 M50 50 L62 81 ' +
      'M50 50 L36 80 M50 50 L20 62 M50 50 L22 33" ' +
      'stroke="#a9d95f" stroke-width="3" stroke-linecap="round"/>' +
      '<circle cx="50" cy="50" r="4" fill="#a9d95f"/>'
    )
  };

  root.Sprites = SPRITES;
  if (typeof module === 'object' && module.exports) module.exports = SPRITES;
})(typeof self !== 'undefined' ? self : this);
