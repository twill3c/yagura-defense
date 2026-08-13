"use client";
// 下部パネル: セル選択中は建設メニュー、タワー選択中は詳細。
// タッチターゲットは 44px 以上(F-09)。
import {
  MAX_TOWER_LEVEL,
  SELL_REFUND_RATE,
  TOWERS,
  UPGRADE_COSTS,
  towerStats,
} from "@/core/balance";
import type { Command, GameState, TowerTypeId } from "@/core/types";
import type { UiAction, UiSelection } from "@/lib/uiState";

const AVAILABLE: TowerTypeId[] = ["yumi", "ozutsu", "fuda"];

const TOWER_NOTE: Record<TowerTypeId, string> = {
  yumi: "単体・速射",
  ozutsu: "範囲攻撃・低速",
  fuda: "鈍足付与",
};

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
              <br />
              <small style={{ fontWeight: 400 }}>{TOWER_NOTE[id]}</small>
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
    const stats = towerStats(tower.type, tower.level);
    const canUpgrade = tower.level < MAX_TOWER_LEVEL;
    const upCost = canUpgrade ? UPGRADE_COSTS[tower.type][tower.level - 1] : 0;
    const refund = Math.floor(tower.invested * SELL_REFUND_RATE);
    return (
      <div style={boxStyle}>
        <strong>{spec.name}</strong>
        <span style={{ color: "var(--text-dim)" }}>
          Lv{tower.level} / 威力 {stats.dmg} / 射程 {stats.range}
        </span>
        <button
          disabled={!canUpgrade || game.money < upCost}
          onClick={() => onExec({ type: "upgrade", towerId: tower.id })}
          style={{
            minHeight: 44,
            minWidth: 110,
            borderRadius: 8,
            border: "1px solid var(--line)",
            background:
              canUpgrade && game.money >= upCost ? "var(--accent)" : "var(--surface)",
            color: canUpgrade && game.money >= upCost ? "#fff" : "var(--text-dim)",
            cursor: canUpgrade && game.money >= upCost ? "pointer" : "default",
            fontSize: 14,
          }}
        >
          {canUpgrade ? `強化 💰${upCost}` : "最大 Lv"}
        </button>
        <button
          onClick={() => {
            onExec({ type: "sell", towerId: tower.id });
            onUi({ type: "dismiss" });
          }}
          style={{
            minHeight: 44,
            minWidth: 110,
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--text)",
            cursor: "pointer",
            fontSize: 14,
          }}
        >
          売却 💰{refund}
        </button>
      </div>
    );
  }

  return (
    <div style={{ ...boxStyle, color: "var(--text-dim)" }}>
      空き地をタップして矢倉を建て、「出陣」で敵勢を迎え撃とう。
    </div>
  );
}
