import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useUpdateProfile } from "@/features/profile/hooks/useUpdateProfile";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import type { CurrentUser } from "@/types/auth.types";

/**
 * Khớp allowlist THẬT của `updateMeService()` (`users.service.ts`) — CHỈ
 * `fullName`/`username`. KHÔNG có field role/department/isActive/email (đổi
 * qua kênh khác hoặc chưa hỗ trợ tự đổi — xem `UpdateMeRequest` comment gốc).
 */
const editProfileSchema = z.object({
  fullName: z.string().trim().min(1, "Họ tên không được để trống"),
  username: z
    .string()
    .trim()
    .min(5, "Tên đăng nhập tối thiểu 5 ký tự")
    .regex(/^[a-zA-Z0-9_]+$/, "Tên đăng nhập chỉ chứa chữ, số, _"),
});

type EditProfileFormValues = z.infer<typeof editProfileSchema>;

interface ProfileEditModalProps {
  open: boolean;
  onClose: () => void;
  user: CurrentUser;
}

/** `key={user._id}` ở nơi gọi đảm bảo remount đúng giá trị khi user đổi (cùng pattern `AssetEditModal`). */
export function ProfileEditModal({ open, onClose, user }: ProfileEditModalProps) {
  const updateMutation = useUpdateProfile();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: { fullName: user.fullName, username: user.username },
  });

  const apiError = updateMutation.error ? parseApiError(updateMutation.error) : null;

  function onSubmit(values: EditProfileFormValues) {
    updateMutation.mutate(values, {
      onSuccess: () => {
        toast.success("Đã cập nhật thông tin cá nhân");
        onClose();
      },
    });
  }

  return (
    <AppModal open={open} onClose={onClose} title="Sửa thông tin cá nhân" size="sm">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="profile-fullName" className="text-sm font-medium text-foreground">
            Họ tên
          </label>
          <input
            id="profile-fullName"
            autoFocus
            aria-invalid={!!errors.fullName}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("fullName")}
          />
          {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="profile-username" className="text-sm font-medium text-foreground">
            Tên đăng nhập
          </label>
          <input
            id="profile-username"
            aria-invalid={!!errors.username}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("username")}
          />
          {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
        </div>

        {apiError && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={updateMutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" size="sm" loading={updateMutation.isPending}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
