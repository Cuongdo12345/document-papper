import { useState } from "react";
import { AppModal } from "@/components/shared/AppModal";
import { Avatar } from "@/components/shared/Avatar";
import { FileUpload } from "@/components/shared/FileUpload";
import { Button } from "@/components/ui/button";
import { useUserDetail } from "@/features/users/hooks/useUserDetail";
import { useUpdateUserAvatar, useDeleteUserAvatar } from "@/features/users/hooks/useUserAvatarActions";
import { fileToDataUrl } from "@/utils/fileToDataUrl";
import { parseApiError } from "@/utils/parseApiError";
import type { UserListItem } from "@/types/user.types";

/** Khớp `AVATAR_ALLOWED_MIME`/`AVATAR_MAX_BYTES` (backend `users.dto.ts`). */
const MAX_SIZE_BYTES = 300 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

interface UserAvatarModalProps {
  open: boolean;
  onClose: () => void;
  user: UserListItem | null;
}

/**
 * [MỚI DEV-079] ADMIN sửa/xoá avatar hộ user khác (permission USER_UPDATE).
 * `user` truyền vào là dòng từ `GET /users` (KHÔNG có field `avatar` — list
 * cố tình loại trừ, xem `user.types.ts`) — modal tự fetch chi tiết qua
 * `useUserDetail` để có avatar hiện tại. `key={user._id}` ở nơi gọi
 * (`UsersListPage`) ép remount khi đổi target, cùng pattern
 * `ResetPasswordModal.tsx`.
 */
export function UserAvatarModal({ open, onClose, user }: UserAvatarModalProps) {
  if (!user) return null;
  return <UserAvatarModalContent key={user._id} open={open} onClose={onClose} user={user} />;
}

function UserAvatarModalContent({ open, onClose, user }: { open: boolean; onClose: () => void; user: UserListItem }) {
  const detailQuery = useUserDetail(user._id, open);
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const updateMutation = useUpdateUserAvatar();
  const deleteMutation = useDeleteUserAvatar();

  const currentAvatar = detailQuery.data?.avatar;
  const apiError = updateMutation.error
    ? parseApiError(updateMutation.error)
    : deleteMutation.error
      ? parseApiError(deleteMutation.error)
      : null;

  async function handleFilesChange(nextFiles: File[]) {
    setFiles(nextFiles);
    const file = nextFiles[0];
    if (!file) {
      setPreview(null);
      return;
    }
    setConverting(true);
    try {
      setPreview(await fileToDataUrl(file));
    } finally {
      setConverting(false);
    }
  }

  function reset() {
    setFiles([]);
    setPreview(null);
  }

  return (
    <AppModal open={open} onClose={onClose} title={`Ảnh đại diện — ${user.fullName}`} size="sm">
      <div className="space-y-4">
        <div className="flex justify-center">
          {detailQuery.isLoading ? (
            <div className="flex size-20 items-center justify-center text-sm text-muted-foreground">Đang tải...</div>
          ) : (
            <Avatar avatar={preview ?? currentAvatar} fullName={user.fullName} size="lg" />
          )}
        </div>

        <FileUpload
          accept={ACCEPT}
          allowedExtensions={[".jpg", ".jpeg", ".png", ".webp"]}
          maxSizeBytes={MAX_SIZE_BYTES}
          value={files}
          onChange={handleFilesChange}
          disabled={detailQuery.isLoading}
          helperText={`JPEG/PNG/WebP, tối đa ${Math.round(MAX_SIZE_BYTES / 1024)}KB`}
        />

        {apiError && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          {currentAvatar && !preview && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              loading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(user._id, { onSuccess: () => { reset(); onClose(); } })}
            >
              Xoá ảnh hiện tại
            </Button>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={updateMutation.isPending}>
            Huỷ
          </Button>
          <Button
            type="button"
            size="sm"
            loading={updateMutation.isPending || converting}
            disabled={!preview}
            onClick={() =>
              preview &&
              updateMutation.mutate(
                { id: user._id, body: { avatar: preview } },
                { onSuccess: () => { reset(); onClose(); } },
              )
            }
          >
            Lưu
          </Button>
        </div>
      </div>
    </AppModal>
  );
}
