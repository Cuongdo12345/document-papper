import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useBroadcastNotification } from "@/features/notifications/hooks/useBroadcastNotification";
import { useRoles } from "@/features/rbac/hooks/useRoles";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useUsers } from "@/features/users/hooks/useUsers";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import type { NotificationBroadcastScope } from "@/types/notification.types";

/** Khớp `BroadcastNotificationDTO` — `superRefine` phía backend validate field bắt buộc theo `scope`, ở đây chỉ validate field chung, field theo scope tự check ở `onSubmit` (đơn giản hơn tái tạo discriminated union Zod chỉ cho 1 form nhỏ). */
const broadcastSchema = z.object({
  title: z.string().trim().min(1, "Tiêu đề không được để trống").max(200),
  message: z.string().trim().min(1, "Nội dung không được để trống").max(2000),
  priority: z.enum(["low", "normal", "high"]).optional(),
  sendEmail: z.boolean().optional(),
  scope: z.enum(["ALL", "ROLE", "DEPARTMENT", "USERS"]),
  roleName: z.string().optional(),
  departmentId: z.string().optional(),
  userIds: z.array(z.string()).optional(),
});

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

const SCOPE_LABEL: Record<NotificationBroadcastScope, string> = {
  ALL: "Tất cả người dùng",
  ROLE: "Theo vai trò",
  DEPARTMENT: "Theo khoa/phòng",
  USERS: "Người dùng cụ thể",
};

interface BroadcastNotificationModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Form soạn + gửi thông báo hệ thống (roadmap Mục 18 mở rộng — quản trị
 * Notification cho ADMIN, xem `docs/frontend/tasks/FE-13.md`). `scope`
 * quyết định field nào hiện thêm — validate field-theo-scope thủ công ở
 * `onSubmit` (form nhỏ, không cần dựng discriminated union Zod phức tạp).
 */
export function BroadcastNotificationModal({ open, onClose }: BroadcastNotificationModalProps) {
  const mutation = useBroadcastNotification();
  const [scopeError, setScopeError] = useState<string | null>(null);

  const rolesQuery = useRoles();
  const departmentsQuery = useDepartments({ limit: 100 }, { enabled: open });
  const usersQuery = useUsers({ limit: 100 }, { enabled: open });

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: { scope: "ALL", priority: "normal", sendEmail: false },
  });

  // `useWatch` (không phải `watch()` gọi trực tiếp lúc render) — tránh cảnh
  // báo oxlint react/incompatible-library, cùng pattern `DocumentCreatePage.tsx`.
  const scope = useWatch({ control, name: "scope" });

  useEffect(() => {
    // `scopeError` KHÔNG tự clear ở đây (tránh oxlint react/set-state-in-effect)
    // — cùng đặc điểm `apiError` ở `AssetCategoryFormModal`/`RbacPermissionFormModal`
    // (đọc thẳng từ `mutation.error`, cũng không tự clear khi mở lại modal),
    // tự hết khi user submit lại (`onSubmit` luôn `setScopeError(null)` trước).
    if (open) {
      reset({ scope: "ALL", priority: "normal", sendEmail: false, title: "", message: "" });
    }
  }, [open, reset]);

  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  function onSubmit(values: BroadcastFormValues) {
    setScopeError(null);

    if (values.scope === "ROLE" && !values.roleName) {
      setScopeError("Vui lòng chọn vai trò.");
      return;
    }
    if (values.scope === "DEPARTMENT" && !values.departmentId) {
      setScopeError("Vui lòng chọn khoa/phòng.");
      return;
    }
    if (values.scope === "USERS" && (!values.userIds || values.userIds.length === 0)) {
      setScopeError("Vui lòng chọn ít nhất 1 người dùng.");
      return;
    }

    mutation.mutate(
      {
        title: values.title,
        message: values.message,
        priority: values.priority,
        sendEmail: values.sendEmail,
        scope: values.scope,
        roleName: values.scope === "ROLE" ? values.roleName : undefined,
        departmentId: values.scope === "DEPARTMENT" ? values.departmentId : undefined,
        userIds: values.scope === "USERS" ? values.userIds : undefined,
      },
      {
        onSuccess: (response) => {
          toast.success(`Đã gửi thông báo tới ${response.data.data.recipientCount} người dùng`);
          onClose();
        },
      },
    );
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Gửi thông báo hệ thống"
      size="lg"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" form="broadcast-notification-form" size="sm" loading={mutation.isPending}>
            Gửi thông báo
          </Button>
        </>
      }
    >
      <form id="broadcast-notification-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="bc-title" className="text-sm font-medium text-foreground">
            Tiêu đề
          </label>
          <input
            id="bc-title"
            autoFocus
            aria-invalid={!!errors.title}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("title")}
          />
          {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bc-message" className="text-sm font-medium text-foreground">
            Nội dung
          </label>
          <textarea
            id="bc-message"
            rows={4}
            aria-invalid={!!errors.message}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("message")}
          />
          {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="bc-priority" className="text-sm font-medium text-foreground">
              Mức độ ưu tiên
            </label>
            <select
              id="bc-priority"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("priority")}
            >
              <option value="low">Thấp</option>
              <option value="normal">Bình thường</option>
              <option value="high">Cao</option>
            </select>
          </div>

          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" className="size-4 rounded border-input" {...register("sendEmail")} />
              Gửi kèm email
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="bc-scope" className="text-sm font-medium text-foreground">
            Gửi tới
          </label>
          <select
            id="bc-scope"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("scope")}
          >
            {(Object.keys(SCOPE_LABEL) as NotificationBroadcastScope[]).map((s) => (
              <option key={s} value={s}>
                {SCOPE_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        {scope === "ROLE" && (
          <div className="space-y-1.5">
            <label htmlFor="bc-role" className="text-sm font-medium text-foreground">
              Vai trò
            </label>
            <select
              id="bc-role"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("roleName")}
            >
              <option value="">Chọn vai trò...</option>
              {rolesQuery.data?.map((r) => (
                <option key={r._id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {scope === "DEPARTMENT" && (
          <div className="space-y-1.5">
            <label htmlFor="bc-department" className="text-sm font-medium text-foreground">
              Khoa/Phòng
            </label>
            <select
              id="bc-department"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("departmentId")}
            >
              <option value="">Chọn khoa/phòng...</option>
              {departmentsQuery.data?.data.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {scope === "USERS" && (
          <div className="space-y-1.5">
            <label htmlFor="bc-users" className="text-sm font-medium text-foreground">
              Người dùng (giữ Ctrl/Cmd để chọn nhiều)
            </label>
            <select
              id="bc-users"
              multiple
              size={6}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("userIds")}
            >
              {usersQuery.data?.data.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.fullName} ({u.username})
                </option>
              ))}
            </select>
          </div>
        )}

        {scopeError && <p className="text-xs text-destructive">{scopeError}</p>}

        {apiError && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.message}
          </p>
        )}
      </form>
    </AppModal>
  );
}
