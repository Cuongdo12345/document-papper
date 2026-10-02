import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/features/users/hooks/useUsers";
import { useCreateOperatorCertificate } from "@/features/assets/hooks/useOperatorCertificateActions";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { parseApiError } from "@/utils/parseApiError";

const todayISODate = () => new Date().toISOString().slice(0, 10);

/** Khớp `CreateOperatorCertificateDTO` (backend) — `expiresAt` phải sau `issuedAt`. */
const operatorCertificateSchema = z
  .object({
    user: z.string().min(1, "Vui lòng chọn người được cấp chứng chỉ"),
    certificateNumber: z.string().trim().optional(),
    issuedAt: z.string().min(1, "Vui lòng chọn ngày cấp"),
    expiresAt: z.string().min(1, "Vui lòng chọn hạn chứng chỉ"),
  })
  .refine((data) => new Date(data.expiresAt) > new Date(data.issuedAt), {
    message: "Hạn chứng chỉ phải sau ngày cấp",
    path: ["expiresAt"],
  });

type OperatorCertificateFormValues = z.infer<typeof operatorCertificateSchema>;

interface OperatorCertificateModalProps {
  open: boolean;
  onClose: () => void;
  deviceCategoryId: string;
  deviceCategoryName: string;
}

/**
 * [MỚI, DEV-077] Cấp chứng chỉ vận hành mới — chỉ hiện trong
 * `MedicalDeviceSection` khi `profile.operatorCertificateRequired = true`.
 * `deviceCategoryId` cố định theo asset đang xem (KHÔNG phải field form —
 * chứng chỉ theo DANH MỤC, xem giải thích ở `operatorCertificate.interface.ts`
 * backend). `canBrowseUsers` (`USER_VIEW`) — cùng hạn chế đã biết ở
 * `AssetAssignModal.tsx` (role PHONG_VAT_TU_TTB có `OPERATOR_CERTIFICATE_CREATE`
 * nhưng có thể không có `USER_VIEW`) — chấp nhận được, KHÔNG phải regression
 * mới, cùng pattern toàn app.
 */
export function OperatorCertificateModal({ open, onClose, deviceCategoryId, deviceCategoryName }: OperatorCertificateModalProps) {
  const createMutation = useCreateOperatorCertificate();
  const { hasPermission } = usePermission();
  const canBrowseUsers = hasPermission(PERMISSIONS.USER_VIEW);
  const usersQuery = useUsers({ limit: 100 }, { enabled: canBrowseUsers });

  const form = useForm<OperatorCertificateFormValues>({
    resolver: zodResolver(operatorCertificateSchema),
    defaultValues: { user: "", certificateNumber: "", issuedAt: todayISODate(), expiresAt: "" },
  });
  const { register, handleSubmit, formState } = form;

  const apiError = createMutation.error ? parseApiError(createMutation.error) : null;

  function onSubmit(values: OperatorCertificateFormValues) {
    createMutation.mutate(
      {
        user: values.user,
        deviceCategory: deviceCategoryId,
        certificateNumber: values.certificateNumber || undefined,
        issuedAt: values.issuedAt,
        expiresAt: values.expiresAt,
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title="Cấp chứng chỉ vận hành" description={`Danh mục thiết bị: ${deviceCategoryName}`}>
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {canBrowseUsers ? (
          <div className="space-y-1.5">
            <label htmlFor="cert-user" className="text-sm font-medium text-foreground">
              Người được cấp
            </label>
            <select
              id="cert-user"
              aria-invalid={!!formState.errors.user}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("user")}
            >
              <option value="">-- Chọn người dùng --</option>
              {usersQuery.data?.data.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.fullName} ({u.username})
                </option>
              ))}
            </select>
            {formState.errors.user && <p className="text-xs text-destructive">{formState.errors.user.message}</p>}
          </div>
        ) : (
          <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            Bạn không có quyền xem danh sách người dùng ({PERMISSIONS.USER_VIEW}) — liên hệ IT để cấp chứng chỉ.
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="cert-number" className="text-sm font-medium text-foreground">
            Số chứng chỉ (tuỳ chọn)
          </label>
          <input
            id="cert-number"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("certificateNumber")}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="cert-issued" className="text-sm font-medium text-foreground">
              Ngày cấp
            </label>
            <input
              id="cert-issued"
              type="date"
              aria-invalid={!!formState.errors.issuedAt}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("issuedAt")}
            />
            {formState.errors.issuedAt && <p className="text-xs text-destructive">{formState.errors.issuedAt.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cert-expires" className="text-sm font-medium text-foreground">
              Hạn chứng chỉ
            </label>
            <input
              id="cert-expires"
              type="date"
              aria-invalid={!!formState.errors.expiresAt}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("expiresAt")}
            />
            {formState.errors.expiresAt && <p className="text-xs text-destructive">{formState.errors.expiresAt.message}</p>}
          </div>
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
          <Button type="submit" size="sm" loading={createMutation.isPending} disabled={!canBrowseUsers}>
            Cấp chứng chỉ
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
