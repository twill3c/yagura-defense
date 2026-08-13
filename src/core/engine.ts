// 決定論的シミュレーションエンジン(F-01/F-03)。全関数は純関数。
// tick 内の処理順は SPEC F-03 で固定:
// (1)コマンド適用は step の外(runGame / UI 駆動層)で tick 先頭に行う
// (2)湧き (3)敵移動+リーク (4)タワー射撃 (5)撃破処理 (6)勝敗判定
import {
  ENEMIES,
  MAX_TOWER_LEVEL,
  SELL_REFUND_RATE,
  START_LIVES,
  START_MONEY,
  TICK_MS,
  TOWERS,
  UPGRADE_COSTS,
  WAVE_CLEAR_BONUS,
  towerStats,
} from "./balance";
import { isBuildable } from "./maps";
import { rngInit } from "./prng";
import type {
  Cell,
  Command,
  CommandResult,
  EnemyState,
  GameMap,
  GameState,
  GameStatus,
  SpawnEntry,
  TimedCommand,
  TowerState,
} from "./types";

/** 初期状態を作る */
export function createGame(map: GameMap, seed: number): GameState {
  return {
    map,
    seed,
    rngState: rngInit(seed),
    tick: 0,
    money: START_MONEY,
    lives: START_LIVES,
    status: "building",
    waveIndex: 0,
    pendingSpawns: [],
    enemies: [],
    towers: [],
    nextEnemyId: 1,
    nextTowerId: 1,
    kills: 0,
  };
}

function reject(state: GameState, reason: string): CommandResult {
  return { state, ok: false, reason };
}

/** コマンドを適用する。不正なコマンドは ok=false で状態不変(F-06/F-09 の裏面) */
export function applyCommand(state: GameState, command: Command): CommandResult {
  if (state.status === "won" || state.status === "lost") {
    return reject(state, "終局後は操作できない");
  }

  if (command.type === "build") {
    const spec = TOWERS[command.tower];
    if (!isBuildable(state.map, command.cell)) {
      return reject(state, "建設できないセル");
    }
    if (
      state.towers.some(
        (t) => t.cell.x === command.cell.x && t.cell.y === command.cell.y,
      )
    ) {
      return reject(state, "占有済みのセル");
    }
    if (state.money < spec.cost) {
      return reject(state, "資金不足");
    }
    const tower: TowerState = {
      id: state.nextTowerId,
      type: spec.id,
      cell: { ...command.cell },
      level: 1,
      invested: spec.cost,
      readyAtTick: 0,
    };
    return {
      ok: true,
      state: {
        ...state,
        money: state.money - spec.cost,
        towers: [...state.towers, tower],
        nextTowerId: state.nextTowerId + 1,
      },
    };
  }

  if (command.type === "upgrade") {
    const tower = state.towers.find((t) => t.id === command.towerId);
    if (!tower) return reject(state, "タワーが存在しない");
    if (tower.level >= MAX_TOWER_LEVEL) return reject(state, "最大レベル");
    const cost = UPGRADE_COSTS[tower.type][tower.level - 1];
    if (state.money < cost) return reject(state, "資金不足");
    return {
      ok: true,
      state: {
        ...state,
        money: state.money - cost,
        towers: state.towers.map((t) =>
          t.id === tower.id
            ? { ...t, level: t.level + 1, invested: t.invested + cost }
            : t,
        ),
      },
    };
  }

  if (command.type === "sell") {
    const tower = state.towers.find((t) => t.id === command.towerId);
    if (!tower) return reject(state, "タワーが存在しない");
    const refund = Math.floor(tower.invested * SELL_REFUND_RATE);
    return {
      ok: true,
      state: {
        ...state,
        money: state.money + refund,
        towers: state.towers.filter((t) => t.id !== tower.id),
      },
    };
  }

  // startWave
  if (state.status !== "building") {
    return reject(state, "ウェーブ進行中");
  }
  if (state.waveIndex >= state.map.waves.length) {
    return reject(state, "全ウェーブ終了済み");
  }
  const wave = state.map.waves[state.waveIndex];
  const spawns: SpawnEntry[] = [];
  for (const g of wave) {
    for (let i = 0; i < g.count; i++) {
      spawns.push({
        atTick: state.tick + g.delayTicks + i * g.intervalTicks,
        enemy: g.enemy,
      });
    }
  }
  // 安定ソート(同 tick はグループ定義順)— 湧き順の決定性を保証する
  spawns.sort((a, b) => a.atTick - b.atTick);
  return { ok: true, state: { ...state, status: "wave", pendingSpawns: spawns } };
}

/** 敵の盤面座標(path 上の線形補間。終端以降は本丸位置) */
export function enemyPosition(map: GameMap, enemy: EnemyState): Cell {
  const last = map.path.length - 1;
  const p = Math.min(enemy.progress, last);
  const i = Math.min(Math.floor(p), last - 1);
  const frac = p - i;
  const a = map.path[i];
  const b = map.path[i + 1];
  return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac };
}

/** 1 tick 進める。won / lost では状態を変えない */
export function step(state: GameState): GameState {
  if (state.status === "won" || state.status === "lost") {
    return state;
  }

  const tick = state.tick;
  let money = state.money;
  let lives = state.lives;
  let kills = state.kills;

  // (2) 湧き
  let pendingSpawns = state.pendingSpawns;
  let nextEnemyId = state.nextEnemyId;
  let enemies: EnemyState[] = state.enemies;
  const due = pendingSpawns.filter((p) => p.atTick <= tick);
  if (due.length > 0) {
    pendingSpawns = pendingSpawns.filter((p) => p.atTick > tick);
    enemies = [...enemies];
    for (const d of due) {
      enemies.push({
        id: nextEnemyId++,
        type: d.enemy,
        hp: ENEMIES[d.enemy].hp,
        progress: 0,
      });
    }
  }

  // (3) 敵移動+リーク判定(スロー中は speed × slowFactor・F-04)
  const lastIndex = state.map.path.length - 1;
  const slowFactor = TOWERS.fuda.slowFactor ?? 1;
  const moved: EnemyState[] = [];
  for (const e of enemies) {
    const spec = ENEMIES[e.type];
    const slowed = e.slowUntil !== undefined && tick < e.slowUntil;
    const progress =
      e.progress + spec.speed * (slowed ? slowFactor : 1) * (TICK_MS / 1000);
    if (progress >= lastIndex) {
      lives -= spec.leakDamage;
    } else {
      moved.push({ ...e, progress });
    }
  }
  enemies = moved;

  // (4) タワー射撃(建設順 = id 昇順。hp<=0 の敵はターゲットにしない)
  let towers = state.towers;
  if (enemies.length > 0 && towers.length > 0) {
    const newTowers: TowerState[] = [];
    for (const t of towers) {
      if (tick < t.readyAtTick) {
        newTowers.push(t);
        continue;
      }
      const spec = towerStats(t.type, t.level);
      let target: EnemyState | null = null;
      for (const e of enemies) {
        if (e.hp <= 0) continue;
        const pos = enemyPosition(state.map, e);
        if (Math.hypot(pos.x - t.cell.x, pos.y - t.cell.y) > spec.range) {
          continue;
        }
        if (
          target === null ||
          e.progress > target.progress ||
          (e.progress === target.progress && e.id < target.id)
        ) {
          target = e;
        }
      }
      if (target !== null) {
        // enemies は下で撃破処理するローカル配列(moved)の要素を直接更新する
        if (spec.splashRadius !== undefined) {
          // 大筒: 着弾点(ターゲット位置)の splashRadius 内の敵全員に命中
          const at = enemyPosition(state.map, target);
          for (const e of enemies) {
            if (e.hp <= 0) continue;
            const pos = enemyPosition(state.map, e);
            if (Math.hypot(pos.x - at.x, pos.y - at.y) <= spec.splashRadius) {
              e.hp -= Math.max(1, spec.dmg - ENEMIES[e.type].def);
            }
          }
        } else {
          target.hp -= Math.max(1, spec.dmg - ENEMIES[target.type].def);
        }
        if (spec.slowFactor !== undefined) {
          // 札: スロー付与(再被弾で持続を更新)
          target.slowUntil = tick + (spec.slowTicks ?? 0);
        }
        newTowers.push({ ...t, readyAtTick: tick + spec.cooldownTicks });
      } else {
        newTowers.push(t);
      }
    }
    towers = newTowers;
  }

  // (5) 撃破処理
  if (enemies.some((e) => e.hp <= 0)) {
    const survivors: EnemyState[] = [];
    for (const e of enemies) {
      if (e.hp <= 0) {
        money += ENEMIES[e.type].reward;
        kills++;
      } else {
        survivors.push(e);
      }
    }
    enemies = survivors;
  }

  // (6) 勝敗判定(敗北が優先)
  let status: GameStatus = state.status;
  let waveIndex = state.waveIndex;
  if (lives <= 0) {
    lives = 0;
    status = "lost";
  } else if (
    status === "wave" &&
    pendingSpawns.length === 0 &&
    enemies.length === 0
  ) {
    money += WAVE_CLEAR_BONUS;
    waveIndex += 1;
    status = waveIndex >= state.map.waves.length ? "won" : "building";
  }

  return {
    ...state,
    tick: tick + 1,
    money,
    lives,
    kills,
    status,
    waveIndex,
    pendingSpawns,
    nextEnemyId,
    enemies,
    towers,
  };
}

/** スコア(F-08): 撃破×10 + 残ライフ×100 + 残資金 */
export function score(state: GameState): number {
  return state.kills * 10 + state.lives * 100 + state.money;
}

/**
 * ヘッドレス実行(テスト / バランスゲート用)。
 * timedCommands は tick 昇順で適用し、maxTicks を必ず上限とする(予算・無限ループ禁止)。
 * 拒否されたコマンドは黙って無視する(リプレイの決定性を保つ)。
 */
export function runGame(
  map: GameMap,
  seed: number,
  timedCommands: TimedCommand[],
  maxTicks: number,
): GameState {
  let state = createGame(map, seed);
  const queue = [...timedCommands].sort((a, b) => a.tick - b.tick);
  let qi = 0;
  while (
    state.tick < maxTicks &&
    state.status !== "won" &&
    state.status !== "lost"
  ) {
    while (qi < queue.length && queue[qi].tick <= state.tick) {
      state = applyCommand(state, queue[qi].command).state;
      qi++;
    }
    state = step(state);
  }
  return state;
}
