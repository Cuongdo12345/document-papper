import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Trash2, ArrowRightLeft, PackageCheck, Undo2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { useAssetDetail } from "@/features/assets/hooks/useAssetDetail";
import { useDeleteAsset } from "@/features/assets/hooks/useDeleteAsset";
import { AssetStatusBadge } from "@/features/assets/components/AssetStatusBadge";
import { AssetEditModal } from "@/features/assets/components/AssetEditModal";
import { AssetAssignModal } from "@/features/assets/components/AssetAssignModal";
import { AssetTransferModal } from "@/features/assets/components/AssetTransferModal";
import { AssetReturnModal } from "@/features/assets/components/AssetReturnModal";
import { AssetAssignmentHistorySection } from "@/features/assets/components/AssetAssignmentHistorySection";
import { MedicalDeviceSection } from "@/features/assets/components/MedicalDeviceSection";
import { AssetQRCodeSection } from "@/features/assets/components/AssetQRCodeSection";
import { MaintenancePlanHistorySection } from "@/features/assets/components/MaintenancePlanHistorySection";
import { parseApiError } from "@/utils/parseApiError";

const SECTION_CLASS = "space-y-3 rounded-lg border border-border bg-card p-4";

export function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);

  const assetQuery = useAssetDetail(id);
  const asset = assetQuery.data;
  const deleteMutation = useDeleteAsset();

  if (assetQuery.isLoading) return <LoadingState label="Đang tải tài sản..." />;
  if (assetQuery.isError || !asset) {
    return (
      <ErrorState
        message={assetQuery.error ? parseApiError(assetQuery.error).message : "Không tìm thấy tài sản"}
        onRetry={() => assetQuery.refetch()}
      />
    );
  }

  const canAssign = asset.status === "IN_STOCK" || asset.status === "RESERVED";
  const canTransfer = asset.status === "IN_USE";
  const canReturn = asset.status === "IN_USE" || asset.status === "RESERVED";

  return (
    <div className="space-y-4">
      <PageHeader
        title={asset.name}
        description={asset.assetCode}
        breadcrumb={[{ label: "Tài sản", to: "/app/assets" }, { label: asset.assetCode }]}
        actions={
          <div className="flex flex-wrap gap-2">
            <PermissionGuard permission={PERMISSIONS.ASSET_UPDATE}>
              <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil /> Sửa
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={PERMISSIONS.ASSET_DELETE}>
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 /> Xoá
              </Button>
            </PermissionGuard>
          </div>
        }
      />

      {/* Identity + Status */}
      <div className={SECTION_CLASS}>
        <div className="flex flex-wrap items-center gap-2">
          <AssetStatusBadge status={asset.status} />
        </div>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Danh mục</dt>
            <dd className="text-foreground">{asset.category.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Khoa/Phòng quản lý</dt>
            <dd className="text-foreground">{asset.department.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Người đang sử dụng</dt>
            <dd className="text-foreground">{asset.assignedTo?.fullName ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Vị trí</dt>
            <dd className="text-foreground">{asset.location ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Số serial</dt>
            <dd className="text-foreground">{asset.serialNumber ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Model</dt>
            <dd className="text-foreground">{asset.model ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Hãng sản xuất</dt>
            <dd className="text-foreground">{asset.manufacturer ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Nhà cung cấp</dt>
            <dd className="text-foreground">{asset.supplier ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Ngày mua</dt>
            <dd className="text-foreground">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("vi-VN") : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Giá mua</dt>
            <dd className="text-foreground">
              {asset.purchasePrice != null ? `${asset.purchasePrice.toLocaleString("vi-VN")} đ` : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Hết bảo hành</dt>
            <dd className="text-foreground">
              {asset.warrantyExpiredAt ? new Date(asset.warrantyExpiredAt).toLocaleDateString("vi-VN") : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Lần kiểm kê gần nhất</dt>
            <dd className="text-foreground">
              {asset.lastInventoryCheckAt ? new Date(asset.lastInventoryCheckAt).toLocaleString("vi-VN") : "Chưa kiểm kê lần nào"}
            </dd>
          </div>
        </dl>
      </div>

      {/* Giai đoạn 5 (roadmap A1) — QR code kiểm kê */}
      <div className={SECTION_CLASS}>
        <h2 className="text-sm font-semibold text-foreground">Mã QR</h2>
        <AssetQRCodeSection assetId={asset._id} assetCode={asset.assetCode} assetName={asset.name} />
      </div>

      {/* Assignment actions */}
      {(hasPermission(PERMISSIONS.ASSET_ASSIGN) && (canAssign || canTransfer || canReturn)) && (
        <div className={SECTION_CLASS}>
          <h2 className="text-sm font-semibold text-foreground">Cấp phát / Luân chuyển</h2>
          <div className="flex flex-wrap gap-2">
            {canAssign && (
              <Button size="sm" onClick={() => setAssignOpen(true)}>
                <PackageCheck /> Cấp phát
              </Button>
            )}
            {canTransfer && (
              <Button variant="secondary" size="sm" onClick={() => setTransferOpen(true)}>
                <ArrowRightLeft /> Luân chuyển
              </Button>
            )}
            {canReturn && (
              <Button variant="secondary" size="sm" onClick={() => setReturnOpen(true)}>
                <Undo2 /> Thu hồi về kho
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Assignment history */}
      <div className={SECTION_CLASS}>
        <h2 className="text-sm font-semibold text-foreground">Lịch sử cấp phát/luân chuyển</h2>
        <AssetAssignmentHistorySection assetId={asset._id} />
      </div>

      {/* FE-07 — Medical Device Profile/Calibration (tự ẩn nếu không có MEDICAL_DEVICE_VIEW) */}
      <MedicalDeviceSection assetId={asset._id} />

      {/* Roadmap B2 — Lịch bảo trì chủ động (tự ẩn nếu không có ASSET_MAINTENANCE_PLAN_VIEW) */}
      <MaintenancePlanHistorySection assetId={asset._id} />

      {editOpen && <AssetEditModal key={asset._id} open={editOpen} onClose={() => setEditOpen(false)} asset={asset} />}
      {assignOpen && <AssetAssignModal key={`assign-${asset._id}`} open={assignOpen} onClose={() => setAssignOpen(false)} asset={asset} />}
      {transferOpen && <AssetTransferModal key={`transfer-${asset._id}`} open={transferOpen} onClose={() => setTransferOpen(false)} asset={asset} />}
      {returnOpen && <AssetReturnModal key={`return-${asset._id}`} open={returnOpen} onClose={() => setReturnOpen(false)} asset={asset} />}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate(asset._id, { onSuccess: () => navigate("/app/assets") })}
        title="Xoá tài sản"
        message={`Ẩn "${asset.name}"? Có thể khôi phục lại sau ở trang danh sách (bộ lọc "Hiển thị: Đã ẩn").`}
        danger
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
