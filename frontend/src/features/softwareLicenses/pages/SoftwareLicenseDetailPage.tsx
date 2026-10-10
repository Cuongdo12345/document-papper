import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Download, Link2Off, Pencil, Trash2, Upload } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { FileUpload } from "@/components/shared/FileUpload";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { useSoftwareLicense } from "@/features/softwareLicenses/hooks/useSoftwareLicenses";
import {
  useAssignAssetToLicense,
  useDeleteSoftwareLicense,
  useSetLicenseProofFile,
  useUnassignAssetFromLicense,
} from "@/features/softwareLicenses/hooks/useSoftwareLicenseActions";
import { useDownloadLicenseProof } from "@/features/softwareLicenses/hooks/useDownloadLicenseProof";
import { SoftwareLicenseFormModal } from "@/features/softwareLicenses/components/SoftwareLicenseFormModal";
import { LicenseExpiryBadge } from "@/features/softwareLicenses/components/LicenseExpiryBadge";
import { LICENSE_TYPE_LABELS } from "@/features/softwareLicenses/constants/softwareLicense.constants";
import { AssetPicker } from "@/features/documents/components/AssetPicker";
import { AssetStatusBadge } from "@/features/assets/components/AssetStatusBadge";
import { assetDetailPath } from "@/features/assets/constants/assetModule.constants";
import { parseApiError } from "@/utils/parseApiError";
import type { AssetStatus } from "@/types/asset.types";

const SECTION_CLASS = "space-y-3 rounded-lg border border-border bg-card p-4";
const PROOF_ACCEPT = "application/pdf,image/jpeg,image/png";

/** FE-43 — `/app/software-licenses/:id`: thông tin bản quyền, các máy đang dùng (gán/gỡ), chứng từ. */
export function SoftwareLicenseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pickedAsset, setPickedAsset] = useState<{ id?: string; label?: string }>({});
  const [unassignTarget, setUnassignTarget] = useState<{ id: string; label: string } | null>(null);
  const [proofFiles, setProofFiles] = useState<File[]>([]);

  const query = useSoftwareLicense(id);
  const license = query.data;
  const deleteMutation = useDeleteSoftwareLicense();
  const assignMutation = useAssignAssetToLicense();
  const unassignMutation = useUnassignAssetFromLicense();
  const proofMutation = useSetLicenseProofFile();
  const downloadMutation = useDownloadLicenseProof();

  if (query.isLoading) return <LoadingState label="Đang tải bản quyền..." />;
  if (query.isError || !license) {
    return (
      <ErrorState
        message={query.error ? parseApiError(query.error).message : "Không tìm thấy bản quyền phần mềm"}
        onRetry={() => query.refetch()}
      />
    );
  }

  const canOpenAsset = hasPermission(PERMISSIONS.IT_ASSET_VIEW_DETAIL);
  const title = [license.softwareName, license.edition, license.version].filter(Boolean).join(" ");

  return (
    <div className="space-y-4">
      <PageHeader
        title={title}
        description={license.isActive ? undefined : "Bản quyền này đã bị ẩn (xoá mềm)."}
        breadcrumb={[{ label: "Bản quyền phần mềm", to: "/app/software-licenses" }, { label: license.softwareName }]}
        actions={
          license.isActive ? (
            <div className="flex flex-wrap gap-2">
              <PermissionGuard permission={PERMISSIONS.SOFTWARE_LICENSE_UPDATE}>
                <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil /> Sửa
                </Button>
              </PermissionGuard>
              <PermissionGuard permission={PERMISSIONS.SOFTWARE_LICENSE_DELETE}>
                <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                  <Trash2 /> Xoá
                </Button>
              </PermissionGuard>
            </div>
          ) : undefined
        }
      />

      <div className={SECTION_CLASS}>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Loại bản quyền</dt>
            <dd className="text-foreground">{LICENSE_TYPE_LABELS[license.licenseType]}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Hạn dùng</dt>
            <dd>
              <LicenseExpiryBadge license={license} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Số máy đã dùng / được cài</dt>
            <dd className="text-foreground">
              {license.usedSeats} / {license.totalSeats}
              {license.freeSeats === 0 && <span className="ml-2 text-warning">(hết chỗ)</span>}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Ngày mua</dt>
            <dd className="text-foreground">{license.purchaseDate ? new Date(license.purchaseDate).toLocaleDateString("vi-VN") : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Nhà cung cấp</dt>
            <dd className="text-foreground">{license.vendor?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Số hợp đồng/đơn hàng</dt>
            <dd className="text-foreground">{license.contractOrOrderNumber ?? "—"}</dd>
          </div>
        </dl>
      </div>

      <div className={SECTION_CLASS}>
        <h2 className="text-sm font-semibold text-foreground">Thiết bị đang dùng bản quyền này</h2>

        {license.assets.length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa gán cho thiết bị nào.</p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {license.assets.map((a) => (
              <li key={a._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {canOpenAsset && a.isActive ? (
                    <Link to={assetDetailPath("IT", a._id)} className="font-medium text-primary hover:underline">
                      {a.assetCode} — {a.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">
                      {a.assetCode} — {a.name}
                    </span>
                  )}
                  <AssetStatusBadge status={a.status as AssetStatus} />
                  {!a.isActive && <StatusBadge variant="default">Đã ẩn</StatusBadge>}
                </div>
                {license.isActive && (
                  <PermissionGuard permission={PERMISSIONS.SOFTWARE_LICENSE_ASSIGN}>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Gỡ ${a.assetCode} khỏi bản quyền`}
                      onClick={() => setUnassignTarget({ id: a._id, label: `${a.assetCode} — ${a.name}` })}
                    >
                      <Link2Off /> Gỡ
                    </Button>
                  </PermissionGuard>
                )}
              </li>
            ))}
          </ul>
        )}

        {license.isActive && (
          <PermissionGuard permission={PERMISSIONS.SOFTWARE_LICENSE_ASSIGN}>
            <div className="space-y-2 border-t border-border pt-3">
              <span className="text-sm font-medium text-foreground">Gán cho thiết bị CNTT</span>
              {license.freeSeats === 0 ? (
                <p className="text-sm text-muted-foreground">Đã hết chỗ ({license.totalSeats}/{license.totalSeats}). Tăng số máy được cài hoặc gỡ bớt thiết bị để gán thêm.</p>
              ) : (
                <div className="flex flex-wrap items-start gap-2">
                  <div className="min-w-64 flex-1">
                    <AssetPicker
                      assetType="IT"
                      value={pickedAsset.id}
                      selectedLabel={pickedAsset.label}
                      onChange={(assetId, label) => setPickedAsset({ id: assetId, label })}
                    />
                  </div>
                  <Button
                    size="sm"
                    disabled={!pickedAsset.id}
                    loading={assignMutation.isPending}
                    onClick={() => {
                      if (!pickedAsset.id) return;
                      assignMutation.mutate({ id: license._id, assetId: pickedAsset.id }, { onSuccess: () => setPickedAsset({}) });
                    }}
                  >
                    Gán bản quyền
                  </Button>
                </div>
              )}
            </div>
          </PermissionGuard>
        )}
      </div>

      <div className={SECTION_CLASS}>
        <h2 className="text-sm font-semibold text-foreground">Chứng từ</h2>
        {license.proofFileId ? (
          <div>
            <Button variant="secondary" size="sm" loading={downloadMutation.isPending} onClick={() => downloadMutation.mutate(license._id)}>
              <Download /> Tải chứng từ
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có chứng từ (hợp đồng, hoá đơn, giấy chứng nhận bản quyền).</p>
        )}

        {license.isActive && (
          <PermissionGuard permission={PERMISSIONS.SOFTWARE_LICENSE_UPDATE}>
            <div className="space-y-2 border-t border-border pt-3">
              <span className="text-sm font-medium text-foreground">{license.proofFileId ? "Thay chứng từ" : "Tải chứng từ lên"}</span>
              <FileUpload
                value={proofFiles}
                onChange={setProofFiles}
                accept={PROOF_ACCEPT}
                allowedExtensions={[".pdf", ".jpg", ".jpeg", ".png"]}
                maxSizeBytes={10 * 1024 * 1024}
                helperText="PDF/JPEG/PNG, tối đa 10MB"
              />
              <Button
                size="sm"
                disabled={proofFiles.length === 0}
                loading={proofMutation.isPending}
                onClick={() => {
                  const file = proofFiles[0];
                  if (!file) return;
                  proofMutation.mutate({ id: license._id, file }, { onSuccess: () => setProofFiles([]) });
                }}
              >
                <Upload /> Lưu chứng từ
              </Button>
            </div>
          </PermissionGuard>
        )}
      </div>

      {editOpen && <SoftwareLicenseFormModal key={license._id} open={editOpen} onClose={() => setEditOpen(false)} license={license} />}

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate(license._id, { onSuccess: () => navigate("/app/software-licenses") })}
        title="Xoá bản quyền"
        message={`Ẩn "${license.softwareName}"? Có thể khôi phục lại ở trang danh sách (bộ lọc "Hiển thị: Đã ẩn").`}
        danger
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={!!unassignTarget}
        onClose={() => setUnassignTarget(null)}
        onConfirm={() => {
          if (!unassignTarget) return;
          unassignMutation.mutate({ id: license._id, assetId: unassignTarget.id }, { onSuccess: () => setUnassignTarget(null) });
        }}
        title="Gỡ bản quyền khỏi thiết bị"
        message={`Gỡ bản quyền "${license.softwareName}" khỏi ${unassignTarget?.label}? Chỗ trống sẽ trả lại cho bản quyền.`}
        danger
        isLoading={unassignMutation.isPending}
      />
    </div>
  );
}
