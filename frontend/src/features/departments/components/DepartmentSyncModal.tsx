import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/shared/FileUpload";
import { useSyncDepartmentsExcel } from "@/features/departments/hooks/useSyncDepartmentsExcel";
import { parseApiError } from "@/utils/parseApiError";

interface DepartmentSyncModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * "Đồng bộ từ Excel" (roadmap Mục 20, permission `EXCEL_DEPARTMENT_SYNC` —
 * chỉ IT/ADMIN). KHÔNG dùng `ExcelImportWizard` chung — backend
 * `syncDepartmentFromExcel()` KHÔNG hỗ trợ dry-run/preview (đọc thẳng cột 3
 * mỗi dòng, tạo Department nếu tên chưa tồn tại), luồng đơn giản hơn nhiều
 * (chọn file → xác nhận → kết quả), ép vào wizard 4 bước sẽ over-engineer.
 */
export function DepartmentSyncModal({ open, onClose }: DepartmentSyncModalProps) {
  const [file, setFile] = useState<File[]>([]);
  const [result, setResult] = useState<{ totalInFile: number; created: number; existed: number } | null>(null);
  const mutation = useSyncDepartmentsExcel();
  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  function handleClose() {
    setFile([]);
    setResult(null);
    mutation.reset();
    onClose();
  }

  function handleSync() {
    if (!file[0]) return;
    mutation.mutate(file[0], {
      onSuccess: (response) => setResult(response.data.data),
    });
  }

  return (
    <AppModal open={open} onClose={handleClose} title="Đồng bộ khoa/phòng từ Excel" size="sm">
      <div className="space-y-4">
        {!result ? (
          <>
            <p className="text-sm text-muted-foreground">
              Đọc cột "Khoa/phòng" trong file (cùng file dùng để import tài liệu) — tự tạo khoa/phòng nào CHƯA tồn tại, bỏ qua tên đã có
              (không phân biệt hoa/thường).
            </p>
            <FileUpload
              accept=".xlsx,.xls"
              allowedExtensions={[".xlsx", ".xls"]}
              maxSizeBytes={5 * 1024 * 1024}
              disabled={mutation.isPending}
              value={file}
              onChange={setFile}
              helperText="File Excel .xlsx/.xls — tối đa 5MB"
            />
            {apiError && (
              <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {apiError.message}
              </p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={handleClose} disabled={mutation.isPending}>
                Huỷ
              </Button>
              <Button type="button" size="sm" onClick={handleSync} loading={mutation.isPending} disabled={!file[0]}>
                Đồng bộ
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">Đồng bộ hoàn tất</p>
              <p className="text-sm text-muted-foreground">
                {result.totalInFile} khoa/phòng trong file — tạo mới {result.created}, đã tồn tại {result.existed}.
              </p>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="button" size="sm" onClick={handleClose}>
                Đóng
              </Button>
            </div>
          </>
        )}
      </div>
    </AppModal>
  );
}
