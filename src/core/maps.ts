// 内蔵マップ定義と構造検証(F-02)。検証器は生成器(F-11・loop_007)でも再利用する。
import type { Cell, GameMap } from "./types";

/** マップ 1「街道口」— 12×9、S 字経路 20 セル */
export const MAP_01: GameMap = {
  id: "map_01",
  name: "街道口",
  cols: 12,
  rows: 9,
  path: [
    { x: 0, y: 4 },
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 3, y: 4 },
    { x: 3, y: 3 },
    { x: 3, y: 2 },
    { x: 4, y: 2 },
    { x: 5, y: 2 },
    { x: 6, y: 2 },
    { x: 6, y: 3 },
    { x: 6, y: 4 },
    { x: 6, y: 5 },
    { x: 6, y: 6 },
    { x: 7, y: 6 },
    { x: 8, y: 6 },
    { x: 9, y: 6 },
    { x: 9, y: 5 },
    { x: 9, y: 4 },
    { x: 10, y: 4 },
    { x: 11, y: 4 },
  ],
  blocked: [
    { x: 0, y: 0 },
    { x: 11, y: 0 },
    { x: 0, y: 8 },
    { x: 11, y: 8 },
  ],
  waves: [
    [{ enemy: "ashigaru", count: 8, intervalTicks: 10, delayTicks: 10 }],
    [
      { enemy: "ashigaru", count: 12, intervalTicks: 8, delayTicks: 10 },
      { enemy: "shinobi", count: 4, intervalTicks: 15, delayTicks: 40 },
    ],
    [
      { enemy: "ashigaru", count: 15, intervalTicks: 6, delayTicks: 10 },
      { enemy: "shinobi", count: 8, intervalTicks: 10, delayTicks: 30 },
    ],
    [
      { enemy: "kabuto", count: 6, intervalTicks: 15, delayTicks: 10 },
      { enemy: "ashigaru", count: 10, intervalTicks: 6, delayTicks: 30 },
    ],
    [
      { enemy: "shinobi", count: 10, intervalTicks: 8, delayTicks: 10 },
      { enemy: "kabuto", count: 4, intervalTicks: 20, delayTicks: 40 },
      { enemy: "taisho", count: 1, intervalTicks: 1, delayTicks: 60 },
    ],
  ],
};

export const MAPS: GameMap[] = [MAP_01];

export interface MapValidation {
  ok: boolean;
  errors: string[];
}

/**
 * マップ構造検証(F-02 / F-11):
 * 経路の連結性(隣接セル間はマンハッタン距離 1)・重複なし・盤面内・
 * blocked と path の非交差・buildable セル数の下限(20)。
 */
export function validateMap(map: GameMap): MapValidation {
  const errors: string[] = [];
  const inBounds = (c: Cell) =>
    c.x >= 0 && c.x < map.cols && c.y >= 0 && c.y < map.rows;
  const key = (c: Cell) => `${c.x},${c.y}`;

  if (map.path.length < 2) errors.push("path はセル 2 個以上であること");

  const seen = new Set<string>();
  for (const c of map.path) {
    if (!inBounds(c)) errors.push(`path セルが盤面外: (${c.x},${c.y})`);
    if (seen.has(key(c))) errors.push(`path セルが重複: (${c.x},${c.y})`);
    seen.add(key(c));
  }

  for (let i = 1; i < map.path.length; i++) {
    const a = map.path[i - 1];
    const b = map.path[i];
    if (Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1) {
      errors.push(`path が非隣接: (${a.x},${a.y}) → (${b.x},${b.y})`);
    }
  }

  for (const c of map.blocked) {
    if (!inBounds(c)) errors.push(`blocked セルが盤面外: (${c.x},${c.y})`);
    if (seen.has(key(c))) errors.push(`blocked が path と交差: (${c.x},${c.y})`);
  }

  const buildableCount =
    map.cols * map.rows - map.path.length - map.blocked.length;
  if (buildableCount < MIN_BUILDABLE_CELLS) {
    errors.push(`buildable セル不足: ${buildableCount} < ${MIN_BUILDABLE_CELLS}`);
  }

  return { ok: errors.length === 0, errors };
}

/** 生成マップ検証の buildable 下限(F-11 / B-06 でも使用) */
export const MIN_BUILDABLE_CELLS = 20;

/** セルがタワー建設可能か(盤面内・path でも blocked でもない) */
export function isBuildable(map: GameMap, cell: Cell): boolean {
  if (cell.x < 0 || cell.x >= map.cols || cell.y < 0 || cell.y >= map.rows) {
    return false;
  }
  const hit = (c: Cell) => c.x === cell.x && c.y === cell.y;
  return !map.path.some(hit) && !map.blocked.some(hit);
}
