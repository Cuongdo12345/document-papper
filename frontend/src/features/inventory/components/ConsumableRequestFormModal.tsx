import { useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useConsumableItems } from "@/features/inventory/hooks/useConsumableItems";
import { useCreateConsumableRequest, useUpdateConsumableRequest } from "@/features/inventory/hooks/useConsumableRequestActions";
import { usePermission } from "@/hooks/usePermission";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { PERMISSIONS } from "@/constants/permissions";
import { parseApiError } from "@/utils/parseApiError";
import type { ConsumableRequest } from "@/types/consumable.types";

// `z.number()` (KHÔNG phải `z.coerce.number()`) CHỦ Ý — cùng lý do đã ghi ở
// `documentMeta.ts`: input đã là `number` thật qua `register(..., {
// valueAsNumber: true })`, tránh lệch type input/output của `z.coerce`
// (input=`unknown`) làm `zodResolver` không tương thích generic của RHF.
const itemRowSchema = z.object({
  consumableItem: z.string().min(1, "Chọn vật tư"),
  quantity: z.number().positive("SL phải > 0"),
  unitPrice: z.number().min(0, "Đơn giá không âm"),
});

const schema = z.object({
  department: z.string().min(1, "Vui lòng chọn khoa/phòng"),
  requestMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Vui lòng chọn tháng dự trù"),
  items: z.array(itemRowSchema).min(1, "Cần ít nhất 1 vật tư"),
  note: z.string().trim().optional(),
});
type FormValues = z.infer<typeof schema>;

function departmentIdOf(request: ConsumableRequest): string {
  return typeof request.department === "string" ? request.department : request.department._id;
}

function itemIdOf(item: ConsumableRequest["items"][number]): string {
  return typeof item.consumableItem === "string" ? item.consumableItem : item.consumableItem._id;
}

interface ConsumableRequestFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Có giá trị -> chế độ Sửa (CHỈ khi đang PENDING, `ConsumableRequestsListPage` đã lọc trước khi mở); `undefined` -> chế độ Tạo mới. */
  request?: ConsumableRequest;
}

/**
 * Roadmap B8 (DEV-067, 2026-09-18) — tạo/sửa đề xuất dự trù vật tư. `items`
 * là bảng dòng động (`useFieldArray`), cùng pattern `DocumentMetaFields.tsx`.
 * `department`/`requestMonth` BẤT BIẾN sau khi tạo (khoá field khi Sửa, khớp
 * `UpdateConsumableRequestDTO` backend không nhận 2 field này).
 */
export function ConsumableRequestFormModal({ open, onClose, request }: ConsumableRequestFormModalProps) {
  const isEdit = !!request;
  const { user, hasPermission } = usePermission();
  const isAdmin = useIsAdmin();
  const canBrowseDepartments = isAdmin || hasPermission(PERMISSIONS.DEPARTMENT_VIEW);
  const departmentsQuery = useDepartments({ limit: 100 }, { enabled: canBrowseDepartments && !isEdit });
  const createMutation = useCreateConsumableRequest();
  const updateMutation = useUpdateConsumableRequest();
  const mutation = isEdit ? updateMutation : createMutation;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      department: "",
      requestMonth: "",
      items: [{ consumableItem: "", quantity: 1, unitPrice: 0 }],
      note: "",
    },
  });
  const { register, control, handleSubmit, watch, reset, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const selectedDepartment = watch("department");
  const watchedItems = watch("items");

  useEffect(() => {
    if (!open) return;
    if (isEdit && request) {
      reset({
        department: departmentIdOf(request),
        requestMonth: request.requestMonth,
        items: request.items.map((i) => ({ consumableItem: itemIdOf(i), quantity: i.quantity, unitPrice: i.unitPrice })),
        note: request.note ?? "",
      });
    } else {
      reset({
        department: canBrowseDepartments ? "" : (user?.department?._id ?? ""),
        requestMonth: "",
        items: [{ consumableItem: "", quantity: 1, unitPrice: 0 }],
        note: "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isEdit, request]);

  const itemsQuery = useConsumableItems({
    department: selectedDepartment || undefined,
    isActive: true,
    limit: 100,
  });
  const availableItems = itemsQuery.data?.data ?? [];

  const totalAmount = (watchedItems ?? []).reduce((sum, row) => sum + (row.quantity || 0) * (row.unitPrice || 0), 0);
  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  function onSubmit(values: FormValues) {
    const items = values.items.map((i) => ({
      consumableItem: i.consumableItem,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    }));

    if (isEdit && request) {
      updateMutation.mutate(
        { id: request._id, body: { items, note: values.note || undefined } },
        { onSuccess: () => onClose() },
      );
    } else {
      createMutation.mutate(
        { department: values.department, requestMonth: values.requestMonth, items, note: values.note || undefined },
        { onSuccess: () => onClose() },
      );
    }
  }

  return (
    <AppModal open={open} onClose={onClose} title={isEdit ? "Sửa đề xuất vật tư" : "Đề xuất/dự trù vật tư mới"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="cr-department" className="text-sm font-medium text-foreground">
              Khoa/Phòng
            </label>
            {isEdit || !canBrowseDepartments ? (
              <input
                disabled
                value={isEdit && request ? (typeof request.department === "string" ? "—" : request.department.name) : (user?.department?.name ?? "—")}
                className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
              />
            ) : (
              <select
                id="cr-department"
                aria-invalid={!!formState.errors.department}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("department")}
              >
                <option value="">-- Chọn khoa/phòng --</option>
                {departmentsQuery.data?.data.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            )}
            {formState.errors.department && <p className="text-xs text-destructive">{formState.errors.department.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cr-month" className="text-sm font-medium text-foreground">
              Tháng dự trù
            </label>
            <input
              id="cr-month"
              type="month"
              disabled={isEdit}
              aria-invalid={!!formState.errors.requestMonth}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:bg-muted disabled:text-muted-foreground"
              {...register("requestMonth")}
            />
            {formState.errors.requestMonth && <p className="text-xs text-destructive">{formState.errors.requestMonth.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Vật tư đề xuất</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!selectedDepartment}
              onClick={() => append({ consumableItem: "", quantity: 1, unitPrice: 0 })}
            >
              <Plus /> Thêm dòng
            </Button>
          </div>

          {!selectedDepartment && <p className="text-xs text-muted-foreground">Chọn khoa/phòng trước để chọn vật tư.</p>}

          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-2 rounded-md border border-border p-2">
              <div className="col-span-12 sm:col-span-5">
                <select
                  aria-invalid={!!formState.errors.items?.[index]?.consumableItem}
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register(`items.${index}.consumableItem`)}
                >
                  <option value="">-- Chọn vật tư --</option>
                  {availableItems.map((it) => (
                    <option key={it._id} value={it._id}>
                      {it.name} ({it.unit})
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3 sm:col-span-2">
                <input
                  type="number"
                  min={0.01}
                  step="any"
                  placeholder="SL"
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                />
              </div>
              <div className="col-span-4 sm:col-span-3">
                <input
                  type="number"
                  min={0}
                  placeholder="Đơn giá"
                  className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register(`items.${index}.unitPrice`, { valueAsNumber: true })}
                />
              </div>
              <div className="col-span-4 sm:col-span-1 flex items-center justify-end text-xs text-muted-foreground">
                {((watchedItems?.[index]?.quantity || 0) * (watchedItems?.[index]?.unitPrice || 0)).toLocaleString("vi-VN")}
              </div>
              <div className="col-span-1 flex items-center justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="Xoá dòng"
                  onClick={() => remove(index)}
                  disabled={fields.length <= 1}
                >
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          {formState.errors.items?.message && <p className="text-xs text-destructive">{formState.errors.items.message}</p>}

          <div className="text-right text-sm font-medium text-foreground">
            Tổng dự trù: {totalAmount.toLocaleString("vi-VN")} đ
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cr-note" className="text-sm font-medium text-foreground">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            id="cr-note"
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("note")}
          />
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
            {isEdit ? "Lưu thay đổi" : "Ghi nhận đề xuất"}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
