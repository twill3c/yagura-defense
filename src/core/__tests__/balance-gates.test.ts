// バランスゲート(SPEC §4)。このファイルの基準を緩める変更は人間の承認が必要
// (AGENTS.md §3)。数値調整は balance.ts 側で行い、ここを green に保つ。
import { describe, expect, it } from "vitest";
import { ENEMIES, START_LIVES, START_MONEY, TOWERS, towerStats } from "../balance";
import { runGame } from "../engine";
import { MAP_01 } from "../maps";
import { recommendedCells, runBaseline } from "../strategy";
import type { EnemyTypeId, TowerTypeId } from "../types";

// T-100(B-01: ゲームが自明でない)
describe("B-01: タワー未設置ならウェーブ 1 でリークする", () => {
  it("MAP_01 で 1 体以上が本丸に到達する", () => {
    const end = runGame(MAP_01, 1, [{ tick: 0, command: { type: "startWave" } }], 3000);
    expect(end.lives).toBeLessThan(START_LIVES);
  });
});

// T-101(B-02: クリア可能性の下限保証)
describe("B-02: 基準戦略で MAP_01 を全ウェーブクリアできる", () => {
  it("貪欲弓戦略で won かつ残ライフ ≥ 1", () => {
    const end = runBaseline(MAP_01, 1, 20000);
    expect(end.status).toBe("won");
    expect(end.lives).toBeGreaterThanOrEqual(1);
  });
});

// T-102(B-03: 初手の選択肢)
describe("B-03: 初期資金で弓矢倉 2 基", () => {
  it("START_MONEY ≥ 弓×2", () => {
    expect(START_MONEY).toBeGreaterThanOrEqual(TOWERS.yumi.cost * 2);
  });
});

// T-103(B-05: 完全無効化なし)
describe("B-05: 全タワー × 全敵で 1 発ダメージ ≥ 1", () => {
  it("Lv1 の実効ダメージが防御で 0 にならない", () => {
    const towers: TowerTypeId[] = ["yumi", "ozutsu", "fuda"];
    const enemies: EnemyTypeId[] = ["ashigaru", "shinobi", "kabuto", "taisho"];
    for (const t of towers) {
      for (const e of enemies) {
        const dmg = Math.max(1, towerStats(t, 1).dmg - ENEMIES[e].def);
        expect(dmg).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

// T-104(F-10: 基準戦略の決定性と予算)
describe("recommendedCells / runBaseline の性質", () => {
  it("推奨セルは重複なく、カバー数降順", () => {
    const cells = recommendedCells(MAP_01);
    expect(cells.length).toBeGreaterThan(0);
    const keys = cells.map((c) => `${c.x},${c.y}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("同一シードの 2 回実行が深い等値(決定性)", () => {
    const a = runBaseline(MAP_01, 3, 20000);
    const b = runBaseline(MAP_01, 3, 20000);
    expect(a).toEqual(b);
  });

  it("tick 予算内に終局する(ハングしない)", () => {
    const end = runBaseline(MAP_01, 1, 20000);
    expect(end.tick).toBeLessThan(20000);
    expect(["won", "lost"]).toContain(end.status);
  });
});
