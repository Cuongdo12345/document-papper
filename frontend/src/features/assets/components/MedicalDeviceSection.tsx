import { useState } from "react";
import { ShieldCheck, Pencil, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { useMedicalDeviceProfile } from "@/features/assets/hooks/useMedicalDeviceProfile";
import { CalibrationStatusBadge } from "@/features/assets/components/CalibrationStatusBadge";
import { MedicalDeviceProfileModal } from "@/features/assets/components/MedicalDeviceProfileModal";
import { CalibrationRecordModal } from "@/features/assets/components/CalibrationRecordModal";
import { CalibrationHistoryList } from "@/features/assets/components/CalibrationHistoryList";
import { parseApiError } from "@/utils/parseApiError";

const SECTION_CLASS = "space-y-3 rounded-lg border border-border bg-card p-4";

/**
 * FE-07 — "Hồ sơ thiết bị y tế", nhúng trong `AssetDetailPage` (KHÔNG có
 * route/trang riêng — đúng thiết kế backend: mọi endpoint đều theo
 * `:assetId`, 1 Asset có tối đa 1 profile, xem comment gốc
 * `medicalDeviceAlerts.service.ts`: "MedicalDeviceProfile không có màn hình
 * chi tiết riêng ở FE, mọi thao tác đều thực hiện qua màn hình chi tiết
 * Asset"). KHÔNG PHẢI mọi Asset đều có hồ sơ này (chỉ thiết bị y tế thật —
 * VD "Máy gây mê", KHÔNG áp dụng cho "Access Point Wifi") — component tự xử
 * lý trạng thái "chưa có hồ sơ" bằng CTA tạo mới thay vì ẩn hẳn.
 */
export function MedicalDeviceSection({ assetId }: { assetId: string }) {
  const { hasPermission } = usePermission();
  const canView = hasPermission(PERMISSIONS.MEDICAL_DEVICE_VIEW);

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [calibrationModalOpen, setCalibrationModalOpen] = useState(false);

  const profileQuery = useMedicalDeviceProfile(assetId, canView);

  if (!canView) return null;

  if (profileQuery.isLoading) {
    return (
      <div className={SECTION_CLASS}>
        <h2 className="text-sm font-semibold text-foreground">Hồ sơ thiết bị y tế</h2>
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      </div>
    );
  }

  if (profileQuery.notFound) {
    return (
      <div className={SECTION_CLASS}>
        <h2 className="text-sm font-semibold text-foreground">Hồ sơ thiết bị y tế</h2>
        <p className="text-sm text-muted-foreground">
          Tài sản này chưa có hồ sơ thiết bị y tế. Chỉ tạo hồ sơ nếu đây thực sự là thiết bị y tế cần tuân thủ pháp lý/kiểm định.
        </p>
        <PermissionGuard permission={PERMISSIONS.MEDICAL_DEVICE_CREATE}>
          <Button size="sm" onClick={() => setProfileModalOpen(true)}>
            <ShieldCheck /> Tạo hồ sơ thiết bị y tế
          </Button>
        </PermissionGuard>
        {profileModalOpen && (
          <MedicalDeviceProfileModal key="create" open={profileModalOpen} onClose={() => setProfileModalOpen(false)} assetId={assetId} />
        )}
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className={SECTION_CLASS}>
        <h2 className="text-sm font-semibold text-foreground">Hồ sơ thiết bị y tế</h2>
        <ErrorState
          message={profileQuery.error ? parseApiError(profileQuery.error).message : "Không tải được hồ sơ"}
          onRetry={() => profileQuery.refetch()}
        />
      </div>
    );
  }

  const profile = profileQuery.data;

  return (
    <div className={SECTION_CLASS}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Hồ sơ thiết bị y tế</h2>
        <div className="flex flex-wrap gap-2">
          <StatusBadge variant="info">Phân loại {profile.deviceClass}</StatusBadge>
          <CalibrationStatusBadge profile={profile} />
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Số đăng ký lưu hành</dt>
          <dd className="text-foreground">{profile.registrationNumber ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Hạn giấy phép lưu hành</dt>
          <dd className="text-foreground">{profile.licenseExpiredAt ? new Date(profile.licenseExpiredAt).toLocaleDateString("vi-VN") : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Chu kỳ kiểm định</dt>
          <dd className="text-foreground">
            {profile.requiresCalibration ? `${profile.calibrationIntervalMonths} tháng/lần` : "Không yêu cầu"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Kiểm định gần nhất</dt>
          <dd className="text-foreground">
            {profile.lastCalibrationDate ? new Date(profile.lastCalibrationDate).toLocaleDateString("vi-VN") : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Hạn kiểm định kế tiếp</dt>
          <dd className="text-foreground">
            {profile.nextCalibrationDueDate ? new Date(profile.nextCalibrationDueDate).toLocaleDateString("vi-VN") : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Người vận hành cần chứng chỉ riêng</dt>
          <dd className="text-foreground">{profile.operatorCertificateRequired ? "Có" : "Không"}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2 border-t border-border pt-3">
        <PermissionGuard permission={PERMISSIONS.MEDICAL_DEVICE_UPDATE}>
          <Button variant="secondary" size="sm" onClick={() => setProfileModalOpen(true)}>
            <Pencil /> Sửa hồ sơ
          </Button>
        </PermissionGuard>
        <PermissionGuard permission={PERMISSIONS.MEDICAL_DEVICE_CALIBRATE}>
          <Button size="sm" onClick={() => setCalibrationModalOpen(true)}>
            <ClipboardCheck /> Ghi nhận kiểm định
          </Button>
        </PermissionGuard>
      </div>

      <div className="border-t border-border pt-3">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Lịch sử kiểm định</h3>
        <CalibrationHistoryList assetId={assetId} />
      </div>

      {profileModalOpen && (
        <MedicalDeviceProfileModal key={profile._id} open={profileModalOpen} onClose={() => setProfileModalOpen(false)} assetId={assetId} profile={profile} />
      )}
      {calibrationModalOpen && (
        <CalibrationRecordModal key={`calibrate-${profile._id}`} open={calibrationModalOpen} onClose={() => setCalibrationModalOpen(false)} assetId={assetId} />
      )}
    </div>
  );
}
