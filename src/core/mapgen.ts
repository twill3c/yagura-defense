// シード付きマップ生成器(F-11)。生成は必ず試行予算付きで行い、
// validateMap に合格したマップだけを返す。解けない(=検証を通らない)地形は出荷しない。
import { MAP_01, validateMap } from "./maps";
import { randInt, rngInit } from "./prng";
import type { Cell, GameMap } from "./types";

/** 生成試行の上限(予算)。超過時は決定論的なフォールバック地形を返す */
export const MAX_GEN_ATTEMPTS = 50;

const COLS = 12;
const ROWS = 9;
/** 経路長の上限(蛇行しすぎた試行は打ち切る) */
const MAX_PATH_LEN = Math.floor((COLS * ROWS) / 2);

interface CarveResult {
  path: Cell[] | null;
  state: number;
}

/** 左端 → 右端の自己回避ウォーク。東 2 : 北 1 : 南 1 の重みで蛇行させる */
function carvePath(state: number): CarveResult {
  let r = randInt(state, 1, ROWS - 2);
  state = r.state;
  let cur: Cell = { x: 0, y: r.value };
  const path: Cell[] = [cur];
  const visited = new Set<string>([`${cur.x},${cur.y}`]);

  while (cur.x < COLS - 1) {
    if (path.length > MAX_PATH_LEN) return { path: null, state };
    const candidates: Cell[] = [];
    const push = (c: Cell, weight: number) => {
      if (c.y < 0 || c.y >= ROWS) return;
      if (visited.has(`${c.x},${c.y}`)) return;
      for (let i = 0; i < weight; i++) candidates.push(c);
    };
    push({ x: cur.x + 1, y: cur.y }, 2);
    push({ x: cur.x, y: cur.y - 1 }, 1);
    push({ x: cur.x, y: cur.y + 1 }, 1);
    if (candidates.length === 0) return { path: null, state };
    r = randInt(state, 0, candidates.length - 1);
    state = r.state;
    cur = candidates[r.value];
    visited.add(`${cur.x},${cur.y}`);
    path.push(cur);
  }
  return { path, state };
}

/** 決定論的フォールバック: 中央行の直線街道(予算切れ時のみ) */
function fallbackMap(seed: number): GameMap {
  const y = Math.floor(ROWS / 2);
  return {
    id: `gen_${seed}`,
    name: `生成マップ ${seed}`,
    cols: COLS,
    rows: ROWS,
    path: Array.from({ length: COLS }, (_, x) => ({ x, y })),
    blocked: [],
    waves: MAP_01.waves,
  };
}

/** シードから 12×9 の経路保証付きマップを生成する(同一シード → 同一マップ) */
export function generateMap(seed: number): GameMap {
  let state = rngInit(seed);

  for (let attempt = 0; attempt < MAX_GEN_ATTEMPTS; attempt++) {
    const carved = carvePath(state);
    state = carved.state;
    if (!carved.path) continue;
    const path = carved.path;
    const onPath = new Set(path.map((c) => `${c.x},${c.y}`));

    // 装飾の建設不可セル(経路外に 3〜6 個)
    const blocked: Cell[] = [];
    let r = randInt(state, 3, 6);
    state = r.state;
    const targetBlocked = r.value;
    for (let i = 0; i < 20 && blocked.length < targetBlocked; i++) {
      r = randInt(state, 0, COLS - 1);
      state = r.state;
      const x = r.value;
      r = randInt(state, 0, ROWS - 1);
      state = r.state;
      const y = r.value;
      const key = `${x},${y}`;
      if (onPath.has(key)) continue;
      if (blocked.some((b) => b.x === x && b.y === y)) continue;
      blocked.push({ x, y });
    }

    const map: GameMap = {
      id: `gen_${seed}`,
      name: `生成マップ ${seed}`,
      cols: COLS,
      rows: ROWS,
      path,
      blocked,
      waves: MAP_01.waves,
    };
    if (validateMap(map).ok) return map;
  }

  return fallbackMap(seed);
}
