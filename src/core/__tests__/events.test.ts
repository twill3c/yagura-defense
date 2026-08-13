import { describe, expect, it } from "vitest";
import { diffEvents } from "../events";
import { createGame } from "../engine";
import { MAP_01 } from "../maps";
import type { GameState } from "../types";

const base = createGame(MAP_01, 1);

function w(patch: Partial<GameState>): GameState {
  return { ...base, ...patch };
}

// T-070(F-12: 状態差分イベント)
describe("diffEvents", () => {
  it("変化なしなら空", () => {
    expect(diffEvents(base, base)).toEqual([]);
  });

  it("kills 増加 → kill(count)", () => {
    expect(diffEvents(base, w({ kills: 2 }))).toContainEqual({ type: "kill", count: 2 });
  });

  it("lives 減少 → leak(livesLost)", () => {
    expect(diffEvents(base, w({ lives: 7 }))).toContainEqual({ type: "leak", livesLost: 3 });
  });

  it("building → wave で waveStart(1 始まり)", () => {
    expect(diffEvents(base, w({ status: "wave" }))).toContainEqual({
      type: "waveStart",
      wave: 1,
    });
  });

  it("waveIndex 増加 → waveClear", () => {
    expect(diffEvents(w({ status: "wave" }), w({ waveIndex: 1 }))).toContainEqual({
      type: "waveClear",
      wave: 1,
    });
  });

  it("won / lost への遷移", () => {
    expect(diffEvents(base, w({ status: "won" }))).toContainEqual({ type: "won" });
    expect(diffEvents(base, w({ status: "lost" }))).toContainEqual({ type: "lost" });
  });

  it("タワーの readyAtTick 変化 → shot", () => {
    const tower = {
      id: 1,
      type: "yumi" as const,
      cell: { x: 1, y: 3 },
      level: 1,
      invested: 100,
      readyAtTick: 0,
    };
    const prev = w({ towers: [tower] });
    const next = w({ towers: [{ ...tower, readyAtTick: 15 }] });
    expect(diffEvents(prev, next)).toContainEqual({ type: "shot" });
    expect(diffEvents(prev, prev)).toEqual([]);
  });
});
