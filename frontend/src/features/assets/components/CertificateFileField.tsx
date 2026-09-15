import type { UseFormRegisterReturn } from "react-hook-form";
import { FileUpload } from "@/components/shared/FileUpload";

/**
 * Khớp `certificateUploader` backend (`medicalDevice.routes.ts`) — PDF/JPEG/PNG,
 * tối đa 10MB. KHÔNG export — chỉ dùng nội bộ (tránh oxlint
 * `react(only-export-components)`, cùng lý do file này chỉ export 1 component).
 */
const CERTIFICATE_MAX_SIZE = 10 * 1024 * 1024;
const CERTIFICATE_ACCEPT = "application/pdf,image/jpeg,image/png";
const CERTIFICATE_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];

interface CertificateFileFieldProps {
  idPrefix: string;
  label: string;
  urlLabel: string;
  hint: string;
  value: File[];
  onChange: (files: File[]) => void;
  urlValue: string | undefined;
  urlInputProps: UseFormRegisterReturn<"certificateFileUrl">;
}

/**
 * Cặp field "upload file chứng nhận HOẶC dán link" — tách ra từ
 * `CalibrationRecordModal` (A2) khi có thêm nơi dùng thứ 2
 * (`UpdateCalibrationCertificateModal`, sửa chứng nhận đã lưu). Mutually
 * exclusive (khớp validate backend — gửi cả 2 → 400): chọn file thì disable
 * ô link, nhập link thì disable vùng chọn file. `idPrefix` để 2 modal cùng
 * mở trên trang không đụng `id` HTML.
 */
export function CertificateFileField({
  idPrefix,
  label,
  urlLabel,
  hint,
  value,
  onChange,
  urlValue,
  urlInputProps,
}: CertificateFileFieldProps) {
  return (
    <>
      <div className="space-y-1.5">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <FileUpload
          value={value}
          onChange={onChange}
          accept={CERTIFICATE_ACCEPT}
          allowedExtensions={CERTIFICATE_EXTENSIONS}
          maxSizeBytes={CERTIFICATE_MAX_SIZE}
          disabled={!!urlValue?.trim()}
          helperText="PDF/JPEG/PNG, tối đa 10MB"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor={`${idPrefix}-certUrl`} className="text-sm font-medium text-foreground">
          {urlLabel}
        </label>
        <input
          id={`${idPrefix}-certUrl`}
          placeholder="https://..."
          disabled={value.length > 0}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          {...urlInputProps}
        />
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </>
  );
}
