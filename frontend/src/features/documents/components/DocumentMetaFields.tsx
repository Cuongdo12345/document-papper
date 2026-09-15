import { useFieldArray, type Control, type UseFormRegister } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMetaShape, type MetaFormValues } from "@/features/documents/utils/documentMeta";
import type { DocumentSubType } from "@/types/document.types";

interface DocumentMetaFieldsProps {
  /**
   * Cast 1 LẦN duy nhất ở nơi gọi (`form.register as unknown as
   * UseFormRegister<MetaFormValues>`) — form cha (`DocumentCreatePage`/
   * `DocumentEditModal`) có type LÀ `{...field riêng} & MetaFormValues`
   * (`.merge(metaFieldsSchema)`, xem `documentMeta.ts`), nên các path
   * "items"/"issue"/... luôn tồn tại thật trong form cha; cast ở ranh giới
   * này để tránh generic `Path<T>`/`ArrayPath<T>` không suy luận được với
   * `useFieldArray` khi T chỉ bị ràng buộc lỏng (`T extends MetaFormValues`)
   * — lỗi build thật đã gặp, không phải phòng ngừa suông.
   */
  register: UseFormRegister<MetaFormValues>;
  control: Control<MetaFormValues>;
  subType: DocumentSubType;
}

const ITEM_LABEL: Record<"items-procurement" | "items-inspection", string> = {
  "items-procurement": "Thiết bị/Vật tư",
  "items-inspection": "Hạng mục kiểm tra",
};

/**
 * Form nhập `meta` — DÙNG CHUNG cho Create (`DocumentCreatePage`) và Edit
 * (`DocumentEditModal`), chỉ đổi theo `subType` (xem `documentMeta.ts` cho
 * giải thích đầy đủ mapping subType -> shape, dựa trên dữ liệu thật).
 */
export function DocumentMetaFields({ register, control, subType }: DocumentMetaFieldsProps) {
  const shape = getMetaShape(subType);
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  if (shape === "issue") {
    return (
      <div className="space-y-1.5">
        <label htmlFor="meta-issue" className="text-sm font-medium text-foreground">
          Mô tả sự cố
        </label>
        <textarea
          id="meta-issue"
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register("issue")}
        />
      </div>
    );
  }

  if (shape === "items-procurement" || shape === "items-inspection") {
    return (
      <div className="space-y-3">
        {shape === "items-inspection" && (
          <div className="space-y-1.5">
            <label htmlFor="meta-inspectionResult" className="text-sm font-medium text-foreground">
              Kết quả kiểm tra (tóm tắt)
            </label>
            <input
              id="meta-inspectionResult"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("inspectionResult")}
            />
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">{ITEM_LABEL[shape]}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => append({ name: "", quantity: 1, unitPrice: 0, note: "" })}
            >
              <Plus /> Thêm dòng
            </Button>
          </div>

          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 rounded-md border border-border p-2">
              <div className="col-span-12 sm:col-span-4">
                <input
                  placeholder={shape === "items-procurement" ? "Tên thiết bị/vật tư" : "Mô tả hạng mục"}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register(`items.${index}.name`)}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <input
                  type="number"
                  min={1}
                  placeholder="SL"
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                />
              </div>
              <div className="col-span-4 sm:col-span-2">
                <input
                  type="number"
                  min={0}
                  placeholder="Đơn giá"
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                />
              </div>
              {shape === "items-procurement" && (
                <div className="col-span-3 sm:col-span-3">
                  <input
                    placeholder="Ghi chú"
                    className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    {...register(`items.${index}.note`)}
                  />
                </div>
              )}
              <div className="col-span-1 flex items-center justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Xoá dòng"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // "raw" — MANUAL/subType chưa có mẫu dữ liệu thật, fallback JSON thô.
  return (
    <div className="space-y-1.5">
      <label htmlFor="meta-raw" className="text-sm font-medium text-foreground">
        Dữ liệu bổ sung (JSON)
      </label>
      <textarea
        id="meta-raw"
        rows={6}
        className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...register("rawMetaJson")}
      />
      <p className="text-xs text-muted-foreground">
        subType này chưa có dữ liệu mẫu thật để thiết kế form riêng — nhập trực tiếp JSON.
      </p>
    </div>
  );
}
