import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useCreateConsumableCategory, useUpdateConsumableCategory } from "@/features/inventory/hooks/useConsumableCategoryActions";
import { useConsumableCategories } from "@/features/inventory/hooks/useConsumableCategories";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import type { ConsumableCategory } from "@/types/consumableCategory.types";

/** 1 schema dùng chung cho tạo/sửa — cùng lý do `AssetCategoryFormModal`. */
const schema = z.object({
  code: z.string().trim().min(1, "Mã nhóm vật tư không được để trống"),
  name: z.string().trim().min(1, "Tên nhóm vật tư không được để trống"),
  parentCategory: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface ConsumableCategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  category?: ConsumableCategory;
}

/** `key={category?._id ?? "create"}` ở nơi gọi đảm bảo remount đúng khi đổi giữa tạo mới/sửa (cùng pattern `AssetCategoryFormModal`). */
export function ConsumableCategoryFormModal({ open, onClose, category }: ConsumableCategoryFormModalProps) {
  const isEdit = !!category;
  const createMutation = useCreateConsumableCategory();
  const updateMutation = useUpdateConsumableCategory();
  const mutation = isEdit ? updateMutation : createMutation;

  // Dropdown chọn nhóm cha — loại trừ chính nhóm đang sửa (khớp check
  // `parentCategory === id` → 400 ở backend).
  const categoriesQuery = useConsumableCategories({ limit: 100, isActive: true });
  const parentOptions = (categoriesQuery.data?.data ?? []).filter((c) => c._id !== category?._id);

  const defaultValues: FormValues = {
    code: category?.code ?? "",
    name: category?.name ?? "",
    parentCategory: category?.parentCategory?._id ?? "",
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues });

  useEffect(() => {
    if (open) reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  function onSubmit(values: FormValues) {
    const body = { name: values.name, parentCategory: values.parentCategory || undefined };

    if (isEdit) {
      updateMutation.mutate(
        { id: category._id, body },
        {
          onSuccess: () => {
            toast.success("Đã cập nhật nhóm vật tư");
            onClose();
          },
        },
      );
    } else {
      createMutation.mutate(
        { code: values.code, ...body },
        {
          onSuccess: () => {
            toast.success("Đã tạo nhóm vật tư mới");
            onClose();
          },
        },
      );
    }
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={isEdit ? "Sửa nhóm vật tư" : "Tạo nhóm vật tư"}
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" form="consumable-category-form" size="sm" loading={mutation.isPending}>
            {isEdit ? "Lưu thay đổi" : "Tạo mới"}
          </Button>
        </>
      }
    >
      <form id="consumable-category-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {isEdit ? (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Mã nhóm</label>
            <input type="hidden" {...register("code")} />
            <div className="w-full rounded-md border border-input bg-muted px-3 py-2 font-mono text-sm text-muted-foreground">
              {category.code}
            </div>
            <p className="text-xs text-muted-foreground">Mã nhóm không thể đổi sau khi tạo.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="cc-code" className="text-sm font-medium text-foreground">
              Mã nhóm
            </label>
            <input
              id="cc-code"
              autoFocus
              placeholder="VD: VPP-GIAYTO"
              aria-invalid={!!errors.code}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("code")}
            />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="cc-name" className="text-sm font-medium text-foreground">
            Tên nhóm
          </label>
          <input
            id="cc-name"
            autoFocus={isEdit}
            aria-invalid={!!errors.name}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("name")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <label htmlFor="cc-parent" className="text-sm font-medium text-foreground">
            Nhóm cha (tuỳ chọn)
          </label>
          <select
            id="cc-parent"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("parentCategory")}
          >
            <option value="">Không có</option>
            {parentOptions.map((c) => (
              <option key={c._id} value={c._id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>
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
