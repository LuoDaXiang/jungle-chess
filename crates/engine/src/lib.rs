//! 斗兽棋规则引擎。
//!
//! 这里是规则的唯一实现。前端通过 `jungle-engine-wasm` 同步调用它算合法落点，
//! AI 通过 `jungle-ai` 原生调用它做搜索。规则不存在第二份实现，也就不会漂移。
//!
//! 行为基准是 `legacy/engine.js`，它有 60 个测试背书。本文件里的每一条规则和
//! 每一个测试局面都照搬那份，不重新设计——移植期间换语言就够了，别同时改规则。

#![forbid(unsafe_code)]

use serde::{Deserialize, Serialize};
use serde_big_array::BigArray;

pub const COLS: usize = 7;
pub const ROWS: usize = 9;
pub const CELLS: usize = COLS * ROWS;

/// 四个正交方向，(dc, dr)。
const DIRS: [(i32, i32); 4] = [(0, -1), (0, 1), (-1, 0), (1, 0)];

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

/// 终局状态。
///
/// 必须有 `Draw`：最后两子同归于尽时旧版判和棋（`legacy/engine.js` 里的
/// `state.winner = 'draw'`），两个测试锁着这个行为。用 `Option<Side>` 表达不了它。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", content = "side", rename_all = "lowercase")]
pub enum Outcome {
    Ongoing,
    Won(Side),
    Draw,
}

impl Outcome {
    pub const fn is_over(self) -> bool {
        !matches!(self, Outcome::Ongoing)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct Piece {
    pub rank: Rank,
    pub side: Side,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub struct Move {
    pub from: usize,
    pub to: usize,
}

/// 一步走完之后的事实。界面照着它播动画和语音，不必自己重算规则——
/// 旧版是在落子前手工读 `captured` 和 `mutual` 的，那等于让 UI 复制了一遍规则。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct MoveOutcome {
    pub moved: Piece,
    pub captured: Option<Piece>,
    /// 同级相撞，两边一起消失。
    pub mutual: bool,
    pub outcome: Outcome,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum MoveError {
    NoPiece { at: usize },
    NotYourTurn { turn: Side, piece: Side },
    Illegal { from: usize, to: usize },
    GameOver,
}

impl core::fmt::Display for MoveError {
    fn fmt(&self, f: &mut core::fmt::Formatter<'_>) -> core::fmt::Result {
        match self {
            MoveError::NoPiece { at } => write!(f, "no piece at {at}"),
            MoveError::NotYourTurn { turn, piece } => {
                write!(f, "not {piece:?}'s turn, it is {turn:?}'s")
            }
            MoveError::Illegal { from, to } => write!(f, "illegal move {from}->{to}"),
            MoveError::GameOver => write!(f, "the game is already over"),
        }
    }
}

impl std::error::Error for MoveError {}

pub const fn idx(c: usize, r: usize) -> usize {
    r * COLS + c
}
pub const fn col_of(i: usize) -> usize {
    i % COLS
}
pub const fn row_of(i: usize) -> usize {
    i / COLS
}
pub const fn in_board(c: i32, r: i32) -> bool {
    c >= 0 && c < COLS as i32 && r >= 0 && r < ROWS as i32
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

pub fn is_den(i: usize, side: Side) -> bool {
    den_of(side) == i
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

/// 只保存当前规则状态。历史不在这里——悔棋和教学回退由前端的 reducer
/// 保存局面序列，AI 的防重复列表也由调用方传入。引擎保持无历史，才好做纯函数。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Game {
    // serde 的数组实现只到 32 长度，63 格要靠 BigArray。定长数组不换成 Vec，
    // 是因为 AI 的 make/unmake 在搜索热路径上，不该有堆分配。
    #[serde(with = "BigArray")]
    pub board: Board,
    pub turn: Side,
    pub outcome: Outcome,
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
        outcome: Outcome::Ongoing,
    }
}

/// 用稀疏列表摆局面，而不是整套开局。测试和教学关都要它。
pub fn make_position(pieces: &[(usize, usize, Rank, Side)], turn: Side) -> Game {
    let mut board: Board = [None; CELLS];
    for &(c, r, rank, side) in pieces {
        board[idx(c, r)] = Some(Piece { rank, side });
    }
    Game {
        board,
        turn,
        outcome: Outcome::Ongoing,
    }
}

/// 能不能吃。
///
/// 判断顺序有讲究：**陷阱检查必须在鼠象特例之前**。站在攻方陷阱里的老鼠
/// 等级归零，是可以被象吃掉的；顺序反了这条就丢了。
pub fn can_capture(g: &Game, from: usize, to: usize) -> bool {
    let (Some(a), Some(d)) = (g.board[from], g.board[to]) else {
        return false;
    };
    if a.side == d.side {
        return false;
    }

    // 水里的老鼠和岸上的棋子互不相干，两个方向都是。鼠对鼠在水里可以。
    if is_water(from) != is_water(to) {
        return false;
    }

    // 守方站在攻方的陷阱里，等级归零。
    if is_trap_of(to, a.side) {
        return true;
    }

    if a.rank == Rank::Rat && d.rank == Rank::Elephant {
        return true;
    }
    if a.rank == Rank::Elephant && d.rank == Rank::Rat {
        return false;
    }

    a.rank >= d.rank // 同级可以撞
}

/// 同级相撞，两边一起消失，而不是一方占格。
///
/// 例外：踩进攻方陷阱的棋子等级为 0，来吃它的人吃掉它并活着占住格子，
/// 哪怕等级相同。只有两个满级棋子相遇才会同归于尽。
pub fn is_mutual_kill(g: &Game, from: usize, to: usize) -> bool {
    let (Some(a), Some(d)) = (g.board[from], g.board[to]) else {
        return false;
    };
    if a.side == d.side {
        return false;
    }
    if is_trap_of(to, a.side) {
        return false;
    }
    a.rank == d.rank
}

/// 狮虎横跨整块水塘，横竖都行。路径上水里有任何老鼠都挡住，不分敌我。
/// 返回落点，不是合法跳跃则返回 None。
pub fn leap_target(g: &Game, from: usize, dc: i32, dr: i32) -> Option<usize> {
    let p = g.board[from]?;
    if p.rank != Rank::Lion && p.rank != Rank::Tiger {
        return None;
    }

    let mut c = col_of(from) as i32 + dc;
    let mut r = row_of(from) as i32 + dr;
    let mut crossed = 0;

    while in_board(c, r) && is_water(idx(c as usize, r as usize)) {
        if g.board[idx(c as usize, r as usize)].is_some() {
            return None; // 水里的老鼠挡住了
        }
        crossed += 1;
        c += dc;
        r += dr;
    }
    if crossed == 0 {
        return None; // 这个方向压根不对着水
    }
    if !in_board(c, r) {
        return None; // 水塘一直延到棋盘外
    }
    Some(idx(c as usize, r as usize))
}

pub fn legal_moves_from(g: &Game, from: usize) -> Vec<usize> {
    let mut moves = Vec::new();
    let Some(p) = g.board[from] else {
        return moves;
    };

    for (dc, dr) in DIRS {
        let nc = col_of(from) as i32 + dc;
        let nr = row_of(from) as i32 + dr;
        if !in_board(nc, nr) {
            continue;
        }
        let to = idx(nc as usize, nr as usize);

        if is_water(to) {
            if p.rank == Rank::Rat {
                // 老鼠可以下水，吃子规则照常（鼠对鼠）。
                if is_croc(to) {
                    continue; // 鳄鱼挡路
                }
                if g.board[to].is_some() && !can_capture(g, from, to) {
                    continue;
                }
                moves.push(to);
            } else if let Some(landing) = leap_target(g, from, dc, dr) {
                match g.board[landing] {
                    Some(occ) if occ.side == p.side => continue,
                    Some(_) if !can_capture(g, from, landing) => continue,
                    _ => moves.push(landing),
                }
            }
            continue;
        }

        if is_den(to, p.side) {
            continue; // 永远不进自己的兽穴
        }
        if g.board[to].is_some() && !can_capture(g, from, to) {
            continue;
        }
        moves.push(to);
    }
    moves
}

pub fn legal_moves(g: &Game, side: Side) -> Vec<Move> {
    let mut out = Vec::new();
    for from in 0..CELLS {
        match g.board[from] {
            Some(p) if p.side == side => {
                out.extend(
                    legal_moves_from(g, from)
                        .into_iter()
                        .map(|to| Move { from, to }),
                );
            }
            _ => {}
        }
    }
    out
}

fn has_pieces(g: &Game, side: Side) -> bool {
    g.board.iter().flatten().any(|p| p.side == side)
}

/// 走一步，返回新局面和这一步的事实。值语义：不改原局面。
///
/// 前端持有权威局面，悔棋就是留着旧值，教学关走错就是丢掉新值——
/// 这比让 WASM 内部藏一个可变状态机简单得多。
pub fn apply_move(g: &Game, mv: Move) -> Result<(Game, MoveOutcome), MoveError> {
    if g.outcome.is_over() {
        return Err(MoveError::GameOver);
    }
    let Some(p) = g.board[mv.from] else {
        return Err(MoveError::NoPiece { at: mv.from });
    };
    if p.side != g.turn {
        return Err(MoveError::NotYourTurn {
            turn: g.turn,
            piece: p.side,
        });
    }
    if !legal_moves_from(g, mv.from).contains(&mv.to) {
        return Err(MoveError::Illegal {
            from: mv.from,
            to: mv.to,
        });
    }

    let mut next = g.clone();
    let captured = next.board[mv.to];
    let mutual = captured.is_some() && is_mutual_kill(g, mv.from, mv.to);

    next.board[mv.from] = None;
    next.board[mv.to] = if mutual { None } else { Some(p) };

    let foe = p.side.opponent();
    let we_live = has_pieces(&next, p.side);
    let they_live = has_pieces(&next, foe);

    // 顺序照搬旧版。注意：只有对局继续时才换手——分出胜负后 turn 停在走子方，
    // 有测试锁着这个细节。
    next.outcome = if is_den(mv.to, foe) && !mutual {
        Outcome::Won(p.side)
    } else if !we_live && !they_live {
        Outcome::Draw // 最后两子同时换掉了
    } else if !they_live {
        Outcome::Won(p.side)
    } else if !we_live {
        Outcome::Won(foe)
    } else {
        next.turn = foe;
        // 困毙：轮到的一方没有合法走法，判它输。
        if legal_moves(&next, foe).is_empty() {
            Outcome::Won(p.side)
        } else {
            Outcome::Ongoing
        }
    };

    let outcome = next.outcome;
    Ok((
        next,
        MoveOutcome {
            moved: p,
            captured,
            mutual,
            outcome,
        },
    ))
}

// ---------------------------------------------------------------- 局面指纹

/// splitmix64，用来在编译期生成 Zobrist 表。固定常数，结果完全确定——
/// 同一个局面在任何机器上、任何一次运行里哈希都相同，所以搜索可复现，
/// 前端和后端算出来的也必然一致。
const fn splitmix64(state: u64) -> (u64, u64) {
    let next = state.wrapping_add(0x9E37_79B9_7F4A_7C15);
    let mut z = next;
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    (next, z ^ (z >> 31))
}

/// 63 格 × 16 种棋子（8 等级 × 2 方），外加一个走子方的键。
struct Zobrist {
    cells: [[u64; 16]; CELLS],
    black_to_move: u64,
}

const ZOBRIST: Zobrist = {
    let mut cells = [[0u64; 16]; CELLS];
    let mut s = 0x243F_6A88_85A3_08D3u64;
    let mut i = 0;
    while i < CELLS {
        let mut k = 0;
        while k < 16 {
            let (ns, v) = splitmix64(s);
            s = ns;
            cells[i][k] = v;
            k += 1;
        }
        i += 1;
    }
    let (_, black_to_move) = splitmix64(s);
    Zobrist {
        cells,
        black_to_move,
    }
};

const fn piece_slot(rank: Rank, side: Side) -> usize {
    let base = match side {
        Side::Red => 0,
        Side::Black => 8,
    };
    base + (rank as usize) - 1
}

/// 某个棋子在某一格上的 Zobrist 键。AI 做增量更新时 xor 它，
/// 所以搜索不必每个节点重算整盘。
pub fn zobrist_piece(i: usize, p: Piece) -> u64 {
    ZOBRIST.cells[i][piece_slot(p.rank, p.side)]
}

/// 走子方的 Zobrist 键。黑方走棋时 xor 进去。
pub const fn zobrist_side_to_move() -> u64 {
    ZOBRIST.black_to_move
}

/// 局面指纹。
///
/// 放在引擎而不是 AI 里：它是局面的属性，不是搜索的属性。界面维护防重复列表
/// 要它（经 WASM 同步调用，不走 IPC），AI 的置换表也要它——同一个函数，
/// 两边算出来必然一致。
pub fn position_key(g: &Game) -> u64 {
    let mut h = 0u64;
    for (i, cell) in g.board.iter().enumerate() {
        if let Some(p) = cell {
            h ^= zobrist_piece(i, *p);
        }
    }
    if g.turn == Side::Black {
        h ^= zobrist_side_to_move();
    }
    h
}

#[cfg(test)]
mod tests {
    use super::Rank::*;
    use super::Side::*;
    use super::*;

    /// 摆局面：(列, 行, 等级, 方)
    fn pos(pieces: &[(usize, usize, Rank, Side)], turn: Side) -> Game {
        make_position(pieces, turn)
    }

    fn can_move(g: &Game, from: usize, to: usize) -> bool {
        legal_moves_from(g, from).contains(&to)
    }

    /// 走一步并断言成功。测试里绝大多数走子都该成功，失败要当场炸。
    fn play(g: &Game, from: usize, to: usize) -> (Game, MoveOutcome) {
        apply_move(g, Move { from, to }).expect("这一步应当合法")
    }

    // ---------- 开局与地形 ----------

    #[test]
    fn opening_layout_places_16_pieces_with_lions_and_tigers_on_opposite_corners() {
        let g = create_game();
        assert_eq!(g.board.iter().flatten().count(), 16);
        assert_eq!(
            g.board[idx(0, 0)],
            Some(Piece {
                rank: Lion,
                side: Black
            })
        );
        assert_eq!(
            g.board[idx(6, 0)],
            Some(Piece {
                rank: Tiger,
                side: Black
            })
        );
        assert_eq!(
            g.board[idx(0, 8)],
            Some(Piece {
                rank: Tiger,
                side: Red
            })
        );
        assert_eq!(
            g.board[idx(6, 8)],
            Some(Piece {
                rank: Lion,
                side: Red
            })
        );
        assert_eq!(g.turn, Red);
        assert_eq!(g.outcome, Outcome::Ongoing);
    }

    #[test]
    fn water_is_two_pools_of_six() {
        assert_eq!((0..CELLS).filter(|&i| is_water(i)).count(), 12);
        assert!(is_water(idx(1, 3)) && is_water(idx(5, 5)));
        assert!(!is_water(idx(3, 4)), "中间那列是陆地");
        assert!(
            !is_water(idx(1, 2)) && !is_water(idx(1, 6)),
            "水塘只占 3-5 行"
        );
    }

    #[test]
    fn crocodiles_sit_at_1_4_and_5_4_and_are_not_pieces() {
        let g = create_game();
        assert!(is_croc(idx(1, 4)) && is_croc(idx(5, 4)));
        assert!(is_water(idx(1, 4)) && is_water(idx(5, 4)), "它们住在水里");
        assert_eq!(g.board[idx(1, 4)], None, "鳄鱼从不占棋盘格位");
        assert!(
            !is_croc(idx(2, 4)) && !is_croc(idx(4, 4)),
            "只有外侧中间两格"
        );
    }

    #[test]
    fn each_den_is_guarded_by_three_traps() {
        for side in [Red, Black] {
            assert_eq!((0..CELLS).filter(|&i| is_trap_of(i, side)).count(), 3);
            assert!(!is_trap_of(den_of(side), side), "兽穴本身不是陷阱");
        }
        assert_eq!(den_of(Red), idx(3, 8));
        assert_eq!(den_of(Black), idx(3, 0));
    }

    #[test]
    fn position_key_separates_side_to_move() {
        let a = pos(&[(3, 4, Wolf, Red)], Red);
        let mut b = a.clone();
        b.turn = Black;
        assert_ne!(
            position_key(&a),
            position_key(&b),
            "同一摆法不同走子方必须不同指纹"
        );
    }

    #[test]
    fn position_key_separates_pieces_and_squares() {
        let a = pos(&[(3, 4, Wolf, Red)], Red);
        let b = pos(&[(3, 4, Wolf, Black)], Red);
        let c = pos(&[(3, 5, Wolf, Red)], Red);
        assert_ne!(position_key(&a), position_key(&b), "换一方必须换指纹");
        assert_ne!(position_key(&a), position_key(&c), "换一格必须换指纹");
    }

    #[test]
    fn rat_is_lowest_elephant_is_highest() {
        assert!(Rat < Elephant);
        assert_eq!(Elephant as u8, 8);
        assert_eq!(Rat as u8, 1);
    }

    // ---------- 水域与鳄鱼 ----------

    #[test]
    fn rat_enters_water_dog_does_not() {
        let s = pos(&[(1, 2, Rat, Red), (2, 2, Dog, Red)], Red);
        assert!(can_move(&s, idx(1, 2), idx(1, 3)), "老鼠该能下水");
        assert!(!can_move(&s, idx(2, 2), idx(2, 3)), "狗不能下水");
    }

    #[test]
    fn rat_in_water_cannot_capture_on_land_and_cannot_be_captured_from_land() {
        let mut s = pos(&[(1, 3, Rat, Red), (1, 2, Cat, Black)], Red);
        assert!(
            !can_capture(&s, idx(1, 3), idx(1, 2)),
            "水里的鼠不能吃岸上的猫"
        );
        assert!(!can_move(&s, idx(1, 3), idx(1, 2)));
        s.turn = Black;
        assert!(
            !can_capture(&s, idx(1, 2), idx(1, 3)),
            "岸上的猫不能吃水里的鼠"
        );
        assert!(!can_move(&s, idx(1, 2), idx(1, 3)));
    }

    #[test]
    fn rat_meets_rat_inside_the_water_and_both_are_destroyed() {
        // (1,4) 和 (5,4) 是鳄鱼格，所以用第 2 列。
        let s = pos(&[(2, 3, Rat, Red), (2, 4, Rat, Black)], Red);
        assert!(can_move(&s, idx(2, 3), idx(2, 4)), "水里鼠对鼠是合法相撞");
        let (after, mo) = play(&s, idx(2, 3), idx(2, 4));
        assert_eq!(after.board[idx(2, 4)], None, "守方没了");
        assert_eq!(after.board[idx(2, 3)], None, "攻方也没了");
        assert!(mo.mutual);
        assert_eq!(after.outcome, Outcome::Draw, "两边同时没子了");
    }

    #[test]
    fn the_rat_cannot_swim_through_a_crocodile_but_can_go_around_it() {
        let s = pos(&[(1, 3, Rat, Red)], Red);
        assert!(!can_move(&s, idx(1, 3), idx(1, 4)), "鳄鱼挡住老鼠");
        assert!(can_move(&s, idx(1, 3), idx(2, 3)), "绕路是通的");
        let below = pos(&[(1, 5, Rat, Red)], Red);
        assert!(!can_move(&below, idx(1, 5), idx(1, 4)), "另一边也挡");
    }

    #[test]
    fn lions_and_tigers_leap_straight_over_a_crocodile() {
        // 沿第 4 行横跳会经过两个鳄鱼格。
        let h = pos(&[(0, 4, Lion, Red)], Red);
        assert!(can_move(&h, idx(0, 4), idx(3, 4)), "第 4 行横跳越过鳄鱼");
        // 沿第 1 列竖跳会经过 (1,4)。
        let v = pos(&[(1, 2, Tiger, Red)], Red);
        assert!(can_move(&v, idx(1, 2), idx(1, 6)), "第 1 列竖跳越过鳄鱼");
    }

    #[test]
    fn a_rat_still_blocks_a_leap_even_on_a_crocodile_column() {
        let s = pos(&[(1, 2, Tiger, Red), (1, 3, Rat, Black)], Red);
        assert!(!can_move(&s, idx(1, 2), idx(1, 6)), "有鳄鱼也照样被老鼠挡");
    }

    #[test]
    fn rat_in_the_water_cannot_eat_the_elephant_standing_on_the_bank() {
        let s = pos(&[(1, 3, Rat, Red), (0, 3, Elephant, Black)], Red);
        assert!(
            !can_move(&s, idx(1, 3), idx(0, 3)),
            "得先上岸，下回合才能吃"
        );
        assert!(can_move(&s, idx(1, 3), idx(1, 2)), "但爬上空岸没问题");
    }

    // ---------- 吃子、鼠象、同归于尽 ----------

    #[test]
    fn equal_ranks_annihilate_instead_of_one_taking_the_square() {
        let s = pos(
            &[
                (3, 4, Lion, Red),
                (0, 8, Cat, Red),
                (3, 3, Lion, Black),
                (0, 0, Cat, Black),
            ],
            Red,
        );
        assert!(is_mutual_kill(&s, idx(3, 4), idx(3, 3)));
        let (after, mo) = play(&s, idx(3, 4), idx(3, 3));
        assert_eq!(after.board[idx(3, 3)], None, "守方狮没了");
        assert_eq!(after.board[idx(3, 4)], None, "攻方狮也没了");
        assert!(mo.mutual);
        assert_eq!(after.outcome, Outcome::Ongoing, "两边都还有猫，继续");
        assert_eq!(after.turn, Black);
    }

    #[test]
    fn spending_your_last_piece_on_a_collision_loses_the_game() {
        // 值得锁住：同归于尽也会吃掉你自己的子，拿最后一个子去换等于送对方赢。
        let s = pos(
            &[(3, 4, Lion, Red), (3, 3, Lion, Black), (0, 0, Cat, Black)],
            Red,
        );
        let (after, _) = play(&s, idx(3, 4), idx(3, 3));
        assert_eq!(after.outcome, Outcome::Won(Black), "红方换掉了自己唯一的子");
    }

    #[test]
    fn a_trapped_defender_is_a_one_sided_kill_not_a_collision() {
        // 黑狮站在红方陷阱里，等级归零，红狮活下来。
        let s = pos(&[(2, 8, Lion, Black), (2, 7, Lion, Red)], Red);
        assert!(
            !is_mutual_kill(&s, idx(2, 7), idx(2, 8)),
            "等级 0 不是势均力敌"
        );
        let (after, mo) = play(&s, idx(2, 7), idx(2, 8));
        assert_eq!(
            after.board[idx(2, 8)],
            Some(Piece {
                rank: Lion,
                side: Red
            }),
            "红狮占住格子并活着"
        );
        assert!(!mo.mutual);
        assert_eq!(after.outcome, Outcome::Won(Red));
    }

    #[test]
    fn rat_and_elephant_is_not_a_collision_either_way() {
        let s = pos(&[(3, 4, Rat, Red), (3, 3, Elephant, Black)], Red);
        assert!(!is_mutual_kill(&s, idx(3, 4), idx(3, 3)), "等级不同");
        let (after, _) = play(&s, idx(3, 4), idx(3, 3));
        assert_eq!(
            after.board[idx(3, 3)],
            Some(Piece {
                rank: Rat,
                side: Red
            }),
            "老鼠活下来并占住格子"
        );
    }

    #[test]
    fn trading_off_the_last_piece_on_each_side_is_a_draw() {
        let s = pos(&[(3, 4, Wolf, Red), (3, 3, Wolf, Black)], Red);
        let (after, _) = play(&s, idx(3, 4), idx(3, 3));
        assert_eq!(after.outcome, Outcome::Draw);
    }

    #[test]
    fn move_outcome_records_whether_a_capture_was_mutual() {
        let s = pos(
            &[(3, 4, Wolf, Red), (3, 3, Wolf, Black), (0, 0, Cat, Black)],
            Red,
        );
        let (_, mo) = play(&s, idx(3, 4), idx(3, 3));
        assert!(mo.mutual);
        assert_eq!(
            mo.captured,
            Some(Piece {
                rank: Wolf,
                side: Black
            })
        );
        assert_eq!(
            mo.moved,
            Piece {
                rank: Wolf,
                side: Red
            }
        );
    }

    #[test]
    fn rat_eats_elephant_on_land_elephant_never_eats_rat() {
        let mut s = pos(&[(3, 4, Rat, Red), (3, 3, Elephant, Black)], Red);
        assert!(can_move(&s, idx(3, 4), idx(3, 3)), "陆地上鼠吃象");
        s.turn = Black;
        assert!(!can_move(&s, idx(3, 3), idx(3, 4)), "象不能吃鼠");
    }

    // ---------- 陷阱 ----------

    #[test]
    fn elephant_eats_a_rat_that_stepped_into_the_elephant_side_trap() {
        let s = pos(&[(2, 8, Rat, Black), (2, 7, Elephant, Red)], Red);
        assert!(is_trap_of(idx(2, 8), Red));
        assert!(
            can_move(&s, idx(2, 7), idx(2, 8)),
            "在红方陷阱里老鼠没有等级可言"
        );
    }

    #[test]
    fn cat_eats_an_elephant_sitting_in_the_cat_side_trap() {
        let s = pos(&[(2, 0, Elephant, Red), (2, 1, Cat, Black)], Black);
        assert!(can_move(&s, idx(2, 1), idx(2, 0)), "陷阱里的象等级为 0");
    }

    #[test]
    fn elephant_regains_rank_after_leaving_the_trap() {
        let s = pos(&[(2, 0, Elephant, Red), (1, 0, Dog, Black)], Black);
        assert!(can_move(&s, idx(1, 0), idx(2, 0)), "陷阱里的象连狗都吃得动");
        let (s, _) = play(&s, idx(1, 0), idx(1, 1)); // 狗让开，不吃
        let (s, _) = play(&s, idx(2, 0), idx(2, 1)); // 象走出陷阱
        assert!(!can_move(&s, idx(1, 1), idx(2, 1)), "等级恢复，狗吃不动了");
    }

    #[test]
    fn own_trap_does_not_weaken_your_own_piece() {
        let s = pos(&[(2, 0, Elephant, Black), (2, 1, Cat, Red)], Red);
        assert!(is_trap_of(idx(2, 0), Black));
        assert!(
            !can_move(&s, idx(2, 1), idx(2, 0)),
            "黑象在黑方陷阱里仍是 8 级"
        );
    }

    // ---------- 狮虎跳河 ----------

    #[test]
    fn lion_leaps_the_pool_horizontally_and_vertically() {
        let s = pos(&[(0, 3, Lion, Red), (1, 2, Tiger, Red)], Red);
        assert!(can_move(&s, idx(0, 3), idx(3, 3)), "横跳越过 1-2 列");
        assert!(can_move(&s, idx(1, 2), idx(1, 6)), "竖跳越过 3-5 行");
    }

    #[test]
    fn a_rat_in_the_pool_blocks_the_leap_whatever_its_colour() {
        let own = pos(&[(0, 3, Lion, Red), (2, 3, Rat, Red)], Red);
        assert!(!can_move(&own, idx(0, 3), idx(3, 3)), "自己的老鼠也挡");
        let foe = pos(&[(0, 3, Lion, Red), (2, 3, Rat, Black)], Red);
        assert!(!can_move(&foe, idx(0, 3), idx(3, 3)), "敌方老鼠一样挡");
    }

    #[test]
    fn leap_capture_follows_the_normal_rank_rules() {
        let weaker = pos(&[(0, 3, Lion, Red), (3, 3, Wolf, Black)], Red);
        assert!(can_move(&weaker, idx(0, 3), idx(3, 3)), "狮落在狼上吃掉它");
        let stronger = pos(&[(0, 3, Tiger, Red), (3, 3, Elephant, Black)], Red);
        assert!(!can_move(&stronger, idx(0, 3), idx(3, 3)), "虎落不到象上");
        let friendly = pos(&[(0, 3, Lion, Red), (3, 3, Wolf, Red)], Red);
        assert!(
            !can_move(&friendly, idx(0, 3), idx(3, 3)),
            "不能落在自己人身上"
        );
    }

    #[test]
    fn equal_ranks_may_capture_each_other() {
        let s = pos(&[(3, 3, Wolf, Red), (3, 2, Wolf, Black)], Red);
        assert!(can_move(&s, idx(3, 3), idx(3, 2)));
    }

    // ---------- 兽穴与胜负 ----------

    #[test]
    fn a_piece_may_not_enter_its_own_den_but_wins_by_entering_the_other_one() {
        let s = pos(&[(3, 7, Wolf, Red)], Red);
        assert!(!can_move(&s, idx(3, 7), idx(3, 8)), "红狼不能进红兽穴");

        let w = pos(&[(3, 1, Wolf, Red)], Red);
        let (after, mo) = play(&w, idx(3, 1), idx(3, 0));
        assert_eq!(after.outcome, Outcome::Won(Red), "冲进黑兽穴就赢");
        assert_eq!(mo.outcome, Outcome::Won(Red));
    }

    #[test]
    fn taking_the_last_enemy_piece_ends_the_game() {
        let s = pos(&[(3, 3, Lion, Red), (3, 2, Cat, Black)], Red);
        let (after, _) = play(&s, idx(3, 3), idx(3, 2));
        assert_eq!(after.outcome, Outcome::Won(Red));
    }

    #[test]
    fn a_side_with_no_legal_move_loses() {
        let s = pos(
            &[(0, 0, Cat, Red), (1, 0, Lion, Black), (0, 2, Tiger, Black)],
            Black,
        );
        let (after, _) = play(&s, idx(0, 2), idx(0, 1)); // 把红猫封死在角落
        assert_eq!(legal_moves(&after, Red).len(), 0);
        assert_eq!(after.outcome, Outcome::Won(Black));
    }

    #[test]
    fn opening_position_offers_the_same_move_count_to_both_sides() {
        let g = create_game();
        let red = legal_moves(&g, Red).len();
        let black = legal_moves(&g, Black).len();
        assert_eq!(red, black);
        assert!(red > 0);
    }

    #[test]
    fn apply_move_rejects_moving_out_of_turn_and_illegal_destinations() {
        let g = create_game();
        assert_eq!(
            apply_move(
                &g,
                Move {
                    from: idx(0, 0),
                    to: idx(0, 1)
                }
            ),
            Err(MoveError::NotYourTurn {
                turn: Red,
                piece: Black
            })
        );
        assert_eq!(
            apply_move(
                &g,
                Move {
                    from: idx(0, 6),
                    to: idx(0, 4)
                }
            ),
            Err(MoveError::Illegal {
                from: idx(0, 6),
                to: idx(0, 4)
            })
        );
        assert_eq!(
            apply_move(
                &g,
                Move {
                    from: idx(3, 4),
                    to: idx(3, 3)
                }
            ),
            Err(MoveError::NoPiece { at: idx(3, 4) })
        );
    }

    #[test]
    fn a_finished_game_refuses_further_moves() {
        let w = pos(&[(3, 1, Wolf, Red)], Red);
        let (won, _) = play(&w, idx(3, 1), idx(3, 0));
        assert!(won.outcome.is_over());
        assert_eq!(
            apply_move(
                &won,
                Move {
                    from: idx(3, 0),
                    to: idx(3, 1)
                }
            ),
            Err(MoveError::GameOver)
        );
    }

    #[test]
    fn apply_move_does_not_mutate_the_input() {
        let before = create_game();
        let snapshot = before.clone();
        let _ = play(&before, idx(0, 6), idx(0, 5));
        assert_eq!(before, snapshot, "值语义：原局面一个字节都不能变");
    }
}
