//! 斗兽棋电脑对手。
//!
//! 只编译原生，不编译 WASM：它跑在 Tauri 后端。界面通过一次 IPC 调它——
//! AI 本来就要想几秒，异步在这里是对的。
//!
//! 移植自 `legacy/ai.js`。评估函数、子力价值、剪枝细节全部照搬，**只有一处
//! 故意改了**：迭代加深不再被 `DEPTH[5] = 8` 封顶（见 `MAX_DEPTH`）。
//!
//! 搜索位置直接持有 `engine::Game`，所有走法生成和吃子判定都调引擎本体。
//! 旧版 JS 也是这么做的（`makeMove` 里调 `J.isMutualKill`），理由一样：
//! 规则在 AI 里出现第二份实现，迟早和引擎漂移。

#![forbid(unsafe_code)]

use jungle_engine as e;
use std::collections::HashMap;
use std::time::{Duration, Instant};

/// 子力价值。不是原始等级：鼠远比 1 级值钱，因为它是象的答案；
/// 象也因此比 8 级便宜。
pub const VALUE: [i32; 9] = [0, 700, 200, 300, 400, 500, 800, 900, 1000];

pub const fn value_of(r: e::Rank) -> i32 {
    VALUE[r as usize]
}

/// 胜负分。比任何子力组合都大，所以搜索永远不会拿赢换子。
pub const WIN: i32 = 1_000_000;

/// 每档难度的思考时间上限，单位毫秒。与 `legacy/ai.js` 的 TIME_BUDGET_MS 一致。
pub const TIME_BUDGET_MS: [u64; 5] = [10, 80, 400, 1200, 3000];

/// 搜索深度上限。
///
/// **这是相对旧版唯一的故意改动。**旧版第五档硬停在深度 8，时间没用完也不再往下。
/// 换成原生 Rust 之后，一旦 3 秒内跑得到深度 8，收益就会被这个封顶全部吃掉——
/// 那正是换语言想要的东西。所以顶档改成「跑到 deadline 为止」。
///
/// 低档仍然保留封顶：难度阶梯是靠深度拉开的，第二档要是也放开，80ms 在原生
/// Rust 下能搜很深，阶梯就塌了。
pub const MAX_DEPTH: [Option<u8>; 5] = [Some(0), Some(2), Some(4), Some(6), None];

/// 顶档虽然不封顶，仍要有个防跑飞的天花板。
pub const DEPTH_CEILING: u8 = 64;

/// 静态搜索层数，按难度。与 `legacy/ai.js` 的 QUIET 一致。
pub const QUIESCENCE_PLIES: [u8; 5] = [0, 0, 2, 4, 6];

/// 置换表，第三档起开。与 `legacy/ai.js` 的 USE_TT 一致。
pub const USE_TT: [bool; 5] = [false, false, true, true, true];

/// null-move 剪枝只在第五档开。与 `legacy/ai.js` 的 NULLMOVE 一致。
pub const NULL_MOVE: [bool; 5] = [false, false, false, false, true];

/// 置换表条目上限，和旧版一样。超了就不再写，不做替换策略。
const TT_CAPACITY: usize = 400_000;

pub const MAX_LEVEL: u8 = 5;

/// 难度档位，1-5。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Level(u8);

impl Level {
    /// 超出 1..=5 返回 None，而不是悄悄夹到边界——难度选错必须当场暴露。
    pub const fn new(n: u8) -> Option<Level> {
        if n >= 1 && n <= MAX_LEVEL {
            Some(Level(n))
        } else {
            None
        }
    }
    pub const fn get(self) -> u8 {
        self.0
    }
    const fn i(self) -> usize {
        (self.0 - 1) as usize
    }
    pub const fn budget_ms(self) -> u64 {
        TIME_BUDGET_MS[self.i()]
    }
    pub const fn quiescence_plies(self) -> u8 {
        QUIESCENCE_PLIES[self.i()]
    }
    pub const fn use_tt(self) -> bool {
        USE_TT[self.i()]
    }
    pub const fn null_move(self) -> bool {
        NULL_MOVE[self.i()]
    }
    pub const fn max_depth(self) -> Option<u8> {
        MAX_DEPTH[self.i()]
    }
}

// ---------------------------------------------------------------- Zobrist

/// splitmix64，用来在编译期生成 Zobrist 表。固定常数，结果完全确定——
/// 同一个局面在任何机器上、任何一次运行里哈希都相同，这样搜索可复现。
const fn splitmix64(state: u64) -> (u64, u64) {
    let next = state.wrapping_add(0x9E37_79B9_7F4A_7C15);
    let mut z = next;
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    (next, z ^ (z >> 31))
}

/// 63 格 × 16 种棋子（8 等级 × 2 方），外加一个走子方的键。
struct Zobrist {
    cells: [[u64; 16]; e::CELLS],
    black_to_move: u64,
}

const ZOBRIST: Zobrist = {
    let mut cells = [[0u64; 16]; e::CELLS];
    let mut s = 0x243F_6A88_85A3_08D3u64;
    let mut i = 0;
    while i < e::CELLS {
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

const fn piece_slot(rank: e::Rank, side: e::Side) -> usize {
    let base = match side {
        e::Side::Red => 0,
        e::Side::Black => 8,
    };
    base + (rank as usize) - 1
}

fn hash_of(board: &e::Board, turn: e::Side) -> u64 {
    let mut h = 0u64;
    for (i, cell) in board.iter().enumerate() {
        if let Some(p) = cell {
            h ^= ZOBRIST.cells[i][piece_slot(p.rank, p.side)];
        }
    }
    if turn == e::Side::Black {
        h ^= ZOBRIST.black_to_move;
    }
    h
}

/// 局面指纹。防重复列表（`avoid`）用它，跨 IPC 传的就是这些 u64。
pub fn position_key(g: &e::Game) -> u64 {
    hash_of(&g.board, g.turn)
}

// ---------------------------------------------------------------- 搜索状态

/// 搜索用的局面。
///
/// 直接持有 `engine::Game`，所以 `legal_moves` / `is_mutual_kill` 都能原样调，
/// 规则不会在这里出现第二份。另外增量维护双方子数和 Zobrist 哈希，
/// 终局判定和置换表查表因此是 O(1)。
#[derive(Debug, Clone)]
pub struct SearchPos {
    pub game: e::Game,
    red: u16,
    black: u16,
    hash: u64,
}

/// make_move 的回退信息。定长，不分配。
#[derive(Debug, Clone, Copy)]
pub struct Undo {
    from: usize,
    to: usize,
    moving: e::Piece,
    captured: Option<e::Piece>,
    mutual: bool,
    hash: u64,
}

impl SearchPos {
    pub fn new(g: &e::Game) -> SearchPos {
        let mut red = 0;
        let mut black = 0;
        for p in g.board.iter().flatten() {
            match p.side {
                e::Side::Red => red += 1,
                e::Side::Black => black += 1,
            }
        }
        let hash = hash_of(&g.board, g.turn);
        SearchPos {
            game: g.clone(),
            red,
            black,
            hash,
        }
    }

    fn count_of(&self, side: e::Side) -> u16 {
        match side {
            e::Side::Red => self.red,
            e::Side::Black => self.black,
        }
    }

    fn bump(&mut self, side: e::Side, n: i16) {
        match side {
            e::Side::Red => self.red = (self.red as i16 + n) as u16,
            e::Side::Black => self.black = (self.black as i16 + n) as u16,
        }
    }

    fn xor_cell(&mut self, i: usize, p: e::Piece) {
        self.hash ^= ZOBRIST.cells[i][piece_slot(p.rank, p.side)];
    }

    fn flip_side(&mut self) {
        self.hash ^= ZOBRIST.black_to_move;
    }

    /// 就地走子。不校验合法性——调用方只喂 `legal_moves` 产出的走法。
    pub fn make_move(&mut self, from: usize, to: usize) -> Undo {
        let moving = self.game.board[from].expect("走子起点必须有子");
        let captured = self.game.board[to];
        // 问引擎，所以永远不会和真实吃子规则漂移。
        let mutual = captured.is_some() && e::is_mutual_kill(&self.game, from, to);
        let saved = self.hash;

        if let Some(c) = captured {
            self.bump(c.side, -1);
            self.xor_cell(to, c);
            if mutual {
                self.bump(moving.side, -1);
            }
        }
        self.xor_cell(from, moving);
        self.game.board[from] = None;
        if mutual {
            self.game.board[to] = None;
        } else {
            self.game.board[to] = Some(moving);
            self.xor_cell(to, moving);
        }
        self.game.turn = moving.side.opponent();
        self.flip_side();

        Undo {
            from,
            to,
            moving,
            captured,
            mutual,
            hash: saved,
        }
    }

    pub fn unmake_move(&mut self, u: Undo) {
        self.game.board[u.from] = Some(u.moving);
        self.game.board[u.to] = u.captured;
        if let Some(c) = u.captured {
            self.bump(c.side, 1);
            if u.mutual {
                self.bump(u.moving.side, 1);
            }
        }
        self.game.turn = u.moving.side;
        self.hash = u.hash;
    }
}

// ---------------------------------------------------------------- 评估

fn den_distance(i: usize, side: e::Side) -> i32 {
    let target = e::den_of(side.opponent());
    (e::col_of(i) as i32 - e::col_of(target) as i32).abs()
        + (e::row_of(i) as i32 - e::row_of(target) as i32).abs()
}

/// 只看子力和位置，不看胜负。搜索内部用它——终局由 `terminal_score` 处理。
fn eval_board(board: &e::Board, side: e::Side) -> i32 {
    let mut score = 0;
    for (i, cell) in board.iter().enumerate() {
        let Some(p) = cell else { continue };
        let sign = if p.side == side { 1 } else { -1 };
        score += sign * value_of(p.rank);
        // 朝对方兽穴的轻微牵引。小到永远压不过一次真实吃子，
        // 但足以在等分时偏向有进展的那一步。
        score += sign * (14 - den_distance(i, p.side)) * 15;
    }
    score
}

/// 从 `side` 的角度打分，正数对 `side` 有利。含终局判定。
pub fn evaluate(g: &e::Game, side: e::Side) -> i32 {
    match g.outcome {
        e::Outcome::Draw => 0,
        e::Outcome::Won(w) if w == side => WIN,
        e::Outcome::Won(_) => -WIN,
        e::Outcome::Ongoing => eval_board(&g.board, side),
    }
}

/// 走子方视角的终局分；还没结束返回 None。
fn terminal_score(sp: &SearchPos, u: &Undo) -> Option<i32> {
    let mover = u.moving.side;
    let foe = mover.opponent();
    if e::is_den(u.to, foe) && !u.mutual {
        return Some(WIN);
    }
    let we_live = sp.count_of(mover) > 0;
    let they_live = sp.count_of(foe) > 0;
    match (we_live, they_live) {
        (false, false) => Some(0),
        (_, false) => Some(WIN),
        (false, _) => Some(-WIN),
        _ => None,
    }
}

// ---------------------------------------------------------------- 走法排序

fn score_move(sp: &SearchPos, m: e::Move, tt_move: Option<e::Move>) -> i32 {
    if Some(m) == tt_move {
        return 10_000_000;
    }
    let Some(victim) = sp.game.board[m.to] else {
        return 0;
    };
    let attacker = sp.game.board[m.from].expect("走子起点必须有子");
    // 优先用便宜的子吃贵的子。
    1_000_000 + value_of(victim.rank) - value_of(attacker.rank)
}

fn order_moves(sp: &SearchPos, moves: &mut [e::Move], tt_move: Option<e::Move>) {
    moves.sort_by_key(|&m| std::cmp::Reverse(score_move(sp, m, tt_move)));
}

// ---------------------------------------------------------------- 置换表

#[derive(Debug, Clone, Copy)]
struct TtEntry {
    depth: u8,
    score: i32,
    mv: Option<e::Move>,
    /// 0 精确值，-1 上界，1 下界。
    flag: i8,
}

struct Search {
    quiet: u8,
    tt: Option<HashMap<u64, TtEntry>>,
    null_move: bool,
    deadline: Instant,
    nodes: u64,
}

impl Search {
    fn out_of_time(&self) -> bool {
        Instant::now() > self.deadline
    }
}

// ---------------------------------------------------------------- 搜索

fn quiescence(
    s: &mut Search,
    sp: &mut SearchPos,
    side: e::Side,
    mut alpha: i32,
    beta: i32,
    qdepth: u8,
) -> i32 {
    s.nodes += 1;
    let stand_pat = eval_board(&sp.game.board, side);
    if qdepth == 0 {
        return stand_pat;
    }
    if stand_pat >= beta {
        return beta;
    }
    if stand_pat > alpha {
        alpha = stand_pat;
    }
    if s.out_of_time() {
        return stand_pat;
    }

    let mut caps: Vec<e::Move> = e::legal_moves(&sp.game, sp.game.turn)
        .into_iter()
        .filter(|m| sp.game.board[m.to].is_some())
        .collect();
    if caps.is_empty() {
        return stand_pat;
    }
    order_moves(sp, &mut caps, None);

    for m in caps {
        let u = sp.make_move(m.from, m.to);
        // terminal_score 已经是走子方视角，这里走子方就是 `side`。
        // 千万不要取负——取负等于告诉搜索「冲进对方兽穴是最坏结果」。
        let v = match terminal_score(sp, &u) {
            Some(t) => t,
            None => -quiescence(s, sp, side.opponent(), -beta, -alpha, qdepth - 1),
        };
        sp.unmake_move(u);
        if v >= beta {
            return beta;
        }
        if v > alpha {
            alpha = v;
        }
    }
    alpha
}

fn negamax(
    s: &mut Search,
    sp: &mut SearchPos,
    side: e::Side,
    depth: u8,
    mut alpha: i32,
    beta: i32,
) -> i32 {
    s.nodes += 1;
    if s.out_of_time() {
        return eval_board(&sp.game.board, side);
    }
    if depth == 0 {
        return if s.quiet > 0 {
            quiescence(s, sp, side, alpha, beta, s.quiet)
        } else {
            eval_board(&sp.game.board, side)
        };
    }

    let key = sp.hash;
    let mut tt_move = None;
    if let Some(tt) = &s.tt {
        if let Some(hit) = tt.get(&key) {
            tt_move = hit.mv;
            if hit.depth >= depth {
                match hit.flag {
                    0 => return hit.score,
                    f if f < 0 && hit.score <= alpha => return hit.score,
                    f if f > 0 && hit.score >= beta => return hit.score,
                    _ => {}
                }
            }
        }
    }

    // beta 有限很关键：根节点用无限窗口搜索，拿 Infinity 造出来的零窗口
    // 会塌成空窗口，几乎剪掉所有子树，结果顶档搜得**更浅**而不是更深。
    if s.null_move && depth >= 3 && beta < i32::MAX && sp.count_of(sp.game.turn) >= 4 {
        let saved = sp.game.turn;
        sp.game.turn = saved.opponent();
        sp.flip_side();
        let null_score = -negamax(s, sp, side.opponent(), depth - 3, -beta, -beta + 1);
        sp.game.turn = saved;
        sp.flip_side();
        if null_score >= beta {
            return beta;
        }
    }

    let mut moves = e::legal_moves(&sp.game, sp.game.turn);
    if moves.is_empty() {
        return -WIN; // 无子可动：这一方输
    }
    order_moves(sp, &mut moves, tt_move);

    let alpha0 = alpha;
    let mut best = i32::MIN;
    let mut best_move = None;

    for m in moves {
        let u = sp.make_move(m.from, m.to);
        let v = match terminal_score(sp, &u) {
            Some(t) => t,
            None => -negamax(s, sp, side.opponent(), depth - 1, -beta, -alpha),
        };
        sp.unmake_move(u);

        if v > best {
            best = v;
            best_move = Some(m);
        }
        if best > alpha {
            alpha = best;
        }
        if alpha >= beta {
            break;
        }
    }

    // 绝不缓存因为时间到才返回的分数。
    let timed_out = s.out_of_time();
    if let Some(tt) = &mut s.tt {
        if tt.len() < TT_CAPACITY && !timed_out {
            let flag = if best <= alpha0 {
                -1
            } else if best >= beta {
                1
            } else {
                0
            };
            tt.insert(
                key,
                TtEntry {
                    depth,
                    score: best,
                    mv: best_move,
                    flag,
                },
            );
        }
    }
    best
}

// ---------------------------------------------------------------- 第一档

/// 走这一步会不会白送子？
///
/// 等价或更好的交换不算送：关键是这一步吃到的东西够不够抵它置于险地的子。
pub fn hangs_piece(g: &e::Game, m: e::Move) -> bool {
    let gain = g.board[m.to].map_or(0, |p| value_of(p.rank));
    let Ok((next, _)) = e::apply_move(g, m) else {
        return false;
    };
    if next.outcome.is_over() {
        return false;
    }
    // 同级相撞把我们的子也带走了，那格上没剩下什么可被吃的。
    let Some(moved) = next.board[m.to] else {
        return false;
    };
    if gain >= value_of(moved.rank) {
        return false;
    }
    e::legal_moves(&next, next.turn)
        .iter()
        .any(|r| r.to == m.to)
}

/// 确定性 PRNG。第一档要有随机性，但测试必须能钉死它。
struct Rng(u64);

impl Rng {
    fn next_u64(&mut self) -> u64 {
        let (ns, v) = splitmix64(self.0);
        self.0 = ns;
        v
    }
    fn below(&mut self, n: usize) -> usize {
        (self.next_u64() % n as u64) as usize
    }
    /// 返回 [0,1) 的小数。
    fn unit(&mut self) -> f64 {
        (self.next_u64() >> 11) as f64 / (1u64 << 53) as f64
    }
}

fn pick_level1(g: &e::Game, rng: &mut Rng) -> Option<e::Move> {
    let moves = e::legal_moves(g, g.turn);
    if moves.is_empty() {
        return None;
    }

    // 能赢就赢，不用掷骰子。
    if let Some(&w) = moves.iter().find(|m| e::is_den(m.to, g.turn.opponent())) {
        return Some(w);
    }

    let safe: Vec<e::Move> = moves
        .iter()
        .copied()
        .filter(|&m| !hangs_piece(g, m))
        .collect();
    let pool = if safe.is_empty() { &moves } else { &safe };

    let captures: Vec<e::Move> = pool
        .iter()
        .copied()
        .filter(|m| g.board[m.to].is_some())
        .collect();
    if !captures.is_empty() && rng.unit() < 0.7 {
        let k = rng.below(captures.len());
        return Some(captures[k]);
    }
    let k = rng.below(pool.len());
    Some(pool[k])
}

// ---------------------------------------------------------------- 对外接口

/// 搜索诊断。用来验证高档确实比低档搜得远，以及做 native/wasm 对照实测。
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct Stats {
    /// 最深的**完整搜完**的层数。半途而废的那层不算。
    pub depth: u8,
    pub nodes: u64,
    pub elapsed_ms: u64,
}

#[derive(Debug, Clone, Default)]
pub struct Options {
    /// 覆盖档位自带的时间预算。
    pub budget_ms: Option<u64>,
    /// 钉死搜索深度，无视时钟。测试靠它拿到可复现的结果。
    pub fixed_depth: Option<u8>,
    /// 近期出现过的局面指纹，用来打散来回蹭子。由调用方（界面）维护。
    pub avoid: Vec<u64>,
    /// 第一档的随机种子。不给就用时间，给了就完全确定。
    pub rng_seed: Option<u64>,
}

/// 选一步。没得走时返回 None。
pub fn choose_move(g: &e::Game, level: Level, opts: &Options) -> Option<e::Move> {
    choose_move_with_stats(g, level, opts).0
}

pub fn choose_move_with_stats(
    g: &e::Game,
    level: Level,
    opts: &Options,
) -> (Option<e::Move>, Stats) {
    let started = Instant::now();
    let mut stats = Stats::default();
    if g.outcome.is_over() {
        return (None, stats);
    }

    if level.get() == 1 {
        let seed = opts.rng_seed.unwrap_or_else(|| {
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_or(0x5DEE_CE66, |d| d.as_nanos() as u64)
        });
        let mut rng = Rng(seed);
        let mv = pick_level1(g, &mut rng);
        stats.elapsed_ms = started.elapsed().as_millis() as u64;
        return (mv, stats);
    }

    let side = g.turn;
    let mut moves = e::legal_moves(g, side);
    if moves.is_empty() {
        return (None, stats);
    }

    let budget = opts.budget_ms.unwrap_or_else(|| level.budget_ms());
    let mut s = Search {
        quiet: level.quiescence_plies(),
        tt: level.use_tt().then(HashMap::new),
        null_move: level.null_move(),
        deadline: started + Duration::from_millis(budget),
        nodes: 0,
    };

    let mut sp = SearchPos::new(g);
    let mut best: Option<e::Move> = None;

    // 迭代加深。只有**扫完每一个根节点走法**的那一层才有资格替换答案：
    // 半途而废的一层只比较了前几步，可能比它下面那层完整的结果差得多。
    let ceiling = opts
        .fixed_depth
        .or_else(|| level.max_depth())
        .unwrap_or(DEPTH_CEILING);

    for d in 1..=ceiling {
        let mut local_best = None;
        let mut local_score = i32::MIN;
        let mut searched = 0usize;
        let total = moves.len();
        order_moves(&sp, &mut moves, best);

        for &m in moves.iter() {
            // fixed_depth 模式下无视时钟，测试要的是可复现而不是准时。
            if opts.fixed_depth.is_none() && s.out_of_time() {
                break;
            }
            let u = sp.make_move(m.from, m.to);
            let mut v = match terminal_score(&sp, &u) {
                Some(t) => t,
                None => -negamax(
                    &mut s,
                    &mut sp,
                    side.opponent(),
                    d - 1,
                    i32::MIN + 1,
                    i32::MAX,
                ),
            };
            // 轻推一下，避开刚刚出现过的局面。小到绝不会劝退一次真实吃子
            // 或一步胜着，但足以打断来回蹭子。
            if !opts.avoid.is_empty() && opts.avoid.contains(&sp.hash) {
                v -= 60;
            }
            sp.unmake_move(u);
            searched += 1;
            if v > local_score {
                local_score = v;
                local_best = Some(m);
            }
        }

        let complete = searched == total;
        if complete {
            if let Some(lb) = local_best {
                best = Some(lb);
                stats.depth = d;
            }
        } else {
            break;
        }
        // 已经搜到胜负，再深也没有意义。
        if local_score >= WIN || local_score <= -WIN {
            break;
        }
    }

    stats.nodes = s.nodes;
    stats.elapsed_ms = started.elapsed().as_millis() as u64;
    (best.or_else(|| moves.first().copied()), stats)
}

#[cfg(test)]
mod tests {
    use super::*;
    use jungle_engine::Rank::*;
    use jungle_engine::Side::*;

    fn lv(n: u8) -> Level {
        Level::new(n).expect("档位合法")
    }

    fn pos(pieces: &[(usize, usize, e::Rank, e::Side)], turn: e::Side) -> e::Game {
        e::make_position(pieces, turn)
    }

    // ---------- 档位常量与旧版一致 ----------

    #[test]
    fn levels_outside_one_to_five_are_rejected() {
        assert!(Level::new(0).is_none());
        assert!(Level::new(6).is_none());
        for n in 1..=MAX_LEVEL {
            assert!(Level::new(n).is_some());
        }
    }

    #[test]
    fn budget_matches_legacy_ladder() {
        let got: Vec<u64> = (1..=MAX_LEVEL).map(|n| lv(n).budget_ms()).collect();
        assert_eq!(got, vec![10, 80, 400, 1200, 3000]);
    }

    #[test]
    fn null_move_pruning_and_tt_match_legacy() {
        for n in 1..MAX_LEVEL {
            assert!(!lv(n).null_move());
        }
        assert!(lv(MAX_LEVEL).null_move());
        assert_eq!(
            (1..=MAX_LEVEL).map(|n| lv(n).use_tt()).collect::<Vec<_>>(),
            vec![false, false, true, true, true]
        );
    }

    #[test]
    fn only_the_top_tier_searches_to_the_deadline() {
        // 低档必须保留深度封顶，否则原生 Rust 下 80ms 能搜很深，难度阶梯会塌。
        assert_eq!(lv(1).max_depth(), Some(0));
        assert_eq!(lv(2).max_depth(), Some(2));
        assert_eq!(lv(3).max_depth(), Some(4));
        assert_eq!(lv(4).max_depth(), Some(6));
        assert_eq!(
            lv(5).max_depth(),
            None,
            "顶档跑到 deadline，这是相对旧版的故意改动"
        );
    }

    #[test]
    fn piece_values_match_legacy() {
        assert_eq!(value_of(Rat), 700, "鼠远比 1 级值钱：它是象的答案");
        assert_eq!(value_of(Elephant), 1000);
        assert_eq!(value_of(Cat), 200);
        assert!(value_of(Rat) > value_of(Leopard), "鼠比豹值钱");
        assert!(value_of(Lion) < value_of(Elephant));
    }

    // ---------- Zobrist ----------

    #[test]
    fn hash_is_incremental_and_reversible() {
        let g = e::create_game();
        let mut sp = SearchPos::new(&g);
        let start = sp.hash;

        for m in e::legal_moves(&g, Red) {
            let u = sp.make_move(m.from, m.to);
            assert_eq!(
                sp.hash,
                hash_of(&sp.game.board, sp.game.turn),
                "增量哈希必须等于从头算的哈希，走法 {m:?}"
            );
            sp.unmake_move(u);
            assert_eq!(sp.hash, start, "回退后哈希必须复原，走法 {m:?}");
            assert_eq!(sp.game, g, "回退后局面必须复原，走法 {m:?}");
        }
    }

    #[test]
    fn hash_separates_side_to_move() {
        let a = pos(&[(3, 4, Wolf, Red)], Red);
        let mut b = a.clone();
        b.turn = Black;
        assert_ne!(
            position_key(&a),
            position_key(&b),
            "同一摆法不同走子方必须不同哈希"
        );
    }

    #[test]
    fn counts_survive_a_mutual_kill_round_trip() {
        let g = pos(
            &[(3, 4, Wolf, Red), (3, 3, Wolf, Black), (0, 0, Cat, Black)],
            Red,
        );
        let mut sp = SearchPos::new(&g);
        assert_eq!((sp.red, sp.black), (1, 2));
        let u = sp.make_move(e::idx(3, 4), e::idx(3, 3));
        assert!(u.mutual);
        assert_eq!((sp.red, sp.black), (0, 1), "同归于尽两边各少一个");
        sp.unmake_move(u);
        assert_eq!((sp.red, sp.black), (1, 2), "回退后子数复原");
        assert_eq!(sp.game, g);
    }

    // ---------- 会不会下棋 ----------

    #[test]
    fn every_level_takes_a_free_win() {
        // 红狼在 (3,1)，一步进黑兽穴。没有哪一档该错过它。
        let g = pos(&[(3, 1, Wolf, Red), (0, 0, Cat, Black)], Red);
        for n in 1..=MAX_LEVEL {
            let opts = Options {
                rng_seed: Some(1),
                ..Default::default()
            };
            let mv = choose_move(&g, lv(n), &opts).expect("有棋可走");
            assert_eq!(mv.to, e::den_of(Black), "第 {n} 档错过了一步胜着");
        }
    }

    #[test]
    fn every_level_takes_a_free_capture() {
        // 红象旁边就是白送的黑狮，且吃完不会被反吃。
        // 注意方向：象 8 级吃得动狮 7 级，反过来不行——这个测试最初就写反了，
        // 而 AI 拒绝走那步非法吃子才暴露出来。
        let g = pos(
            &[
                (3, 5, Elephant, Red),
                (3, 4, Lion, Black),
                (0, 0, Cat, Black),
            ],
            Red,
        );
        for n in 2..=MAX_LEVEL {
            let opts = Options {
                rng_seed: Some(7),
                ..Default::default()
            };
            let mv = choose_move(&g, lv(n), &opts).expect("有棋可走");
            assert_eq!(mv.to, e::idx(3, 4), "第 {n} 档没吃白送的象");
        }
    }

    #[test]
    fn level_one_refuses_to_hang_a_piece() {
        // 第一档故意不随机：会白送子的对手，6 岁小孩学不到东西。
        // 红猫若走到 (3,4)，黑狮一步吃掉它；(2,6) 是安全的。
        let g = pos(&[(3, 5, Cat, Red), (3, 3, Lion, Black)], Red);
        assert!(hangs_piece(
            &g,
            e::Move {
                from: e::idx(3, 5),
                to: e::idx(3, 4)
            }
        ));
        for seed in 0..40u64 {
            let opts = Options {
                rng_seed: Some(seed),
                ..Default::default()
            };
            let mv = choose_move(&g, lv(1), &opts).expect("有棋可走");
            assert_ne!(mv.to, e::idx(3, 4), "种子 {seed}：第一档把猫送了");
        }
    }

    #[test]
    fn a_finished_game_has_no_move() {
        let g = pos(&[(3, 1, Wolf, Red)], Red);
        let (won, _) = e::apply_move(
            &g,
            e::Move {
                from: e::idx(3, 1),
                to: e::idx(3, 0),
            },
        )
        .unwrap();
        assert!(won.outcome.is_over());
        assert_eq!(choose_move(&won, lv(5), &Options::default()), None);
    }

    #[test]
    fn a_stuck_side_has_no_move() {
        // 红猫被封死在角落。
        let g = pos(
            &[(0, 0, Cat, Red), (1, 0, Lion, Black), (0, 1, Tiger, Black)],
            Red,
        );
        assert!(e::legal_moves(&g, Red).is_empty());
        assert_eq!(choose_move(&g, lv(3), &Options::default()), None);
    }

    // ---------- 搜索质量 ----------

    #[test]
    fn searching_deeper_costs_more_nodes_and_reports_the_depth() {
        // 不用时间预算：那样断言就依赖墙钟，在慢或忙的 CI runner 上会 flake，
        // 而且 CI 跑的是 debug 构建，比这里慢得多。难度阶梯本身由
        // `only_the_top_tier_searches_to_the_deadline` 从结构上锁住，
        // 这里只验证「深度确实被搜到并如实上报，而且越深越费节点」。
        let g = e::create_game();
        let mut last_nodes = 0u64;
        for d in 1..=5u8 {
            let opts = Options {
                fixed_depth: Some(d),
                ..Default::default()
            };
            let (mv, st) = choose_move_with_stats(&g, lv(5), &opts);
            assert!(mv.is_some(), "深度 {d} 没选出走法");
            assert_eq!(st.depth, d, "上报的层数应等于钉死的深度");
            assert!(
                st.nodes > last_nodes,
                "深度 {d} 只搜了 {} 个节点，不比深度 {} 的 {last_nodes} 多",
                st.nodes,
                d - 1
            );
            last_nodes = st.nodes;
        }
    }

    #[test]
    fn fixed_depth_is_reproducible() {
        // 只靠时间预算的话，机器负载会改变搜索深度，同一局面可能选出不同的着法。
        let g = e::create_game();
        let opts = Options {
            fixed_depth: Some(3),
            ..Default::default()
        };
        let first = choose_move(&g, lv(5), &opts);
        for _ in 0..3 {
            assert_eq!(
                choose_move(&g, lv(5), &opts),
                first,
                "钉死深度必须每次同一步"
            );
        }
    }

    #[test]
    fn the_top_tier_is_not_capped_at_depth_eight() {
        // 旧版第五档硬停在深度 8，时间没用完也不再往下。原生 Rust 一旦跑得到 8，
        // 收益会被那个封顶全部吃掉。这里锁住「顶档能超过 8」。
        let g = pos(
            &[
                (0, 8, Tiger, Red),
                (6, 8, Lion, Red),
                (0, 0, Lion, Black),
                (6, 0, Tiger, Black),
            ],
            Red,
        );
        // 钉死深度而不是给时间预算：断言不能依赖墙钟，否则慢 runner 上会 flake。
        // 顶档「没有封顶」这件事由 only_the_top_tier_searches_to_the_deadline
        // 从结构上锁住（max_depth() == None）；这里锁住搜索机器确实跑得过 8 层。
        let opts = Options {
            fixed_depth: Some(12),
            ..Default::default()
        };
        let (mv, st) = choose_move_with_stats(&g, lv(5), &opts);
        assert!(mv.is_some());
        assert_eq!(st.depth, 12, "残局搜不到 12 层，深度 8 以上这条路是断的");
        assert!(st.depth > 8);
    }

    #[test]
    fn the_avoid_list_shifts_the_choice() {
        // 防重复：把当前会走到的那一步对应的局面放进 avoid，选择应当改变。
        // 这条锁住 avoid 真的接进了搜索，而不是个摆设参数。
        let g = e::create_game();
        let plain = Options {
            fixed_depth: Some(2),
            ..Default::default()
        };
        let first = choose_move(&g, lv(4), &plain).expect("有棋可走");

        // 算出走完 first 之后的局面指纹
        let (after, _) = e::apply_move(&g, first).expect("合法");
        let avoided = Options {
            fixed_depth: Some(2),
            avoid: vec![position_key(&after)],
            ..Default::default()
        };
        let (second, _) = choose_move_with_stats(&g, lv(4), &avoided);
        assert!(second.is_some());
        // 开局有很多等价走法，惩罚 60 分足以把这一步挤下去。
        assert_ne!(second, Some(first), "avoid 没起作用");
    }

    #[test]
    fn search_never_trades_a_win_for_material() {
        // 一步进兽穴就赢，旁边同时挂着一个可以白吃的象。必须选赢，不选吃。
        let g = pos(
            &[
                (3, 1, Wolf, Red),
                (2, 1, Elephant, Black),
                (6, 6, Cat, Black),
            ],
            Red,
        );
        for n in 2..=MAX_LEVEL {
            let mv = choose_move(&g, lv(n), &Options::default()).expect("有棋可走");
            assert_eq!(mv.to, e::den_of(Black), "第 {n} 档拿赢去换了子力");
        }
    }
}
