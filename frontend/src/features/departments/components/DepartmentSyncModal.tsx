import { useState, type ReactNode } from "react";
import type { AxiosError } from "axios";
import { CheckCircle2 } from "lucide-react";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/shared/FileUpload";
import { usePreviewDepartmentSync, useSyncDepartmentsExcel } from "@/features/departments/hooks/useSyncDepartmentsExcel";
import { parseApiError } from "@/utils/parseApiError";
import type { DepartmentSyncIssue, DepartmentSyncItem, DepartmentSyncResult } from "@/types/department.types";

interface DepartmentSyncModalProps {
  open: boolean;
  onClose: () => void;
}

/** Danh sách tiêu đề cột backend trả về khi file sai định dạng (`details.foundHeaders`). */
function foundHeadersOf(error: unknown): string[] {
  const details = (error as AxiosError<{ details?: { foundHeaders?: unknown } }>)?.response?.data?.details;
  return Array.isArray(details?.foundHeaders) ? (details.foundHeaders as string[]) : [];
}

function ItemList({ children }: { children: ReactNode }) {
  return <ul className="max-h-48 divide-y divide-border overflow-y-auto rounded-md border border-border text-sm">{children}</ul>;
}

function PlainItems({ items }: { items: DepartmentSyncItem[] }) {
  return (
    <ItemList>
      {items.map((d) => (
        <li key={d.name} className="flex items-center justify-between gap-3 px-3 py-1.5">
          <span className="text-foreground">{d.name}</span>
          <span className="shrink-0 font-mono text-xs text-muted-foreground">{d.code}</span>
        </li>
      ))}
    </ItemList>
  );
}

function IssueItems({ items }: { items: DepartmentSyncIssue[] }) {
  return (
    <ItemList>
      {items.map((d) => (
        <li key={d.name} className="px-3 py-1.5">
          <p className="text-foreground">{d.name}</p>
          <p className="text-xs text-destructive">{d.reason}</p>
        </li>
      ))}
    </ItemList>
  );
}

/** Nhóm phụ thu gọn được (native `<details>` — bàn phím/trình đọc màn hình có sẵn). */
function Group({ title, count, hint, defaultOpen, children }: { title: string; count: number; hint?: string; defaultOpen?: boolean; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <details open={defaultOpen} className="group space-y-2">
      <summary className="cursor-pointer text-sm font-medium text-foreground">
        {title} ({count})
      </summary>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </details>
  );
}

/**
 * "Đồng bộ từ Excel" (roadmap Mục 20, permission `EXCEL_DEPARTMENT_SYNC` — chỉ IT/ADMIN).
 *
 * [DEV-089] Viết lại thành 3 bước theo yêu cầu user: chọn file → XEM TRƯỚC (tick
 * chọn từng khoa sẽ tạo) → kết quả. Trước đây chọn file là tạo ngay, và backend
 * đọc mù cột 3 của file bất kỳ — 1 file danh sách thiết bị từng sinh ra 11 "khoa"
 * mang tên thiết bị (FE-38 Mục 4). Nay backend bắt buộc có cột tiêu đề
 * "Khoa"/"Khoa/Phòng" ở dòng 1. Vẫn KHÔNG dùng `ExcelImportWizard` chung (luồng
 * đơn giản hơn nhiều, dữ liệu chỉ là 1 danh sách tên).
 */
export function DepartmentSyncModal({ open, onClose }: DepartmentSyncModalProps) {
  const [file, setFile] = useState<File[]>([]);
  const [preview, setPreview] = useState<DepartmentSyncResult | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<DepartmentSyncResult | null>(null);
  const previewMutation = usePreviewDepartmentSync();
  const syncMutation = useSyncDepartmentsExcel();

  const activeError = previewMutation.error ?? syncMutation.error;
  const apiError = activeError ? parseApiError(activeError) : null;
  const foundHeaders = foundHeadersOf(previewMutation.error);
  const isBusy = previewMutation.isPending || syncMutation.isPending;

  function handleClose() {
    setFile([]);
    setPreview(null);
    setSelected(new Set());
    setResult(null);
    previewMutation.reset();
    syncMutation.reset();
    onClose();
  }

  function handlePreview() {
    if (!file[0]) return;
    syncMutation.reset();
    previewMutation.mutate(file[0], {
      onSuccess: (response) => {
        const data = response.data.data;
        setPreview(data);
        setSelected(new Set(data.toCreate.map((d) => d.name)));
      },
    });
  }

  function handleCreate() {
    if (!file[0] || selected.size === 0) return;
    syncMutation.mutate({ file: file[0], names: [...selected] }, { onSuccess: (response) => setResult(response.data.data) });
  }

  function backToSelect() {
    setPreview(null);
    setSelected(new Set());
    previewMutation.reset();
    syncMutation.reset();
  }

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const errorBox = apiError && (
    <div role="alert" className="space-y-1 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      <p>{apiError.message}</p>
      {foundHeaders.length > 0 && <p className="text-xs">Các cột tìm thấy ở dòng 1: {foundHeaders.join(", ")}</p>}
    </div>
  );

  let body: ReactNode;

  if (result) {
    body = (
      <>
        <div className="flex flex-col items-center gap-2 py-2 text-center">
          <CheckCircle2 className="size-10 text-primary" aria-hidden="true" />
          <p className="text-sm font-medium text-foreground">Đã tạo {result.created.length} khoa/phòng</p>
        </div>
        {result.created.length > 0 && <PlainItems items={result.created} />}
        <Group title="Không lưu được" count={result.failed.length} defaultOpen>
          <IssueItems items={result.failed} />
        </Group>
        <div className="flex justify-end pt-2">
          <Button type="button" size="sm" onClick={handleClose}>
            Đóng
          </Button>
        </div>
      </>
    );
  } else if (preview) {
    const allChecked = preview.toCreate.length > 0 && selected.size === preview.toCreate.length;
    const someChecked = selected.size > 0 && !allChecked;
    body = (
      <>
        <p className="text-sm text-muted-foreground">
          Đọc cột <span className="font-medium text-foreground">"{preview.column.header}"</span> (cột {preview.column.index}) —{" "}
          {preview.totalInFile} khoa/phòng khác nhau trong file. Chưa có gì được lưu.
        </p>

        {preview.toCreate.length > 0 ? (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={allChecked}
                ref={(el) => {
                  if (el) el.indeterminate = someChecked;
                }}
                onChange={() => setSelected(allChecked ? new Set() : new Set(preview.toCreate.map((d) => d.name)))}
                className="size-4 rounded border-input"
              />
              Sẽ tạo mới ({selected.size}/{preview.toCreate.length} đã chọn)
            </label>
            <ItemList>
              {preview.toCreate.map((d) => (
                <li key={d.name}>
                  <label className="flex cursor-pointer items-center gap-2 px-3 py-1.5 hover:bg-muted/50">
                    <input type="checkbox" checked={selected.has(d.name)} onChange={() => toggle(d.name)} className="size-4 shrink-0 rounded border-input" />
                    <span className="flex-1 text-foreground">{d.name}</span>
                    <span className="shrink-0 font-mono text-xs text-muted-foreground" title="Mã tự sinh">
                      {d.code}
                    </span>
                  </label>
                </li>
              ))}
            </ItemList>
          </div>
        ) : (
          <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">Không có khoa/phòng mới nào cần tạo.</p>
        )}

        <Group title="Không tạo được" count={preview.invalid.length} defaultOpen>
          <IssueItems items={preview.invalid} />
        </Group>
        <Group
          title="Đang ẩn (đã xoá mềm)"
          count={preview.inactive.length}
          hint='Không tạo trùng. Muốn dùng lại thì khôi phục ở trang Khoa/Phòng, bộ lọc "Hiển thị: Đã ẩn".'
          defaultOpen
        >
          <PlainItems items={preview.inactive} />
        </Group>
        <Group title="Đã tồn tại — bỏ qua" count={preview.existed.length}>
          <PlainItems items={preview.existed} />
        </Group>

        {errorBox}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={backToSelect} disabled={isBusy}>
            Chọn file khác
          </Button>
          <Button type="button" size="sm" onClick={handleCreate} loading={syncMutation.isPending} disabled={selected.size === 0}>
            Tạo {selected.size} khoa/phòng
          </Button>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <p className="text-sm text-muted-foreground">
          Dòng 1 của file phải có cột tiêu đề <span className="font-medium text-foreground">"Khoa"</span> hoặc{" "}
          <span className="font-medium text-foreground">"Khoa/Phòng"</span> (VD file mẫu import tài liệu hoặc tài sản). Bạn sẽ được xem
          trước danh sách và chọn khoa/phòng cần tạo trước khi lưu.
        </p>
        <FileUpload
          accept=".xlsx,.xls"
          allowedExtensions={[".xlsx", ".xls"]}
          maxSizeBytes={5 * 1024 * 1024}
          disabled={isBusy}
          value={file}
          onChange={(files) => {
            setFile(files);
            previewMutation.reset();
          }}
          helperText="File Excel .xlsx/.xls — tối đa 5MB"
        />
        {errorBox}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={handleClose} disabled={isBusy}>
            Huỷ
          </Button>
          <Button type="button" size="sm" onClick={handlePreview} loading={previewMutation.isPending} disabled={!file[0]}>
            Xem trước
          </Button>
        </div>
      </>
    );
  }

  return (
    <AppModal open={open} onClose={handleClose} title="Đồng bộ khoa/phòng từ Excel" size="lg">
      <div className="space-y-4">{body}</div>
    </AppModal>
  );
}
