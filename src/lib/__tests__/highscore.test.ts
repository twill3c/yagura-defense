import { describe, expect, it } from "vitest";
import { loadHighScore, saveHighScore, type ScoreStorage } from "../highscore";

function memStorage(): ScoreStorage {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
  };
}

// T-071(F-08: ハイスコア)
describe("highscore", () => {
  it("未保存なら null", () => {
    expect(loadHighScore("map_01", memStorage())).toBeNull();
  });

  it("高いスコアだけ更新する", () => {
    const s = memStorage();
    expect(saveHighScore("map_01", 500, s)).toBe(true);
    expect(saveHighScore("map_01", 300, s)).toBe(false);
    expect(loadHighScore("map_01", s)).toBe(500);
    expect(saveHighScore("map_01", 700, s)).toBe(true);
    expect(loadHighScore("map_01", s)).toBe(700);
  });

  it("マップごとに独立", () => {
    const s = memStorage();
    saveHighScore("map_01", 500, s);
    expect(loadHighScore("map_02", s)).toBeNull();
  });

  it("storage が無い環境では安全に無効", () => {
    expect(loadHighScore("map_01", null)).toBeNull();
    expect(saveHighScore("map_01", 100, null)).toBe(false);
  });
});
