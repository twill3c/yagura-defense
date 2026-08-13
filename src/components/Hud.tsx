"use client";
import type { GameState } from "@/core/types";

export function Hud({
  game,
  onStartWave,
}: {
  game: GameState;
  onStartWave: () => void;
}) {
  const totalWaves = game.map.waves.length;
  const waveLabel =
    game.status === "wave"
      ? `第 ${game.waveIndex + 1} 波 進行中`
      : game.waveIndex >= totalWaves
        ? `全 ${totalWaves} 波 終了`
        : `次: 第 ${game.waveIndex + 1} / ${totalWaves} 波`;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        flexWrap: "wrap",
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 8,
        padding: "8px 12px",
      }}
    >
      <strong style={{ fontSize: 15 }}>やぐらディフェンス</strong>
      <span>💰 {game.money}</span>
      <span>❤️ {game.lives}</span>
      <span style={{ color: "var(--text-dim)" }}>{waveLabel}</span>
      <button
        onClick={onStartWave}
        disabled={game.status !== "building"}
        style={{
          marginLeft: "auto",
          minWidth: 96,
          minHeight: 44,
          fontSize: 15,
          fontWeight: 700,
          borderRadius: 8,
          border: "1px solid var(--line)",
          background: game.status === "building" ? "var(--accent)" : "var(--surface)",
          color: game.status === "building" ? "#fff" : "var(--text-dim)",
          cursor: game.status === "building" ? "pointer" : "default",
        }}
      >
        出陣
      </button>
    </div>
  );
}
