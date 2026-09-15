import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useReturnAsset } from "@/features/assets/hooks/useAssetAssignmentActions";
import { parseApiError } from "@/utils/parseApiError";
import type { Asset } from "@/types/asset.types";

const returnAssetSchema = z.object({
  toDepartment: z.string().optional(),
  reason: z.string().trim().optional(),
});

type ReturnAssetFormValues = z.infer<typeof returnAssetSchema>;

interface AssetReturnModalProps {
  open: boolean;
  onClose: () => void;
  asset: Asset;
}

/** Thu hồi về kho (IN_STOCK), gỡ `assignedTo` — chỉ dùng khi asset đang IN_USE/RESERVED. */
export function AssetReturnModal({ open, onClose, asset }: AssetReturnModalProps) {
  const returnMutation = useReturnAsset();
  const departmentsQuery = useDepartments({ limit: 100 });

  const form = useForm<ReturnAssetFormValues>({
    resolver: zodResolver(returnAssetSchema),
    defaultValues: { toDepartment: "", reason: "" },
  });
  const { register, handleSubmit } = form;
  const apiError = returnMutation.error ? parseApiError(returnMutation.error) : null;

  function onSubmit(values: ReturnAssetFormValues) {
    returnMutation.mutate(
      { id: asset._id, body: { toDepartment: values.toDepartment || undefined, reason: values.reason || undefined } },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title={`Thu hồi "${asset.name}"`} description={asset.assetCode}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="return-department" className="text-sm font-medium text-foreground">
            Kho nhận (bỏ trống để giữ nguyên khoa/phòng hiện tại)
          </label>
          <select
            id="return-department"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("toDepartment")}
          >
            <option value="">-- Giữ nguyên: {asset.department.name} --</option>
            {departmentsQuery.data?.data
              .filter((d) => d._id !== asset.department._id)
              .map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="return-reason" className="text-sm font-medium text-foreground">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            id="return-reason"
            rows={2}
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
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={returnMutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" size="sm" loading={returnMutation.isPending}>
            Thu hồi
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
