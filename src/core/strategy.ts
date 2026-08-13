// 基準戦略(F-10)。バランスゲート B-02 の「人間の平均的な遊び方の下限」を
// 機械化したもの: 経路カバー数の多い空きセルから順に、資金が許す限り弓矢倉を
// 建てて出陣するだけの貪欲プレイ。これでクリアできることが難易度の下限保証になる。
import { TOWERS } from "./balance";
import { applyCommand, createGame, step } from "./engine";
import { isBuildable } from "./maps";
import type { Cell, GameMap, GameState } from "./types";

/** 建設候補セルを「射程内に捉える経路セル数」降順で返す(同数なら y, x 昇順) */
export function recommendedCells(map: GameMap): Cell[] {
  const range = TOWERS.yumi.range;
  const ranked: { cell: Cell; cover: number }[] = [];
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      const cell = { x, y };
      if (!isBuildable(map, cell)) continue;
      let cover = 0;
      for (const p of map.path) {
        if (Math.hypot(p.x - x, p.y - y) <= range) cover++;
      }
      if (cover > 0) ranked.push({ cell, cover });
    }
  }
  ranked.sort(
    (a, b) => b.cover - a.cover || a.cell.y - b.cell.y || a.cell.x - b.cell.x,
  );
  return ranked.map((r) => r.cell);
}

/**
 * 基準戦略を maxTicks 予算付きで実行する。
 * building 中: 資金が許す限り推奨セル順に弓矢倉を建て、即 startWave。
 * wave 中: 資金が貯まり次第、追加建設する。
 */
export function runBaseline(
  map: GameMap,
  seed: number,
  maxTicks: number,
): GameState {
  const cells = recommendedCells(map);
  let state = createGame(map, seed);

  const tryBuild = (s: GameState): GameState => {
    let cur = s;
    while (cur.money >= TOWERS.yumi.cost) {
      const occupied = new Set(cur.towers.map((t) => `${t.cell.x},${t.cell.y}`));
      const cell = cells.find((c) => !occupied.has(`${c.x},${c.y}`));
      if (!cell) break;
      const r = applyCommand(cur, { type: "build", cell, tower: "yumi" });
      if (!r.ok) break;
      cur = r.state;
    }
    return cur;
  };

  while (
    state.tick < maxTicks &&
    state.status !== "won" &&
    state.status !== "lost"
  ) {
    state = tryBuild(state);
    if (state.status === "building") {
      const r = applyCommand(state, { type: "startWave" });
      if (!r.ok) break; // 起こり得ないが、無限ループの保険
      state = r.state;
    }
    state = step(state);
  }
  return state;
}
