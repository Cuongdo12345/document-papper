import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useCreateRole, useUpdateRole } from "@/features/rbac/hooks/useRoleActions";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import type { Role } from "@/types/rbac.types";

/** Khớp `CreateRoleDTO`/`UpdateRoleDTO` — CỐ TÌNH chỉ có `name` (đổi `permissions` phải qua permission matrix riêng, xem `RolePermissionMatrix`). */
const roleSchema = z.object({
  name: z.string().trim().min(1, "Tên role không được để trống").max(100),
});

type RoleFormValues = z.infer<typeof roleSchema>;

interface RoleFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Có giá trị -> chế độ Sửa; `undefined` -> chế độ Tạo mới. */
  role?: Role;
}

export function RoleFormModal({ open, onClose, role }: RoleFormModalProps) {
  const isEdit = !!role;
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RoleFormValues>({ resolver: zodResolver(roleSchema) });

  useEffect(() => {
    if (open) reset({ name: role?.name ?? "" });
  }, [open, role, reset]);

  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  function onSubmit(values: RoleFormValues) {
    if (isEdit) {
      updateMutation.mutate(
        { id: role._id, body: values },
        {
          onSuccess: () => {
            toast.success("Đã cập nhật role");
            onClose();
          },
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success("Đã tạo role mới");
          onClose();
        },
      });
    }
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Sửa role" : "Tạo role"}
      description={isEdit ? "Gán/gỡ quyền cho role này ở trang chi tiết, không phải form này." : undefined}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" form="role-form" size="sm" loading={mutation.isPending}>
            {isEdit ? "Lưu thay đổi" : "Tạo mới"}
          </Button>
        </>
      }
    >
      <form id="role-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="role-name" className="text-sm font-medium text-foreground">
            Tên role
          </label>
          <input
            id="role-name"
            autoFocus
            aria-invalid={!!errors.name}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("name")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        {apiError && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.message}
          </p>
        )}
      </form>
    </AppModal>
  );
}
