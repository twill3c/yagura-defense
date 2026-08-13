"use client";
// ゲーム画面のルート。rAF は描画駆動のみ、シミュレーションは固定 TICK_MS の
// 積算で進める(N-03: フレームレートが結果に影響しない)。
// 効果音・バナーは状態差分(diffEvents)から導出し、シムはイベントを持たない。
import { useCallback, useEffect, useRef, useState } from "react";
import { TICK_MS } from "@/core/balance";
import { applyCommand, createGame, score, step } from "@/core/engine";
import { diffEvents } from "@/core/events";
import { MAP_01 } from "@/core/maps";
import type { Command, GameState } from "@/core/types";
import { loadHighScore, saveHighScore } from "@/lib/highscore";
import { playEvents, unlockAudio } from "@/lib/sound";
import { UI_NONE, uiReduce, type UiAction, type UiSelection } from "@/lib/uiState";
import { BuildPanel } from "./BuildPanel";
import { GameBoard } from "./GameBoard";
import { Hud } from "./Hud";

const SEED = 1;

export function Game() {
  const [game, setGame] = useState<GameState>(() => createGame(MAP_01, SEED));
  const [sel, setSel] = useState<UiSelection>(UI_NONE);
  const [soundOn, setSoundOn] = useState(false); // F-12: デフォルト OFF
  const [banner, setBanner] = useState<string | null>(null);
  const [highInfo, setHighInfo] = useState<{ best: number | null; isNew: boolean } | null>(
    null,
  );

  const accRef = useRef(0);
  const lastRef = useRef<number | null>(null);
  const prevGameRef = useRef(game);
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // 状態遷移の観測: 効果音・ウェーブバナー・ハイスコア
  useEffect(() => {
    const prev = prevGameRef.current;
    if (prev === game) return;
    prevGameRef.current = game;

    const events = diffEvents(prev, game);
    playEvents(events, soundOnRef.current);

    const waveStart = events.find((e) => e.type === "waveStart");
    if (waveStart && waveStart.type === "waveStart") {
      setBanner(`第 ${waveStart.wave} 波、来襲!`);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
      bannerTimer.current = setTimeout(() => setBanner(null), 1600);
    }

    if (events.some((e) => e.type === "won" || e.type === "lost")) {
      const s = score(game);
      const isNew = saveHighScore(game.map.id, s);
      setHighInfo({ best: loadHighScore(game.map.id), isNew });
    }
  }, [game]);

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  const exec = useCallback((command: Command) => {
    setGame((g) => applyCommand(g, command).state);
  }, []);

  const dispatchUi = useCallback((action: UiAction) => {
    setSel((s) => uiReduce(s, action));
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((v) => {
      if (!v) unlockAudio();
      return !v;
    });
  }, []);

  const restart = useCallback(() => {
    setGame(createGame(MAP_01, SEED));
    setSel(UI_NONE);
    setHighInfo(null);
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
      <Hud
        game={game}
        soundOn={soundOn}
        onToggleSound={toggleSound}
        onStartWave={() => exec({ type: "startWave" })}
      />
      <div style={{ position: "relative" }}>
        <GameBoard game={game} sel={sel} onUi={dispatchUi} />
        {banner && !ended && (
          <div
            style={{
              position: "absolute",
              top: "40%",
              left: 0,
              right: 0,
              textAlign: "center",
              fontSize: 24,
              fontWeight: 700,
              color: "var(--accent-soft)",
              textShadow: "0 2px 8px #000",
              pointerEvents: "none",
            }}
          >
            {banner}
          </div>
        )}
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
            {highInfo && (
              <div style={{ fontSize: 15, color: "var(--accent-soft)" }}>
                {highInfo.isNew
                  ? "🎉 ハイスコア更新!"
                  : highInfo.best !== null
                    ? `ハイスコア: ${highInfo.best}`
                    : null}
              </div>
            )}
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
