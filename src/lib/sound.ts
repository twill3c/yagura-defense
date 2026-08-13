// WebAudio 合成効果音(F-12)。外部アセットなし・デフォルト OFF。
// AudioContext はユーザー操作(ON 切り替え)後に生成する(自動再生制限対応)。
import type { GameEvent } from "@/core/events";

let ctx: AudioContext | null = null;

function ensureCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function blip(
  freq: number,
  durationMs: number,
  type: OscillatorType = "square",
  gainValue = 0.04,
): void {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(gainValue, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + durationMs / 1000);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + durationMs / 1000);
}

/** ON 切り替え直後に呼び、AudioContext を確実に起こす */
export function unlockAudio(): void {
  ensureCtx();
}

export function playEvents(events: GameEvent[], enabled: boolean): void {
  if (!enabled || events.length === 0) return;
  for (const e of events) {
    switch (e.type) {
      case "shot":
        blip(880, 40, "square", 0.015);
        break;
      case "kill":
        blip(1320, 90, "triangle");
        break;
      case "leak":
        blip(150, 250, "sawtooth", 0.06);
        break;
      case "waveStart":
        blip(440, 160, "square");
        break;
      case "waveClear":
        blip(660, 120, "triangle");
        blip(990, 200, "triangle");
        break;
      case "won":
        blip(523, 150, "triangle");
        blip(659, 150, "triangle");
        blip(784, 300, "triangle");
        break;
      case "lost":
        blip(220, 300, "sawtooth", 0.06);
        blip(110, 500, "sawtooth", 0.06);
        break;
    }
  }
}
