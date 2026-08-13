import { describe, expect, it } from "vitest";
import {
  SELL_REFUND_RATE,
  START_MONEY,
  TOWERS,
  UPGRADE_COSTS,
  towerStats,
} from "../balance";
import { applyCommand, createGame, score, step } from "../engine";
import { MAP_01 } from "../maps";
import type { GameState, Wave } from "../types";

function makeTestMap(waves: Wave[]) {
  return {
    id: "test",
    name: "テスト街道",
    cols: 10,
    rows: 3,
    path: Array.from({ length: 8 }, (_, i) => ({ x: i, y: 1 })),
    blocked: [],
    waves,
  };
}

function mustApply(state: GameState, command: Parameters<typeof applyCommand>[1]): GameState {
  const r = applyCommand(state, command);
  expect(r.ok).toBe(true);
  return r.state;
}

// T-060(F-07: レベル別実効ステータス)
describe("towerStats", () => {
  it("Lv1 は基礎値そのまま", () => {
    const s = towerStats("yumi", 1);
    expect(s.dmg).toBe(TOWERS.yumi.dmg);
    expect(s.range).toBe(TOWERS.yumi.range);
  });

  it("Lv3 の弓: 威力 ×2.25(四捨五入)・射程 +0.5", () => {
    const s = towerStats("yumi", 3);
    expect(s.dmg).toBe(27);
    expect(s.range).toBe(3.0);
  });

  it("札の付随効果(スロー)はレベルで消えない", () => {
    expect(towerStats("fuda", 2).slowFactor).toBe(TOWERS.fuda.slowFactor);
  });
});

// T-061(F-07: 強化)
describe("upgrade コマンド", () => {
  const built = mustApply(createGame(MAP_01, 1), {
    type: "build",
    cell: { x: 1, y: 3 },
    tower: "yumi",
  });
  const towerId = built.towers[0].id;

  it("費用を払って Lv が上がり、invested に累積する", () => {
    const up = mustApply(built, { type: "upgrade", towerId });
    expect(up.towers[0].level).toBe(2);
    expect(up.money).toBe(START_MONEY - TOWERS.yumi.cost - UPGRADE_COSTS.yumi[0]);
    expect(up.towers[0].invested).toBe(TOWERS.yumi.cost + UPGRADE_COSTS.yumi[0]);
  });

  it("最大 Lv では拒否", () => {
    let s = { ...built, money: 9999 };
    s = mustApply(s, { type: "upgrade", towerId });
    s = mustApply(s, { type: "upgrade", towerId });
    expect(s.towers[0].level).toBe(3);
    expect(applyCommand(s, { type: "upgrade", towerId }).ok).toBe(false);
  });

  it("資金不足は拒否・状態不変", () => {
    const poor = { ...built, money: UPGRADE_COSTS.yumi[0] - 1 };
    const r = applyCommand(poor, { type: "upgrade", towerId });
    expect(r.ok).toBe(false);
    expect(r.state).toEqual(poor);
  });

  it("存在しない towerId は拒否", () => {
    expect(applyCommand(built, { type: "upgrade", towerId: 999 }).ok).toBe(false);
  });
});

// T-062(F-07 / B-04: 売却)
describe("sell コマンド", () => {
  it("払い戻しは floor(invested × 0.7) でタワーが消える", () => {
    const built = mustApply(createGame(MAP_01, 1), {
      type: "build",
      cell: { x: 1, y: 3 },
      tower: "yumi",
    });
    const sold = mustApply(built, { type: "sell", towerId: built.towers[0].id });
    expect(sold.towers).toEqual([]);
    expect(sold.money).toBe(
      START_MONEY - TOWERS.yumi.cost + Math.floor(TOWERS.yumi.cost * SELL_REFUND_RATE),
    );
  });

  it("B-04: 建設 → 強化 → 即売却で資金は必ず目減りする", () => {
    let s = createGame(MAP_01, 1);
    const before = s.money;
    s = mustApply(s, { type: "build", cell: { x: 1, y: 3 }, tower: "yumi" });
    s = mustApply(s, { type: "upgrade", towerId: s.towers[0].id });
    s = mustApply(s, { type: "sell", towerId: s.towers[0].id });
    expect(s.money).toBeLessThan(before);
  });

  it("存在しない towerId は拒否", () => {
    expect(applyCommand(createGame(MAP_01, 1), { type: "sell", towerId: 1 }).ok).toBe(false);
  });
});

// T-063(F-07: 強化が射撃に反映される)
describe("強化後の射撃", () => {
  it("Lv2 弓(dmg18)で足軽の初弾後 HP が 12 になる", () => {
    const map = makeTestMap([[{ enemy: "ashigaru", count: 1, intervalTicks: 1, delayTicks: 0 }]]);
    let s = { ...createGame(map, 1), money: 999 };
    s = mustApply(s, { type: "build", cell: { x: 0, y: 0 }, tower: "yumi" });
    s = mustApply(s, { type: "upgrade", towerId: s.towers[0].id });
    s = mustApply(s, { type: "startWave" });
    expect(step(s).enemies[0].hp).toBe(30 - 18);
  });
});

// T-064(F-08: スコア)
describe("score", () => {
  it("撃破×10 + 残ライフ×100 + 残資金", () => {
    const s = { ...createGame(MAP_01, 1), kills: 7, lives: 3, money: 45 };
    expect(score(s)).toBe(7 * 10 + 3 * 100 + 45);
  });
});

// T-065(F-07: ウェーブ進行中も強化・売却できる)
describe("ウェーブ進行中の強化・売却", () => {
  it("status=wave でも upgrade / sell が受理される", () => {
    const map = makeTestMap([[{ enemy: "ashigaru", count: 3, intervalTicks: 10, delayTicks: 5 }]]);
    let s = { ...createGame(map, 1), money: 999 };
    s = mustApply(s, { type: "build", cell: { x: 0, y: 0 }, tower: "yumi" });
    s = mustApply(s, { type: "startWave" });
    expect(s.status).toBe("wave");
    s = mustApply(s, { type: "upgrade", towerId: s.towers[0].id });
    s = mustApply(s, { type: "sell", towerId: s.towers[0].id });
    expect(s.towers).toEqual([]);
  });
});
