import { useCallback, useEffect, useMemo, useState } from "react";
// 这一行让 CI 的「前端构建」job 真的会因为 WASM 接口改坏而失败。
import init, {
  cols,
  rows,
  is_water,
  is_croc,
  is_trap_of,
  den_of,
  create_game,
  legal_moves_from,
  apply_move,
  name_cn,
  position_key,
} from "jungle-engine-wasm";
import "./App.css";

type Side = "red" | "black";
type Rank =
  | "rat" | "cat" | "dog" | "wolf"
  | "leopard" | "tiger" | "lion" | "elephant";
type Piece = { rank: Rank; side: Side };
type Outcome =
  | { kind: "ongoing" }
  | { kind: "won"; side: Side }
  | { kind: "draw" };
type Game = { board: (Piece | null)[]; turn: Side; outcome: Outcome };
type MoveOutcome = {
  moved: Piece;
  captured: Piece | null;
  mutual: boolean;
  outcome: Outcome;
};

function App() {
  const [ready, setReady] = useState(false);
  const [game, setGame] = useState<Game | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [log, setLog] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    init()
      .then(() => {
        setReady(true);
        setGame(create_game() as Game);
      })
      .catch((e: unknown) => setError(String(e)));
  }, []);

  // 落点是同步算出来的——没有 await，没有 IPC，没有等待态。
  // 这正是规则走 WASM 而不是走 Tauri 后端的全部理由。
  const targets = useMemo<number[]>(() => {
    if (!ready || !game || selected === null) return [];
    return legal_moves_from(game, selected) as number[];
  }, [ready, game, selected]);

  const onCell = useCallback(
    (i: number) => {
      if (!game || game.outcome.kind !== "ongoing") return;
      const p = game.board[i];

      if (selected !== null && targets.includes(i)) {
        const res = apply_move(game, selected, i) as {
          game: Game;
          outcome: MoveOutcome;
        };
        const mo = res.outcome;
        setGame(res.game);
        setSelected(null);
        setLog(
          [
            `${name_cn(mo.moved.rank)} ${selected}→${i}`,
            mo.captured ? `吃 ${name_cn(mo.captured.rank)}` : null,
            mo.mutual ? "同归于尽" : null,
            mo.outcome.kind === "won"
              ? `${mo.outcome.side === "red" ? "绿方" : "红方"}胜`
              : mo.outcome.kind === "draw"
                ? "和棋"
                : null,
          ]
            .filter(Boolean)
            .join(" · "),
        );
        return;
      }

      setSelected(p && p.side === game.turn ? i : null);
    },
    [game, selected, targets],
  );

  if (error) return <main className="container">WASM 加载失败：{error}</main>;
  if (!game) return <main className="container">加载引擎…</main>;

  const c = cols();
  const r = rows();

  return (
    <main className="container">
      <h1>引擎连通性自检</h1>
      <p>
        {c}×{r} · {game.board.filter(Boolean).length} 子 ·{" "}
        {game.outcome.kind === "ongoing"
          ? `轮到 ${game.turn === "red" ? "绿方" : "红方"}`
          : game.outcome.kind === "draw"
            ? "和棋"
            : `${game.outcome.side === "red" ? "绿方" : "红方"}胜`}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${c}, 42px)`,
          gap: 2,
          justifyContent: "center",
        }}
      >
        {game.board.map((p, i) => {
          const isTarget = targets.includes(i);
          const den = i === den_of("red") || i === den_of("black");
          const trap = is_trap_of(i, "red") || is_trap_of(i, "black");
          return (
            <button
              key={i}
              onClick={() => onCell(i)}
              title={String(i)}
              style={{
                height: 42,
                padding: 0,
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 700,
                borderRadius: 5,
                border:
                  selected === i
                    ? "3px solid #ffc21a"
                    : isTarget
                      ? "3px solid #ffc21a"
                      : "1px solid rgba(0,0,0,.15)",
                // 地形全部来自 Rust 引擎，前端没有第二份实现
                background: is_croc(i)
                  ? "#6aa84f"
                  : is_water(i)
                    ? "#9ad4ef"
                    : den
                      ? "#c9b6f0"
                      : trap
                        ? "#f2c25a"
                        : "#d9e7bd",
                color: p?.side === "black" ? "#cf3a34" : "#2c6a26",
              }}
            >
              {p ? name_cn(p.rank) : isTarget ? "·" : ""}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 13, minHeight: 20 }}>{log}</p>
      <p style={{ fontSize: 11, opacity: 0.55, fontFamily: "monospace" }}>
        局面指纹 {position_key(game).toString(16)} · 同步取自引擎，防重复列表用它
      </p>
      <p style={{ fontSize: 12, opacity: 0.7 }}>
        点自己的棋子看落点。落点由 Rust 引擎经 WASM 同步返回，无 IPC、无等待。
        这只是连通性自检，不是最终界面。
      </p>
    </main>
  );
}

export default App;
