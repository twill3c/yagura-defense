import { describe, expect, it } from "vitest";
import { generateMap } from "../mapgen";
import { validateMap } from "../maps";

// T-110(F-11: 決定性)
describe("generateMap: 決定性", () => {
  it("同一シードは同一マップ(深い等値)", () => {
    expect(generateMap(7)).toEqual(generateMap(7));
  });

  it("異なるシードは(ほぼ確実に)異なる経路", () => {
    const paths = new Set(
      [1, 2, 3, 4, 5].map((s) => JSON.stringify(generateMap(s).path)),
    );
    expect(paths.size).toBeGreaterThan(1);
  });
});

// T-111(B-06: 生成品質の全数検証)
describe("generateMap: シード 1〜20 の全数検証", () => {
  it("全マップが validateMap に合格し、経路が左端 → 右端", () => {
    for (let seed = 1; seed <= 20; seed++) {
      const map = generateMap(seed);
      const v = validateMap(map);
      expect(v.errors).toEqual([]);
      expect(map.path[0].x).toBe(0);
      expect(map.path[map.path.length - 1].x).toBe(map.cols - 1);
      expect(map.waves.length).toBeGreaterThanOrEqual(5);
      expect(map.id).toBe(`gen_${seed}`);
    }
  });
});
