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
import { ExportAssetsExcelModal } from "@/features/assets/components/ExportAssetsExcelModal";
import { ImportHistoryDrawer } from "@/features/documents/components/ImportHistoryDrawer";
import { useAssetImportTemplate } from "@/features/assets/hooks/useAssetImportTemplate";
import { useImportAssetsExcel } from "@/features/assets/hooks/useImportAssetsExcel";
import type { AssetImportPreviewRow } from "@/types/asset.types";

const PREVIEW_COLUMNS: DataTableColumn<AssetImportPreviewRow>[] = [
  { key: "row", header: "Dòng", className: "w-16" },
  { key: "category", header: "Danh mục" },
  { key: "department", header: "Khoa/phòng" },
  { key: "name", header: "Tên tài sản" },
  { key: "serialNumber", header: "Số serial", render: (row) => row.serialNumber ?? "—" },
];

/**
 * Dropdown "Excel" (`AssetsListPage`, roadmap Mục 20) — cùng pattern
 * `DocumentExcelMenu`. Asset KHÔNG có permission `_TEMPLATE` riêng — tải file
 * mẫu dùng CHUNG `ASSET_EXCEL_IMPORT` (xác nhận `asset.routes.ts`, khác
 * Document có `DOCUMENT_EXCEL_TEMPLATE` tách riêng). "Lịch sử import" dùng
 * LẠI `ImportHistoryDrawer` của Document (cùng collection `ImportHistory`,
 * gate bằng `DOCUMENT_EXCEL_HISTORY` — dùng CHUNG cho cả 2 domain, tên gợi ý
 * "Document" nhưng mô tả seed thực tế trung lập "Xem lịch sử nhập Excel").
 * RBAC gap trước đây (`PHONG_VAT_TU_TTB` thiếu quyền này) ĐÃ FIX 2026-09-10
 * — gán thêm permission cho role qua `rolePermission.map.ts` + chạy lại
 * `seed-rbac.ts`, xem `types/importHistory.types.ts`.
 */
export function AssetExcelMenu() {
  const { hasPermission, hasAnyPermission } = usePermission();
  const queryClient = useQueryClient();
  const templateMutation = useAssetImportTemplate();
  const runImport = useImportAssetsExcel();

  const [exportOpen, setExportOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const menuPermissions = [PERMISSIONS.ASSET_EXCEL_EXPORT, PERMISSIONS.ASSET_EXCEL_IMPORT, PERMISSIONS.DOCUMENT_EXCEL_HISTORY];
  if (!hasAnyPermission(menuPermissions)) return null;

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
            {hasPermission(PERMISSIONS.ASSET_EXCEL_EXPORT) && (
              <DropdownMenu.Item
                onSelect={() => setExportOpen(true)}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted focus:bg-muted"
              >
                <Download className="size-4" /> Xuất Excel
              </DropdownMenu.Item>
            )}
            {hasPermission(PERMISSIONS.ASSET_EXCEL_IMPORT) && (
              <>
                <DropdownMenu.Item
                  onSelect={() => setImportOpen(true)}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted focus:bg-muted"
                >
                  <Upload className="size-4" /> Nhập từ Excel
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => templateMutation.mutate()}
                  className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none hover:bg-muted focus:bg-muted"
                >
                  <FileSpreadsheet className="size-4" /> Tải file mẫu
                </DropdownMenu.Item>
              </>
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

      <ExportAssetsExcelModal open={exportOpen} onClose={() => setExportOpen(false)} />

      <ExcelImportWizard
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Nhập tài sản từ Excel"
        helperText="Import CHỈ tạo tài sản mới (không cập nhật tài sản đã tồn tại qua Excel)."
        onDownloadTemplate={() => templateMutation.mutate()}
        isDownloadingTemplate={templateMutation.isPending}
        runImport={runImport}
        previewColumns={PREVIEW_COLUMNS}
        previewRowKey={(row) => `${row.row}`}
        onImported={() => queryClient.invalidateQueries({ queryKey: ["assets", "list"] })}
      />

      <ImportHistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </>
  );
}
