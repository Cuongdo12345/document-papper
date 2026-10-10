import { useState } from "react";
import { Link } from "react-router-dom";
import { Cpu, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/ErrorState";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { useItDeviceProfile } from "@/features/assets/hooks/useItDeviceProfile";
import { ItDeviceProfileModal } from "@/features/assets/components/ItDeviceProfileModal";
import { assetDetailPath } from "@/features/assets/constants/assetModule.constants";
import { parseApiError } from "@/utils/parseApiError";

const SECTION_CLASS = "space-y-3 rounded-lg border border-border bg-card p-4";

const GROUPS: { title: string; fields: { key: "cpu" | "ram" | "storage" | "gpu" | "ipAddress" | "macAddress" | "hostname" | "vlan" | "osName" | "osVersion" | "firmwareVersion"; label: string }[] }[] = [
  {
    title: "Phần cứng",
    fields: [
      { key: "cpu", label: "CPU" },
      { key: "ram", label: "RAM" },
      { key: "storage", label: "Ổ lưu trữ" },
      { key: "gpu", label: "GPU" },
    ],
  },
  {
    title: "Mạng",
    fields: [
      { key: "ipAddress", label: "Địa chỉ IP" },
      { key: "macAddress", label: "Địa chỉ MAC" },
      { key: "hostname", label: "Hostname" },
      { key: "vlan", label: "VLAN" },
    ],
  },
  {
    title: "Hệ điều hành & firmware",
    fields: [
      { key: "osName", label: "Hệ điều hành" },
      { key: "osVersion", label: "Phiên bản HĐH" },
      { key: "firmwareVersion", label: "Firmware" },
    ],
  },
];

/**
 * FE-43 — "Hồ sơ thiết bị CNTT" nhúng trong trang chi tiết thiết bị CNTT (không có route riêng, giống hồ sơ y tế).
 * Xem cần `IT_ASSET_VIEW_DETAIL` (đã là điều kiện vào trang), sửa cần `IT_ASSET_UPDATE`. Chưa có hồ sơ → hiện nút tạo.
 * IP trùng thiết bị khác chỉ CẢNH BÁO (không chặn lưu).
 */
export function ItDeviceSection({ assetId }: { assetId: string }) {
  const [modalOpen, setModalOpen] = useState(false);
  const query = useItDeviceProfile(assetId, true);

  if (query.isLoading) {
    return (
      <div className={SECTION_CLASS}>
        <h2 className="text-sm font-semibold text-foreground">Hồ sơ thiết bị CNTT</h2>
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      </div>
    );
  }
  if (query.isError || !query.data) {
    return <ErrorState message={query.error ? parseApiError(query.error).message : undefined} onRetry={() => query.refetch()} />;
  }

  const profile = query.data.data;
  const duplicate = query.data.warnings?.find((w) => w.code === "DUPLICATE_IP");

  return (
    <div className={SECTION_CLASS}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Hồ sơ thiết bị CNTT</h2>
        <PermissionGuard permission={PERMISSIONS.IT_ASSET_UPDATE}>
          <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
            {profile ? (
              <>
                <Pencil /> Sửa hồ sơ
              </>
            ) : (
              <>
                <Cpu /> Tạo hồ sơ CNTT
              </>
            )}
          </Button>
        </PermissionGuard>
      </div>

      {duplicate && (
        <div role="alert" className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-foreground">
          <p>{duplicate.message}</p>
          {duplicate.assets && duplicate.assets.length > 0 && (
            <ul className="mt-1 list-disc pl-5 text-xs">
              {duplicate.assets.map((a) => (
                <li key={a._id}>
                  <Link to={assetDetailPath("IT", a._id)} className="text-primary hover:underline">
                    {a.assetCode} — {a.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!profile ? (
        <p className="text-sm text-muted-foreground">Thiết bị này chưa có hồ sơ cấu hình, mạng và hệ điều hành.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {GROUPS.map((group) => (
            <div key={group.title} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">{group.title}</h3>
              <dl className="space-y-1 text-sm">
                {group.fields.map((f) => (
                  <div key={f.key}>
                    <dt className="text-xs text-muted-foreground">{f.label}</dt>
                    <dd className="text-foreground">{profile[f.key] != null && profile[f.key] !== "" ? String(profile[f.key]) : "—"}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ItDeviceProfileModal key={profile?._id ?? "create"} open={modalOpen} onClose={() => setModalOpen(false)} assetId={assetId} profile={profile} />
      )}
    </div>
  );
}
