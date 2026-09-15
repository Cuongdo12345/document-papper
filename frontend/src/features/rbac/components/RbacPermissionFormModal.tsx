import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useCreateRbacPermission, useUpdateRbacPermission } from "@/features/rbac/hooks/useRbacPermissionActions";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import type { RbacPermission } from "@/types/rbac.types";

/** Khớp `CreatePermissionDTO`/`UpdatePermissionDTO`. */
const permissionSchema = z.object({
  name: z.string().trim().min(1, "Tên permission không được để trống").max(100),
  resource: z.string().trim().min(1, "Resource không được để trống").max(100),
  action: z.string().trim().min(1, "Action không được để trống").max(100),
  description: z.string().trim().max(500).optional(),
});

type PermissionFormValues = z.infer<typeof permissionSchema>;

interface RbacPermissionFormModalProps {
  open: boolean;
  onClose: () => void;
  permission?: RbacPermission;
}

export function RbacPermissionFormModal({ open, onClose, permission }: RbacPermissionFormModalProps) {
  const isEdit = !!permission;
  const createMutation = useCreateRbacPermission();
  const updateMutation = useUpdateRbacPermission();
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PermissionFormValues>({ resolver: zodResolver(permissionSchema) });

  useEffect(() => {
    if (open) {
      reset({
        name: permission?.name ?? "",
        resource: permission?.resource ?? "",
        action: permission?.action ?? "",
        description: permission?.description ?? "",
      });
    }
  }, [open, permission, reset]);

  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  function onSubmit(values: PermissionFormValues) {
    const body = { ...values, description: values.description || undefined };
    if (isEdit) {
      updateMutation.mutate(
        { id: permission._id, body },
        {
          onSuccess: () => {
            toast.success("Đã cập nhật permission");
            onClose();
          },
        },
      );
    } else {
      createMutation.mutate(body, {
        onSuccess: () => {
          toast.success("Đã tạo permission mới");
          onClose();
        },
      });
    }
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Sửa permission" : "Tạo permission"}
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" form="permission-form" size="sm" loading={mutation.isPending}>
            {isEdit ? "Lưu thay đổi" : "Tạo mới"}
          </Button>
        </>
      }
    >
      <form id="permission-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="perm-name" className="text-sm font-medium text-foreground">
            Tên permission
          </label>
          <input
            id="perm-name"
            autoFocus
            placeholder="VD: DOCUMENT_VIEW"
            aria-invalid={!!errors.name}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("name")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="perm-resource" className="text-sm font-medium text-foreground">
              Resource
            </label>
            <input
              id="perm-resource"
              placeholder="VD: DOCUMENT"
              aria-invalid={!!errors.resource}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("resource")}
            />
            {errors.resource && <p className="text-xs text-destructive">{errors.resource.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="perm-action" className="text-sm font-medium text-foreground">
              Action
            </label>
            <input
              id="perm-action"
              placeholder="VD: VIEW"
              aria-invalid={!!errors.action}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("action")}
            />
            {errors.action && <p className="text-xs text-destructive">{errors.action.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="perm-description" className="text-sm font-medium text-foreground">
            Mô tả (tuỳ chọn)
          </label>
          <input
            id="perm-description"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("description")}
          />
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
