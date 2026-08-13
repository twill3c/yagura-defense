# TEST_SPEC.md — yagura-defense

<!-- scaffold template v1.8.0 から展開(2026-08-13) -->

## 実行規約

- `npx vitest run` を stage 3–5 の判定に使用。カバレッジ判定は `npx vitest run --coverage`
- テストは `src/core/__tests__/*.test.ts` に置き、各 describe に対応 T-ID をコメントで残す
- 決定性テスト(T-011 等)はシードを固定値で書く。期待値をスナップショットに逃がさず、
  構造的性質(深い等値・到達可能性・単調性)で assert する。前提を検算しない期待値は
  正しい実装を落とす(VERIF-FALSE)
- バランステスト(T-1xx)はヘッドレスで全ウェーブを回す。tick 上限(予算)を必ず設け、
  無限ループでテストをハングさせない

## ケース一覧

| ID | 対応要求 | ケース | 期待 |
|---|---|---|---|
| T-001 | F-01 | mulberry32 に同一シード | 同一の乱数列・値は [0,1) |
| T-002 | F-01 | 異なるシード | 先頭 8 個の列が一致しない |
| T-003 | F-01 | randInt(state, 0, 3) を 200 回 | 常に範囲内・両端が出現・整数 |
| T-010 | F-02 | validateMap(MAP_01) | エラーなしで合格 |
| T-011 | F-02 | 壊れたマップ(重複 / 非隣接 / blocked 交差 / 盤外 / buildable 下限割れ) | いずれも !ok |
| T-012 | F-02 | isBuildable | path・blocked・盤外は false、空地は true |
| T-020 | F-03 | createGame 初期状態 | money/lives/status/tick が仕様どおり |
| T-021 | F-02/F-06 | build の受理と拒否(path・blocked・盤外・占有・資金不足) | 拒否時は ok=false かつ状態不変 |
| T-022 | F-06 | startWave | スケジュール確定・進行中の再開始拒否・atTick どおり湧く |
| T-023 | F-03 | 敵移動 | progress = speed×tick、enemyPosition は線形補間・終端張り付き |
| T-024 | F-05/B-01 | タワー未設置 | リークでライフ減・敵消滅・ウェーブは終了する |
| T-025 | F-04 | 射撃 | max(1, dmg−def)、クールダウン間隔でのみ発射 |
| T-026 | F-06 | 撃破 | 報酬加算・kills 増・敵消滅 |
| T-027 | F-06/F-08 | 複数ウェーブ | クリアボーナス → building に復帰 → 全殲滅で won |
| T-028 | F-08 | ライフ 0 | 即 lost・以後 step は状態を変えない |
| T-029 | F-01 | 同一シード + 同一コマンド列を 2 回リプレイ | 最終 state が深い等値 |
| T-030 | F-03 | runGame にコマンドなし | maxTicks で必ず停止(予算) |
