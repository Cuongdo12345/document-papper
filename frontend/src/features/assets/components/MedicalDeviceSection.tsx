import { useState } from "react";
import { ShieldCheck, Pencil, ClipboardCheck, UserPlus, Ban, Trash2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { useMedicalDeviceProfile } from "@/features/assets/hooks/useMedicalDeviceProfile";
import { useCertifiedOperators } from "@/features/assets/hooks/useCertifiedOperators";
import { useRevokeOperatorCertificate, useDeleteOperatorCertificate } from "@/features/assets/hooks/useOperatorCertificateActions";
import { CalibrationStatusBadge } from "@/features/assets/components/CalibrationStatusBadge";
import { MedicalDeviceProfileModal } from "@/features/assets/components/MedicalDeviceProfileModal";
import { CalibrationRecordModal } from "@/features/assets/components/CalibrationRecordModal";
import { CalibrationHistoryList } from "@/features/assets/components/CalibrationHistoryList";
import { OperatorCertificateModal } from "@/features/assets/components/OperatorCertificateModal";
import { OperatorCertificateEditModal } from "@/features/assets/components/OperatorCertificateEditModal";
import { OperatorCertificateHistoryModal } from "@/features/assets/components/OperatorCertificateHistoryModal";
import { WorkflowActionModal } from "@/features/documents/components/WorkflowActionModal";
import { parseApiError } from "@/utils/parseApiError";
import type { OperatorCertificate } from "@/types/operatorCertificate.types";

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
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const canCreateCertificate = hasPermission(PERMISSIONS.OPERATOR_CERTIFICATE_CREATE);
  // [MỚI DEV-078] Sửa/thu hồi/xoá — lưu ĐÚNG bản ghi đang thao tác (không
  // chỉ id) để modal có sẵn dữ liệu hiển thị (certificateNumber hiện tại...).
  const [editingCert, setEditingCert] = useState<OperatorCertificate | null>(null);
  const [revokingCert, setRevokingCert] = useState<OperatorCertificate | null>(null);
  const [deletingCert, setDeletingCert] = useState<OperatorCertificate | null>(null);
  const canUpdateCertificate = hasPermission(PERMISSIONS.OPERATOR_CERTIFICATE_UPDATE);
  const canRevokeCertificate = hasPermission(PERMISSIONS.OPERATOR_CERTIFICATE_REVOKE);

  const profileQuery = useMedicalDeviceProfile(assetId, canView);
  // [MỚI, DEV-077] `profile.asset.category` — chỉ có giá trị khi `profileQuery.data`
  // đã tải xong (asset luôn được backend populate, xem `PROFILE_POPULATE`).
  const category = typeof profileQuery.data?.asset === "object" ? profileQuery.data.asset.category : undefined;
  const certifiedOperatorsQuery = useCertifiedOperators(
    category?._id,
    !!profileQuery.data?.operatorCertificateRequired,
  );
  // [MỚI DEV-078] `deviceCategoryId` chỉ dùng để invalidate đúng query key
  // sau khi sửa/thu hồi/xoá — an toàn truyền "" trước khi `category` tải
  // xong vì các modal action chỉ mở được SAU khi list đã render (đã có category).
  const revokeMutation = useRevokeOperatorCertificate(category?._id ?? "");
  const deleteMutation = useDeleteOperatorCertificate(category?._id ?? "");

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
          {/* FE-19 — section phụ trong AssetDetailPage, cùng quy ước "secondary"
              với "Lên lịch bảo trì" (MaintenancePlanHistorySection.tsx) để "Cấp
              phát" (AssetDetailPage) là CTA chính duy nhất của trang. */}
          <Button variant="secondary" size="sm" onClick={() => setProfileModalOpen(true)}>
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
          {/* FE-19 — cùng lý do nút "Tạo hồ sơ..." phía trên. */}
          <Button variant="secondary" size="sm" onClick={() => setCalibrationModalOpen(true)}>
            <ClipboardCheck /> Ghi nhận kiểm định
          </Button>
        </PermissionGuard>
      </div>

      <div className="border-t border-border pt-3">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Lịch sử kiểm định</h3>
        <CalibrationHistoryList assetId={assetId} />
      </div>

      {/* [MỚI, DEV-077] Chỉ hiện khi thiết bị yêu cầu chứng chỉ vận hành —
          gap đã đóng, trước đây `operatorCertificateRequired` chỉ là 1 cờ
          không có tác dụng theo dõi thật nào. */}
      {profile.operatorCertificateRequired && category && (
        <div className="border-t border-border pt-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Người vận hành đủ điều kiện ({category.name})</h3>
            <div className="flex flex-wrap gap-2">
              {/* [MỚI DEV-078] Lịch sử ĐẦY ĐỦ (kể cả đã hết hạn/thu hồi/xoá) — đóng
                  gap đã ghi nhận ở DEV-078.md Mục 6, khác list "còn hạn" bên dưới. */}
              <Button variant="ghost" size="sm" onClick={() => setHistoryModalOpen(true)}>
                <History /> Xem lịch sử
              </Button>
              {canCreateCertificate && (
                <Button variant="secondary" size="sm" onClick={() => setCertificateModalOpen(true)}>
                  <UserPlus /> Cấp chứng chỉ
                </Button>
              )}
            </div>
          </div>
          {certifiedOperatorsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Đang tải...</p>
          ) : certifiedOperatorsQuery.isError ? (
            <ErrorState
              message={certifiedOperatorsQuery.error ? parseApiError(certifiedOperatorsQuery.error).message : "Không tải được danh sách"}
              onRetry={() => certifiedOperatorsQuery.refetch()}
            />
          ) : !certifiedOperatorsQuery.data?.length ? (
            <p className="text-sm text-muted-foreground">
              Chưa có ai có chứng chỉ vận hành còn hạn cho danh mục này — không thể gán/chuyển giao thiết bị cho người vận hành cụ thể cho tới khi có chứng chỉ.
            </p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {certifiedOperatorsQuery.data.map((cert) => {
                const user = typeof cert.user === "object" ? cert.user : undefined;
                return (
                  <li key={cert._id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2">
                    <span className="text-foreground">
                      {user?.fullName ?? "—"} <span className="text-muted-foreground">({user?.username})</span>
                      {cert.certificateNumber && <span className="text-muted-foreground"> — số {cert.certificateNumber}</span>}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Hết hạn {new Date(cert.expiresAt).toLocaleDateString("vi-VN")}</span>
                      {/* [MỚI DEV-078] Sửa/thu hồi/xoá — chỉ áp dụng cho bản ghi
                          ĐANG hợp lệ (đây là list "còn hạn", nên mọi cert ở đây
                          đều isActive=true — không cần check lại). */}
                      {canUpdateCertificate && (
                        <Button variant="ghost" size="sm" onClick={() => setEditingCert(cert)} aria-label="Sửa số chứng chỉ">
                          <Pencil />
                        </Button>
                      )}
                      {canRevokeCertificate && (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => setRevokingCert(cert)} aria-label="Thu hồi chứng chỉ">
                            <Ban />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeletingCert(cert)} aria-label="Xoá chứng chỉ">
                            <Trash2 className="text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {profileModalOpen && (
        <MedicalDeviceProfileModal key={profile._id} open={profileModalOpen} onClose={() => setProfileModalOpen(false)} assetId={assetId} profile={profile} />
      )}
      {certificateModalOpen && category && (
        <OperatorCertificateModal
          key={`cert-${category._id}`}
          open={certificateModalOpen}
          onClose={() => setCertificateModalOpen(false)}
          deviceCategoryId={category._id}
          deviceCategoryName={category.name}
        />
      )}
      {historyModalOpen && category && (
        <OperatorCertificateHistoryModal
          key={`history-${category._id}`}
          open={historyModalOpen}
          onClose={() => setHistoryModalOpen(false)}
          deviceCategoryId={category._id}
          deviceCategoryName={category.name}
        />
      )}
      {calibrationModalOpen && (
        <CalibrationRecordModal key={`calibrate-${profile._id}`} open={calibrationModalOpen} onClose={() => setCalibrationModalOpen(false)} assetId={assetId} />
      )}

      {/* [MỚI DEV-078] Sửa/thu hồi/xoá chứng chỉ vận hành. */}
      {editingCert && category && (
        <OperatorCertificateEditModal
          key={`edit-${editingCert._id}`}
          open={!!editingCert}
          onClose={() => setEditingCert(null)}
          certificate={editingCert}
          deviceCategoryId={category._id}
        />
      )}
      {revokingCert && (() => {
        const user = typeof revokingCert.user === "object" ? revokingCert.user : undefined;
        return (
          <WorkflowActionModal
            key={`revoke-${revokingCert._id}`}
            open={!!revokingCert}
            onClose={() => setRevokingCert(null)}
            title="Thu hồi chứng chỉ vận hành"
            message={`Thu hồi chứng chỉ vận hành của ${user?.fullName ?? "người này"}? Dùng khi chứng chỉ từng hợp lệ nhưng bị rút giữa chừng (khác "Xoá" — dành cho lỗi nhập liệu).`}
            confirmLabel="Thu hồi"
            danger
            commentRequired
            isLoading={revokeMutation.isPending}
            onConfirm={(reason) =>
              revokeMutation.mutate(
                { id: revokingCert._id, body: { reason: reason ?? "" } },
                { onSuccess: () => setRevokingCert(null) },
              )
            }
          />
        );
      })()}
      {deletingCert && (() => {
        const user = typeof deletingCert.user === "object" ? deletingCert.user : undefined;
        return (
          <ConfirmDialog
            open={!!deletingCert}
            onClose={() => setDeletingCert(null)}
            onConfirm={() => deleteMutation.mutate(deletingCert._id, { onSuccess: () => setDeletingCert(null) })}
            title="Xoá chứng chỉ vận hành"
            message={`Xoá chứng chỉ vận hành của ${user?.fullName ?? "người này"}? CHỈ dùng khi bản ghi này được tạo do nhập nhầm — vẫn giữ lại để tra soát, không xoá vĩnh viễn.`}
            danger
            isLoading={deleteMutation.isPending}
          />
        );
      })()}
    </div>
  );
}
