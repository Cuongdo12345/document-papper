import { useState } from "react";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useAssetCategories } from "@/features/assets/hooks/useAssetCategories";
import { useExportAssetsExcel } from "@/features/assets/hooks/useExportAssetsExcel";
import { ASSET_STATUSES, type AssetStatus } from "@/types/asset.types";

const STATUS_LABEL: Record<AssetStatus, string> = {
  IN_STOCK: "Trong kho",
  IN_USE: "Đang sử dụng",
  UNDER_MAINTENANCE: "Đang bảo trì",
  RESERVED: "Đã giữ chỗ",
  DISPOSED: "Đã thanh lý",
  LOST: "Thất lạc/mất",
};

interface ExportAssetsExcelModalProps {
  open: boolean;
  onClose: () => void;
}

/** Filter export — khớp `exportAssetsExcelPRO` (`assetExcel.service.ts`): department/category/status/keyword, không ràng buộc theo ADMIN như Document (Asset export không tự khoá theo khoa người gọi). */
export function ExportAssetsExcelModal({ open, onClose }: ExportAssetsExcelModalProps) {
  const departmentsQuery = useDepartments({ limit: 100 }, { enabled: open });
  const categoriesQuery = useAssetCategories({ limit: 100 }, { enabled: open });
  const exportMutation = useExportAssetsExcel();

  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState<AssetStatus | "">("");
  const [keyword, setKeyword] = useState("");

  function handleExport() {
    exportMutation.mutate(
      {
        department: department || undefined,
        category: category || undefined,
        status: status || undefined,
        keyword: keyword.trim() || undefined,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title="Xuất Excel" size="md">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="asset-export-keyword" className="text-sm font-medium text-foreground">
            Tìm kiếm (mã/tên/serial)
          </label>
          <input
            id="asset-export-keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="asset-export-department" className="text-sm font-medium text-foreground">
              Khoa/Phòng
            </label>
            <select
              id="asset-export-department"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Tất cả</option>
              {departmentsQuery.data?.data.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="asset-export-category" className="text-sm font-medium text-foreground">
              Danh mục
            </label>
            <select
              id="asset-export-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Tất cả</option>
              {categoriesQuery.data?.data.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="asset-export-status" className="text-sm font-medium text-foreground">
            Trạng thái
          </label>
          <select
            id="asset-export-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as AssetStatus | "")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả</option>
            {ASSET_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={exportMutation.isPending}>
            Huỷ
          </Button>
          <Button type="button" size="sm" onClick={handleExport} loading={exportMutation.isPending}>
            Xuất Excel
          </Button>
        </div>
      </div>
    </AppModal>
  );
}
