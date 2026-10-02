import { useState } from "react";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useUpdateOperatorCertificate } from "@/features/assets/hooks/useOperatorCertificateActions";
import { parseApiError } from "@/utils/parseApiError";
import type { OperatorCertificate } from "@/types/operatorCertificate.types";

interface OperatorCertificateEditModalProps {
  open: boolean;
  onClose: () => void;
  certificate: OperatorCertificate;
  deviceCategoryId: string;
}

/**
 * [MỚI DEV-078] "Sửa" — CHỈ field `certificateNumber` (không cho sửa ngày
 * cấp/hạn, xem giải thích ở `operatorCertificate.interface.ts` backend).
 * State cục bộ đơn giản (KHÔNG dùng react-hook-form+zod như
 * `OperatorCertificateModal` — chỉ 1 field text tuỳ chọn, không cần
 * validate phức tạp), mirror độ đơn giản của `WorkflowActionModal`.
 */
export function OperatorCertificateEditModal({ open, onClose, certificate, deviceCategoryId }: OperatorCertificateEditModalProps) {
  const [certificateNumber, setCertificateNumber] = useState(certificate.certificateNumber ?? "");
  const mutation = useUpdateOperatorCertificate(deviceCategoryId);
  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Sửa số chứng chỉ"
      description="Chỉ sửa được số chứng chỉ — muốn đổi ngày cấp/hạn, hãy thu hồi rồi cấp chứng chỉ mới."
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button
            type="button"
            size="sm"
            loading={mutation.isPending}
            onClick={() =>
              mutation.mutate(
                { id: certificate._id, body: { certificateNumber: certificateNumber.trim() } },
                { onSuccess: () => onClose() },
              )
            }
          >
            Lưu
          </Button>
        </>
      }
    >
      <div className="space-y-1.5">
        <label htmlFor="cert-edit-number" className="text-sm font-medium text-foreground">
          Số chứng chỉ
        </label>
        <input
          id="cert-edit-number"
          value={certificateNumber}
          onChange={(e) => setCertificateNumber(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      {apiError && (
        <p role="alert" className="mt-3 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {apiError.message}
        </p>
      )}
    </AppModal>
  );
}
