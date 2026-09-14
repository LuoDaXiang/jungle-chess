//! 检验「四子迷你对局」这个教学关卡配置是否站得住。
//!
//! 提议的配置：玩家（red）狼 + 鼠，电脑（black）猫 + 象。
//! 它要当第 7 关——从单步练习过渡到完整对局的台阶。所以必须满足三件事：
//!   1. 下得完，不会无限蹭子；
//!   2. 不是一边倒，孩子输得掉也赢得了；
//!   3. 局长适中，六岁小孩坐得住。
//!
//! 方法：用 AI 替双方走，换种子跑多局。孩子那侧跑两个档位，因为单独哪个都不像
//! 真实的六岁小孩：
//!   - 第一档只在不送子的走法里随机挑，根本不用评估函数，会瞎逛；
//!   - 第二档有目的但只看两层，会直奔兽穴。
//! 真实的孩子在两者之间，所以结论也只能是个区间，不是一个数。
//!
//!   cargo run --release -p jungle-ai --example mini_match

use jungle_ai::{choose_move, Level, Options};
use jungle_engine as e;
use jungle_engine::Rank::*;
use jungle_engine::Side::*;

/// 单局上限。超过就算「下不完」，这本身就是配置不合格的证据。
const MAX_PLIES: usize = 200;

struct Tally {
    red_win: u32,
    black_win: u32,
    draw: u32,
    unfinished: u32,
    total_plies: u64,
}

fn play_levels(
    setup: &[(usize, usize, e::Rank, e::Side)],
    seed: u64,
    red_level: u8,
    black_level: u8,
) -> (Option<e::Outcome>, usize) {
    let mut g = e::make_position(setup, Red);
    let mut recent: Vec<u64> = Vec::new();

    for ply in 0..MAX_PLIES {
        if g.outcome.is_over() {
            return (Some(g.outcome), ply);
        }
        let lv = Level::new(if g.turn == Red {
            red_level
        } else {
            black_level
        })
        .unwrap();
        // 两边用不同的种子流，否则双方决策会同步得不自然。
        let opts = Options {
            rng_seed: Some(
                seed.wrapping_mul(6364136223846793005)
                    .wrapping_add(ply as u64),
            ),
            avoid: recent.clone(),
            ..Default::default()
        };
        let Some(mv) = choose_move(&g, lv, &opts) else {
            // 无合法走法：引擎会在上一步就判负，这里兜底。
            return (Some(g.outcome), ply);
        };
        recent.push(jungle_ai::position_key(&g));
        if recent.len() > 8 {
            recent.remove(0);
        }
        let (next, _) = e::apply_move(&g, mv).expect("AI 只会给出合法走法");
        g = next;
    }
    (None, MAX_PLIES)
}

fn run_levels(
    name: &str,
    setup: &[(usize, usize, e::Rank, e::Side)],
    games: u64,
    red_level: u8,
    black_level: u8,
) {
    let mut t = Tally {
        red_win: 0,
        black_win: 0,
        draw: 0,
        unfinished: 0,
        total_plies: 0,
    };
    for seed in 0..games {
        let (outcome, plies) = play_levels(setup, seed + 1, red_level, black_level);
        t.total_plies += plies as u64;
        match outcome {
            Some(e::Outcome::Won(Red)) => t.red_win += 1,
            Some(e::Outcome::Won(Black)) => t.black_win += 1,
            Some(e::Outcome::Draw) => t.draw += 1,
            _ => t.unfinished += 1,
        }
    }
    let g = games as f64;
    println!(
        "{:<22} 孩子胜 {:>3} ({:>4.0}%)  电脑胜 {:>3} ({:>4.0}%)  和 {:>3}  没下完 {:>3}  平均 {:>5.1} 步",
        name,
        t.red_win,
        t.red_win as f64 / g * 100.0,
        t.black_win,
        t.black_win as f64 / g * 100.0,
        t.draw,
        t.unfinished,
        t.total_plies as f64 / g
    );
}

fn main() {
    let games = 300;
    println!("每种配置 {games} 局，双方都用第一档 AI，单局上限 {MAX_PLIES} 步\n");

    // codex 提议的配置。
    run_levels(
        "狼鼠 vs 猫象",
        &[
            (2, 6, Wolf, Red),
            (6, 6, Rat, Red),
            (5, 1, Cat, Black),
            (6, 2, Elephant, Black),
        ],
        games,
        1,
        1,
    );

    // 对照组，用来判断上面那组是配置本身的问题还是四子局普遍如此。
    run_levels(
        "狼豹 vs 猫犬",
        &[
            (2, 6, Wolf, Red),
            (4, 6, Leopard, Red),
            (5, 1, Cat, Black),
            (1, 1, Dog, Black),
        ],
        games,
        1,
        1,
    );
    run_levels(
        "鼠猫 vs 鼠犬",
        &[
            (6, 6, Rat, Red),
            (1, 7, Cat, Red),
            (0, 2, Rat, Black),
            (1, 1, Dog, Black),
        ],
        games,
        1,
        1,
    );
    run_levels(
        "象鼠 vs 象鼠",
        &[
            (0, 6, Elephant, Red),
            (6, 6, Rat, Red),
            (6, 2, Elephant, Black),
            (0, 2, Rat, Black),
        ],
        games,
        1,
        1,
    );
    // 六子，给第 7 关和第 8 关之间再留一级台阶的可能性。
    run_levels(
        "狼鼠狮 vs 猫象虎",
        &[
            (2, 6, Wolf, Red),
            (6, 6, Rat, Red),
            (6, 8, Lion, Red),
            (5, 1, Cat, Black),
            (6, 2, Elephant, Black),
            (6, 0, Tiger, Black),
        ],
        games,
        1,
        1,
    );

    // 上面全部摆在双方底线附近，结果近一半下不完：四个子在 63 格上互相够不着，
    // 就开始瞎逛。问题不在配子，在起手离兽穴太远。下面把双方都往中间挪，
    // 到对方兽穴只有四到六步。
    println!("\n—— 同样的配子，但起手靠近中线 ——\n");

    run_levels(
        "狼鼠 vs 猫象 · 近",
        &[
            (2, 5, Wolf, Red),
            (4, 5, Rat, Red),
            (2, 3, Cat, Black),
            (4, 3, Elephant, Black),
        ],
        games,
        1,
        1,
    );
    run_levels(
        "狼鼠 vs 猫象 · 很近",
        &[
            (2, 4, Wolf, Red),
            (4, 4, Rat, Red),
            (2, 2, Cat, Black),
            (4, 2, Elephant, Black),
        ],
        games,
        1,
        1,
    );
    run_levels(
        "狼猫 vs 狼猫 · 近",
        &[
            (2, 5, Wolf, Red),
            (4, 5, Cat, Red),
            (2, 3, Wolf, Black),
            (4, 3, Cat, Black),
        ],
        games,
        1,
        1,
    );
    // 只留中央一路，逼双方正面相遇。
    run_levels(
        "狼鼠 vs 猫象 · 中路",
        &[
            (3, 5, Wolf, Red),
            (2, 6, Rat, Red),
            (3, 3, Elephant, Black),
            (4, 2, Cat, Black),
        ],
        games,
        1,
        1,
    );

    // 上面全部拿第一档当孩子的替身，可这是个方法错误：pick_level1 根本不用评估
    // 函数，它在不送子的走法里随机挑，只有一步能赢才必赢——它会瞎逛，而刚学完
    // 「走进对方的家就赢」的孩子不会。用第二档当孩子的替身更接近真实：有目的，
    // 但只看两层。电脑那侧仍是第一档，和教学关实际会用的档位一致。
    println!("\n—— 孩子侧换成第二档（有目的但浅），电脑仍是第一档 ——\n");

    for (name, setup) in [
        (
            "狼鼠 vs 猫象 · 底线",
            vec![
                (2, 6, Wolf, Red),
                (6, 6, Rat, Red),
                (5, 1, Cat, Black),
                (6, 2, Elephant, Black),
            ],
        ),
        (
            "狼鼠 vs 猫象 · 近",
            vec![
                (2, 5, Wolf, Red),
                (4, 5, Rat, Red),
                (2, 3, Cat, Black),
                (4, 3, Elephant, Black),
            ],
        ),
        (
            "狼鼠 vs 猫象 · 很近",
            vec![
                (2, 4, Wolf, Red),
                (4, 4, Rat, Red),
                (2, 2, Cat, Black),
                (4, 2, Elephant, Black),
            ],
        ),
        (
            "狼猫 vs 狼猫 · 近",
            vec![
                (2, 5, Wolf, Red),
                (4, 5, Cat, Red),
                (2, 3, Wolf, Black),
                (4, 3, Cat, Black),
            ],
        ),
    ] {
        run_levels(name, &setup, games, 2, 1);
    }
}
