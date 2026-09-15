import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useUsers } from "@/features/users/hooks/useUsers";
import { useAssignAsset } from "@/features/assets/hooks/useAssetAssignmentActions";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { parseApiError } from "@/utils/parseApiError";
import type { Asset } from "@/types/asset.types";

/** Khớp `AssignAssetDTO` — `toDepartment` bắt buộc, `toUser` tuỳ chọn (cấp phát cho khoa, chưa gắn cá nhân cụ thể). */
const assignAssetSchema = z.object({
  toDepartment: z.string().min(1, "Vui lòng chọn khoa/phòng"),
  toUser: z.string().optional(),
  reason: z.string().trim().optional(),
});

type AssignAssetFormValues = z.infer<typeof assignAssetSchema>;

interface AssetAssignModalProps {
  open: boolean;
  onClose: () => void;
  asset: Asset;
}

/**
 * Chỉ dùng khi asset đang IN_STOCK/RESERVED (điều kiện hiển thị nút — xem
 * `AssetDetailPage`, backend tự validate lại `assignAssetService`).
 * `canBrowseUsers` (`USER_VIEW`) — role `PHONG_VAT_TU_TTB` có `ASSET_ASSIGN`
 * NHƯNG KHÔNG có `USER_VIEW` (`rolePermission.map.ts`) — ẩn dropdown chọn
 * người dùng cụ thể, vẫn cấp phát được cho khoa/phòng (field `toUser` tuỳ
 * chọn, không bắt buộc phải có mới cấp phát được) — ghi nhận ở FE-06.md.
 */
export function AssetAssignModal({ open, onClose, asset }: AssetAssignModalProps) {
  const assignMutation = useAssignAsset();
  const { hasPermission } = usePermission();
  const canBrowseUsers = hasPermission(PERMISSIONS.USER_VIEW);
  const departmentsQuery = useDepartments({ limit: 100 });

  const form = useForm<AssignAssetFormValues>({
    resolver: zodResolver(assignAssetSchema),
    defaultValues: { toDepartment: "", toUser: "", reason: "" },
  });
  const { register, handleSubmit, control, formState } = form;
  const toDepartment = useWatch({ control, name: "toDepartment" });

  const usersQuery = useUsers(
    { department: toDepartment || undefined, limit: 100 },
    { enabled: canBrowseUsers && !!toDepartment },
  );

  const apiError = assignMutation.error ? parseApiError(assignMutation.error) : null;

  function onSubmit(values: AssignAssetFormValues) {
    assignMutation.mutate(
      {
        id: asset._id,
        body: { toDepartment: values.toDepartment, toUser: values.toUser || undefined, reason: values.reason || undefined },
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title={`Cấp phát "${asset.name}"`} description={asset.assetCode}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="assign-department" className="text-sm font-medium text-foreground">
            Khoa/Phòng nhận
          </label>
          <select
            id="assign-department"
            aria-invalid={!!formState.errors.toDepartment}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("toDepartment")}
          >
            <option value="">-- Chọn khoa/phòng --</option>
            {departmentsQuery.data?.data.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
          {formState.errors.toDepartment && <p className="text-xs text-destructive">{formState.errors.toDepartment.message}</p>}
        </div>

        {canBrowseUsers && (
          <div className="space-y-1.5">
            <label htmlFor="assign-user" className="text-sm font-medium text-foreground">
              Gán cho người dùng (tuỳ chọn)
            </label>
            <select
              id="assign-user"
              disabled={!toDepartment}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              {...register("toUser")}
            >
              <option value="">-- Chỉ giao cho khoa/phòng --</option>
              {usersQuery.data?.data.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.fullName} ({u.username})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="assign-reason" className="text-sm font-medium text-foreground">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            id="assign-reason"
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
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={assignMutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" size="sm" loading={assignMutation.isPending}>
            Cấp phát
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
