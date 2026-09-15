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

  if (isLoading) return <LoadingState label="Đang tải thông tin cá nhân..." />;
  if (isError || !user) {
    return <ErrorState message="Không tải được thông tin cá nhân" onRetry={() => refetch()} />;
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

      <ProfileEditModal key={user._id} open={editOpen} onClose={() => setEditOpen(false)} user={user} />
      <ChangePasswordModal open={pwdOpen} onClose={() => setPwdOpen(false)} />
    </div>
  );
}
