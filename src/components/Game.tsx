"use client";
// ゲーム画面のルート。rAF は描画駆動のみ、シミュレーションは固定 TICK_MS の
// 積算で進める(N-03: フレームレートが結果に影響しない)。
import { useCallback, useEffect, useRef, useState } from "react";
import { TICK_MS } from "@/core/balance";
import { applyCommand, createGame, score, step } from "@/core/engine";
import { MAP_01 } from "@/core/maps";
import type { Command, GameState } from "@/core/types";
import { UI_NONE, uiReduce, type UiAction, type UiSelection } from "@/lib/uiState";
import { BuildPanel } from "./BuildPanel";
import { GameBoard } from "./GameBoard";
import { Hud } from "./Hud";

const SEED = 1;

export function Game() {
  const [game, setGame] = useState<GameState>(() => createGame(MAP_01, SEED));
  const [sel, setSel] = useState<UiSelection>(UI_NONE);
  const accRef = useRef(0);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    let raf = 0;
    const frame = (now: number) => {
      const last = lastRef.current ?? now;
      lastRef.current = now;
      // タブ復帰などの巨大な経過はまとめて進めない(上限 1 秒分)
      accRef.current = Math.min(accRef.current + (now - last), 1000);
      const steps = Math.floor(accRef.current / TICK_MS);
      if (steps > 0) {
        accRef.current -= steps * TICK_MS;
        setGame((g) => {
          let s = g;
          for (let i = 0; i < steps; i++) s = step(s);
          return s;
        });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  const exec = useCallback((command: Command) => {
    setGame((g) => applyCommand(g, command).state);
  }, []);

  const dispatchUi = useCallback((action: UiAction) => {
    setSel((s) => uiReduce(s, action));
  }, []);

  const restart = useCallback(() => {
    setGame(createGame(MAP_01, SEED));
    setSel(UI_NONE);
    accRef.current = 0;
  }, []);

  const ended = game.status === "won" || game.status === "lost";

  return (
    <div
      style={{
        maxWidth: 640,
        margin: "0 auto",
        padding: "8px 8px 16px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <Hud game={game} onStartWave={() => exec({ type: "startWave" })} />
      <div style={{ position: "relative" }}>
        <GameBoard game={game} sel={sel} onUi={dispatchUi} />
        {ended && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              background: "rgba(20, 27, 38, 0.82)",
              borderRadius: 8,
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700 }}>
              {game.status === "won" ? "本丸を守り抜いた!" : "本丸陥落…"}
            </div>
            <div style={{ fontSize: 18 }}>
              スコア <strong>{score(game)}</strong>
              <span style={{ color: "var(--text-dim)", fontSize: 14, marginLeft: 8 }}>
                (撃破 {game.kills} / ❤️ {game.lives} / 💰 {game.money})
              </span>
            </div>
            <button
              onClick={restart}
              style={{
                minWidth: 160,
                minHeight: 44,
                fontSize: 16,
                borderRadius: 8,
                border: "1px solid var(--line)",
                background: "var(--accent)",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              もう一度
            </button>
          </div>
        )}
      </div>
      <BuildPanel game={game} sel={sel} onExec={exec} onUi={dispatchUi} />
    </div>
  );
}
