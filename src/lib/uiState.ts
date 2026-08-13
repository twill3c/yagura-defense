// タップ操作の選択状態機械(F-09)。純関数 — React に依存しない。
// 建設フロー: 空きセルをタップ → 種別選択パネル → 種別タップで build。
// 同じ対象の再タップはトグルで解除する(誤操作からの脱出をワンタップに保つ)。
import type { Cell } from "@/core/types";

export type UiSelection =
  | { kind: "none" }
  | { kind: "cell"; cell: Cell }
  | { kind: "tower"; towerId: number };

export type UiAction =
  | { type: "tapCell"; cell: Cell }
  | { type: "tapTower"; towerId: number }
  | { type: "dismiss" };

export const UI_NONE: UiSelection = { kind: "none" };

export function uiReduce(sel: UiSelection, action: UiAction): UiSelection {
  switch (action.type) {
    case "tapCell":
      if (
        sel.kind === "cell" &&
        sel.cell.x === action.cell.x &&
        sel.cell.y === action.cell.y
      ) {
        return UI_NONE;
      }
      return { kind: "cell", cell: action.cell };
    case "tapTower":
      if (sel.kind === "tower" && sel.towerId === action.towerId) {
        return UI_NONE;
      }
      return { kind: "tower", towerId: action.towerId };
    case "dismiss":
      return UI_NONE;
  }
}
