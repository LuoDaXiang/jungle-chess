import { useEffect, useState } from "react";
// 这一行的意义不只是「用上了」：它让 CI 的「前端构建」job 真的会因为 WASM
// 接口改坏而失败。在这之前那个 job 绿得毫无意义——vite 根本不碰 pkg/。
import init, {
  cols,
  rows,
  is_water,
  is_croc,
  create_game,
} from "jungle-engine-wasm";
import "./App.css";

type Piece = { rank: string; side: "red" | "black" };
type Game = { board: (Piece | null)[]; turn: string; winner: string | null };

function App() {
  const [game, setGame] = useState<Game | null>(null);
  const [dims, setDims] = useState<{ c: number; r: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // wasm-pack --target web 的产物必须先 init，之后所有导出函数都是同步的
    // ——界面算合法落点靠的就是这个「同步」。
    init()
      .then(() => {
        setDims({ c: cols(), r: rows() });
        setGame(create_game() as Game);
      })
      .catch((e: unknown) => setError(String(e)));
  }, []);

  if (error) return <main className="container">WASM 加载失败：{error}</main>;
  if (!game || !dims) return <main className="container">加载引擎…</main>;

  const pieceCount = game.board.filter(Boolean).length;

  return (
    <main className="container">
      <h1>引擎连通性自检</h1>
      <p>
        棋盘 {dims.c}×{dims.r} · 开局 {pieceCount} 子 · 先手 {game.turn}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${dims.c}, 34px)`,
          gap: 2,
          justifyContent: "center",
        }}
      >
        {game.board.map((p, i) => (
          <div
            key={i}
            title={String(i)}
            style={{
              height: 34,
              display: "grid",
              placeItems: "center",
              fontSize: 13,
              borderRadius: 4,
              // 地形全部来自 Rust 引擎，前端没有第二份实现
              background: is_croc(i)
                ? "#6aa84f"
                : is_water(i)
                  ? "#9ad4ef"
                  : "#d9e7bd",
              color: p?.side === "black" ? "#cf3a34" : "#3f8f36",
              fontWeight: 700,
            }}
          >
            {p ? p.rank.slice(0, 2) : ""}
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, opacity: 0.7 }}>
        绿=陆地 蓝=水 深绿=鳄鱼。地形和开局都由 Rust 引擎经 WASM 同步返回。
      </p>
    </main>
  );
}

export default App;
