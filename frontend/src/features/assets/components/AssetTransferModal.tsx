import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useUsers } from "@/features/users/hooks/useUsers";
import { useTransferAsset } from "@/features/assets/hooks/useAssetAssignmentActions";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { parseApiError } from "@/utils/parseApiError";
import type { Asset } from "@/types/asset.types";

/** Sentinel cho lựa chọn "Bỏ gán người dùng hiện tại" — khác "giữ nguyên" (không chọn gì = không đổi `toUser`). `TransferAssetDTO` phân biệt 2 trường hợp này bằng `toUser: ""` (gỡ) vs không truyền field (giữ nguyên). */
const CLEAR_USER_SENTINEL = "__CLEAR__";

const transferAssetSchema = z
  .object({
    toDepartment: z.string().optional(),
    toUser: z.string().optional(),
    reason: z.string().trim().optional(),
  })
  .refine((data) => !!data.toDepartment || !!data.toUser, {
    message: "Phải chọn ít nhất khoa/phòng mới hoặc người dùng mới",
    path: ["toDepartment"],
  });

type TransferAssetFormValues = z.infer<typeof transferAssetSchema>;

interface AssetTransferModalProps {
  open: boolean;
  onClose: () => void;
  asset: Asset;
}

/** Chỉ dùng khi asset đang IN_USE (điều kiện hiển thị nút — xem `AssetDetailPage`). */
export function AssetTransferModal({ open, onClose, asset }: AssetTransferModalProps) {
  const transferMutation = useTransferAsset();
  const { hasPermission } = usePermission();
  const canBrowseUsers = hasPermission(PERMISSIONS.USER_VIEW);
  const departmentsQuery = useDepartments({ limit: 100 });

  const form = useForm<TransferAssetFormValues>({
    resolver: zodResolver(transferAssetSchema),
    defaultValues: { toDepartment: "", toUser: "", reason: "" },
  });
  const { register, handleSubmit, control, formState } = form;
  const toDepartment = useWatch({ control, name: "toDepartment" });

  // Danh sách user để chọn theo khoa MỚI nếu có chọn, ngược lại theo khoa HIỆN TẠI của asset.
  const usersQuery = useUsers(
    { department: toDepartment || asset.department._id, limit: 100 },
    { enabled: canBrowseUsers },
  );

  const apiError = transferMutation.error ? parseApiError(transferMutation.error) : null;

  function onSubmit(values: TransferAssetFormValues) {
    const toUser = values.toUser === CLEAR_USER_SENTINEL ? "" : values.toUser || undefined;
    transferMutation.mutate(
      { id: asset._id, body: { toDepartment: values.toDepartment || undefined, toUser, reason: values.reason || undefined } },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title={`Luân chuyển "${asset.name}"`} description={asset.assetCode}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="transfer-department" className="text-sm font-medium text-foreground">
            Khoa/Phòng mới (bỏ trống để giữ nguyên)
          </label>
          <select
            id="transfer-department"
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

        {canBrowseUsers && (
          <div className="space-y-1.5">
            <label htmlFor="transfer-user" className="text-sm font-medium text-foreground">
              Người dùng mới (bỏ trống để giữ nguyên)
            </label>
            <select
              id="transfer-user"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("toUser")}
            >
              <option value="">-- Giữ nguyên người dùng hiện tại --</option>
              <option value={CLEAR_USER_SENTINEL}>-- Bỏ gán (khoa/phòng quản lý chung) --</option>
              {usersQuery.data?.data.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.fullName} ({u.username})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="transfer-reason" className="text-sm font-medium text-foreground">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            id="transfer-reason"
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("reason")}
          />
        </div>

        {formState.errors.toDepartment && (
          <p className="text-xs text-destructive">{formState.errors.toDepartment.message}</p>
        )}

        {apiError && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={transferMutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" size="sm" loading={transferMutation.isPending}>
            Luân chuyển
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
