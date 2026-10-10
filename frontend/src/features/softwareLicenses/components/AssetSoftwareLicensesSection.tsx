import { useState } from "react";
import { Link } from "react-router-dom";
import { Link2Off, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { useSoftwareLicenses } from "@/features/softwareLicenses/hooks/useSoftwareLicenses";
import { useAssignAssetToLicense, useUnassignAssetFromLicense } from "@/features/softwareLicenses/hooks/useSoftwareLicenseActions";
import { LicenseExpiryBadge } from "@/features/softwareLicenses/components/LicenseExpiryBadge";
import { parseApiError } from "@/utils/parseApiError";
import type { SoftwareLicenseListItem } from "@/types/softwareLicense.types";

const SECTION_CLASS = "space-y-3 rounded-lg border border-border bg-card p-4";

/**
 * FE-43 — "Bản quyền phần mềm" của MỘT thiết bị CNTT, nhúng trong trang chi tiết (kế hoạch mục 4.6: "Trang chi tiết
 * thiết bị CNTT hiện các bản quyền đang gán"). Tự ẩn nếu thiếu `SOFTWARE_LICENSE_VIEW`. Gán/gỡ cần `SOFTWARE_LICENSE_ASSIGN`.
 * Gán chỉ chọn trong các bản quyền còn chỗ trống và chưa gán cho máy này (backend vẫn là nơi ép số chỗ).
 */
export function AssetSoftwareLicensesSection({ assetId }: { assetId: string }) {
  const { hasPermission } = usePermission();
  const canView = hasPermission(PERMISSIONS.SOFTWARE_LICENSE_VIEW);
  const canAssign = hasPermission(PERMISSIONS.SOFTWARE_LICENSE_ASSIGN);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [unassignTarget, setUnassignTarget] = useState<SoftwareLicenseListItem | null>(null);

  const ofAsset = useSoftwareLicenses({ asset: assetId, limit: 100 }, canView);
  const candidates = useSoftwareLicenses({ limit: 100 }, canView && canAssign && pickerOpen);
  const assignMutation = useAssignAssetToLicense();
  const unassignMutation = useUnassignAssetFromLicense();

  if (!canView) return null;

  const assigned = ofAsset.data?.data ?? [];
  const assignedIds = new Set(assigned.map((l) => l._id));
  const options = (candidates.data?.data ?? []).filter((l) => !assignedIds.has(l._id) && l.freeSeats > 0 && !l.isExpired);

  return (
    <div className={SECTION_CLASS}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Bản quyền phần mềm đang gán</h2>
        <PermissionGuard permission={PERMISSIONS.SOFTWARE_LICENSE_ASSIGN}>
          <Button variant="secondary" size="sm" onClick={() => setPickerOpen((v) => !v)}>
            <Plus /> Gán bản quyền
          </Button>
        </PermissionGuard>
      </div>

      {ofAsset.isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
      {ofAsset.isError && <p className="text-sm text-destructive">{parseApiError(ofAsset.error).message}</p>}

      {!ofAsset.isLoading && !ofAsset.isError && assigned.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có bản quyền phần mềm nào gán cho thiết bị này.</p>
      )}

      {assigned.length > 0 && (
        <ul className="divide-y divide-border rounded-md border border-border">
          {assigned.map((l) => (
            <li key={l._id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Link to={`/app/software-licenses/${l._id}`} className="font-medium text-primary hover:underline">
                  {[l.softwareName, l.edition, l.version].filter(Boolean).join(" ")}
                </Link>
                <LicenseExpiryBadge license={l} />
              </div>
              {canAssign && (
                <Button variant="ghost" size="sm" aria-label={`Gỡ ${l.softwareName}`} onClick={() => setUnassignTarget(l)}>
                  <Link2Off /> Gỡ
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {pickerOpen && canAssign && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <label htmlFor="asset-license-picker" className="sr-only">
            Chọn bản quyền
          </label>
          <select
            id="asset-license-picker"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="min-w-64 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{candidates.isLoading ? "Đang tải..." : options.length === 0 ? "Không có bản quyền còn chỗ" : "Chọn bản quyền còn chỗ trống"}</option>
            {options.map((l) => (
              <option key={l._id} value={l._id}>
                {[l.softwareName, l.edition, l.version].filter(Boolean).join(" ")} ({l.usedSeats}/{l.totalSeats})
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={!selectedId}
            loading={assignMutation.isPending}
            onClick={() => assignMutation.mutate({ id: selectedId, assetId }, { onSuccess: () => { setSelectedId(""); setPickerOpen(false); } })}
          >
            Gán
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={!!unassignTarget}
        onClose={() => setUnassignTarget(null)}
        onConfirm={() => {
          if (!unassignTarget) return;
          unassignMutation.mutate({ id: unassignTarget._id, assetId }, { onSuccess: () => setUnassignTarget(null) });
        }}
        title="Gỡ bản quyền khỏi thiết bị"
        message={`Gỡ "${unassignTarget?.softwareName}" khỏi thiết bị này? Chỗ trống sẽ trả lại cho bản quyền.`}
        danger
        isLoading={unassignMutation.isPending}
      />
    </div>
  );
}
