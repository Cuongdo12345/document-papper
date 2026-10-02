import { useState } from "react";
import { AppModal } from "@/components/shared/AppModal";
import { Avatar } from "@/components/shared/Avatar";
import { FileUpload } from "@/components/shared/FileUpload";
import { Button } from "@/components/ui/button";
import { useUpdateMyAvatar, useDeleteMyAvatar } from "@/features/profile/hooks/useAvatarActions";
import { fileToDataUrl } from "@/utils/fileToDataUrl";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";

/** Khớp `AVATAR_ALLOWED_MIME`/`AVATAR_MAX_BYTES` (backend `users.dto.ts`). */
const MAX_SIZE_BYTES = 300 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp";

interface AvatarModalProps {
  open: boolean;
  onClose: () => void;
  currentAvatar?: string;
  fullName: string;
}

/**
 * [MỚI DEV-079] Đổi/xoá ảnh đại diện — self-service, mở từ `ProfilePage`.
 * Mirror độ đơn giản của `ChangePasswordModal.tsx` (state cục bộ, không cần
 * react-hook-form cho 1 field file). Tái sử dụng `FileUpload` (đã có sẵn,
 * validate size/type) — KHÔNG viết lại input file thủ công.
 */
export function AvatarModal({ open, onClose, currentAvatar, fullName }: AvatarModalProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const updateMutation = useUpdateMyAvatar();
  const deleteMutation = useDeleteMyAvatar();

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

  function handleClose() {
    setFiles([]);
    setPreview(null);
    onClose();
  }

  return (
    <AppModal open={open} onClose={handleClose} title="Ảnh đại diện" size="sm">
      <div className="space-y-4">
        <div className="flex justify-center">
          <Avatar avatar={preview ?? currentAvatar} fullName={fullName} size="lg" />
        </div>

        <FileUpload
          accept={ACCEPT}
          allowedExtensions={[".jpg", ".jpeg", ".png", ".webp"]}
          maxSizeBytes={MAX_SIZE_BYTES}
          value={files}
          onChange={handleFilesChange}
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
              onClick={() =>
                deleteMutation.mutate(undefined, {
                  onSuccess: () => {
                    toast.success("Đã xoá ảnh đại diện");
                    handleClose();
                  },
                })
              }
            >
              Xoá ảnh hiện tại
            </Button>
          )}
          <Button type="button" variant="secondary" size="sm" onClick={handleClose} disabled={updateMutation.isPending}>
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
                { avatar: preview },
                {
                  onSuccess: () => {
                    toast.success("Đã cập nhật ảnh đại diện");
                    handleClose();
                  },
                },
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
