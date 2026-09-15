import { describe, expect, it } from "vitest";
import { formValuesToMeta, getMetaShape, metaToFormValues } from "../documentMeta";

describe("documentMeta — getMetaShape", () => {
  it("map đúng shape theo subType (CONFIRMED bằng dữ liệu thật, FE-04)", () => {
    expect(getMetaShape("PROPOSE_REPAIR")).toBe("issue");
    expect(getMetaShape("PROPOSE_INK")).toBe("items-procurement");
    expect(getMetaShape("PROPOSE_PROCUREMENT")).toBe("items-procurement");
    expect(getMetaShape("CHECK_DAMAGE")).toBe("items-inspection");
    expect(getMetaShape("CONFIRM_STATUS")).toBe("items-inspection");
    expect(getMetaShape("MANUAL")).toBe("raw");
  });
});

describe("documentMeta — formValuesToMeta", () => {
  it("PROPOSE_REPAIR -> {issue}", () => {
    expect(formValuesToMeta("PROPOSE_REPAIR", { issue: "Máy không lên nguồn" })).toEqual({
      issue: "Máy không lên nguồn",
    });
  });

  it("PROPOSE_INK -> {items:[{deviceName,...}], totalAmount} — tự tính totalPrice/totalAmount", () => {
    const result = formValuesToMeta("PROPOSE_INK", {
      items: [
        { name: "Máy in", quantity: 2, unitPrice: 100000, note: "Hộp mực 78A" },
        { name: "Mực scan", quantity: 1, unitPrice: 50000 },
      ],
    });
    expect(result).toEqual({
      items: [
        { deviceName: "Máy in", quantity: 2, unitPrice: 100000, totalPrice: 200000, note: "Hộp mực 78A" },
        { deviceName: "Mực scan", quantity: 1, unitPrice: 50000, totalPrice: 50000, note: undefined },
      ],
      totalAmount: 250000,
    });
  });

  it("CHECK_DAMAGE -> {inspectionResult, items:[{description,...}], totalAmount}", () => {
    const result = formValuesToMeta("CHECK_DAMAGE", {
      inspectionResult: "Bao lụa, Sensor cảm biến",
      items: [{ name: "Bao lụa", quantity: 1, unitPrice: 350000 }],
    });
    expect(result).toEqual({
      inspectionResult: "Bao lụa, Sensor cảm biến",
      items: [{ description: "Bao lụa", quantity: 1, unitPrice: 350000, totalPrice: 350000 }],
      totalAmount: 350000,
    });
  });

  it("MANUAL (raw fallback) -> parse JSON hợp lệ", () => {
    expect(formValuesToMeta("MANUAL", { rawMetaJson: '{"note":"hướng dẫn sử dụng"}' })).toEqual({
      note: "hướng dẫn sử dụng",
    });
  });

  it("MANUAL (raw fallback) -> JSON không hợp lệ vẫn không throw, giữ nguyên chuỗi", () => {
    expect(formValuesToMeta("MANUAL", { rawMetaJson: "{invalid" })).toEqual({ raw: "{invalid" });
  });
});

describe("documentMeta — metaToFormValues (round-trip với dữ liệu thật)", () => {
  it("PROPOSE_INK: đọc lại đúng field deviceName -> name", () => {
    const meta = { items: [{ deviceName: "Máy in", quantity: 1, unitPrice: 120000, totalPrice: 120000, note: "sạc mực" }], totalAmount: 120000 };
    expect(metaToFormValues("PROPOSE_INK", meta)).toEqual({
      items: [{ name: "Máy in", quantity: 1, unitPrice: 120000, note: "sạc mực" }],
      inspectionResult: undefined,
    });
  });

  it("CHECK_DAMAGE: đọc lại đúng field description -> name + inspectionResult", () => {
    const meta = {
      inspectionResult: "Bao lụa, Sensor cảm biến",
      items: [{ description: "Bao lụa", quantity: 1, unitPrice: 350000, totalPrice: 350000 }],
      totalAmount: 350000,
    };
    expect(metaToFormValues("CHECK_DAMAGE", meta)).toEqual({
      items: [{ name: "Bao lụa", quantity: 1, unitPrice: 350000, note: undefined }],
      inspectionResult: "Bao lụa, Sensor cảm biến",
    });
  });

  it("items rỗng -> trả về 1 dòng trống để form luôn có ít nhất 1 hàng nhập liệu", () => {
    expect(metaToFormValues("PROPOSE_PROCUREMENT", { items: [], totalAmount: 0 })).toEqual({
      items: [{ name: "", quantity: 1, unitPrice: 0, note: "" }],
      inspectionResult: undefined,
    });
  });
});
