//! 斗兽棋电脑对手。
//!
//! 只编译原生，不编译 WASM：它跑在 Tauri 后端，可以开线程吃满多核。
//! 界面通过 IPC 调它——AI 本来就要想几秒，异步在这里是对的。
//!
//! 时间预算沿用 `legacy/ai.js:29` 的五档。旧版在 i5-7500 上实测
//! 2 / 9 / 61 / 808 / 3001 ms，第五档吃满预算。原生 Rust 的收益不是
//! 「更快返回」，而是同样 3000ms 里搜得更深。

#![forbid(unsafe_code)]

/// 每档难度的思考时间上限，单位毫秒。与 `legacy/ai.js` 的 TIME_BUDGET_MS 一致。
pub const TIME_BUDGET_MS: [u64; 5] = [10, 80, 400, 1200, 3000];

/// 静态搜索层数，按难度。与 `legacy/ai.js` 的 QUIET 一致。
pub const QUIESCENCE_PLIES: [u8; 5] = [0, 0, 2, 4, 6];

/// null-move 剪枝只在第五档开。与 `legacy/ai.js` 的 NULLMOVE 一致。
pub const NULL_MOVE: [bool; 5] = [false, false, false, false, true];

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
    pub const fn budget_ms(self) -> u64 {
        TIME_BUDGET_MS[(self.0 - 1) as usize]
    }
    pub const fn quiescence_plies(self) -> u8 {
        QUIESCENCE_PLIES[(self.0 - 1) as usize]
    }
    pub const fn null_move(self) -> bool {
        NULL_MOVE[(self.0 - 1) as usize]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

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
        let got: Vec<u64> = (1..=MAX_LEVEL)
            .map(|n| Level::new(n).unwrap().budget_ms())
            .collect();
        assert_eq!(got, vec![10, 80, 400, 1200, 3000]);
    }

    #[test]
    fn null_move_pruning_is_top_level_only() {
        for n in 1..MAX_LEVEL {
            assert!(!Level::new(n).unwrap().null_move());
        }
        assert!(Level::new(MAX_LEVEL).unwrap().null_move());
    }
}
