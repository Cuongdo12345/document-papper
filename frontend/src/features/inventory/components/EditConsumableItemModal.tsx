import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useUpdateConsumableItem } from "@/features/inventory/hooks/useConsumableActions";
import { useConsumableCategories } from "@/features/inventory/hooks/useConsumableCategories";
import { parseApiError } from "@/utils/parseApiError";
import type { ConsumableItem } from "@/types/consumable.types";

const schema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên vật tư"),
  unit: z.string().trim().min(1, "Vui lòng nhập đơn vị tính"),
  category: z.string().trim().optional(),
  minStockThreshold: z
    .string()
    .refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Ngưỡng cảnh báo phải là số không âm"),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

interface EditConsumableItemModalProps {
  open: boolean;
  onClose: () => void;
  item: ConsumableItem;
}

/**
 * Roadmap B3 — sửa thông tin vật tư. CHỦ Ý KHÔNG có field `department`/
 * `quantityOnHand` (khớp `UpdateConsumableItemDTO` backend — đổi phòng ban
 * là "chuyển kho", tồn kho chỉ đổi qua giao dịch nhập/xuất).
 */
export function EditConsumableItemModal({ open, onClose, item }: EditConsumableItemModalProps) {
  const updateMutation = useUpdateConsumableItem();
  const categoriesQuery = useConsumableCategories({ limit: 100 });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: item.name,
      unit: item.unit,
      category: item.category?._id ?? "",
      minStockThreshold: String(item.minStockThreshold),
      isActive: item.isActive,
    },
  });
  const { register, handleSubmit, formState } = form;
  const apiError = updateMutation.error ? parseApiError(updateMutation.error) : null;

  function onSubmit(values: FormValues) {
    updateMutation.mutate(
      {
        id: item._id,
        body: {
          name: values.name,
          unit: values.unit,
          category: values.category || undefined,
          minStockThreshold: Number(values.minStockThreshold),
          isActive: values.isActive,
        },
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title="Sửa thông tin vật tư">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="ei-name" className="text-sm font-medium text-foreground">
            Tên vật tư
          </label>
          <input
            id="ei-name"
            autoFocus
            aria-invalid={!!formState.errors.name}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("name")}
          />
          {formState.errors.name && <p className="text-xs text-destructive">{formState.errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="ei-unit" className="text-sm font-medium text-foreground">
              Đơn vị tính
            </label>
            <input
              id="ei-unit"
              aria-invalid={!!formState.errors.unit}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("unit")}
            />
            {formState.errors.unit && <p className="text-xs text-destructive">{formState.errors.unit.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ei-category" className="text-sm font-medium text-foreground">
              Nhóm (tuỳ chọn)
            </label>
            <select
              id="ei-category"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("category")}
            >
              <option value="">-- Chưa phân nhóm --</option>
              {categoriesQuery.data?.data.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ei-threshold" className="text-sm font-medium text-foreground">
            Ngưỡng cảnh báo
          </label>
          <input
            id="ei-threshold"
            type="number"
            min={0}
            aria-invalid={!!formState.errors.minStockThreshold}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("minStockThreshold")}
          />
          {formState.errors.minStockThreshold && (
            <p className="text-xs text-destructive">{formState.errors.minStockThreshold.message}</p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" className="size-4 rounded border-input" {...register("isActive")} />
          Đang theo dõi (bỏ chọn để ngừng theo dõi vật tư này)
        </label>

        {apiError && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={updateMutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" size="sm" loading={updateMutation.isPending}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
