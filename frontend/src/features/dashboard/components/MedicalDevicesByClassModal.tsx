import { useState } from "react";
import { Link } from "react-router-dom";
import { AppModal } from "@/components/shared/AppModal";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { Pagination } from "@/components/shared/Pagination";
import { AssetStatusBadge } from "@/features/assets/components/AssetStatusBadge";
import { DEVICE_CLASS_CONFIG } from "@/features/dashboard/constants/medicalDeviceClass.constants";
import { useMedicalDevicesByClass } from "@/features/dashboard/hooks/useMedicalDevicesByClass";
import { parseApiError } from "@/utils/parseApiError";
import type { MedicalDeviceByClassItem } from "@/types/dashboard.types";
import type { MedicalDeviceClass } from "@/types/medicalDevice.types";

const LIMIT = 10;

const columns: DataTableColumn<MedicalDeviceByClassItem>[] = [
  {
    key: "assetCode",
    header: "Mã tài sản",
    className: "font-mono",
    render: (row) => row.asset.assetCode,
  },
  {
    key: "name",
    header: "Tên thiết bị",
    render: (row) => (
      <Link to={`/app/assets/${row.asset._id}`} className="font-medium text-primary hover:underline">
        {row.asset.name}
      </Link>
    ),
  },
  { key: "department", header: "Khoa/Phòng", render: (row) => row.asset.department?.name ?? "—" },
  { key: "status", header: "Trạng thái", render: (row) => <AssetStatusBadge status={row.asset.status} /> },
  { key: "registrationNumber", header: "Số đăng ký lưu hành", render: (row) => row.registrationNumber ?? "—" },
  {
    key: "nextCalibrationDueDate",
    header: "Hạn kiểm định kế tiếp",
    render: (row) => (row.nextCalibrationDueDate ? new Date(row.nextCalibrationDueDate).toLocaleDateString("vi-VN") : "—"),
  },
];

interface MedicalDevicesByClassModalProps {
  open: boolean;
  onClose: () => void;
  deviceClass: MedicalDeviceClass | undefined;
}

/**
 * [MỚI DEV-084] User yêu cầu: bấm vào ô "Loại B/C/D" ở widget "Thiết bị y
 * tế" trên Dashboard → xem danh sách thiết bị tương ứng. Không có trang
 * "Danh sách thiết bị y tế" nào sẵn có để liên kết tới (khác Asset ở
 * DEV-083) — đã hỏi user qua AskUserQuestion, chọn hướng Modal (không xây
 * route/trang mới). `key={deviceClass}` ở nơi gọi để reset trang về 1 khi
 * đổi loại đang xem (mirror pattern `key={category?._id}` các modal khác).
 */
export function MedicalDevicesByClassModal({ open, onClose, deviceClass }: MedicalDevicesByClassModalProps) {
  const [page, setPage] = useState(1);
  const query = useMedicalDevicesByClass(deviceClass, { page, limit: LIMIT }, open);
  const config = deviceClass ? DEVICE_CLASS_CONFIG[deviceClass] : undefined;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={`Thiết bị y tế ${config?.label ?? ""}`}
      description="Chỉ liệt kê thiết bị thuộc tài sản đang hoạt động — khớp đúng số đếm ở ô đã bấm."
      size="lg"
    >
      <DataTable
        columns={columns}
        data={query.data?.data ?? []}
        keyExtractor={(row) => row.asset._id}
        isLoading={query.isLoading}
        isError={query.isError}
        errorMessage={query.error ? parseApiError(query.error).message : undefined}
        onRetry={() => query.refetch()}
        emptyTitle="Không có thiết bị nào thuộc phân loại này"
      />

      {query.data?.pagination && query.data.pagination.totalPages > 1 && (
        <div className="mt-3">
          <Pagination
            page={query.data.pagination.page}
            limit={query.data.pagination.limit}
            total={query.data.pagination.total}
            totalPages={query.data.pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </AppModal>
  );
}
