//! 搜索基准。回答一个具体问题：原生 Rust 在同样的 3000ms 里比旧版 JS 深几层。
//!
//! 两项分开量，因为它们说的不是一回事：
//!   1. 固定预算下完整搜完的层数 —— 用户真正感受到的棋力。
//!   2. 固定深度下的节点吞吐 —— 纯速度，不受时钟噪声影响。
//!
//! 对照脚本是 `tools/bench-legacy.cjs`，局面必须一模一样。
//!
//!   cargo run --release -p jungle-ai --example bench

use jungle_ai::{choose_move_with_stats, Level, Options};
use jungle_engine as e;
use jungle_engine::Rank::*;
use jungle_engine::Side::*;

/// 三个局面：开局、中局、残局。只量开局会低估中局的分支因子。
fn positions() -> Vec<(&'static str, e::Game)> {
    vec![
        ("开局", e::create_game()),
        (
            "中局",
            e::make_position(
                &[
                    (0, 6, Elephant, Red),
                    (2, 6, Wolf, Red),
                    (6, 6, Rat, Red),
                    (1, 7, Cat, Red),
                    (0, 8, Tiger, Red),
                    (6, 8, Lion, Red),
                    (0, 0, Lion, Black),
                    (6, 0, Tiger, Black),
                    (1, 1, Dog, Black),
                    (0, 2, Rat, Black),
                    (4, 2, Wolf, Black),
                    (6, 2, Elephant, Black),
                ],
                Red,
            ),
        ),
        (
            "残局",
            e::make_position(
                &[
                    (0, 8, Tiger, Red),
                    (6, 8, Lion, Red),
                    (0, 0, Lion, Black),
                    (6, 0, Tiger, Black),
                ],
                Red,
            ),
        ),
    ]
}

fn main() {
    let lv5 = Level::new(5).unwrap();

    println!("== 固定 3000ms 预算，第五档 ==");
    println!(
        "{:<8} {:>6} {:>12} {:>9} {:>12}",
        "局面", "层数", "节点", "毫秒", "节点/秒"
    );
    for (name, g) in positions() {
        let (_, st) = choose_move_with_stats(&g, lv5, &Options::default());
        let nps = if st.elapsed_ms > 0 {
            st.nodes * 1000 / st.elapsed_ms
        } else {
            0
        };
        println!(
            "{:<8} {:>6} {:>12} {:>9} {:>12}",
            name, st.depth, st.nodes, st.elapsed_ms, nps
        );
    }

    println!();
    println!("== 固定深度 6，量纯吞吐（不受时钟噪声影响）==");
    println!(
        "{:<8} {:>12} {:>9} {:>12}",
        "局面", "节点", "毫秒", "节点/秒"
    );
    for (name, g) in positions() {
        let opts = Options {
            fixed_depth: Some(6),
            budget_ms: Some(600_000),
            ..Default::default()
        };
        let (_, st) = choose_move_with_stats(&g, lv5, &opts);
        let nps = if st.elapsed_ms > 0 {
            st.nodes * 1000 / st.elapsed_ms
        } else {
            0
        };
        println!(
            "{:<8} {:>12} {:>9} {:>12}",
            name, st.nodes, st.elapsed_ms, nps
        );
    }

    println!();
    println!("== 各档在自己的预算内搜到第几层 ==");
    println!(
        "{:<6} {:>9} {:>6} {:>12} {:>9}",
        "档位", "预算ms", "层数", "节点", "实耗ms"
    );
    let g = e::create_game();
    for n in 1..=5u8 {
        let lv = Level::new(n).unwrap();
        let (_, st) = choose_move_with_stats(
            &g,
            lv,
            &Options {
                rng_seed: Some(1),
                ..Default::default()
            },
        );
        println!(
            "{:<6} {:>9} {:>6} {:>12} {:>9}",
            n,
            lv.budget_ms(),
            st.depth,
            st.nodes,
            st.elapsed_ms
        );
    }
}
