import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useCreateDepartment } from "@/features/departments/hooks/useCreateDepartment";
import { useUpdateDepartment } from "@/features/departments/hooks/useUpdateDepartment";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import type { Department } from "@/types/department.types";

/** Khớp `CreateDepartmentDTO`/`UpdateDepartmentDTO` — CHỈ `name`+`code` (department.model.ts không có field nào khác). */
const departmentSchema = z.object({
  name: z.string().trim().min(1, "Tên phòng ban không được để trống"),
  code: z.string().trim().min(1, "Mã phòng ban không được để trống"),
});

type DepartmentFormValues = z.infer<typeof departmentSchema>;

interface DepartmentFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Có giá trị -> chế độ Sửa; `undefined` -> chế độ Tạo mới. */
  department?: Department;
}

export function DepartmentFormModal({ open, onClose, department }: DepartmentFormModalProps) {
  const isEdit = !!department;
  const createMutation = useCreateDepartment();
  const updateMutation = useUpdateDepartment();
  const mutation = isEdit ? updateMutation : createMutation;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DepartmentFormValues>({ resolver: zodResolver(departmentSchema) });

  // Reset form mỗi khi modal mở lại (tạo mới -> rỗng, sửa -> prefill đúng bản ghi đang mở).
  useEffect(() => {
    if (open) {
      reset({ name: department?.name ?? "", code: department?.code ?? "" });
    }
  }, [open, department, reset]);

  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  function onSubmit(values: DepartmentFormValues) {
    if (isEdit) {
      updateMutation.mutate(
        { id: department._id, body: values },
        {
          onSuccess: () => {
            toast.success("Đã cập nhật khoa/phòng");
            onClose();
          },
        },
      );
    } else {
      createMutation.mutate(values, {
        onSuccess: () => {
          toast.success("Đã tạo khoa/phòng mới");
          onClose();
        },
      });
    }
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Sửa khoa/phòng" : "Tạo khoa/phòng"}
      size="sm"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" form="department-form" size="sm" loading={mutation.isPending}>
            {isEdit ? "Lưu thay đổi" : "Tạo mới"}
          </Button>
        </>
      }
    >
      <form id="department-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="dept-name" className="text-sm font-medium text-foreground">
            Tên phòng ban
          </label>
          <input
            id="dept-name"
            autoFocus
            aria-invalid={!!errors.name}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("name")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="dept-code" className="text-sm font-medium text-foreground">
            Mã phòng ban
          </label>
          <input
            id="dept-code"
            aria-invalid={!!errors.code}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("code")}
          />
          {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
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
