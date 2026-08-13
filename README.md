# yagura-defense — やぐらディフェンス

矢倉(やぐら)を建てて、街道を進軍する敵勢から本丸を守る和風タワーディフェンス。
マウス / タッチ操作だけで完結する(キーボード不要・F-09)。

- 仕様: [SPEC.md](SPEC.md) / テスト仕様: [TEST_SPEC.md](TEST_SPEC.md)
- エージェント規範: [AGENTS.md](AGENTS.md)
- コアは UI から分離された決定論的シミュレーション。同一シード + 同一コマンド列は
  同一結果を再現し、バランス基準(SPEC §4)をヘッドレステストとして検証する。

## 開発

```bash
npm install
npm run dev           # 開発サーバ
npm run verify:fast   # typecheck + lint + test
npm run verify        # 上記 + next build(完了条件)
```

## 構成

- `src/core/` — 純関数のみのゲームエンジン(型 / PRNG / シム / バランス / マップ)
- `src/app/`, `src/components/` — Next.js 静的エクスポート UI
- `harness/`, `logs/loops/` — ループ可観測性(looplog)
