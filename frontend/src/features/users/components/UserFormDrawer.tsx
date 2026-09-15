import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppDrawer } from "@/components/shared/AppDrawer";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";
import { useCreateUser } from "@/features/users/hooks/useCreateUser";
import { useUpdateUser } from "@/features/users/hooks/useUpdateUser";
import { useAssignableRoles } from "@/features/rbac/hooks/useRoles";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import type { UserListItem } from "@/types/user.types";

/** Khớp `CreateUserDTO`. */
const createUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(5, "Tên đăng nhập tối thiểu 5 ký tự")
    .regex(/^[a-zA-Z0-9_]+$/, "Tên đăng nhập chỉ chứa chữ, số, _"),
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự"),
  fullName: z.string().trim().min(1, "Họ tên không được để trống"),
  role: z.string().min(1, "Vui lòng chọn vai trò"),
  department: z.string().optional(),
});

/** Khớp `UpdateUserDTO` — KHÔNG có `password` (đổi mật khẩu là action riêng ở bảng) và KHÔNG có `isActive`
 * (kích hoạt/vô hiệu hoá dùng đúng endpoint riêng `disable`/`restore` — có business rule an toàn riêng,
 * generic update KHÔNG được phép bypass các rule đó). */
const editUserSchema = z.object({
  username: z
    .string()
    .trim()
    .min(5, "Tên đăng nhập tối thiểu 5 ký tự")
    .regex(/^[a-zA-Z0-9_]+$/, "Tên đăng nhập chỉ chứa chữ, số, _"),
  fullName: z.string().trim().min(1, "Họ tên không được để trống"),
  role: z.string().min(1, "Vui lòng chọn vai trò"),
  department: z.string().optional(),
});

type CreateFormValues = z.infer<typeof createUserSchema>;
type EditFormValues = z.infer<typeof editUserSchema>;

interface UserFormDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Có giá trị -> chế độ Sửa; `undefined` -> chế độ Tạo mới. */
  user?: UserListItem;
}

export function UserFormDrawer({ open, onClose, user }: UserFormDrawerProps) {
  const isEdit = !!user;
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const mutation = isEdit ? updateMutation : createMutation;

  const rolesQuery = useAssignableRoles();
  const departmentsQuery = useDepartments({ limit: 100 });
  const isReferenceDataLoading = rolesQuery.isLoading || departmentsQuery.isLoading;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues | EditFormValues>({
    resolver: zodResolver(isEdit ? editUserSchema : createUserSchema),
  });

  // Reset form khi drawer mở lại — tạo mới: rỗng; sửa: prefill đúng user đang mở
  // (role/department của user list là ObjectId thô/object đã populate — xem
  // `types/user.types.ts`).
  useEffect(() => {
    if (open) {
      reset({
        username: user?.username ?? "",
        fullName: user?.fullName ?? "",
        role: user?.role ?? "",
        department: user?.department?._id ?? "",
        ...(isEdit ? {} : { password: "" }),
      } as CreateFormValues | EditFormValues);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  function onSubmit(values: CreateFormValues | EditFormValues) {
    const department = values.department || undefined;

    if (isEdit) {
      updateMutation.mutate(
        { id: user._id, body: { ...values, department } },
        {
          onSuccess: () => {
            toast.success("Đã cập nhật user");
            onClose();
          },
        },
      );
    } else {
      createMutation.mutate(
        { ...(values as CreateFormValues), department },
        {
          onSuccess: () => {
            toast.success("Đã tạo user mới");
            onClose();
          },
        },
      );
    }
  }

  return (
    <AppDrawer open={open} onClose={onClose} title={isEdit ? "Sửa user" : "Tạo user mới"} width="sm">
      {isReferenceDataLoading ? (
        <LoadingState label="Đang tải dữ liệu tham chiếu..." />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="user-username" className="text-sm font-medium text-foreground">
              Tên đăng nhập
            </label>
            <input
              id="user-username"
              autoFocus
              autoComplete="off"
              aria-invalid={!!errors.username}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("username")}
            />
            {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <label htmlFor="user-password" className="text-sm font-medium text-foreground">
                Mật khẩu
              </label>
              <input
                id="user-password"
                type="password"
                autoComplete="new-password"
                aria-invalid={!!("password" in errors && errors.password)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("password" as keyof CreateFormValues)}
              />
              {"password" in errors && errors.password && (
                <p className="text-xs text-destructive">{errors.password.message as string}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="user-fullName" className="text-sm font-medium text-foreground">
              Họ tên
            </label>
            <input
              id="user-fullName"
              aria-invalid={!!errors.fullName}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("fullName")}
            />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="user-role" className="text-sm font-medium text-foreground">
              Vai trò
            </label>
            <select
              id="user-role"
              aria-invalid={!!errors.role}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("role")}
            >
              <option value="">-- Chọn vai trò --</option>
              {rolesQuery.data?.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.name}
                </option>
              ))}
            </select>
            {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="user-department" className="text-sm font-medium text-foreground">
              Khoa/Phòng
            </label>
            <select
              id="user-department"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("department")}
            >
              <option value="">-- Không thuộc khoa/phòng --</option>
              {departmentsQuery.data?.data.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">Bắt buộc nếu vai trò là "USER" (backend tự kiểm tra).</p>
          </div>

          {apiError && (
            <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {apiError.message}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
              Huỷ
            </Button>
            <Button type="submit" size="sm" loading={mutation.isPending}>
              {isEdit ? "Lưu thay đổi" : "Tạo mới"}
            </Button>
          </div>
        </form>
      )}
    </AppDrawer>
  );
}
