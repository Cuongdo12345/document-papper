import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { CertificateFileField } from "@/features/assets/components/CertificateFileField";
import { useUpdateCalibrationCertificate } from "@/features/assets/hooks/useUpdateCalibrationCertificate";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import type { CalibrationRecordItem } from "@/types/medicalDevice.types";

const updateCertificateSchema = z.object({
  certificateFileUrl: z.string().trim().optional(),
});
type UpdateCertificateFormValues = z.infer<typeof updateCertificateSchema>;

interface UpdateCalibrationCertificateModalProps {
  open: boolean;
  onClose: () => void;
  assetId: string;
  record: CalibrationRecordItem;
}

/**
 * Bổ sung sau A2, theo yêu cầu user: "upload nhầm file thì sửa lại được".
 * CHỦ Ý CHỈ sửa đúng chứng nhận (file/link) — KHÔNG cho sửa `calibratedAt`/
 * `result`/`nextDueDate` (chưa có, và không nằm trong yêu cầu này — xem
 * comment `updateCalibrationCertificateService` backend về lý do thu hẹp
 * phạm vi, tránh mở lại rủi ro đồng bộ `MedicalDeviceProfile`).
 */
export function UpdateCalibrationCertificateModal({ open, onClose, assetId, record }: UpdateCalibrationCertificateModalProps) {
  const updateMutation = useUpdateCalibrationCertificate();
  const [certificateFile, setCertificateFile] = useState<File[]>([]);

  const form = useForm<UpdateCertificateFormValues>({
    resolver: zodResolver(updateCertificateSchema),
    defaultValues: { certificateFileUrl: "" },
  });
  const { register, handleSubmit, control } = form;
  const certificateFileUrlValue = useWatch({ control, name: "certificateFileUrl" });
  const apiError = updateMutation.error ? parseApiError(updateMutation.error) : null;
  // Backend bắt buộc ĐÚNG 1 trong 2 (không được để trống cả hai) — chặn submit sớm ở FE, đỡ round-trip 400.
  const hasNothingToSubmit = certificateFile.length === 0 && !certificateFileUrlValue?.trim();

  function onSubmit(values: UpdateCertificateFormValues) {
    updateMutation.mutate(
      {
        assetId,
        recordId: record._id,
        body: { certificateFileUrl: certificateFile.length > 0 ? undefined : values.certificateFileUrl || undefined },
        certificateFile: certificateFile[0],
      },
      {
        onSuccess: () => {
          toast.success("Đã cập nhật giấy chứng nhận");
          onClose();
        },
      },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title="Sửa giấy chứng nhận kiểm định">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Thay thế chứng nhận của lần kiểm định ngày{" "}
          <span className="font-medium text-foreground">{new Date(record.calibratedAt).toLocaleDateString("vi-VN")}</span> — dùng khi
          trước đó đã upload nhầm file. Các thông tin khác của bản ghi (ngày, kết quả, hạn kế tiếp) không đổi.
        </p>

        <CertificateFileField
          idPrefix="ucc"
          label="Chọn file MỚI thay thế"
          urlLabel="Hoặc dán link MỚI thay thế"
          hint="Chỉ chọn 1 trong 2: tải file lên hoặc dán link. File/link cũ sẽ bị thay thế hoàn toàn."
          value={certificateFile}
          onChange={setCertificateFile}
          urlValue={certificateFileUrlValue}
          urlInputProps={register("certificateFileUrl")}
        />

        {apiError && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={updateMutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" size="sm" loading={updateMutation.isPending} disabled={hasNothingToSubmit}>
            Lưu thay thế
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
