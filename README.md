# 斗兽棋 · 教学与陪玩

给 6 岁小孩玩的斗兽棋。6 关教学、5 档电脑对手、全程语音讲解。

正在从原生 JS 重写成 Rust + Tauri。旧版在 [`legacy/`](legacy/)，仍可用，
双击 `legacy/index.html` 即玩，零依赖零构建。

## 架构

规则引擎用 Rust 写，**一份源码编译成两个产物**：

```
crates/engine/   规则，唯一实现 ─┬─ 原生 ─→ crates/ai ─→ src-tauri   AI 搜索，走 IPC，异步
                                 └─ WASM ──────────────→ 前端         合法落点，同步，零 IPC
```

为什么要这么切：

- **界面算合法落点必须同步。** 选中棋子要立刻高亮，走 IPC 会带来延迟、
  连点乱序、组件卸载后的过期响应。这不是性能问题，是交互链路被切断。
  所以规则走 WASM，在前端进程里同步跑。
- **AI 搜索该异步。** 最高一档思考 3 秒，本来就要等，IPC 在这里是对的。
  原生 Rust 还能吃满多核——这正是比 JS 版搜得更深的来源。
- **规则只有一份。** 前端和 AI 调的是同一个 crate，不存在两套实现漂移成
  「界面说能走、点下去被拒绝」。

## 电脑对手有多强

原生 Rust 相对旧版 JS 的实测（Intel i5-7500，2017 年 4 核）：

| 局面 | 旧版 JS 层数 | Rust 层数 | 旧版实耗 | Rust 实耗 |
|---|---:|---:|---:|---:|
| 开局 | 7 | **8** | 3001ms | 3000ms |
| 中局 | 8 | **9** | 885ms | 3000ms |
| 残局 | 8 | **21** | 8ms | 3000ms |

纯速度（固定深度 6，同一算法）：开局 279ms → 80ms，中局 88ms → 23ms，
约 **3.5 倍节点吞吐**。

但开局只多 1 层——搜索深度是指数增长的，快 3.5 倍通常就换一层。
**真正的收获在中局和残局**，而且来源不是速度，是解开了旧版的深度封顶：
旧版第五档硬停在深度 8，残局里 8 毫秒就撞顶，剩下 2.99 秒白白干等。

复现：

```bash
cargo run --release -p jungle-ai --example bench   # Rust
node tools/bench-legacy.cjs                        # 旧版 JS 对照
```

## 开发

```bash
npm install
npm run wasm:build      # 改了 crates/engine 之后要重跑
npm run tauri:dev
```

测试：

```bash
npm run test:rust       # Rust 引擎和 AI
npm run test:legacy     # 旧版 60 个测试，移植的行为基准
npm run test:diff       # 差分：Rust 引擎 vs 旧 JS 引擎，逐步比对
```

`legacy/` 里的旧版是移植的行为基准，CI 持续跑它的测试。它一旦挂了，
「Rust 版和旧版行为一致」这个判断就失去依据，所以不要动它。

## 出安装包

打 tag 触发 GitHub Actions，三平台同时构建，产物发到 draft release：

```bash
git tag v0.1.0 && git push origin v0.1.0
```

也可以在 Actions 页面手动触发 Release 工作流。

**为什么必须用 CI 出包：** Tauri 链接的是系统 WebView（Windows 用 WebView2、
macOS 用 WKWebView、Linux 用 WebKitGTK）和系统原生库，官方不支持交叉编译。
在 macOS 上打不出 Windows 包，所以每个平台的包必须在那个平台上构建。

## 规则、配色、针对 6 岁做的交互决定

见 [`legacy/README.md`](legacy/README.md)。那份文档记录了所有设计取舍的
理由，重写不改变这些决定。
