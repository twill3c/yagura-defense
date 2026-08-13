"use client";
// 下部パネル: セル選択中は建設メニュー、タワー選択中は詳細。
// タッチターゲットは 44px 以上(F-09)。
import { TOWERS } from "@/core/balance";
import type { Command, GameState, TowerTypeId } from "@/core/types";
import type { UiAction, UiSelection } from "@/lib/uiState";

// 現行ループで効果が完全実装済みのタワーのみ販売する(loop_003 で全種解禁)
const AVAILABLE: TowerTypeId[] = ["yumi"];

export function BuildPanel({
  game,
  sel,
  onExec,
  onUi,
}: {
  game: GameState;
  sel: UiSelection;
  onExec: (c: Command) => void;
  onUi: (a: UiAction) => void;
}) {
  const boxStyle: React.CSSProperties = {
    background: "var(--surface)",
    border: "1px solid var(--line)",
    borderRadius: 8,
    padding: 12,
    minHeight: 68,
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  };

  if (sel.kind === "cell") {
    return (
      <div style={boxStyle}>
        <span style={{ color: "var(--text-dim)" }}>
          ({sel.cell.x}, {sel.cell.y}) に建てる:
        </span>
        {AVAILABLE.map((id) => {
          const spec = TOWERS[id];
          const canAfford = game.money >= spec.cost;
          return (
            <button
              key={id}
              disabled={!canAfford}
              onClick={() => {
                onExec({ type: "build", cell: sel.cell, tower: id });
                onUi({ type: "dismiss" });
              }}
              style={{
                minHeight: 44,
                minWidth: 110,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: canAfford ? "var(--accent)" : "var(--surface)",
                color: canAfford ? "#fff" : "var(--text-dim)",
                cursor: canAfford ? "pointer" : "default",
                fontSize: 14,
              }}
            >
              {spec.name} 💰{spec.cost}
            </button>
          );
        })}
      </div>
    );
  }

  if (sel.kind === "tower") {
    const tower = game.towers.find((t) => t.id === sel.towerId);
    if (!tower) return <div style={boxStyle} />;
    const spec = TOWERS[tower.type];
    return (
      <div style={boxStyle}>
        <strong>{spec.name}</strong>
        <span style={{ color: "var(--text-dim)" }}>
          Lv{tower.level} / 威力 {spec.dmg} / 射程 {spec.range}
        </span>
      </div>
    );
  }

  return (
    <div style={{ ...boxStyle, color: "var(--text-dim)" }}>
      空き地をタップして矢倉を建て、「出陣」で敵勢を迎え撃とう。
    </div>
  );
}
