import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { AssetPicker } from "@/features/documents/components/AssetPicker";
import { useCreateMaintenancePlan } from "@/features/assets/hooks/useMaintenancePlanActions";
import { parseApiError } from "@/utils/parseApiError";

const schema = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tên kế hoạch"),
  description: z.string().trim().optional(),
  scheduledDate: z.string().min(1, "Vui lòng chọn ngày dự kiến"),
});
type FormValues = z.infer<typeof schema>;

interface CreateMaintenancePlanModalProps {
  open: boolean;
  onClose: () => void;
  /** Đã biết trước asset (gọi từ `AssetDetailPage`) — ẩn `AssetPicker`. Không truyền thì hiện picker (gọi từ trang Lịch bảo trì). */
  assetId?: string;
  assetLabel?: string;
}

/** Roadmap B2 — lên lịch bảo trì mới. Tái dùng `AssetPicker` (đã có sẵn từ domain Document) khi chưa biết asset trước. */
export function CreateMaintenancePlanModal({ open, onClose, assetId: fixedAssetId, assetLabel }: CreateMaintenancePlanModalProps) {
  const [pickedAsset, setPickedAsset] = useState<{ id?: string; label?: string }>({});
  const createMutation = useCreateMaintenancePlan();

  const assetId = fixedAssetId ?? pickedAsset.id;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", scheduledDate: "" },
  });
  const { register, handleSubmit, formState } = form;
  const apiError = createMutation.error ? parseApiError(createMutation.error) : null;

  function onSubmit(values: FormValues) {
    if (!assetId) return;
    createMutation.mutate(
      { assetId, body: { title: values.title, description: values.description || undefined, scheduledDate: values.scheduledDate } },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title="Lên lịch bảo trì">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {!fixedAssetId && (
          <div className="space-y-1.5">
            <span className="text-sm font-medium text-foreground">Tài sản</span>
            <AssetPicker
              value={pickedAsset.id}
              selectedLabel={pickedAsset.label}
              onChange={(id, label) => setPickedAsset({ id, label })}
            />
          </div>
        )}
        {fixedAssetId && assetLabel && (
          <p className="text-sm text-muted-foreground">
            Tài sản: <span className="font-medium text-foreground">{assetLabel}</span>
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="mp-title" className="text-sm font-medium text-foreground">
            Tên kế hoạch
          </label>
          <input
            id="mp-title"
            placeholder="VD: Bảo trì định kỳ quý 1/2026"
            aria-invalid={!!formState.errors.title}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("title")}
          />
          {formState.errors.title && <p className="text-xs text-destructive">{formState.errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="mp-scheduledDate" className="text-sm font-medium text-foreground">
            Ngày dự kiến
          </label>
          <input
            id="mp-scheduledDate"
            type="date"
            aria-invalid={!!formState.errors.scheduledDate}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("scheduledDate")}
          />
          {formState.errors.scheduledDate && <p className="text-xs text-destructive">{formState.errors.scheduledDate.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="mp-description" className="text-sm font-medium text-foreground">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            id="mp-description"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("description")}
          />
        </div>

        {!assetId && <p className="text-xs text-destructive">Vui lòng chọn tài sản trước khi lưu.</p>}
        {apiError && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={createMutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" size="sm" loading={createMutation.isPending} disabled={!assetId}>
            Lên lịch
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
