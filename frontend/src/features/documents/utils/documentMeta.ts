import { z } from "zod";
import type { DocumentMeta, DocumentSubType } from "@/types/document.types";

/**
 * `meta` KHÔNG có schema cứng ở backend (`z.record(z.string(), z.unknown())`
 * — DOCUMENT_DOMAIN_MAP.md). Các helper dưới đây KHÔNG áp đặt 1 schema mới
 * cho backend, chỉ giúp FE hiển thị/nhập liệu nhất quán dựa trên MẪU DỮ LIỆU
 * THẬT đã quan sát qua `GET /documents?subType=...` (CONFIRMED, không suy
 * đoán, FE-04 2026-09-05):
 *   - PROPOSE_REPAIR                 -> { issue }
 *   - PROPOSE_INK/PROPOSE_PROCUREMENT -> { items: [{deviceName,quantity,unitPrice,totalPrice,note?}], totalAmount }
 *   - CHECK_DAMAGE/CONFIRM_STATUS     -> { inspectionResult, items: [{description,quantity,unitPrice,totalPrice}], totalAmount }
 *   - MANUAL                          -> KHÔNG có bản ghi thật nào để đối chiếu (0 document trong DB lúc khảo sát) — fallback JSON thô.
 *
 * "Hạng mục" dùng chung 1 field nội bộ `name` (bất kể hiển thị là
 * "Thiết bị/Vật tư" hay "Mô tả") — form dùng chung `useFieldArray`, chỉ đổi
 * NHÃN hiển thị theo subType, tránh 2 component gần như giống hệt nhau.
 */

export type MetaShape = "issue" | "items-procurement" | "items-inspection" | "raw";

export function getMetaShape(subType: DocumentSubType): MetaShape {
  if (subType === "PROPOSE_REPAIR") return "issue";
  if (subType === "PROPOSE_INK" || subType === "PROPOSE_PROCUREMENT") return "items-procurement";
  if (subType === "CHECK_DAMAGE" || subType === "CONFIRM_STATUS") return "items-inspection";
  return "raw";
}

/**
 * Schema Zod DÙNG CHUNG cho phần "meta" của form Create (`DocumentCreatePage`)
 * và Edit (`DocumentEditModal`) — bắt buộc dùng `.merge()` với schema riêng
 * của từng trang (KHÔNG viết lại 2 schema tương tự nhau độc lập): `zodResolver`
 * + `react-hook-form` yêu cầu type khớp DANH NGHĨA (không chỉ khớp cấu trúc)
 * giữa `UseFormReturn<T>` và `Path<T>`/`ArrayPath<T>` dùng trong
 * `DocumentMetaFields` — 2 schema viết riêng dù giống hệt cấu trúc vẫn bị
 * TypeScript coi là 2 type khác nhau (lỗi thật đã gặp khi build, không phải
 * suy đoán).
 */
export const metaFieldsSchema = z.object({
  issue: z.string().optional(),
  inspectionResult: z.string().optional(),
  // `z.number()` (KHÔNG phải `z.coerce.number()`) CHỦ Ý — input đã là `number`
  // thật nhờ `register(..., {valueAsNumber:true})` ở `DocumentMetaFields`,
  // tránh lệch type input/output của `z.coerce` (input=`unknown`) làm
  // `zodResolver`/`useFieldArray` suy luận generic sai giữa 2 form dùng
  // chung schema này (lỗi build thật đã gặp, không phải phòng ngừa suông).
  items: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Bắt buộc"),
        quantity: z.number().min(1, "Tối thiểu 1"),
        unitPrice: z.number().min(0, "Không âm"),
        note: z.string().optional(),
      }),
    )
    .optional(),
  rawMetaJson: z.string().optional(),
});

export type MetaItemFormValue = z.infer<typeof metaFieldsSchema>["items"] extends (infer I)[] | undefined ? I : never;
export type MetaFormValues = z.infer<typeof metaFieldsSchema>;

/** Chuyển `Document.meta` (đọc từ backend) thành default values cho form Edit. */
export function metaToFormValues(subType: DocumentSubType, meta: DocumentMeta | undefined): MetaFormValues {
  const shape = getMetaShape(subType);
  const m = (meta ?? {}) as Record<string, unknown>;

  if (shape === "issue") {
    return { issue: typeof m.issue === "string" ? m.issue : "" };
  }

  if (shape === "items-procurement" || shape === "items-inspection") {
    const rawItems = Array.isArray(m.items) ? (m.items as Record<string, unknown>[]) : [];
    const items: MetaItemFormValue[] = rawItems.map((it) => ({
      name: String((shape === "items-procurement" ? it.deviceName : it.description) ?? ""),
      quantity: Number(it.quantity ?? 1),
      unitPrice: Number(it.unitPrice ?? 0),
      note: shape === "items-procurement" ? String(it.note ?? "") : undefined,
    }));
    return {
      items: items.length > 0 ? items : [{ name: "", quantity: 1, unitPrice: 0, note: "" }],
      inspectionResult: shape === "items-inspection" ? String(m.inspectionResult ?? "") : undefined,
    };
  }

  // "raw" (MANUAL/subType không có mẫu) — hiển thị nguyên `meta` dạng JSON để không mất dữ liệu đã có.
  return { rawMetaJson: JSON.stringify(meta ?? {}, null, 2) };
}

/** Chuyển giá trị form thành `meta` object gửi lên backend (`CreateDocumentRequest.meta`/`UpdateDocumentRequest.meta`). */
export function formValuesToMeta(subType: DocumentSubType, values: MetaFormValues): Record<string, unknown> {
  const shape = getMetaShape(subType);

  if (shape === "issue") {
    return { issue: values.issue?.trim() ?? "" };
  }

  if (shape === "items-procurement" || shape === "items-inspection") {
    const items = (values.items ?? []).map((it) => {
      const totalPrice = it.quantity * it.unitPrice;
      return shape === "items-procurement"
        ? { deviceName: it.name, quantity: it.quantity, unitPrice: it.unitPrice, totalPrice, note: it.note || undefined }
        : { description: it.name, quantity: it.quantity, unitPrice: it.unitPrice, totalPrice };
    });
    const totalAmount = items.reduce((sum, it) => sum + it.totalPrice, 0);
    return shape === "items-inspection"
      ? { inspectionResult: values.inspectionResult?.trim() ?? "", items, totalAmount }
      : { items, totalAmount };
  }

  try {
    return values.rawMetaJson ? JSON.parse(values.rawMetaJson) : {};
  } catch {
    return { raw: values.rawMetaJson };
  }
}
