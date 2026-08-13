// シード付き PRNG(mulberry32・F-01)。状態は数値 1 個で GameState に載せて持ち回る。

export interface RngResult {
  value: number;
  state: number;
}

/** シードから PRNG 初期状態を作る */
export function rngInit(seed: number): number {
  return seed | 0;
}

/** [0, 1) の一様乱数を 1 個生成し、次の状態を返す(純関数) */
export function rngNext(state: number): RngResult {
  const a = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, state: a };
}

/** [lo, hi] の整数乱数(両端を含む) */
export function randInt(state: number, lo: number, hi: number): RngResult {
  const r = rngNext(state);
  return { value: lo + Math.floor(r.value * (hi - lo + 1)), state: r.state };
}
