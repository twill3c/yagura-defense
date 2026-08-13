import { Game } from "@/components/Game";

export default function Home() {
  return (
    <main>
      <Game />
      <footer
        style={{
          fontSize: 12,
          opacity: 0.55,
          maxWidth: 640,
          textAlign: "center",
          margin: "16px auto 0",
          padding: "0 12px 24px",
        }}
      >
        <div>
          操作はタップ / クリックのみ ・ 空き地タップ → 矢倉を建設 ・ 矢倉タップ →
          強化 / 売却 ・ 「出陣」で波開始 ・ 🔇 効果音 ON/OFF ・ 🗺 マップ選択 —
          全 5 波を守り抜けば勝利
        </div>
        <div style={{ marginTop: 6, opacity: 0.8 }}>
          MIT License © 2026 坂田哲朗 ・{" "}
          <a
            href="https://github.com/twill3c/yagura-defense"
            target="_blank"
            rel="noreferrer"
            style={{ color: "inherit" }}
          >
            GitHub
          </a>{" "}
          ・{" "}
          <a
            href="https://claude.ai/code/artifact/87aa6fde-cf7e-4fe8-a5c6-cfebbbbea609"
            target="_blank"
            rel="noreferrer"
            style={{ color: "inherit" }}
          >
            遊び方ガイド
          </a>{" "}
          ・{" "}
          <a
            href="https://claude.ai/code/artifact/35b59c70-a145-40c2-b070-9c0aa3f21a94"
            target="_blank"
            rel="noreferrer"
            style={{ color: "inherit" }}
          >
            アーキテクチャ図
          </a>
        </div>
      </footer>
    </main>
  );
}
