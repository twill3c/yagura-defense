import { describe, expect, it } from "vitest";
import { UI_NONE, uiReduce } from "../uiState";

// T-040(F-09: 2 タップ建設フローの選択状態)
describe("uiReduce: セル選択", () => {
  it("空きセルのタップで選択される", () => {
    expect(uiReduce(UI_NONE, { type: "tapCell", cell: { x: 1, y: 3 } })).toEqual({
      kind: "cell",
      cell: { x: 1, y: 3 },
    });
  });

  it("同じセルの再タップで解除(トグル)", () => {
    const sel = uiReduce(UI_NONE, { type: "tapCell", cell: { x: 1, y: 3 } });
    expect(uiReduce(sel, { type: "tapCell", cell: { x: 1, y: 3 } })).toEqual(UI_NONE);
  });

  it("別セルのタップで選択が移る", () => {
    const sel = uiReduce(UI_NONE, { type: "tapCell", cell: { x: 1, y: 3 } });
    expect(uiReduce(sel, { type: "tapCell", cell: { x: 2, y: 5 } })).toEqual({
      kind: "cell",
      cell: { x: 2, y: 5 },
    });
  });
});

// T-041
describe("uiReduce: タワー選択と解除", () => {
  it("タワーのタップでタワー選択になる", () => {
    expect(uiReduce(UI_NONE, { type: "tapTower", towerId: 3 })).toEqual({
      kind: "tower",
      towerId: 3,
    });
  });

  it("同じタワーの再タップで解除", () => {
    const sel = uiReduce(UI_NONE, { type: "tapTower", towerId: 3 });
    expect(uiReduce(sel, { type: "tapTower", towerId: 3 })).toEqual(UI_NONE);
  });

  it("セル選択中にタワーをタップするとタワー選択へ移る", () => {
    const sel = uiReduce(UI_NONE, { type: "tapCell", cell: { x: 1, y: 3 } });
    expect(uiReduce(sel, { type: "tapTower", towerId: 1 })).toEqual({
      kind: "tower",
      towerId: 1,
    });
  });

  it("dismiss は常に none へ戻す", () => {
    const sel = uiReduce(UI_NONE, { type: "tapCell", cell: { x: 1, y: 3 } });
    expect(uiReduce(sel, { type: "dismiss" })).toEqual(UI_NONE);
    expect(uiReduce(UI_NONE, { type: "dismiss" })).toEqual(UI_NONE);
  });
});
