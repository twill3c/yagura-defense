import { describe, expect, it } from "vitest";
import { ENEMIES, TOWERS } from "../balance";
import { applyCommand, createGame, runGame, step } from "../engine";
import { MAP_01, validateMap } from "../maps";
import type { GameMap, GameState, TimedCommand, Wave } from "../types";

function makeTestMap(waves: Wave[]): GameMap {
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

function stepN(state: GameState, n: number): GameState {
  let s = state;
  for (let i = 0; i < n; i++) s = step(s);
  return s;
}

/** (0,0) の塔は湧き直後(x≈0.1, 距離≈1.0)から射程に捉える */
function withTower(
  map: GameMap,
  cell: { x: number; y: number },
  tower: "yumi" | "ozutsu" | "fuda",
): GameState {
  let s = createGame(map, 1);
  s = { ...s, money: 999 }; // テスト用に資金を潤沢にする(建設拒否を排除)
  const built = applyCommand(s, { type: "build", cell, tower });
  expect(built.ok).toBe(true);
  const started = applyCommand(built.state, { type: "startWave" });
  expect(started.ok).toBe(true);
  return started.state;
}

// T-050(F-04: 大筒の範囲攻撃)
describe("大筒矢倉: 着弾点の splashRadius 内の敵全員に max(1, dmg−def)", () => {
  it("1 発で近接する兜武者 2 体が同時に被弾する", () => {
    const map = makeTestMap([[{ enemy: "kabuto", count: 2, intervalTicks: 2, delayTicks: 0 }]]);
    const s = withTower(map, { x: 0, y: 0 }, "ozutsu");
    const dmg = TOWERS.ozutsu.dmg - ENEMIES.kabuto.def; // 27
    // tick0: 1 体目のみ存在(初弾)。tick2 湧きの 2 体目は先頭と 0.12 セル差で
    // 進むため、cooldown 明け(tick20)の 1 発が両方に入る
    const five = stepN(s, 5);
    expect(five.enemies.map((e) => e.hp)).toEqual([90 - dmg, 90]);
    const after = stepN(s, 21);
    expect(after.enemies.map((e) => e.hp)).toEqual([90 - dmg * 2, 90 - dmg]);
  });
});

// T-051(F-04: 札のスロー)
describe("札矢倉: 被弾した敵は slowTicks の間、速度が slowFactor 倍", () => {
  it("足軽の progress が鈍る(0.1/tick → 0.05/tick、再被弾で持続更新)", () => {
    const map = makeTestMap([[{ enemy: "ashigaru", count: 1, intervalTicks: 1, delayTicks: 0 }]]);
    const s = withTower(map, { x: 0, y: 0 }, "fuda");
    // tick0: 通常移動 0.1 の後に被弾しスロー付与。以降 0.05/tick
    expect(stepN(s, 5).enemies[0].progress).toBeCloseTo(0.1 + 4 * 0.05, 6);
    // tick10 / tick20 の再被弾で持続が更新され、鈍足が継続する
    expect(stepN(s, 20).enemies[0].progress).toBeCloseTo(0.1 + 19 * 0.05, 6);
  });

  it("射程を抜けてスロー切れ後は通常速度(0.1/tick)に戻る", () => {
    const map = makeTestMap([[{ enemy: "ashigaru", count: 1, intervalTicks: 1, delayTicks: 0 }]]);
    const s = withTower(map, { x: 0, y: 0 }, "fuda"); // x > 1.73 で射程外
    const a = stepN(s, 60);
    const b = stepN(s, 61);
    expect(b.enemies[0].progress - a.enemies[0].progress).toBeCloseTo(0.1, 6);
  });
});

// T-052(F-05: 防御と最低ダメージ)
describe("兜武者の防御", () => {
  it("札(dmg4)は max(1, 4−3) = 1 しか通らない", () => {
    const map = makeTestMap([[{ enemy: "kabuto", count: 1, intervalTicks: 1, delayTicks: 0 }]]);
    const s = withTower(map, { x: 0, y: 0 }, "fuda");
    expect(stepN(s, 1).enemies[0].hp).toBe(ENEMIES.kabuto.hp - 1);
  });

  it("弓(dmg12)は 12−3 = 9 通る", () => {
    const map = makeTestMap([[{ enemy: "kabuto", count: 1, intervalTicks: 1, delayTicks: 0 }]]);
    const s = withTower(map, { x: 0, y: 0 }, "yumi");
    expect(stepN(s, 1).enemies[0].hp).toBe(ENEMIES.kabuto.hp - 9);
  });
});

// T-053(F-05: ボスのリークダメージ)
describe("武者大将", () => {
  it("リークでライフを 5 失う", () => {
    const map = makeTestMap([[{ enemy: "taisho", count: 1, intervalTicks: 1, delayTicks: 0 }]]);
    const end = runGame(map, 1, [{ tick: 0, command: { type: "startWave" } }], 400);
    expect(end.lives).toBe(10 - ENEMIES.taisho.leakDamage);
    expect(end.status).toBe("won");
  });
});

// T-054(F-02/F-01: 5 ウェーブ化後の MAP_01)
describe("MAP_01 5 ウェーブ", () => {
  it("構造検証に合格し、5 ウェーブを持つ", () => {
    expect(validateMap(MAP_01).ok).toBe(true);
    expect(MAP_01.waves).toHaveLength(5);
  });

  it("混成タワーのリプレイ決定性が保たれる", () => {
    const commands: TimedCommand[] = [
      { tick: 0, command: { type: "build", cell: { x: 5, y: 3 }, tower: "ozutsu" } },
      { tick: 0, command: { type: "build", cell: { x: 7, y: 5 }, tower: "fuda" } },
      { tick: 0, command: { type: "startWave" } },
    ];
    const a = runGame(MAP_01, 11, commands, 5000);
    const b = runGame(MAP_01, 11, commands, 5000);
    expect(a).toEqual(b);
  });
});
