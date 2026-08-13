// バランス数値の正本(SPEC §2 末尾)。調整はバランスゲート(B-xx)green のまま行う。
import type { EnemySpec, EnemyTypeId, TowerSpec, TowerTypeId } from "./types";

/** 論理 tick 長(ms)。シミュレーションは常にこの粒度で進む(F-03 / N-03) */
export const TICK_MS = 100;
export const TICKS_PER_SEC = 1000 / TICK_MS;

export const START_MONEY = 220;
export const START_LIVES = 10;
export const WAVE_CLEAR_BONUS = 50;
/** 売却払い戻し率(F-07)。累計投資額 × 0.7 切り捨て */
export const SELL_REFUND_RATE = 0.7;

export const TOWERS: Record<TowerTypeId, TowerSpec> = {
  yumi: {
    id: "yumi",
    name: "弓矢倉",
    cost: 100,
    range: 2.5,
    dmg: 12,
    cooldownTicks: 5,
  },
  ozutsu: {
    id: "ozutsu",
    name: "大筒矢倉",
    cost: 250,
    range: 2.0,
    dmg: 30,
    cooldownTicks: 20,
    splashRadius: 1.0, // loop_003 で有効化
  },
  fuda: {
    id: "fuda",
    name: "札矢倉",
    cost: 150,
    range: 2.0,
    dmg: 4,
    cooldownTicks: 10,
    slowFactor: 0.5, // loop_003 で有効化
    slowTicks: 20,
  },
};

export const ENEMIES: Record<EnemyTypeId, EnemySpec> = {
  ashigaru: {
    id: "ashigaru",
    name: "足軽",
    hp: 30,
    speed: 1.0,
    def: 0,
    reward: 10,
    leakDamage: 1,
  },
  shinobi: {
    id: "shinobi",
    name: "忍び",
    hp: 20,
    speed: 2.0,
    def: 0,
    reward: 12,
    leakDamage: 1,
  },
  kabuto: {
    id: "kabuto",
    name: "兜武者",
    hp: 90,
    speed: 0.6,
    def: 3,
    reward: 25,
    leakDamage: 1,
  },
  taisho: {
    id: "taisho",
    name: "武者大将",
    hp: 600,
    speed: 0.4,
    def: 5,
    reward: 150,
    leakDamage: 5,
  },
};
