// yagura-defense core 型定義(SPEC F-01〜F-08)
// このファイルは型のみ。実行文を置かない(カバレッジ集計対象外の根拠)。

export type TileKind = "path" | "buildable" | "blocked";

export interface Cell {
  x: number;
  y: number;
}

export type TowerTypeId = "yumi" | "ozutsu" | "fuda";
export type EnemyTypeId = "ashigaru" | "shinobi" | "kabuto" | "taisho";

/** タワー種の定義(正本: balance.ts)。splash/slow は loop_003 で有効化 */
export interface TowerSpec {
  id: TowerTypeId;
  name: string;
  cost: number;
  /** 射程(セル単位・ユークリッド距離) */
  range: number;
  dmg: number;
  cooldownTicks: number;
  /** 範囲攻撃半径(大筒のみ・loop_003) */
  splashRadius?: number;
  /** スロー倍率 0–1(札のみ・loop_003) */
  slowFactor?: number;
  slowTicks?: number;
}

export interface EnemySpec {
  id: EnemyTypeId;
  name: string;
  hp: number;
  /** 移動速度(セル / 秒) */
  speed: number;
  /** 平坦防御。ダメージは max(1, dmg - def)(F-05) */
  def: number;
  reward: number;
  /** 本丸到達時に失うライフ */
  leakDamage: number;
}

export interface WaveGroup {
  enemy: EnemyTypeId;
  count: number;
  /** 同グループ内の湧き間隔(tick) */
  intervalTicks: number;
  /** ウェーブ開始からの遅延(tick) */
  delayTicks: number;
}

export type Wave = WaveGroup[];

export interface GameMap {
  id: string;
  name: string;
  cols: number;
  rows: number;
  /** 湧き口 → 本丸の順序付きセル列。隣接(マンハッタン距離 1)・重複なし(F-02) */
  path: Cell[];
  /** 建設不可の装飾タイル */
  blocked: Cell[];
  waves: Wave[];
}

export interface EnemyState {
  id: number;
  type: EnemyTypeId;
  hp: number;
  /** path 上の進行度(セル単位の実数)。path.length - 1 以上で本丸到達 */
  progress: number;
}

export interface TowerState {
  id: number;
  type: TowerTypeId;
  cell: Cell;
  level: number;
  /** 累計投資額(売却払い戻しの基数・F-07) */
  invested: number;
  /** この tick 以降に射撃可能 */
  readyAtTick: number;
}

export type GameStatus = "building" | "wave" | "won" | "lost";

export interface SpawnEntry {
  atTick: number;
  enemy: EnemyTypeId;
}

export interface GameState {
  map: GameMap;
  seed: number;
  /** PRNG 内部状態(F-01: 状態は GameState で持ち回る) */
  rngState: number;
  tick: number;
  money: number;
  lives: number;
  status: GameStatus;
  /** 次に開始する(または進行中の)ウェーブ番号 */
  waveIndex: number;
  pendingSpawns: SpawnEntry[];
  enemies: EnemyState[];
  towers: TowerState[];
  nextEnemyId: number;
  nextTowerId: number;
  kills: number;
}

export type Command =
  | { type: "build"; cell: Cell; tower: TowerTypeId }
  | { type: "startWave" };

export interface TimedCommand {
  tick: number;
  command: Command;
}

export interface CommandResult {
  state: GameState;
  ok: boolean;
  reason?: string;
}
