import { describe, expect, it } from "vitest";
import { isBuildable, MAP_01, validateMap } from "../maps";
import type { GameMap } from "../types";

function clone(map: GameMap): GameMap {
  return JSON.parse(JSON.stringify(map)) as GameMap;
}

// T-010
describe("validateMap: MAP_01 は正当", () => {
  it("エラーなしで合格する", () => {
    const v = validateMap(MAP_01);
    expect(v.errors).toEqual([]);
    expect(v.ok).toBe(true);
  });
});

// T-011
describe("validateMap: 壊れたマップを拒否する", () => {
  it("経路セルの重複", () => {
    const m = clone(MAP_01);
    m.path[2] = { ...m.path[0] };
    expect(validateMap(m).ok).toBe(false);
  });

  it("非隣接の経路(飛び)", () => {
    const m = clone(MAP_01);
    m.path[1] = { x: 5, y: 8 };
    expect(validateMap(m).ok).toBe(false);
  });

  it("blocked が経路と交差", () => {
    const m = clone(MAP_01);
    m.blocked.push({ ...m.path[3] });
    expect(validateMap(m).ok).toBe(false);
  });

  it("盤面外の経路セル", () => {
    const m = clone(MAP_01);
    m.path[0] = { x: -1, y: 4 };
    expect(validateMap(m).ok).toBe(false);
  });

  it("buildable セル数の下限(20)割れ", () => {
    const m = clone(MAP_01);
    m.cols = 2;
    m.rows = 2;
    m.path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ];
    m.blocked = [];
    expect(validateMap(m).ok).toBe(false);
  });
});

// T-012
describe("isBuildable", () => {
  it("空地は true", () => {
    expect(isBuildable(MAP_01, { x: 1, y: 3 })).toBe(true);
  });

  it("path セルは false", () => {
    expect(isBuildable(MAP_01, { x: 1, y: 4 })).toBe(false);
  });

  it("blocked セルは false", () => {
    expect(isBuildable(MAP_01, { x: 0, y: 0 })).toBe(false);
  });

  it("盤面外は false", () => {
    expect(isBuildable(MAP_01, { x: -1, y: 0 })).toBe(false);
    expect(isBuildable(MAP_01, { x: 12, y: 0 })).toBe(false);
    expect(isBuildable(MAP_01, { x: 0, y: 9 })).toBe(false);
  });
});
