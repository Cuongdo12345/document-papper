import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useUpdateMaintenancePlan } from "@/features/assets/hooks/useMaintenancePlanActions";
import { parseApiError } from "@/utils/parseApiError";
import type { AssetMaintenancePlan } from "@/types/assetMaintenancePlan.types";

const schema = z.object({
  title: z.string().trim().min(1, "Vui lòng nhập tên kế hoạch"),
  description: z.string().trim().optional(),
  scheduledDate: z.string().min(1, "Vui lòng chọn ngày dự kiến"),
});
type FormValues = z.infer<typeof schema>;

interface EditMaintenancePlanModalProps {
  open: boolean;
  onClose: () => void;
  plan: AssetMaintenancePlan;
}

/**
 * Roadmap B2 — sửa kế hoạch CÒN "planned" (backend chặn 400 nếu đã
 * completed/cancelled — form này chỉ nên mở khi `plan.status==="planned"`,
 * nơi gọi tự kiểm tra trước). KHÔNG cho đổi asset (giữ nguyên gắn với đúng
 * tài sản đã tạo, chỉ sửa nội dung/thời gian).
 */
export function EditMaintenancePlanModal({ open, onClose, plan }: EditMaintenancePlanModalProps) {
  const updateMutation = useUpdateMaintenancePlan();
  const assetId = typeof plan.asset === "string" ? plan.asset : plan.asset._id;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: plan.title,
      description: plan.description ?? "",
      scheduledDate: plan.scheduledDate.slice(0, 10),
    },
  });
  const { register, handleSubmit, formState } = form;
  const apiError = updateMutation.error ? parseApiError(updateMutation.error) : null;

  function onSubmit(values: FormValues) {
    updateMutation.mutate(
      {
        id: plan._id,
        assetId,
        body: { title: values.title, description: values.description || undefined, scheduledDate: values.scheduledDate },
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title="Sửa kế hoạch bảo trì">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="mp-edit-title" className="text-sm font-medium text-foreground">
            Tên kế hoạch
          </label>
          <input
            id="mp-edit-title"
            aria-invalid={!!formState.errors.title}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("title")}
          />
          {formState.errors.title && <p className="text-xs text-destructive">{formState.errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="mp-edit-scheduledDate" className="text-sm font-medium text-foreground">
            Ngày dự kiến
          </label>
          <input
            id="mp-edit-scheduledDate"
            type="date"
            aria-invalid={!!formState.errors.scheduledDate}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("scheduledDate")}
          />
          {formState.errors.scheduledDate && <p className="text-xs text-destructive">{formState.errors.scheduledDate.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="mp-edit-description" className="text-sm font-medium text-foreground">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            id="mp-edit-description"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("description")}
          />
        </div>

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
            Lưu
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
