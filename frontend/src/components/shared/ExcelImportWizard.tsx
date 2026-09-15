import { useState } from "react";
import { FileCheck2, Download } from "lucide-react";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { FileUpload } from "@/components/shared/FileUpload";
import { parseApiError } from "@/utils/parseApiError";

/**
 * Khớp shape CHUNG của `importDocumentsExcel`/`importAssetsExcel`
 * (`excel.service.ts`/`assetExcel.service.ts`) — 2 domain dùng ĐÚNG 1 shape
 * (Asset ghi chú rõ "giữ field cho khớp shape chung với ImportHistory").
 */
export interface ExcelImportResult<TPreviewRow> {
  dryRun: boolean;
  created: number;
  updated: number;
  reportsCreated: number;
  totalRows: number;
  errors: { row: number; message: string }[];
  preview: TPreviewRow[];
}

type WizardStep = "select" | "preview" | "done";

interface ExcelImportWizardProps<TPreviewRow> {
  open: boolean;
  onClose: () => void;
  title: string;
  helperText?: string;
  /** Mặc định khớp `uploadExcel` middleware (`upload.middleware.ts`): .xlsx/.xls, tối đa 5MB. */
  maxSizeBytes?: number;
  onDownloadTemplate?: () => void;
  isDownloadingTemplate?: boolean;
  /** Gọi lại ĐÚNG 1 API với `dryRun` khác nhau cho preview/xác nhận (khớp thiết kế backend — cùng 1 route, query `dryRun`). */
  runImport: (file: File, dryRun: boolean) => Promise<ExcelImportResult<TPreviewRow>>;
  previewColumns: DataTableColumn<TPreviewRow>[];
  previewRowKey: (row: TPreviewRow) => string;
  /** Gọi sau khi import THẬT (`dryRun:false`) thành công — nơi gọi tự invalidate query list tương ứng. */
  onImported?: () => void;
}

/**
 * Wizard chung roadmap Mục 20 ("Excel import — Select file → Validate →
 * Preview/dry-run → Review errors → Confirm import → Result summary...
 * Không cho user import trực tiếp khi có thể preview"). Dùng chung cho
 * Document VÀ Asset (2 domain có cùng shape response, xem `ExcelImportResult`)
 * — tránh viết lại đúng luồng 4 bước 2 lần.
 */
export function ExcelImportWizard<TPreviewRow>({
  open,
  onClose,
  title,
  helperText,
  maxSizeBytes = 5 * 1024 * 1024,
  onDownloadTemplate,
  isDownloadingTemplate,
  runImport,
  previewColumns,
  previewRowKey,
  onImported,
}: ExcelImportWizardProps<TPreviewRow>) {
  const [step, setStep] = useState<WizardStep>("select");
  const [file, setFile] = useState<File[]>([]);
  const [result, setResult] = useState<ExcelImportResult<TPreviewRow> | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStep("select");
    setFile([]);
    setResult(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handlePreview() {
    if (!file[0]) return;
    setIsRunning(true);
    setError(null);
    try {
      const previewResult = await runImport(file[0], true);
      setResult(previewResult);
      setStep("preview");
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleConfirm() {
    if (!file[0]) return;
    setIsRunning(true);
    setError(null);
    try {
      const commitResult = await runImport(file[0], false);
      setResult(commitResult);
      setStep("done");
      onImported?.();
    } catch (err) {
      setError(parseApiError(err).message);
    } finally {
      setIsRunning(false);
    }
  }

  const errorColumns: DataTableColumn<{ row: number; message: string }>[] = [
    { key: "row", header: "Dòng", className: "w-20" },
    { key: "message", header: "Lỗi" },
  ];

  return (
    <AppModal open={open} onClose={handleClose} title={title} size="lg">
      <div className="space-y-4">
        {step === "select" && (
          <>
            {helperText && <p className="text-sm text-muted-foreground">{helperText}</p>}

            {onDownloadTemplate && (
              <Button type="button" variant="secondary" size="sm" onClick={onDownloadTemplate} loading={isDownloadingTemplate}>
                <Download /> Tải file mẫu
              </Button>
            )}

            <FileUpload
              accept=".xlsx,.xls"
              allowedExtensions={[".xlsx", ".xls"]}
              maxSizeBytes={maxSizeBytes}
              disabled={isRunning}
              value={file}
              onChange={setFile}
              helperText="File Excel .xlsx/.xls — tối đa 5MB"
            />

            {error && (
              <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={handleClose} disabled={isRunning}>
                Huỷ
              </Button>
              <Button type="button" size="sm" onClick={handlePreview} loading={isRunning} disabled={!file[0]}>
                Xem trước
              </Button>
            </div>
          </>
        )}

        {step === "preview" && result && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SummaryStat label="Tạo mới" value={result.created} />
              <SummaryStat label="Cập nhật" value={result.updated} />
              <SummaryStat label="Tổng dòng" value={result.totalRows} />
              <SummaryStat label="Lỗi" value={result.errors.length} tone={result.errors.length > 0 ? "destructive" : undefined} />
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Dòng lỗi (sẽ bị bỏ qua nếu import)</p>
                <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                  <DataTable columns={errorColumns} data={result.errors} keyExtractor={(e) => `${e.row}`} />
                </div>
              </div>
            )}

            {result.preview.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Xem trước ({result.preview.length} dòng hợp lệ)</p>
                <div className="max-h-64 overflow-y-auto rounded-md border border-border">
                  <DataTable columns={previewColumns} data={result.preview} keyExtractor={previewRowKey} />
                </div>
              </div>
            )}

            {error && (
              <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={reset} disabled={isRunning}>
                Chọn file khác
              </Button>
              <Button type="button" size="sm" onClick={handleConfirm} loading={isRunning} disabled={result.preview.length === 0}>
                Xác nhận import
              </Button>
            </div>
          </>
        )}

        {step === "done" && result && (
          <>
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <FileCheck2 className="size-10 text-primary" aria-hidden="true" />
              <p className="text-sm font-medium text-foreground">Import hoàn tất</p>
              <p className="text-sm text-muted-foreground">
                Tạo mới {result.created}, cập nhật {result.updated}
                {result.reportsCreated > 0 && `, sinh thêm ${result.reportsCreated} biên bản`} trên tổng {result.totalRows} dòng
                {result.errors.length > 0 && ` — ${result.errors.length} dòng lỗi bị bỏ qua`}.
              </p>
            </div>

            {result.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                <DataTable columns={errorColumns} data={result.errors} keyExtractor={(e) => `${e.row}`} />
              </div>
            )}

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

function SummaryStat({ label, value, tone }: { label: string; value: number; tone?: "destructive" }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 p-2.5 text-center">
      <p className={`text-lg font-semibold ${tone === "destructive" ? "text-destructive" : "text-foreground"}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
