//! 差分测试的 Rust 一侧。
//!
//! 从 stdin 读一行一个 JSON 局面，把规则判定按固定文本格式写到 stdout。
//! `tools/differential.cjs` 用旧 JS 引擎算出同样格式的文本，逐字比对。
//!
//! 为什么要它：Rust 引擎的实现和它的单元测试都是同一个人读同一份 JS 写出来的。
//! 读岔一条规则，实现和测试会一起岔，测试照样全绿。差分测试换了一个 oracle
//! ——旧 JS 引擎本身——才能抓住这种一致的误读。
//!
//! 线格式（两侧必须完全一致，所以定得很死）：
//!   输入：{"cells":["","7B",...63 个...],"turn":"red"}
//!   空格子是 ""，有子是 "<等级数字><R|B>"，例如 "8R" 是红象。

#![forbid(unsafe_code)]

use jungle_engine as e;
use std::io::{self, BufRead, Write};

fn rank_from_digit(d: u8) -> Option<e::Rank> {
    Some(match d {
        1 => e::Rank::Rat,
        2 => e::Rank::Cat,
        3 => e::Rank::Dog,
        4 => e::Rank::Wolf,
        5 => e::Rank::Leopard,
        6 => e::Rank::Tiger,
        7 => e::Rank::Lion,
        8 => e::Rank::Elephant,
        _ => return None,
    })
}

fn cell_code(p: Option<e::Piece>) -> String {
    match p {
        None => String::new(),
        Some(p) => format!(
            "{}{}",
            p.rank as u8,
            match p.side {
                e::Side::Red => 'R',
                e::Side::Black => 'B',
            }
        ),
    }
}

fn parse_position(v: &serde_json::Value) -> Result<e::Game, String> {
    let cells = v["cells"].as_array().ok_or("cells 不是数组")?;
    if cells.len() != e::CELLS {
        return Err(format!("cells 应有 {} 个，实际 {}", e::CELLS, cells.len()));
    }
    let turn = match v["turn"].as_str().ok_or("turn 不是字符串")? {
        "red" => e::Side::Red,
        "black" => e::Side::Black,
        other => return Err(format!("turn 只能是 red/black，收到 {other}")),
    };

    let mut pieces = Vec::new();
    for (i, cell) in cells.iter().enumerate() {
        let s = cell.as_str().ok_or("格子不是字符串")?;
        if s.is_empty() {
            continue;
        }
        let bytes = s.as_bytes();
        if bytes.len() != 2 {
            return Err(format!("格子 {i} 的编码 {s:?} 不是两个字符"));
        }
        let rank = rank_from_digit(bytes[0] - b'0').ok_or(format!("格子 {i} 等级非法"))?;
        let side = match bytes[1] {
            b'R' => e::Side::Red,
            b'B' => e::Side::Black,
            _ => return Err(format!("格子 {i} 的方非法")),
        };
        pieces.push((e::col_of(i), e::row_of(i), rank, side));
    }

    let mut g = e::make_position(&pieces, turn);
    // make_position 一律给 Ongoing。差分脚本只喂还没分出胜负的局面，
    // 所以这里不需要额外恢复终局状态。
    g.turn = turn;
    Ok(g)
}

fn outcome_code(o: e::Outcome) -> &'static str {
    match o {
        e::Outcome::Ongoing => "ongoing",
        e::Outcome::Won(e::Side::Red) => "red",
        e::Outcome::Won(e::Side::Black) => "black",
        e::Outcome::Draw => "draw",
    }
}

fn moves_line(g: &e::Game, side: e::Side) -> String {
    let mut mv = e::legal_moves(g, side);
    mv.sort(); // 两侧都排序，消除生成顺序差异
    let body: Vec<String> = mv.iter().map(|m| format!("{}>{}", m.from, m.to)).collect();
    body.join(",")
}

fn report(g: &e::Game) -> String {
    let mut out = String::new();
    out.push_str(&format!("R {}\n", moves_line(g, e::Side::Red)));
    out.push_str(&format!("B {}\n", moves_line(g, e::Side::Black)));

    // 轮到的一方逐步试走，比对每一步走完之后的全部事实。
    let mut mv = e::legal_moves(g, g.turn);
    mv.sort();
    for m in mv {
        match e::apply_move(g, m) {
            Ok((after, mo)) => out.push_str(&format!(
                "M {}>{} cap={} mut={} out={} turn={}\n",
                m.from,
                m.to,
                if mo.captured.is_some() {
                    cell_code(mo.captured)
                } else {
                    "-".into()
                },
                u8::from(mo.mutual),
                outcome_code(mo.outcome),
                match after.turn {
                    e::Side::Red => "red",
                    e::Side::Black => "black",
                }
            )),
            Err(err) => out.push_str(&format!("M {}>{} ERR {}\n", m.from, m.to, err)),
        }
    }
    out
}

fn main() -> io::Result<()> {
    let stdin = io::stdin();
    let mut stdout = io::BufWriter::new(io::stdout());
    for line in stdin.lock().lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        let v: serde_json::Value = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(err) => {
                writeln!(stdout, "=== PARSE ERROR {err}")?;
                continue;
            }
        };
        match parse_position(&v) {
            Ok(g) => {
                writeln!(stdout, "=== {}", v["id"].as_str().unwrap_or("?"))?;
                write!(stdout, "{}", report(&g))?;
            }
            Err(err) => writeln!(stdout, "=== BAD POSITION {err}")?,
        }
    }
    stdout.flush()
}
