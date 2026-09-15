import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { CertificateFileField } from "@/features/assets/components/CertificateFileField";
import { useCreateCalibrationRecord } from "@/features/assets/hooks/useCreateCalibrationRecord";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import { CALIBRATION_RESULTS, type CalibrationResult } from "@/types/medicalDevice.types";

/** Khớp `CreateCalibrationRecordDTO` — `nextDueDate` BẮT BUỘC nhập tay (không tự suy ra từ chu kỳ, xem comment gốc DTO backend: kết quả FAIL/CONDITIONAL_PASS có thể rút ngắn hạn). */
const calibrationRecordSchema = z
  .object({
    calibratedAt: z.string().min(1, "Vui lòng chọn ngày kiểm định"),
    calibratedBy: z.string().trim().min(1, "Vui lòng nhập tên đơn vị kiểm định"),
    result: z.enum(CALIBRATION_RESULTS),
    certificateFileUrl: z.string().trim().optional(),
    nextDueDate: z.string().min(1, "Vui lòng chọn hạn kiểm định kế tiếp"),
  })
  .refine((data) => new Date(data.nextDueDate) > new Date(data.calibratedAt), {
    message: "Hạn kế tiếp phải sau ngày kiểm định",
    path: ["nextDueDate"],
  });

type CalibrationRecordFormValues = z.infer<typeof calibrationRecordSchema>;

interface CalibrationRecordModalProps {
  open: boolean;
  onClose: () => void;
  assetId: string;
}

const RESULT_LABEL: Record<CalibrationResult, string> = {
  PASS: "Đạt",
  FAIL: "Không đạt",
  CONDITIONAL_PASS: "Đạt có điều kiện",
};

/**
 * Ghi nhận 1 lần kiểm định mới — hỗ trợ CẢ 2 cách đính kèm chứng nhận: upload
 * file thật (`certificateFile`, A2/roadmap) HOẶC nhập tay link
 * (`certificateFileUrl`) — mutually exclusive, khớp validate backend
 * (`createCalibrationRecordService`: gửi cả 2 → 400).
 */
export function CalibrationRecordModal({ open, onClose, assetId }: CalibrationRecordModalProps) {
  const createMutation = useCreateCalibrationRecord();
  // Tách khỏi react-hook-form (giống `ExcelImportWizard`) — `FileUpload` là
  // controlled component riêng, không phải input HTML thường `register()` được.
  const [certificateFile, setCertificateFile] = useState<File[]>([]);

  const form = useForm<CalibrationRecordFormValues>({
    resolver: zodResolver(calibrationRecordSchema),
    defaultValues: {
      calibratedAt: new Date().toISOString().slice(0, 10),
      calibratedBy: "",
      result: "PASS",
      certificateFileUrl: "",
      nextDueDate: "",
    },
  });

  const { register, handleSubmit, formState, control } = form;
  // `useWatch` (không phải `watch()` gọi trực tiếp lúc render) — cùng lý do
  // đã dùng ở `AssetAssignModal`/`DocumentCreatePage`: tránh cảnh báo oxlint
  // `react(incompatible-library)` (API `watch()` trả hàm mới mỗi render,
  // React Compiler không memo hoá được an toàn).
  const certificateFileUrlValue = useWatch({ control, name: "certificateFileUrl" });
  const apiError = createMutation.error ? parseApiError(createMutation.error) : null;

  function onSubmit(values: CalibrationRecordFormValues) {
    createMutation.mutate(
      {
        assetId,
        body: {
          calibratedAt: values.calibratedAt,
          calibratedBy: values.calibratedBy,
          result: values.result,
          certificateFileUrl: certificateFile.length > 0 ? undefined : values.certificateFileUrl || undefined,
          nextDueDate: values.nextDueDate,
        },
        certificateFile: certificateFile[0],
      },
      {
        onSuccess: () => {
          toast.success("Đã ghi nhận kiểm định");
          onClose();
        },
      },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title="Ghi nhận kiểm định">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="cr-calibratedAt" className="text-sm font-medium text-foreground">
              Ngày kiểm định
            </label>
            <input
              id="cr-calibratedAt"
              type="date"
              aria-invalid={!!formState.errors.calibratedAt}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("calibratedAt")}
            />
            {formState.errors.calibratedAt && <p className="text-xs text-destructive">{formState.errors.calibratedAt.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cr-nextDueDate" className="text-sm font-medium text-foreground">
              Hạn kiểm định kế tiếp
            </label>
            <input
              id="cr-nextDueDate"
              type="date"
              aria-invalid={!!formState.errors.nextDueDate}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("nextDueDate")}
            />
            {formState.errors.nextDueDate && <p className="text-xs text-destructive">{formState.errors.nextDueDate.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cr-calibratedBy" className="text-sm font-medium text-foreground">
            Đơn vị kiểm định
          </label>
          <input
            id="cr-calibratedBy"
            placeholder="VD: Trung tâm Kiểm định Y tế khu vực"
            aria-invalid={!!formState.errors.calibratedBy}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("calibratedBy")}
          />
          {formState.errors.calibratedBy && <p className="text-xs text-destructive">{formState.errors.calibratedBy.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cr-result" className="text-sm font-medium text-foreground">
            Kết quả
          </label>
          <select
            id="cr-result"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("result")}
          >
            {CALIBRATION_RESULTS.map((r) => (
              <option key={r} value={r}>
                {RESULT_LABEL[r]}
              </option>
            ))}
          </select>
        </div>

        <CertificateFileField
          idPrefix="cr"
          label="Giấy chứng nhận kiểm định (tuỳ chọn)"
          urlLabel="Hoặc dán link giấy chứng nhận có sẵn (tuỳ chọn)"
          hint="Chỉ chọn 1 trong 2: tải file lên hoặc dán link — không dùng cả hai."
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
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={createMutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" size="sm" loading={createMutation.isPending}>
            Ghi nhận
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
