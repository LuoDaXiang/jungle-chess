import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
// 规则全部同步走 WASM：选中棋子要立刻出落点，不能等 IPC。
import init, {
  cols,

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
type ThinkReply = {
  requestId: number;
  stale: boolean;
  mv: { from: number; to: number } | null;
  depth: number;
  nodes: number;
  elapsedMs: number;
};

const LEVEL_NAMES = ["最简单", "有点难", "很难", "非常难", "最厉害"];
const SIDE_CN = (s: Side) => (s === "red" ? "你" : "电脑");

function describe(mo: MoveOutcome, from: number, to: number): string {
  const bits = [`${name_cn(mo.moved.rank)} ${from}→${to}`];
  if (mo.captured) bits.push(`吃${name_cn(mo.captured.rank)}`);
  if (mo.mutual) bits.push("同归于尽");
  if (mo.outcome.kind === "won") bits.push(`${SIDE_CN(mo.outcome.side)}赢了`);
  if (mo.outcome.kind === "draw") bits.push("和棋");
  return bits.join(" · ");
}

function App() {
  const [game, setGame] = useState<Game | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [level, setLevel] = useState(2);
  const [log, setLog] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const [stats, setStats] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  // 防重复：界面持有近期局面指纹，调 AI 时传过去。引擎不存历史，
  // 这个责任在持有局面的这一侧。
  // 指纹是 u64 → JS 的 bigint。传给 Tauri 时转字符串，JSON 装不下 BigInt。
  const avoid = useRef<bigint[]>([]);
  const reqId = useRef(0);

  useEffect(() => {
    init()
      .then(() => setGame(create_game() as Game))
      .catch((e: unknown) => setError(String(e)));
  }, []);

  const newGame = useCallback(() => {
    avoid.current = [];
    reqId.current += 1; // 作废还在路上的搜索
    setGame(create_game() as Game);
    setSelected(null);
    setLog([]);
    setStats("");
    setThinking(false);
  }, []);

  const aiTurn = useCallback(
    async (g: Game) => {
      if (g.outcome.kind !== "ongoing") return;
      reqId.current += 1;
      const myId = reqId.current;
      setThinking(true);
      try {
        const reply = await invoke<ThinkReply>("think", {
          req: {
            game: g,
            level,
            requestId: myId,
            avoid: avoid.current.map(String),
          },
        });
        // 悔棋或重开会作废旧请求，过期的回复必须丢掉，
        // 否则一个三秒前算出的着法会落到已经变了的棋盘上。
        if (reply.stale || reply.requestId !== reqId.current) return;
        if (!reply.mv) {
          setLog((l) => [...l, "电脑没棋可走"]);
          return;
        }
        const res = apply_move(g, reply.mv.from, reply.mv.to) as {
          game: Game;
          outcome: MoveOutcome;
        };
        avoid.current = [...avoid.current, position_key(g)].slice(-8);
        setGame(res.game);
        setLog((l) => [...l, "电脑：" + describe(res.outcome, reply.mv!.from, reply.mv!.to)]);
        setStats(`搜到 ${reply.depth} 层 · ${reply.nodes.toLocaleString()} 节点 · ${reply.elapsedMs}ms`);
      } catch (e) {
        setError(
          String(e) +
            "（AI 是 Tauri 后端命令，必须跑 npm run tauri:dev，纯浏览器里调不到）",
        );
      } finally {
        setThinking(false);
      }
    },
    [level],
  );

  const onCell = useCallback(
    (i: number) => {
      if (!game || thinking || game.outcome.kind !== "ongoing") return;
      if (game.turn !== "red") return;

      if (selected !== null) {
        const targets = legal_moves_from(game, selected) as number[];
        if (targets.includes(i)) {
          const res = apply_move(game, selected, i) as {
            game: Game;
            outcome: MoveOutcome;
          };
          avoid.current = [...avoid.current, position_key(game)].slice(-8);
          setGame(res.game);
          setSelected(null);
          setLog((l) => [...l, "你：" + describe(res.outcome, selected, i)]);
          if (res.game.outcome.kind === "ongoing") void aiTurn(res.game);
          return;
        }
      }
      const p = game.board[i];
      setSelected(p && p.side === "red" ? i : null);
    },
    [game, selected, thinking, aiTurn],
  );

  if (error) return <main className="container">出错了：{error}</main>;
  if (!game) return <main className="container">加载引擎…</main>;

  const c = cols();
  const targets =
    selected === null ? [] : (legal_moves_from(game, selected) as number[]);
  const over = game.outcome.kind !== "ongoing";

  return (
    <main className="container" style={{ padding: 12 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 8 }}>
        <button onClick={newGame}>重开一局</button>
        <label>
          难度{" "}
          <select value={level} onChange={(e) => setLevel(Number(e.target.value))}>
            {LEVEL_NAMES.map((n, k) => (
              <option key={k} value={k + 1}>
                {k + 1} · {n}
              </option>
            ))}
          </select>
        </label>
        <strong>
          {over
            ? game.outcome.kind === "won"
              ? `${SIDE_CN(game.outcome.side)}赢了`
              : "和棋"
            : thinking
              ? "电脑在想…"
              : game.turn === "red"
                ? "该你走"
                : "…"}
        </strong>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${c}, 46px)`,
          gap: 2,
          justifyContent: "start",
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
              title={`${i} (${i % c},${Math.floor(i / c)})`}
              style={{
                height: 46,
                padding: 0,
                cursor: over || thinking ? "default" : "pointer",
                fontSize: 18,
                fontWeight: 700,
                borderRadius: 5,
                border:
                  selected === i || isTarget
                    ? "3px solid #ffc21a"
                    : "1px solid rgba(0,0,0,.2)",
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

      <p style={{ fontSize: 12, opacity: 0.7, margin: "8px 0 4px" }}>
        你是绿方（下方），先走。紫=兽穴 金=陷阱 蓝=河 深绿=鳄鱼。{stats}
      </p>
      <div style={{ fontSize: 12, fontFamily: "monospace", maxHeight: 180, overflowY: "auto" }}>
        {log.slice(-25).map((t, k) => (
          <div key={k}>{t}</div>
        ))}
      </div>
    </main>
  );
}

export default App;
