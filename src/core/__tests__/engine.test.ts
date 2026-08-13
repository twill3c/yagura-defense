import { describe, expect, it } from "vitest";
import {
  START_LIVES,
  START_MONEY,
  TOWERS,
  WAVE_CLEAR_BONUS,
} from "../balance";
import { applyCommand, createGame, enemyPosition, runGame, step } from "../engine";
import { MAP_01 } from "../maps";
import type { GameMap, GameState, TimedCommand, Wave } from "../types";

/** 直線 8 セル(y=1)のテスト街道。湧き口 (0,1) → 本丸 (7,1)、踏破 70 tick(足軽) */
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

function mustApply(state: GameState, command: Parameters<typeof applyCommand>[1]): GameState {
  const r = applyCommand(state, command);
  expect(r.ok).toBe(true);
  return r.state;
}

// T-020
describe("createGame: 初期状態", () => {
  it("資金・ライフ・状態が仕様どおり", () => {
    const s = createGame(MAP_01, 42);
    expect(s.money).toBe(START_MONEY);
    expect(s.lives).toBe(START_LIVES);
    expect(s.status).toBe("building");
    expect(s.tick).toBe(0);
    expect(s.waveIndex).toBe(0);
    expect(s.enemies).toEqual([]);
    expect(s.towers).toEqual([]);
    expect(s.kills).toBe(0);
    expect(s.seed).toBe(42);
  });
});

// T-021
describe("applyCommand build: 受理と拒否", () => {
  const base = createGame(MAP_01, 1);

  it("空地への建設は成功し、費用が引かれる", () => {
    const r = applyCommand(base, { type: "build", cell: { x: 1, y: 3 }, tower: "yumi" });
    expect(r.ok).toBe(true);
    expect(r.state.money).toBe(START_MONEY - TOWERS.yumi.cost);
    expect(r.state.towers).toHaveLength(1);
    expect(r.state.towers[0].invested).toBe(TOWERS.yumi.cost);
    expect(r.state.towers[0].level).toBe(1);
  });

  it("path セルへの建設は拒否・状態不変", () => {
    const r = applyCommand(base, { type: "build", cell: { x: 1, y: 4 }, tower: "yumi" });
    expect(r.ok).toBe(false);
    expect(r.state).toEqual(base);
  });

  it("blocked セルへの建設は拒否", () => {
    const r = applyCommand(base, { type: "build", cell: { x: 0, y: 0 }, tower: "yumi" });
    expect(r.ok).toBe(false);
  });

  it("盤面外への建設は拒否", () => {
    const r = applyCommand(base, { type: "build", cell: { x: -1, y: 0 }, tower: "yumi" });
    expect(r.ok).toBe(false);
  });

  it("占有セルへの重複建設は拒否", () => {
    const s1 = mustApply(base, { type: "build", cell: { x: 1, y: 3 }, tower: "yumi" });
    const r = applyCommand(s1, { type: "build", cell: { x: 1, y: 3 }, tower: "yumi" });
    expect(r.ok).toBe(false);
    expect(r.state).toEqual(s1);
  });

  it("資金不足は拒否", () => {
    // 220 - 100 - 100 = 20 < 100
    let s = mustApply(base, { type: "build", cell: { x: 1, y: 3 }, tower: "yumi" });
    s = mustApply(s, { type: "build", cell: { x: 2, y: 3 }, tower: "yumi" });
    const r = applyCommand(s, { type: "build", cell: { x: 4, y: 3 }, tower: "yumi" });
    expect(r.ok).toBe(false);
    expect(r.state).toEqual(s);
  });
});

// T-022
describe("startWave と湧きスケジュール", () => {
  const map = makeTestMap([[{ enemy: "ashigaru", count: 3, intervalTicks: 10, delayTicks: 5 }]]);

  it("開始で status=wave、スケジュールが確定する", () => {
    const s = mustApply(createGame(map, 1), { type: "startWave" });
    expect(s.status).toBe("wave");
    expect(s.pendingSpawns.map((p) => p.atTick)).toEqual([5, 15, 25]);
  });

  it("ウェーブ進行中の再開始は拒否", () => {
    const s = mustApply(createGame(map, 1), { type: "startWave" });
    expect(applyCommand(s, { type: "startWave" }).ok).toBe(false);
  });

  it("atTick どおりに湧く", () => {
    const s = mustApply(createGame(map, 1), { type: "startWave" });
    expect(stepN(s, 5).enemies).toHaveLength(0);
    expect(stepN(s, 6).enemies).toHaveLength(1);
    expect(stepN(s, 16).enemies).toHaveLength(2);
    expect(stepN(s, 26).enemies).toHaveLength(3);
  });
});

// T-023
describe("敵移動と座標補間", () => {
  const map = makeTestMap([[{ enemy: "ashigaru", count: 1, intervalTicks: 1, delayTicks: 0 }]]);

  it("progress は speed × 経過 tick で単調に進む(足軽 = 0.1/tick)", () => {
    const s = mustApply(createGame(map, 1), { type: "startWave" });
    const after10 = stepN(s, 10);
    expect(after10.enemies[0].progress).toBeCloseTo(1.0, 6);
    const after25 = stepN(s, 25);
    expect(after25.enemies[0].progress).toBeCloseTo(2.5, 6);
  });

  it("enemyPosition は path 上を線形補間する", () => {
    expect(enemyPosition(map, { id: 1, type: "ashigaru", hp: 30, progress: 2.5 })).toEqual({
      x: 2.5,
      y: 1,
    });
    expect(enemyPosition(map, { id: 1, type: "ashigaru", hp: 30, progress: 0 })).toEqual({
      x: 0,
      y: 1,
    });
    // 終端以降は本丸位置に張り付く
    expect(enemyPosition(map, { id: 1, type: "ashigaru", hp: 30, progress: 99 })).toEqual({
      x: 7,
      y: 1,
    });
  });
});

// T-024(B-01 相当)
describe("タワー未設置ならリークする", () => {
  it("テスト街道: 1 体がリークしてライフが 1 減り、ウェーブは終了する", () => {
    const map = makeTestMap([[{ enemy: "ashigaru", count: 1, intervalTicks: 1, delayTicks: 0 }]]);
    const end = runGame(map, 1, [{ tick: 0, command: { type: "startWave" } }], 200);
    expect(end.lives).toBe(START_LIVES - 1);
    expect(end.enemies).toEqual([]);
    expect(end.kills).toBe(0);
    expect(end.status).toBe("won"); // 最終ウェーブ終了(リークでも殲滅扱い)
  });

  it("MAP_01 ウェーブ 1: 8 体全てがリークする", () => {
    const end = runGame(MAP_01, 1, [{ tick: 0, command: { type: "startWave" } }], 3000);
    expect(end.lives).toBe(START_LIVES - 8);
    expect(end.status).toBe("building");
    expect(end.waveIndex).toBe(1);
    expect(end.money).toBe(START_MONEY + WAVE_CLEAR_BONUS);
  });
});

// T-025 / T-026
describe("射撃・クールダウン・撃破", () => {
  // 塔 (2,0) は path y=1 の x∈[0,4] を射程 2.5 で覆う
  const map = makeTestMap([[{ enemy: "ashigaru", count: 1, intervalTicks: 1, delayTicks: 0 }]]);
  const withTower = (): GameState => {
    let s = createGame(map, 1);
    s = mustApply(s, { type: "build", cell: { x: 2, y: 0 }, tower: "yumi" });
    return mustApply(s, { type: "startWave" });
  };

  it("射程内の敵に max(1, dmg - def) を与える(tick0 で 30→18)", () => {
    const s1 = stepN(withTower(), 1);
    expect(s1.enemies[0].hp).toBe(30 - TOWERS.yumi.dmg);
  });

  it("クールダウン中(tick1〜4)は撃たない", () => {
    const s5 = stepN(withTower(), 5);
    expect(s5.enemies[0].hp).toBe(30 - TOWERS.yumi.dmg);
  });

  it("cooldown 明け(tick5)に 2 発目(18→6)", () => {
    const s6 = stepN(withTower(), 6);
    expect(s6.enemies[0].hp).toBe(30 - TOWERS.yumi.dmg * 2);
  });

  it("3 発で撃破: 報酬 +10・kills=1・クリアで won", () => {
    const end = runGame(
      map,
      1,
      [
        { tick: 0, command: { type: "build", cell: { x: 2, y: 0 }, tower: "yumi" } },
        { tick: 0, command: { type: "startWave" } },
      ],
      200,
    );
    expect(end.kills).toBe(1);
    expect(end.lives).toBe(START_LIVES);
    expect(end.status).toBe("won");
    expect(end.money).toBe(START_MONEY - TOWERS.yumi.cost + 10 + WAVE_CLEAR_BONUS);
  });
});

// T-027
describe("複数ウェーブ進行と勝利", () => {
  it("ウェーブ間は building に戻り、全ウェーブ殲滅で won", () => {
    const map = makeTestMap([
      [{ enemy: "ashigaru", count: 1, intervalTicks: 1, delayTicks: 0 }],
      [{ enemy: "ashigaru", count: 1, intervalTicks: 1, delayTicks: 0 }],
    ]);
    const commands: TimedCommand[] = [
      { tick: 0, command: { type: "build", cell: { x: 2, y: 0 }, tower: "yumi" } },
      { tick: 0, command: { type: "startWave" } },
      { tick: 100, command: { type: "startWave" } },
    ];
    const mid = runGame(map, 1, commands.slice(0, 2), 99);
    expect(mid.status).toBe("building");
    expect(mid.waveIndex).toBe(1);

    const end = runGame(map, 1, commands, 400);
    expect(end.status).toBe("won");
    expect(end.kills).toBe(2);
    expect(end.money).toBe(START_MONEY - TOWERS.yumi.cost + 10 * 2 + WAVE_CLEAR_BONUS * 2);
  });
});

// T-028
describe("ライフ 0 で敗北", () => {
  it("10 体リークした時点で lost、以後 step は状態を変えない", () => {
    const map = makeTestMap([[{ enemy: "ashigaru", count: 12, intervalTicks: 5, delayTicks: 0 }]]);
    const end = runGame(map, 1, [{ tick: 0, command: { type: "startWave" } }], 500);
    expect(end.status).toBe("lost");
    expect(end.lives).toBe(0);
    expect(end.tick).toBeLessThan(500);
    expect(step(end)).toEqual(end);
  });
});

// T-029(F-01 決定性)
describe("決定性: 同一シード + 同一コマンド列は同一結果", () => {
  it("MAP_01 のリプレイ 2 回が深い等値になる", () => {
    const commands: TimedCommand[] = [
      { tick: 0, command: { type: "build", cell: { x: 1, y: 3 }, tower: "yumi" } },
      { tick: 0, command: { type: "startWave" } },
      { tick: 50, command: { type: "build", cell: { x: 5, y: 3 }, tower: "yumi" } },
    ];
    const a = runGame(MAP_01, 7, commands, 3000);
    const b = runGame(MAP_01, 7, commands, 3000);
    expect(a).toEqual(b);
  });
});

// T-030
describe("runGame は tick 予算で必ず停止する", () => {
  it("コマンドなし(永遠に building)でも maxTicks で返る", () => {
    const map = makeTestMap([[{ enemy: "ashigaru", count: 1, intervalTicks: 1, delayTicks: 0 }]]);
    const end = runGame(map, 1, [], 50);
    expect(end.tick).toBe(50);
    expect(end.status).toBe("building");
  });
});
