import { describe, expect, it } from "vitest";
import { randInt, rngInit, rngNext } from "../prng";

function drawSeq(seed: number, n: number): number[] {
  let state = rngInit(seed);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const r = rngNext(state);
    out.push(r.value);
    state = r.state;
  }
  return out;
}

// T-001
describe("rngNext: 同一シードは同一列", () => {
  it("シード 42 で 10 個の列が完全一致する", () => {
    expect(drawSeq(42, 10)).toEqual(drawSeq(42, 10));
  });

  it("値は [0, 1) に収まる", () => {
    for (const v of drawSeq(123, 100)) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

// T-002
describe("rngNext: 異なるシードは異なる列", () => {
  it("シード 1 と 2 の先頭 8 個が一致しない", () => {
    expect(drawSeq(1, 8)).not.toEqual(drawSeq(2, 8));
  });
});

// T-003
describe("randInt: 範囲と両端", () => {
  it("[0, 3] を 200 回引くと常に範囲内で、両端が出現する", () => {
    let state = rngInit(7);
    const seen = new Set<number>();
    for (let i = 0; i < 200; i++) {
      const r = randInt(state, 0, 3);
      state = r.state;
      expect(Number.isInteger(r.value)).toBe(true);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThanOrEqual(3);
      seen.add(r.value);
    }
    expect(seen.has(0)).toBe(true);
    expect(seen.has(3)).toBe(true);
  });
});
