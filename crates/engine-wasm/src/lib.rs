//! `jungle-engine` 的 WASM 包装层。
//!
//! 存在的唯一理由：界面必须能**同步**算出合法落点。走 Tauri IPC 会引入延迟、
//! 连点乱序、组件卸载后的过期响应——这些不是性能问题，是交互链路被切断。
//! 规则本身一行都不在这里，全在 `jungle-engine`，所以不存在双份实现。
//!
//! 接口是纯函数，不是可变状态机：局面进、局面出。权威状态由 React 持有，
//! 悔棋就是留着旧值，教学关走错就是丢掉新值。让 WASM 内部藏一个状态机会让
//! 这两件事都变复杂，而 63 格的序列化开销跟 React 渲染比可以忽略。

#![forbid(unsafe_code)]

use jungle_engine as engine;
use wasm_bindgen::prelude::*;

fn to_js<T: serde::Serialize>(v: &T) -> Result<JsValue, JsValue> {
    serde_wasm_bindgen::to_value(v).map_err(|e| JsValue::from_str(&e.to_string()))
}

fn from_js<T: serde::de::DeserializeOwned>(v: JsValue) -> Result<T, JsValue> {
    serde_wasm_bindgen::from_value(v).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// 新开一局，返回初始局面。
#[wasm_bindgen]
pub fn create_game() -> Result<JsValue, JsValue> {
    to_js(&engine::create_game())
}

/// 某个棋子的全部合法落点。界面高亮金点靠它，每次点击都要调，所以必须同步。
#[wasm_bindgen]
pub fn legal_moves_from(game: JsValue, from: usize) -> Result<JsValue, JsValue> {
    let g: engine::Game = from_js(game)?;
    to_js(&engine::legal_moves_from(&g, from))
}

/// 某一方的全部合法走法。困毙判定和 AI 之外，教学关也用它检查目标可达。
#[wasm_bindgen]
pub fn legal_moves(game: JsValue, side: JsValue) -> Result<JsValue, JsValue> {
    let g: engine::Game = from_js(game)?;
    let s: engine::Side = from_js(side)?;
    to_js(&engine::legal_moves(&g, s))
}

/// 走一步。返回 `{ game, outcome }`：新局面，加上这一步发生了什么
/// （吃了谁、是否同归于尽、有没有分出胜负），界面照着它播动画和语音。
///
/// 非法走法返回 Err，里面是结构化的 `MoveError`，不是字符串。
#[wasm_bindgen]
pub fn apply_move(game: JsValue, from: usize, to: usize) -> Result<JsValue, JsValue> {
    let g: engine::Game = from_js(game)?;
    match engine::apply_move(&g, engine::Move { from, to }) {
        Ok((next, outcome)) => {
            let obj = js_sys::Object::new();
            js_sys::Reflect::set(&obj, &"game".into(), &to_js(&next)?)?;
            js_sys::Reflect::set(&obj, &"outcome".into(), &to_js(&outcome)?)?;
            Ok(obj.into())
        }
        Err(err) => Err(to_js(&err)?),
    }
}

/// 摆一个稀疏局面。教学关的初始局面靠它，不走完整开局。
/// `pieces` 是 `[{c, r, rank, side}]`。
#[wasm_bindgen]
pub fn make_position(pieces: JsValue, turn: JsValue) -> Result<JsValue, JsValue> {
    #[derive(serde::Deserialize)]
    struct Spec {
        c: usize,
        r: usize,
        rank: engine::Rank,
        side: engine::Side,
    }
    let specs: Vec<Spec> = from_js(pieces)?;
    let t: engine::Side = from_js(turn)?;
    let list: Vec<_> = specs.iter().map(|s| (s.c, s.r, s.rank, s.side)).collect();
    to_js(&engine::make_position(&list, t))
}

// --- 地形。都是纯函数，前端画棋盘时逐格调用。 ---

#[wasm_bindgen]
pub fn is_water(i: usize) -> bool {
    engine::is_water(i)
}

#[wasm_bindgen]
pub fn is_croc(i: usize) -> bool {
    engine::is_croc(i)
}

#[wasm_bindgen]
pub fn is_trap_of(i: usize, side: JsValue) -> Result<bool, JsValue> {
    let s: engine::Side = from_js(side)?;
    Ok(engine::is_trap_of(i, s))
}

#[wasm_bindgen]
pub fn den_of(side: JsValue) -> Result<usize, JsValue> {
    let s: engine::Side = from_js(side)?;
    Ok(engine::den_of(s))
}

#[wasm_bindgen]
pub fn cols() -> usize {
    engine::COLS
}

#[wasm_bindgen]
pub fn rows() -> usize {
    engine::ROWS
}
