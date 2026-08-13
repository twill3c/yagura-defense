"use client";
// 盤面 SVG。セル座標系(1 セル = 1 単位)で描き、表示サイズは CSS に任せる。
import { ENEMIES, TOWERS } from "@/core/balance";
import { enemyPosition } from "@/core/engine";
import { isBuildable } from "@/core/maps";
import type { GameState } from "@/core/types";
import type { UiAction, UiSelection } from "@/lib/uiState";

const TOWER_GLYPH: Record<string, string> = {
  yumi: "弓",
  ozutsu: "筒",
  fuda: "札",
};
const TOWER_COLOR: Record<string, string> = {
  yumi: "#7fa65a",
  ozutsu: "#8a6d9b",
  fuda: "#4f8fa8",
};
const ENEMY_COLOR: Record<string, string> = {
  ashigaru: "#c9a227",
  shinobi: "#9b59b6",
  kabuto: "#b0413e",
  taisho: "#e74c3c",
};
const ENEMY_R: Record<string, number> = {
  ashigaru: 0.26,
  shinobi: 0.2,
  kabuto: 0.32,
  taisho: 0.42,
};

export function GameBoard({
  game,
  sel,
  onUi,
}: {
  game: GameState;
  sel: UiSelection;
  onUi: (a: UiAction) => void;
}) {
  const { map } = game;
  const pathKey = new Set(map.path.map((c) => `${c.x},${c.y}`));
  const blockedKey = new Set(map.blocked.map((c) => `${c.x},${c.y}`));
  const towerAt = new Map(game.towers.map((t) => [`${t.cell.x},${t.cell.y}`, t]));
  const spawn = map.path[0];
  const goal = map.path[map.path.length - 1];

  const selectedTower =
    sel.kind === "tower" ? game.towers.find((t) => t.id === sel.towerId) : undefined;

  const cells = [];
  for (let y = 0; y < map.rows; y++) {
    for (let x = 0; x < map.cols; x++) {
      const key = `${x},${y}`;
      const fill = pathKey.has(key)
        ? "var(--path)"
        : blockedKey.has(key)
          ? "#1a222e"
          : "var(--grass)";
      const isSel = sel.kind === "cell" && sel.cell.x === x && sel.cell.y === y;
      cells.push(
        <rect
          key={key}
          x={x}
          y={y}
          width={1}
          height={1}
          fill={fill}
          stroke={isSel ? "var(--accent-soft)" : "#141b26"}
          strokeWidth={isSel ? 0.08 : 0.03}
          onClick={() => {
            const tower = towerAt.get(key);
            if (tower) onUi({ type: "tapTower", towerId: tower.id });
            else if (isBuildable(map, { x, y })) onUi({ type: "tapCell", cell: { x, y } });
            else onUi({ type: "dismiss" });
          }}
        />,
      );
    }
  }

  return (
    <svg
      viewBox={`0 0 ${map.cols} ${map.rows}`}
      style={{
        width: "100%",
        height: "auto",
        display: "block",
        borderRadius: 8,
        background: "var(--bg)",
        touchAction: "manipulation",
      }}
    >
      {cells}
      {/* 湧き口と本丸 */}
      <text x={spawn.x + 0.5} y={spawn.y + 0.72} textAnchor="middle" fontSize={0.6} pointerEvents="none">
        ⛩️
      </text>
      <text x={goal.x + 0.5} y={goal.y + 0.72} textAnchor="middle" fontSize={0.7} pointerEvents="none">
        🏯
      </text>
      {/* 選択タワーの射程 */}
      {selectedTower && (
        <circle
          cx={selectedTower.cell.x + 0.5}
          cy={selectedTower.cell.y + 0.5}
          r={TOWERS[selectedTower.type].range}
          fill="rgba(232, 168, 124, 0.12)"
          stroke="var(--accent-soft)"
          strokeWidth={0.04}
          pointerEvents="none"
        />
      )}
      {/* タワー */}
      {game.towers.map((t) => (
        <g key={t.id} pointerEvents="none">
          <circle
            cx={t.cell.x + 0.5}
            cy={t.cell.y + 0.5}
            r={0.38}
            fill={TOWER_COLOR[t.type]}
            stroke="#141b26"
            strokeWidth={0.05}
          />
          <text
            x={t.cell.x + 0.5}
            y={t.cell.y + 0.68}
            textAnchor="middle"
            fontSize={0.42}
            fill="#141b26"
            fontWeight={700}
          >
            {TOWER_GLYPH[t.type]}
          </text>
        </g>
      ))}
      {/* 敵(HP バー付き) */}
      {game.enemies.map((e) => {
        const pos = enemyPosition(map, e);
        const r = ENEMY_R[e.type];
        const hpRatio = Math.max(0, e.hp / ENEMIES[e.type].hp);
        return (
          <g key={e.id} pointerEvents="none">
            <circle cx={pos.x + 0.5} cy={pos.y + 0.5} r={r} fill={ENEMY_COLOR[e.type]} />
            <rect x={pos.x + 0.15} y={pos.y - 0.02} width={0.7} height={0.09} fill="#141b26" />
            <rect
              x={pos.x + 0.15}
              y={pos.y - 0.02}
              width={0.7 * hpRatio}
              height={0.09}
              fill="#6fcf7c"
            />
          </g>
        );
      })}
    </svg>
  );
}
