//! `jungle-engine` 的 WASM 包装层。
//!
//! 存在的唯一理由：界面必须能**同步**算出合法落点。走 Tauri IPC 会引入延迟、
//! 连点乱序、组件卸载后的过期响应——这些不是性能问题，是交互链路被切断。
//! 规则本身一行都不在这里，全在 `jungle-engine`，所以不存在双份实现。

#![forbid(unsafe_code)]

use jungle_engine as engine;
use wasm_bindgen::prelude::*;

/// 新开一局，返回初始局面。
#[wasm_bindgen]
pub fn create_game() -> Result<JsValue, JsValue> {
    let g = engine::create_game();
    serde_wasm_bindgen::to_value(&g).map_err(|e| JsValue::from_str(&e.to_string()))
}

#[wasm_bindgen]
pub fn is_water(i: usize) -> bool {
    engine::is_water(i)
}

#[wasm_bindgen]
pub fn is_croc(i: usize) -> bool {
    engine::is_croc(i)
}

#[wasm_bindgen]
pub fn cols() -> usize {
    engine::COLS
}

#[wasm_bindgen]
pub fn rows() -> usize {
    engine::ROWS
}
