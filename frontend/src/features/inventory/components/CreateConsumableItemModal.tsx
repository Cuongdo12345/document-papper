import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { useConsumableCategories } from "@/features/inventory/hooks/useConsumableCategories";
import { useCreateConsumableItem } from "@/features/inventory/hooks/useConsumableActions";
import { usePermission } from "@/hooks/usePermission";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { PERMISSIONS } from "@/constants/permissions";
import { parseApiError } from "@/utils/parseApiError";

const schema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên vật tư"),
  unit: z.string().trim().min(1, "Vui lòng nhập đơn vị tính"),
  category: z.string().trim().optional(),
  department: z.string().min(1, "Vui lòng chọn khoa/phòng"),
  minStockThreshold: z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Ngưỡng cảnh báo phải là số không âm"),
  initialQuantity: z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Tồn kho ban đầu phải là số không âm"),
});
type FormValues = z.infer<typeof schema>;

interface CreateConsumableItemModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Roadmap B3 — tạo vật tư mới. Cùng lý do `AssetCreatePage`: role
 * `PHONG_VAT_TU_TTB` có `CONSUMABLE_CREATE` NHƯNG KHÔNG có `DEPARTMENT_VIEW`
 * (`rolePermission.map.ts`) — khoá field về đúng khoa của người tạo thay vì
 * nới RBAC.
 */
export function CreateConsumableItemModal({ open, onClose }: CreateConsumableItemModalProps) {
  const { user, hasPermission } = usePermission();
  const isAdmin = useIsAdmin();
  const canBrowseDepartments = isAdmin || hasPermission(PERMISSIONS.DEPARTMENT_VIEW);
  const departmentsQuery = useDepartments({ limit: 100 }, { enabled: canBrowseDepartments });
  const categoriesQuery = useConsumableCategories({ limit: 100 });
  const createMutation = useCreateConsumableItem();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      unit: "",
      category: "",
      department: canBrowseDepartments ? "" : (user?.department?._id ?? ""),
      minStockThreshold: "0",
      initialQuantity: "0",
    },
  });
  const { register, handleSubmit, formState } = form;
  const apiError = createMutation.error ? parseApiError(createMutation.error) : null;

  function onSubmit(values: FormValues) {
    createMutation.mutate(
      {
        name: values.name,
        unit: values.unit,
        category: values.category || undefined,
        department: values.department,
        minStockThreshold: values.minStockThreshold ? Number(values.minStockThreshold) : undefined,
        initialQuantity: values.initialQuantity ? Number(values.initialQuantity) : undefined,
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title="Tạo vật tư mới">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="ci-name" className="text-sm font-medium text-foreground">
            Tên vật tư
          </label>
          <input
            id="ci-name"
            autoFocus
            placeholder="VD: Khẩu trang y tế"
            aria-invalid={!!formState.errors.name}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("name")}
          />
          {formState.errors.name && <p className="text-xs text-destructive">{formState.errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="ci-unit" className="text-sm font-medium text-foreground">
              Đơn vị tính
            </label>
            <input
              id="ci-unit"
              placeholder="cái, hộp, gói..."
              aria-invalid={!!formState.errors.unit}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("unit")}
            />
            {formState.errors.unit && <p className="text-xs text-destructive">{formState.errors.unit.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ci-category" className="text-sm font-medium text-foreground">
              Nhóm (tuỳ chọn)
            </label>
            <select
              id="ci-category"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("category")}
            >
              <option value="">-- Chưa phân nhóm --</option>
              {categoriesQuery.data?.data.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {canBrowseDepartments && (
          <div className="space-y-1.5">
            <label htmlFor="ci-department" className="text-sm font-medium text-foreground">
              Khoa/Phòng
            </label>
            <select
              id="ci-department"
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
            {formState.errors.department && (
              <p className="text-xs text-destructive">{formState.errors.department.message}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="ci-threshold" className="text-sm font-medium text-foreground">
              Ngưỡng cảnh báo
            </label>
            <input
              id="ci-threshold"
              type="number"
              min={0}
              aria-invalid={!!formState.errors.minStockThreshold}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("minStockThreshold")}
            />
            {formState.errors.minStockThreshold && (
              <p className="text-xs text-destructive">{formState.errors.minStockThreshold.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="ci-initial" className="text-sm font-medium text-foreground">
              Tồn kho ban đầu
            </label>
            <input
              id="ci-initial"
              type="number"
              min={0}
              aria-invalid={!!formState.errors.initialQuantity}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("initialQuantity")}
            />
            {formState.errors.initialQuantity && (
              <p className="text-xs text-destructive">{formState.errors.initialQuantity.message}</p>
            )}
          </div>
        </div>

        {apiError && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={createMutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" size="sm" loading={createMutation.isPending}>
            Tạo vật tư
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
