"use client";
// マップ選択画面(F-11)。タップのみで完結(F-09)。
import { useState } from "react";
import { generateMap } from "@/core/mapgen";
import { MAP_01 } from "@/core/maps";
import type { GameMap } from "@/core/types";
import { loadHighScore } from "@/lib/highscore";

/** 経路だけの小さなプレビュー */
function MapThumb({ map }: { map: GameMap }) {
  return (
    <svg
      viewBox={`0 0 ${map.cols} ${map.rows}`}
      style={{ width: 132, height: 99, background: "var(--grass)", borderRadius: 4 }}
    >
      {map.path.map((c) => (
        <rect key={`${c.x},${c.y}`} x={c.x} y={c.y} width={1} height={1} fill="var(--path)" />
      ))}
      {map.blocked.map((c) => (
        <rect key={`b${c.x},${c.y}`} x={c.x} y={c.y} width={1} height={1} fill="#1a222e" />
      ))}
    </svg>
  );
}

export function MapSelect({ onPick }: { onPick: (map: GameMap) => void }) {
  const [baseSeed, setBaseSeed] = useState(1);
  const maps: GameMap[] = [MAP_01, ...[0, 1, 2, 3].map((i) => generateMap(baseSeed + i))];

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "16px 8px",
        display: "flex",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <h1 style={{ margin: 0, fontSize: 22 }}>
        やぐらディフェンス{" "}
        <span
          style={{
            fontSize: 11,
            fontWeight: 400,
            color: "var(--text-dim)",
            border: "1px solid var(--line)",
            borderRadius: 999,
            padding: "2px 8px",
            verticalAlign: "middle",
            whiteSpace: "nowrap",
          }}
        >
          📱 スマホ対応(タッチ操作)
        </span>
      </h1>
      <p style={{ margin: 0, color: "var(--text-dim)" }}>
        出陣する街道を選んでください。矢倉を建てて本丸を守り抜こう。
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {maps.map((map) => {
          const high = loadHighScore(map.id);
          return (
            <button
              key={map.id}
              onClick={() => onPick(map)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: 10,
                minWidth: 152,
                minHeight: 44,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: 14,
              }}
            >
              <MapThumb map={map} />
              <span>{map.name}</span>
              <small style={{ color: "var(--text-dim)" }}>
                {high !== null ? `ハイスコア ${high}` : "未挑戦"}
              </small>
            </button>
          );
        })}
      </div>
      <button
        onClick={() => setBaseSeed((s) => s + 4)}
        style={{
          alignSelf: "flex-start",
          minHeight: 44,
          minWidth: 132,
          borderRadius: 8,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          color: "var(--text)",
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        🗺 別の地形を見る
      </button>
    </div>
  );
}
