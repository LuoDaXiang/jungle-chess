//! Tauri 后端。只做一件事：跑 AI 搜索。
//!
//! 规则**不在这里**——界面通过 WASM 同步调引擎算合法落点，不走 IPC。
//! 这里只接一件延迟无所谓的事：电脑思考。顶档要想满 3 秒，那点 IPC 开销为零。

use std::sync::atomic::{AtomicU64, Ordering};

use jungle_ai as ai;
use jungle_engine as e;
use serde::{Deserialize, Serialize};

/// 最近一次请求的编号。界面重开一局或悔棋之后，旧的搜索结果必须作废——
/// 否则一个 3 秒前发出的着法会落到已经变了的棋盘上。
static LATEST_REQUEST: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, Deserialize)]
pub struct ThinkRequest {
    pub game: e::Game,
    pub level: u8,
    /// 界面自己发的请求号，单调递增。
    pub request_id: u64,
    /// 近期局面指纹，用来打散来回蹭子。由界面维护并传进来——
    /// 引擎不存历史，这个责任在持有局面的那一侧。
    #[serde(default)]
    pub avoid: Vec<u64>,
    /// 覆盖档位自带的时间预算。给基准测试和测试用。
    #[serde(default)]
    pub budget_ms: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThinkReply {
    pub request_id: u64,
    /// 搜索被更新的请求作废时为 true，界面应当直接丢弃这个回复。
    pub stale: bool,
    pub mv: Option<e::Move>,
    pub depth: u8,
    pub nodes: u64,
    pub elapsed_ms: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ThinkError {
    pub message: String,
}

/// 让电脑想一步。
#[tauri::command]
async fn think(req: ThinkRequest) -> Result<ThinkReply, ThinkError> {
    let Some(level) = ai::Level::new(req.level) else {
        return Err(ThinkError {
            message: format!("难度 {} 不在 1..=5", req.level),
        });
    };

    LATEST_REQUEST.fetch_max(req.request_id, Ordering::SeqCst);

    let opts = ai::Options {
        budget_ms: req.budget_ms,
        fixed_depth: None,
        avoid: req.avoid,
        rng_seed: None,
    };

    // 搜索是同步的重活，丢到阻塞线程池，别占住 Tauri 的异步运行时。
    let request_id = req.request_id;
    let game = req.game;
    let (mv, stats) = tauri::async_runtime::spawn_blocking(move || {
        ai::choose_move_with_stats(&game, level, &opts)
    })
    .await
    .map_err(|err| ThinkError {
        message: format!("搜索线程崩了：{err}"),
    })?;

    // 想完之后再看一眼：这期间界面有没有发出更新的请求。
    let stale = LATEST_REQUEST.load(Ordering::SeqCst) > request_id;

    Ok(ThinkReply {
        request_id,
        stale,
        mv,
        depth: stats.depth,
        nodes: stats.nodes,
        elapsed_ms: stats.elapsed_ms,
    })
}

/// 局面指纹。界面维护防重复列表时要用，必须和 AI 内部用的是同一个函数。
#[tauri::command]
fn position_key(game: e::Game) -> u64 {
    ai::position_key(&game)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![think, position_key])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
