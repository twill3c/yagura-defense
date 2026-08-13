# HARNESS_CHANGELOG.md — ハーネス改訂台帳(yagura-defense)

原則: **エージェントがミスをするたびに、そのミスが二度と起きないようハーネスを改良する。**
起票条件: 同一失敗コード累計 2 回(LL-10)、または severity S1(LL-12)。

HC-001 は fleet 共通の looplog 記録規範(AGENTS.md §2 参照)。本台帳は HC-002 から始める。

---

## HC-002

| 項目 | 内容 |
|---|---|
| 起票日 | 2026-08-13 |
| トリガー | `TOOL-MISUSE` × 2(loop_002: failure.resolution に自由文を渡しスキーマ拒否 / loop_005: test_run の passed/failed をテスト出力を見る前に同一バッチで記録し実数と乖離) |
| 診断 | looplog 記録を「実行コマンドと同じシェルバッチ」に混ぜると、出力確認前に数値を書くことになり HC-001 の転記規範を破る。また enum フィールド(resolution 等)の許容値は EVENT_SPECS でなく taxonomy.json 側にあり、確認手順から漏れやすい |
| 改訂 | AGENTS.md §2 looplog 記録の規範に追記: (1) test_run の記録はテスト実行と**別コマンド**で、出力の数値を確認してから行う (2) enum 値(resolution / severity / kind)は taxonomy.json と looplog.py の ENUMS を正とし、初回使用前に確認する |
| 種別 | agents_md |
| SCAFFOLD_VERSION | 変更なし(プロジェクト局所。再発すればレジストリへ還流を検討) |
| 効果検証 | 以後 5 ループで TOOL-MISUSE 再発 0 件なら Closed |
| propagation | yagura-defense のみ(fleet 展開はレジストリ改訂時に判断) |
| 状態 | Open |
