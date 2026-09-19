import { useState } from "react";
import { Pencil, KeyRound } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ProfileEditModal } from "@/features/profile/components/ProfileEditModal";
import { ChangePasswordModal } from "@/features/profile/components/ChangePasswordModal";
import { TwoFactorSection } from "@/features/profile/components/TwoFactorSection";
import { SessionsSection } from "@/features/profile/components/SessionsSection";
import { useUpdateProfile } from "@/features/profile/hooks/useUpdateProfile";
import { toast } from "@/stores/toastStore";
import { parseApiError } from "@/utils/parseApiError";

/**
 * [MỚI 2026-09-18, Roadmap B7] Đúng 2 role user chỉ định trong mô tả gốc —
 * KHÔNG tự ý thêm DIEU_DUONG_TRUONG dù cùng permission set với TRUONG_KHOA
 * (khớp `WEEKLY_REPORT_ROLE_NAMES` phía backend, `weeklyReport.service.ts`).
 */
const WEEKLY_REPORT_ROLES = ["BAN_GIAM_DOC", "TRUONG_KHOA"];

/**
 * [MỚI 2026-09-19, Roadmap C1] Khớp `TWO_FACTOR_ELIGIBLE_ROLE_NAMES` phía
 * backend (`auths.service.ts`) — ADMIN + 3 role duyệt cấp cao, KHÁC
 * `WEEKLY_REPORT_ROLES` ở trên (danh sách role riêng cho từng tính năng).
 */
const TWO_FACTOR_ELIGIBLE_ROLES = ["ADMIN", "TRUONG_KHOA", "DIEU_DUONG_TRUONG", "BAN_GIAM_DOC"];

const SECTION_CLASS = "space-y-3 rounded-lg border border-border bg-card p-4";

/**
 * Profile UI (roadmap Mục 19, FE-14) — reach qua avatar menu ở `Header.tsx`
 * (KHÔNG thêm mục sidebar riêng — khác quyết định đã sửa ở Notifications:
 * đây thuần "thông tin CỦA CHÍNH MÌNH", không có phần quản trị nào bên
 * trong, đúng convention avatar-menu chuẩn của app, không phải 1 domain
 * điều hướng chính).
 *
 * Roadmap: "user information" + "role/permission context phù hợp" + "update
 * profile" + "change password". CHỦ Ý KHÔNG dump danh sách permission kỹ
 * thuật (roadmap: "Không hiển thị permission technical detail nếu không
 * phục vụ UX") — chỉ hiện badge vai trò/phòng ban, giống cách `Header.tsx`
 * đã hiển thị ở dropdown.
 */
export function ProfilePage() {
  const { data: user, isLoading, isError, refetch } = useCurrentUser();
  const [editOpen, setEditOpen] = useState(false);
  const [pwdOpen, setPwdOpen] = useState(false);
  const updateProfile = useUpdateProfile();

  if (isLoading) return <LoadingState label="Đang tải thông tin cá nhân..." />;
  if (isError || !user) {
    return <ErrorState message="Không tải được thông tin cá nhân" onRetry={() => refetch()} />;
  }

  const canSubscribeWeeklyReport = WEEKLY_REPORT_ROLES.includes(user.role.name);
  const canUseTwoFactor = TWO_FACTOR_ELIGIBLE_ROLES.includes(user.role.name);

  function handleToggleWeeklyReport(checked: boolean) {
    updateProfile.mutate(
      { subscribedToWeeklyReport: checked },
      {
        onSuccess: () => toast.success(checked ? "Đã bật nhận báo cáo tuần" : "Đã tắt nhận báo cáo tuần"),
        onError: (err) => toast.error(parseApiError(err).message),
      },
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Hồ sơ cá nhân" description="Thông tin tài khoản, vai trò và bảo mật đăng nhập của bạn." />

      <div className={SECTION_CLASS}>
        <div className="flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant="primary">{user.role.name}</StatusBadge>
            {user.role.isSystemRole && <StatusBadge variant="info">System Role</StatusBadge>}
            {user.department && <StatusBadge variant="default">{user.department.name}</StatusBadge>}
          </div>
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil /> Sửa thông tin
          </Button>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">Họ tên</dt>
            <dd className="text-foreground">{user.fullName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Tên đăng nhập</dt>
            <dd className="text-foreground">{user.username}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="text-foreground">{user.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Khoa/Phòng</dt>
            <dd className="text-foreground">{user.department?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Ngày tạo tài khoản</dt>
            <dd className="text-foreground">{user.createdAt ? new Date(user.createdAt).toLocaleDateString("vi-VN") : "—"}</dd>
          </div>
        </dl>
      </div>

      <div className={SECTION_CLASS}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Mật khẩu</h2>
            <p className="text-xs text-muted-foreground">Đổi mật khẩu định kỳ để bảo vệ tài khoản của bạn.</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setPwdOpen(true)}>
            <KeyRound /> Đổi mật khẩu
          </Button>
        </div>
      </div>

      <SessionsSection />

      {canUseTwoFactor && <TwoFactorSection user={user} />}

      {canSubscribeWeeklyReport && (
        <div className={SECTION_CLASS}>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Báo cáo tuần</h2>
            <p className="text-xs text-muted-foreground">
              Nhận email tóm tắt số liệu {user.role.name === "BAN_GIAM_DOC" ? "toàn viện" : "khoa/phòng của bạn"} vào
              sáng thứ Hai hàng tuần, thay vì phải chủ động vào Dashboard xem.
            </p>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={user.subscribedToWeeklyReport ?? false}
              disabled={updateProfile.isPending}
              onChange={(e) => handleToggleWeeklyReport(e.target.checked)}
            />
            Nhận báo cáo tuần qua email
          </label>
          {!user.email && (
            <p className="mt-2 rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
              Tài khoản của bạn chưa có email — liên hệ IT/Quản trị hệ thống để được bổ sung trước khi bật tính năng
              này (hiện chưa có màn hình tự cập nhật email).
            </p>
          )}
        </div>
      )}

      <ProfileEditModal key={user._id} open={editOpen} onClose={() => setEditOpen(false)} user={user} />
      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </div>
  );
}
