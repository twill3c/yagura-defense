// ハイスコア永続化(F-08)。localStorage が無い環境(SSR / テスト)では安全に無効。
// storage を注入可能にしてテストする。

export interface ScoreStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): ScoreStorage | null {
  try {
    if (typeof globalThis.localStorage !== "undefined") {
      return globalThis.localStorage;
    }
  } catch {
    // アクセス自体が例外を投げる環境(プライベートモード等)は無効扱い
  }
  return null;
}

const KEY_PREFIX = "yagura-defense:high:";

export function loadHighScore(
  mapId: string,
  storage: ScoreStorage | null = defaultStorage(),
): number | null {
  if (!storage) return null;
  const raw = storage.getItem(KEY_PREFIX + mapId);
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/** 既存より高いときだけ保存し、更新したかを返す */
export function saveHighScore(
  mapId: string,
  score: number,
  storage: ScoreStorage | null = defaultStorage(),
): boolean {
  if (!storage) return false;
  const prev = loadHighScore(mapId, storage);
  if (prev !== null && prev >= score) return false;
  storage.setItem(KEY_PREFIX + mapId, String(score));
  return true;
}
