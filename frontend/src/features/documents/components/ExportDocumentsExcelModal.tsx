import { useState } from "react";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useExportDocumentsExcel } from "@/features/documents/hooks/useExportDocumentsExcel";
import { WORKFLOW_STATUSES, SUB_TYPES_BY_CATEGORY, type WorkflowStatus, type DocumentExportSubType } from "@/types/document.types";

const SUB_TYPE_LABEL: Record<DocumentExportSubType, string> = {
  PROPOSE_REPAIR: "Đề xuất sửa chữa",
  PROPOSE_INK: "Đề xuất mực in",
  PROPOSE_PROCUREMENT: "Đề xuất mua sắm",
};
const STATUS_LABEL: Record<WorkflowStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã huỷ",
  completed: "Hoàn tất",
};

interface ExportDocumentsExcelModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Filter export — khớp `exportDocumentsExcelPRO` (`excel.service.ts`):
 * `month`/`year` PHẢI đi cùng nhau (validate FE trước, backend cũng tự
 * chặn), `department` CHỈ hiển thị cho ADMIN (non-ADMIN bị controller ghi
 * đè bằng `req.user.department`, hiển thị dropdown sẽ gây hiểu nhầm).
 */
export function ExportDocumentsExcelModal({ open, onClose }: ExportDocumentsExcelModalProps) {
  const isAdmin = useIsAdmin();
  const departmentsQuery = useDepartments({ limit: 100 }, { enabled: isAdmin && open });
  const exportMutation = useExportDocumentsExcel();

  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState<WorkflowStatus | "">("");
  const [subTypes, setSubTypes] = useState<DocumentExportSubType[]>([]);
  const [error, setError] = useState<string | null>(null);

  function toggleSubType(s: DocumentExportSubType) {
    setSubTypes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function handleExport() {
    setError(null);
    if ((month && !year) || (!month && year)) {
      setError("Cần chọn đủ cả Tháng và Năm, hoặc để trống cả hai.");
      return;
    }
    exportMutation.mutate(
      {
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
        department: isAdmin && department ? department : undefined,
        status: status || undefined,
        subType: subTypes.length ? subTypes : undefined,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title="Xuất Excel" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="export-month" className="text-sm font-medium text-foreground">
              Tháng
            </label>
            <input
              id="export-month"
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="export-year" className="text-sm font-medium text-foreground">
              Năm
            </label>
            <input
              id="export-year"
              type="number"
              min={2000}
              max={2100}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        {isAdmin && (
          <div className="space-y-1.5">
            <label htmlFor="export-department" className="text-sm font-medium text-foreground">
              Khoa/Phòng
            </label>
            <select
              id="export-department"
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
        )}

        <div className="space-y-1.5">
          <label htmlFor="export-status" className="text-sm font-medium text-foreground">
            Trạng thái duyệt
          </label>
          <select
            id="export-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as WorkflowStatus | "")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Tất cả</option>
            {WORKFLOW_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <p className="text-sm font-medium text-foreground">Loại đề xuất</p>
          <div className="flex flex-wrap gap-3">
            {SUB_TYPES_BY_CATEGORY.PROPOSAL.map((s) => (
              <label key={s} className="flex items-center gap-1.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={subTypes.includes(s as DocumentExportSubType)}
                  onChange={() => toggleSubType(s as DocumentExportSubType)}
                />
                {SUB_TYPE_LABEL[s as DocumentExportSubType]}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Không chọn = xuất tất cả loại.</p>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

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
