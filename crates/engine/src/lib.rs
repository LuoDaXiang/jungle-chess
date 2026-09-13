//! 斗兽棋规则引擎。
//!
//! 这里是规则的唯一实现。前端通过 `jungle-engine-wasm` 同步调用它算合法落点，
//! AI 通过 `jungle-ai` 原生调用它做搜索。规则不存在第二份实现，也就不会漂移。
//!
//! 常量与 `legacy/engine.js` 逐条对应，移植时以那份为准——它有 60 个测试背书。

#![forbid(unsafe_code)]

use serde::{Deserialize, Serialize};
use serde_big_array::BigArray;

pub const COLS: usize = 7;
pub const ROWS: usize = 9;
pub const CELLS: usize = COLS * ROWS;

/// 等级。鼠的数字最小，但能吃象——这是唯一的例外，在 `can_capture` 里处理。
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Rank {
    Rat = 1,
    Cat = 2,
    Dog = 3,
    Wolf = 4,
    Leopard = 5,
    Tiger = 6,
    Lion = 7,
    Elephant = 8,
}

impl Rank {
    /// 给界面显示用的汉字。孩子认得这些字，所以用字不用图标。
    pub const fn name_cn(self) -> &'static str {
        match self {
            Rank::Rat => "鼠",
            Rank::Cat => "猫",
            Rank::Dog => "犬",
            Rank::Wolf => "狼",
            Rank::Leopard => "豹",
            Rank::Tiger => "虎",
            Rank::Lion => "狮",
            Rank::Elephant => "象",
        }
    }
}

/// 引擎沿用旧版的 red/black 命名：red 是玩家（坐在下方，第 8 行），black 是电脑。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Side {
    Red,
    Black,
}

impl Side {
    pub const fn opponent(self) -> Side {
        match self {
            Side::Red => Side::Black,
            Side::Black => Side::Red,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Piece {
    pub rank: Rank,
    pub side: Side,
}

pub const fn idx(c: usize, r: usize) -> usize {
    r * COLS + c
}
pub const fn col_of(i: usize) -> usize {
    i % COLS
}
pub const fn row_of(i: usize) -> usize {
    i / COLS
}

/// 两块 2x3 的水塘：列 1-2 和 4-5，行 3-5。
pub fn is_water(i: usize) -> bool {
    let (c, r) = (col_of(i), row_of(i));
    matches!(c, 1 | 2 | 4 | 5) && matches!(r, 3..=5)
}

/// 固定鳄鱼，在每块水塘的中间行。它是地形不是棋子：不入棋盘数组，
/// 吃不掉、踩不上，狮虎跳河时直接跳过它。它唯一的作用是挡住老鼠。
pub fn is_croc(i: usize) -> bool {
    i == idx(1, 4) || i == idx(5, 4)
}

pub const fn den_of(side: Side) -> usize {
    match side {
        Side::Black => idx(3, 0),
        Side::Red => idx(3, 8),
    }
}

/// 陷阱归它守护的那个兽穴所有。
pub fn is_trap_of(i: usize, side: Side) -> bool {
    let (c, r) = (col_of(i), row_of(i));
    match side {
        Side::Black => matches!((c, r), (2, 0) | (4, 0) | (3, 1)),
        Side::Red => matches!((c, r), (2, 8) | (4, 8) | (3, 7)),
    }
}

pub type Board = [Option<Piece>; CELLS];

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Game {
    // serde 的数组实现只到 32 长度，63 格要靠 BigArray。定长数组不换成 Vec，
    // 是因为 AI 的 make/unmake 在搜索热路径上，不该有堆分配。
    #[serde(with = "BigArray")]
    pub board: Board,
    pub turn: Side,
    pub winner: Option<Side>,
}

/// 标准开局。第 0 行是 black 的底线，第 8 行是 red 的。
const LAYOUT: [(usize, usize, Rank, Side); 16] = [
    (0, 0, Rank::Lion, Side::Black),
    (6, 0, Rank::Tiger, Side::Black),
    (1, 1, Rank::Dog, Side::Black),
    (5, 1, Rank::Cat, Side::Black),
    (0, 2, Rank::Rat, Side::Black),
    (2, 2, Rank::Leopard, Side::Black),
    (4, 2, Rank::Wolf, Side::Black),
    (6, 2, Rank::Elephant, Side::Black),
    (0, 6, Rank::Elephant, Side::Red),
    (2, 6, Rank::Wolf, Side::Red),
    (4, 6, Rank::Leopard, Side::Red),
    (6, 6, Rank::Rat, Side::Red),
    (1, 7, Rank::Cat, Side::Red),
    (5, 7, Rank::Dog, Side::Red),
    (0, 8, Rank::Tiger, Side::Red),
    (6, 8, Rank::Lion, Side::Red),
];

pub fn create_game() -> Game {
    let mut board: Board = [None; CELLS];
    for &(c, r, rank, side) in LAYOUT.iter() {
        board[idx(c, r)] = Some(Piece { rank, side });
    }
    Game {
        board,
        turn: Side::Red,
        winner: None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn board_has_sixteen_pieces_at_start() {
        let g = create_game();
        assert_eq!(g.board.iter().filter(|s| s.is_some()).count(), 16);
        assert_eq!(g.turn, Side::Red);
        assert!(g.winner.is_none());
    }

    #[test]
    fn water_is_two_pools_of_six() {
        let n = (0..CELLS).filter(|&i| is_water(i)).count();
        assert_eq!(n, 12);
        assert!(is_water(idx(1, 3)) && is_water(idx(5, 5)));
        assert!(!is_water(idx(3, 4)), "中间那列是陆地，不是水");
        assert!(
            !is_water(idx(1, 2)) && !is_water(idx(1, 6)),
            "水塘只占 3-5 行"
        );
    }

    #[test]
    fn crocodiles_sit_in_the_middle_row_of_each_pool() {
        assert!(is_croc(idx(1, 4)) && is_croc(idx(5, 4)));
        assert!(is_water(idx(1, 4)) && is_water(idx(5, 4)), "鳄鱼必须在水里");
        assert_eq!((0..CELLS).filter(|&i| is_croc(i)).count(), 2);
    }

    #[test]
    fn each_den_is_guarded_by_three_traps() {
        for side in [Side::Red, Side::Black] {
            assert_eq!((0..CELLS).filter(|&i| is_trap_of(i, side)).count(), 3);
            assert!(!is_trap_of(den_of(side), side), "兽穴本身不是陷阱");
        }
        assert_eq!(den_of(Side::Red), idx(3, 8));
        assert_eq!(den_of(Side::Black), idx(3, 0));
    }

    #[test]
    fn rat_is_lowest_elephant_is_highest() {
        assert!(Rank::Rat < Rank::Elephant);
        assert_eq!(Rank::Elephant as u8, 8);
        assert_eq!(Rank::Rat as u8, 1);
    }
}
