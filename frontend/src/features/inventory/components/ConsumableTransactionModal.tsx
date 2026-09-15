import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useCreateConsumableTransaction } from "@/features/inventory/hooks/useConsumableActions";
import { parseApiError } from "@/utils/parseApiError";
import type { ConsumableItem, ConsumableTransactionType } from "@/types/consumable.types";

const schema = z.object({
  quantity: z.string().refine((v) => !Number.isNaN(Number(v)) && Number(v) > 0, "Số lượng phải lớn hơn 0"),
  reason: z.string().trim().optional(),
});
type FormValues = z.infer<typeof schema>;

interface ConsumableTransactionModalProps {
  open: boolean;
  onClose: () => void;
  item: ConsumableItem;
  type: ConsumableTransactionType;
}

const TITLE_BY_TYPE: Record<ConsumableTransactionType, string> = {
  IN: "Nhập kho",
  OUT: "Xuất kho",
};

/** Roadmap B3 — ghi nhận 1 giao dịch nhập/xuất kho cho 1 vật tư. */
export function ConsumableTransactionModal({ open, onClose, item, type }: ConsumableTransactionModalProps) {
  const createMutation = useCreateConsumableTransaction();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { quantity: "", reason: "" },
  });
  const { register, handleSubmit, formState } = form;
  const apiError = createMutation.error ? parseApiError(createMutation.error) : null;

  function onSubmit(values: FormValues) {
    createMutation.mutate(
      { itemId: item._id, body: { type, quantity: Number(values.quantity), reason: values.reason || undefined } },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title={`${TITLE_BY_TYPE[type]}: ${item.name}`}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Tồn kho hiện tại: <span className="font-medium text-foreground">{item.quantityOnHand} {item.unit}</span>
        </p>

        <div className="space-y-1.5">
          <label htmlFor="ct-quantity" className="text-sm font-medium text-foreground">
            Số lượng ({item.unit})
          </label>
          <input
            id="ct-quantity"
            autoFocus
            type="number"
            min={1}
            aria-invalid={!!formState.errors.quantity}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("quantity")}
          />
          {formState.errors.quantity && <p className="text-xs text-destructive">{formState.errors.quantity.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ct-reason" className="text-sm font-medium text-foreground">
            Lý do (tuỳ chọn)
          </label>
          <textarea
            id="ct-reason"
            rows={2}
            placeholder={type === "IN" ? "VD: Nhập hàng từ NCC ABC" : "VD: Cấp phát cho khoa Nội"}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("reason")}
          />
        </div>

        {apiError && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={createMutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" size="sm" loading={createMutation.isPending}>
            {TITLE_BY_TYPE[type]}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
