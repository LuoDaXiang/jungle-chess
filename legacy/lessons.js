/*
 * Tutorial content: six lessons, every spoken line written out in full.
 *
 * Each `key` maps to audio/<key>.mp3. `text` is both the speechSynthesis
 * fallback and the script for generating those files, so the two never drift.
 *
 * goal types:
 *   inspect     - click every own piece once
 *   move        - move a piece onto an exact square
 *   capture     - capture the piece on an exact square
 *   safeMove    - make any legal move that does not land on a forbidden square
 *   den         - enter the opponent den
 *   play        - hand over to a real game against the AI
 */
(function (root) {
  'use strict';

  var P = function (c, r, rank, side) { return { c: c, r: r, rank: rank, side: side }; };

  var LESSONS = [
    {
      id: 'l1',
      title: '认识八个动物',
      badge: '一',
      steps: [{
        setup: [
          P(0, 8, 'tiger', 'red'), P(6, 8, 'lion', 'red'),
          P(1, 7, 'cat', 'red'), P(5, 7, 'dog', 'red'),
          P(0, 6, 'elephant', 'red'), P(2, 6, 'wolf', 'red'),
          P(4, 6, 'leopard', 'red'), P(6, 6, 'rat', 'red')
        ],
        turn: 'red',
        say: { key: 'l1_intro', text: '我们先来认识这八个动物。用鼠标点一点它们，每一个我都告诉你它是谁。' },
        goal: { type: 'inspect' },
        pieceLines: {
          elephant: { key: 'p_elephant', text: '这是大象。它个子最大，力气也最大，除了老鼠，谁都打不过它。' },
          lion: { key: 'p_lion', text: '这是狮子，森林之王。它有一个本领，能一下子跳过整条河。' },
          tiger: { key: 'p_tiger', text: '这是老虎。它也会跳过河，不过狮子比它厉害一点点。' },
          leopard: { key: 'p_leopard', text: '这是豹子，跑得飞快。可是它打不过老虎和狮子。' },
          wolf: { key: 'p_wolf', text: '这是狼。它能吃掉狗、猫和老鼠。' },
          dog: { key: 'p_dog', text: '这是狗。它能吃掉猫和老鼠。' },
          cat: { key: 'p_cat', text: '这是猫。它只能吃老鼠，别的动物它都打不过。' },
          rat: { key: 'p_rat', text: '这是老鼠。它最小，可是它能钻进大象的鼻子里，把大象打败！而且只有它会游泳。' }
        },
        success: { key: 'l1_done', text: '八个动物你都认识啦！记住，个子大的能吃个子小的，只有老鼠是个例外。' }
      }]
    },

    {
      id: 'l2',
      title: '谁能吃谁',
      badge: '二',
      steps: [
        {
          setup: [P(3, 4, 'wolf', 'red'), P(3, 3, 'cat', 'black')],
          turn: 'red',
          say: { key: 'l2_s1', text: '狼比猫厉害。点一下狼，再点一下猫，把它吃掉。' },
          goal: { type: 'capture', target: [3, 3] },
          success: { key: 'l2_s1_ok', text: '对了！大的可以吃小的。' }
        },
        {
          setup: [P(3, 4, 'cat', 'red'), P(3, 3, 'wolf', 'black')],
          turn: 'red',
          say: { key: 'l2_s2', text: '现在反过来了。我们只有一只小猫，对面是一只狼。小猫吃不动狼，快带它躲开。' },
          goal: { type: 'safeMove', forbidden: [[3, 3]] },
          hints: [{ at: [3, 3], key: 'l2_s2_no', text: '猫太小啦，吃不动狼。往别的方向走走看。' }],
          success: { key: 'l2_s2_ok', text: '躲得好。打不过的时候，走开也是聪明的办法。' }
        },
        {
          setup: [P(3, 4, 'leopard', 'red'), P(3, 3, 'leopard', 'black')],
          turn: 'red',
          say: { key: 'l2_s3', text: '两只一样大的豹子碰上了。一样大的撞在一起会同归于尽，两只一起消失。你试试。' },
          goal: { type: 'capture', target: [3, 3] },
          success: { key: 'l2_s3_ok', text: '看到了吗？两只都不见了。一样大的碰在一起，谁也占不到便宜。' }
        },
        {
          setup: [P(3, 4, 'lion', 'red'), P(3, 3, 'leopard', 'black'), P(2, 2, 'dog', 'black')],
          turn: 'red',
          say: { key: 'l2_s4', text: '最后一题。狮子和豹子，谁厉害？厉害的那个去吃掉另一个。' },
          goal: { type: 'capture', target: [3, 3] },
          success: { key: 'l2_s4_ok', text: '全对！你已经记住谁能吃谁了。' }
        }
      ]
    },

    {
      id: 'l3',
      title: '老鼠打大象',
      badge: '三',
      steps: [
        {
          setup: [P(3, 4, 'rat', 'red'), P(3, 3, 'elephant', 'black')],
          turn: 'red',
          say: { key: 'l3_s1', text: '这一关最有意思。老鼠最小，可是它专门能打败大象。用老鼠去吃掉那头大象！' },
          goal: { type: 'capture', target: [3, 3] },
          success: { key: 'l3_s1_ok', text: '厉害吧！老鼠会钻进大象的鼻子，大象最怕它了。' }
        },
        {
          setup: [P(3, 4, 'elephant', 'red'), P(3, 3, 'rat', 'black')],
          turn: 'red',
          say: { key: 'l3_s2', text: '那大象能不能吃老鼠呢？我们的大象在这里，你试试看。' },
          goal: { type: 'safeMove', forbidden: [[3, 3]] },
          hints: [{ at: [3, 3], key: 'l3_s2_no', text: '不行哦，大象怕老鼠，吃不了它。让大象躲开吧。' }],
          success: { key: 'l3_s2_ok', text: '记住啦：老鼠能吃大象，大象不能吃老鼠。只有这一对是反过来的。' }
        }
      ]
    },

    {
      id: 'l4',
      title: '过河的本领',
      badge: '四',
      steps: [
        {
          setup: [P(1, 2, 'rat', 'red')],
          turn: 'red',
          say: { key: 'l4_s1', text: '中间这两块蓝色的是河。八个动物里，只有老鼠会游泳。让老鼠下水试试。' },
          goal: { type: 'move', to: [1, 3] },
          success: { key: 'l4_s1_ok', text: '老鼠会游泳！在水里的时候，岸上的动物咬不到它，它也咬不到岸上的动物。' }
        },
        {
          setup: [P(1, 3, 'rat', 'red')],
          turn: 'red',
          say: { key: 'l4_croc', text: '河里趴着一只鳄鱼，它一动不动，可是老鼠游不过去。让老鼠绕开它走。' },
          goal: { type: 'move', to: [2, 3] },
          hints: [{ at: [1, 4], key: 'l4_croc_no', text: '鳄鱼挡在那儿呢，老鼠过不去。从旁边绕过去吧。' }],
          success: { key: 'l4_croc_ok', text: '绕过去了。鳄鱼那一格谁都进不去，不过狮子和老虎跳的时候可以从它上面飞过去。' }
        },
        {
          setup: [P(1, 2, 'wolf', 'red')],
          turn: 'red',
          say: { key: 'l4_s2', text: '这次是一只狼。你试试能不能让它下水。' },
          goal: { type: 'safeMove', forbidden: [[1, 3]] },
          hints: [{ at: [1, 3], key: 'l4_s2_no', text: '狼不会游泳，下不了水。除了老鼠，谁都不能进河里。' }],
          success: { key: 'l4_s2_ok', text: '对，只有老鼠能下水。' }
        },
        {
          setup: [P(0, 3, 'lion', 'red')],
          turn: 'red',
          say: { key: 'l4_s3', text: '狮子和老虎有个特别的本领：它们能一下子跳过整条河。让狮子跳到对面去。' },
          goal: { type: 'move', to: [3, 3] },
          success: { key: 'l4_s3_ok', text: '跳过去啦！狮子和老虎横着跳、竖着跳都可以。' }
        },
        {
          setup: [P(0, 3, 'lion', 'red'), P(1, 3, 'rat', 'black')],
          turn: 'red',
          say: { key: 'l4_s4', text: '可是水里有一只老鼠挡在中间。你再试试狮子还能不能跳过去。' },
          goal: { type: 'safeMove', forbidden: [[3, 3]] },
          hints: [{ at: [3, 3], key: 'l4_s4_no', text: '有老鼠在水里挡着，狮子就跳不过去了。这是老鼠的另一个本领。' }],
          success: { key: 'l4_s4_ok', text: '记住：只要河里有老鼠，不管是谁的老鼠，狮子和老虎都跳不过去。' }
        }
      ]
    },

    {
      id: 'l5',
      title: '小心陷阱',
      badge: '五',
      steps: [
        {
          setup: [P(2, 8, 'elephant', 'black'), P(2, 7, 'cat', 'red'), P(5, 6, 'dog', 'black')],
          turn: 'red',
          say: { key: 'l5_s1', text: '看这三个带叉的格子，是我们家门口的陷阱。对面的大象踩进来了！掉进陷阱的动物就没力气了，用我们的小猫去吃掉它。' },
          goal: { type: 'capture', target: [2, 8] },
          success: { key: 'l5_s1_ok', text: '小猫吃掉了大象！只要敌人踩进我们的陷阱，我们随便哪个动物都能吃掉它。' }
        },
        {
          setup: [P(2, 1, 'elephant', 'red'), P(1, 0, 'cat', 'black'), P(5, 1, 'wolf', 'black')],
          turn: 'red',
          say: { key: 'l5_s2', text: '反过来也一样。前面那三个格子是对方家门口的陷阱，我们的大象要是踩进去，连小猫都能把它吃掉。快让大象躲开。' },
          goal: { type: 'safeMove', forbidden: [[2, 0], [3, 1]] },
          hints: [
            { at: [2, 0], key: 'l5_s2_no', text: '别进去！那是对方的陷阱，进去大象就没力气了。' },
            { at: [3, 1], key: 'l5_s2_no', text: '别进去！那是对方的陷阱，进去大象就没力气了。' }
          ],
          success: { key: 'l5_s2_ok', text: '躲开了。走出陷阱以后，力气就会回来，所以千万别在陷阱里待着。' }
        }
      ]
    },

    {
      id: 'l6',
      title: '冲进对方的家',
      badge: '六',
      steps: [
        {
          setup: [P(3, 2, 'wolf', 'red'), P(6, 6, 'cat', 'black')],
          turn: 'red',
          say: { key: 'l6_s1', text: '棋盘最上面那个洞，是对方的家。只要我们有一个动物走进去，我们就赢了。带这只狼走进去！' },
          goal: { type: 'den' },
          success: { key: 'l6_s1_ok', text: '赢啦！记住，走进对方的家就直接赢，不用把它的动物都吃光。' }
        },
        {
          setup: null, // full opening position
          turn: 'red',
          say: { key: 'l6_s2', text: '现在你全都学会了。我们来下一整盘吧，我会让着你一点。你的动物在下面，先走。' },
          goal: { type: 'play' },
          success: { key: 'l6_s2_ok', text: '你毕业啦！以后可以自己挑难度，跟我下棋了。' }
        }
      ]
    }
  ];

  // Lines the game speaks outside the lessons.
  var VOICE = {
    welcome: { key: 'ui_welcome', text: '欢迎来玩斗兽棋！点上面的按钮开始吧。' },
    yourTurn: { key: 'ui_your_turn', text: '该你走了。' },
    illegal: { key: 'ui_illegal', text: '这里走不了，换一个地方试试。' },
    cannotEat: { key: 'ui_cannot_eat', text: '它太厉害了，我们吃不动。' },
    captured: { key: 'ui_captured', text: '吃掉一个！' },
    lost: { key: 'ui_lost', text: '我们被吃掉一个，没关系，继续。' },
    win: { key: 'ui_win', text: '你赢啦！真棒。' },
    lose: { key: 'ui_lose', text: '这局我赢了。再来一盘吧！' },
    draw: { key: 'ui_draw', text: '最后两个撞在一起，一起没了。这局算平手！' },
    mutual: { key: 'ui_mutual', text: '一样大的碰上了，两个一起没了。' },
    undo: { key: 'ui_undo', text: '好，我们退回去重新走。' },
    easier: { key: 'ui_easier', text: '这一档有点难，我们换简单一点的，好不好？' },
    harder: { key: 'ui_harder', text: '你连赢了两盘！要不要试试更难的？' },
    longGame: { key: 'ui_long_game', text: '这盘下了挺久啦，要不要休息一下眼睛？' }
  };

  root.Lessons = { LESSONS: LESSONS, VOICE: VOICE };
  if (typeof module === 'object' && module.exports) module.exports = root.Lessons;
})(typeof self !== 'undefined' ? self : this);
