import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { FileSpreadsheet, Upload, Download, History, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExcelImportWizard } from "@/components/shared/ExcelImportWizard";
import type { DataTableColumn } from "@/components/shared/DataTable";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { cn } from "@/lib/utils";
import { ExportDocumentsExcelModal } from "@/features/documents/components/ExportDocumentsExcelModal";
import { ImportHistoryDrawer } from "@/features/documents/components/ImportHistoryDrawer";
import { useDocumentImportTemplate } from "@/features/documents/hooks/useDocumentImportTemplate";
import { useImportDocumentsExcel } from "@/features/documents/hooks/useImportDocumentsExcel";
import type { DocumentImportPreviewRow } from "@/types/document.types";

const PREVIEW_COLUMNS: DataTableColumn<DocumentImportPreviewRow>[] = [
  { key: "row", header: "Dòng", className: "w-16" },
  { key: "action", header: "Hành động", render: (row) => (row.action === "create" ? "Tạo mới" : "Cập nhật") },
  { key: "department", header: "Khoa/phòng" },
  { key: "title", header: "Tiêu đề" },
  { key: "deviceName", header: "Thiết bị" },
  { key: "willCreateReport", header: "Sinh biên bản", render: (row) => (row.willCreateReport ? "Có" : "—") },
];

const MENU_PERMISSIONS = [
  PERMISSIONS.DOCUMENT_EXCEL_EXPORT,
  PERMISSIONS.DOCUMENT_EXCEL_IMPORT,
  PERMISSIONS.DOCUMENT_EXCEL_TEMPLATE,
  PERMISSIONS.DOCUMENT_EXCEL_HISTORY,
];

/**
 * Dropdown "Excel" (`DocumentsListPage`, roadmap Mục 20) — gộp 4 action liên
 * quan Excel (Export/Import/Template/Lịch sử) thay vì 4 nút rời rạc trên
 * `PageHeader`. Mỗi action tự gate ĐÚNG permission riêng (4 permission khác
 * nhau, không giả định luôn đi cùng nhau — cùng nguyên tắc đã áp dụng ở
 * `AdminNotificationsTab`/Audit Logs tabs). Toàn bộ dropdown tự ẩn nếu
 * thiếu CẢ 4 quyền.
 */
export function DocumentExcelMenu() {
  const { hasPermission, hasAnyPermission } = usePermission();
  const queryClient = useQueryClient();
  const templateMutation = useDocumentImportTemplate();
  const runImport = useImportDocumentsExcel();

  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  if (!hasAnyPermission(MENU_PERMISSIONS)) return null;

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button variant="secondary" size="sm">
            <FileSpreadsheet /> Excel <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className={cn(
              "z-50 w-56 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg",
              "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
            )}
          >
            {hasPermission(PERMISSIONS.DOCUMENT_EXCEL_EXPORT) && (
              <DropdownMenu.Item
                onSelect={() => setExportOpen(true)}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted focus:bg-muted"
              >
                <Download className="size-4" /> Xuất Excel
              </DropdownMenu.Item>
            )}
            {hasPermission(PERMISSIONS.DOCUMENT_EXCEL_IMPORT) && (
              <DropdownMenu.Item
                onSelect={() => setImportOpen(true)}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted focus:bg-muted"
              >
                <Upload className="size-4" /> Nhập từ Excel
              </DropdownMenu.Item>
            )}
            {hasPermission(PERMISSIONS.DOCUMENT_EXCEL_TEMPLATE) && (
              <DropdownMenu.Item
                onSelect={() => templateMutation.mutate()}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted focus:bg-muted"
              >
                <FileSpreadsheet className="size-4" /> Tải file mẫu
              </DropdownMenu.Item>
            )}
            {hasPermission(PERMISSIONS.DOCUMENT_EXCEL_HISTORY) && (
              <DropdownMenu.Item
                onSelect={() => setHistoryOpen(true)}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted focus:bg-muted"
              >
                <History className="size-4" /> Lịch sử import
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ExportDocumentsExcelModal open={exportOpen} onClose={() => setExportOpen(false)} />

      <ExcelImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Nhập tài liệu từ Excel"
        helperText="Import chỉ áp dụng cho Đề xuất (Proposal) — tạo mới hoặc cập nhật theo khoa/tiêu đề/thiết bị/ngày trùng khớp."
        onDownloadTemplate={() => templateMutation.mutate()}
        isDownloadingTemplate={templateMutation.isPending}
        runImport={runImport}
        previewColumns={PREVIEW_COLUMNS}
        previewRowKey={(row) => `${row.row}`}
        onImported={() => queryClient.invalidateQueries({ queryKey: ["documents", "list"] })}
      />

      <ImportHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}
