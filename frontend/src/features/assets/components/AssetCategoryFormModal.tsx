import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useCreateAssetCategory } from "@/features/assets/hooks/useCreateAssetCategory";
import { useUpdateAssetCategory } from "@/features/assets/hooks/useUpdateAssetCategory";
import { useAssetCategories } from "@/features/assets/hooks/useAssetCategories";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import type { AssetCategory } from "@/types/asset.types";

/**
 * 1 SCHEMA DUY NHẤT cho cả tạo/sửa (bài học FE-04 `DocumentMetaFields`: 2
 * schema viết riêng dù giống cấu trúc dễ lệch type). `code` LUÔN required ở
 * schema — khi sửa, field bị ẩn khỏi UI nhưng vẫn `register()` dạng hidden
 * giữ nguyên giá trị gốc (CÙNG PATTERN `category` ở `AssetEditModal.tsx`),
 * KHÔNG gửi lên `UpdateAssetCategoryDTO` (không có field này, xem `onSubmit`).
 */
const assetCategorySchema = z.object({
  code: z.string().trim().min(1, "Mã danh mục không được để trống"),
  name: z.string().trim().min(1, "Tên danh mục không được để trống"),
  parentCategory: z.string().optional(),
  // `z.string()` thuần (KHÔNG `z.coerce.number()`) — cùng lý do `AssetEditModal.tsx`
  // (tránh input/output type lệch nhau ở `zodResolver`), parse thủ công lúc submit.
  defaultWarrantyMonths: z
    .string()
    .optional()
    .refine((v) => !v || (Number.isInteger(Number(v)) && Number(v) >= 0), "Số tháng bảo hành phải là số nguyên không âm"),
});

type AssetCategoryFormValues = z.infer<typeof assetCategorySchema>;

interface AssetCategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  category?: AssetCategory;
}

/** `key={category?._id ?? "create"}` ở nơi gọi đảm bảo remount đúng khi đổi giữa tạo mới/sửa (cùng pattern `AssetEditModal`). */
export function AssetCategoryFormModal({ open, onClose, category }: AssetCategoryFormModalProps) {
  const isEdit = !!category;
  const createMutation = useCreateAssetCategory();
  const updateMutation = useUpdateAssetCategory();
  const mutation = isEdit ? updateMutation : createMutation;

  // Dropdown chọn danh mục cha — loại trừ chính danh mục đang sửa (khớp check
  // `parentCategory === id` → 400 "không thể là cha của chính nó" ở backend,
  // tránh để user chọn rồi mới nhận lỗi).
  const categoriesQuery = useAssetCategories({ limit: 100, isActive: true });
  const parentOptions = (categoriesQuery.data?.data ?? []).filter((c) => c._id !== category?._id);

  const defaultValues: AssetCategoryFormValues = {
    code: category?.code ?? "",
    name: category?.name ?? "",
    parentCategory: category?.parentCategory?._id ?? "",
    defaultWarrantyMonths: category?.defaultWarrantyMonths != null ? String(category.defaultWarrantyMonths) : "",
  };

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssetCategoryFormValues>({ resolver: zodResolver(assetCategorySchema), defaultValues });

  useEffect(() => {
    if (open) reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, category]);

  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  function onSubmit(values: AssetCategoryFormValues) {
    const body = {
      name: values.name,
      parentCategory: values.parentCategory || undefined,
      defaultWarrantyMonths:
        values.defaultWarrantyMonths === "" || values.defaultWarrantyMonths == null ? undefined : Number(values.defaultWarrantyMonths),
    };

    if (isEdit) {
      updateMutation.mutate(
        { id: category._id, body },
        {
          onSuccess: () => {
            toast.success("Đã cập nhật danh mục tài sản");
            onClose();
          },
        },
      );
    } else {
      createMutation.mutate(
        { code: values.code, ...body },
        {
          onSuccess: () => {
            toast.success("Đã tạo danh mục tài sản mới");
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
      title={isEdit ? "Sửa danh mục tài sản" : "Tạo danh mục tài sản"}
      size="md"
      footer={
        <>
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={mutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" form="asset-category-form" size="sm" loading={mutation.isPending}>
            {isEdit ? "Lưu thay đổi" : "Tạo mới"}
          </Button>
        </>
      }
    >
      <form id="asset-category-form" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {isEdit ? (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Mã danh mục</label>
            <input type="hidden" {...register("code")} />
            <div className="w-full rounded-md border border-input bg-muted px-3 py-2 font-mono text-sm text-muted-foreground">
              {category.code}
            </div>
            <p className="text-xs text-muted-foreground">Mã danh mục không thể đổi sau khi tạo.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label htmlFor="cat-code" className="text-sm font-medium text-foreground">
              Mã danh mục
            </label>
            <input
              id="cat-code"
              autoFocus
              placeholder="VD: TB-YTE"
              aria-invalid={!!errors.code}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("code")}
            />
            {errors.code && <p className="text-xs text-destructive">{errors.code.message}</p>}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="cat-name" className="text-sm font-medium text-foreground">
            Tên danh mục
          </label>
          <input
            id="cat-name"
            autoFocus={isEdit}
            aria-invalid={!!errors.name}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("name")}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="cat-parent" className="text-sm font-medium text-foreground">
              Danh mục cha (tuỳ chọn)
            </label>
            <select
              id="cat-parent"
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

          <div className="space-y-1.5">
            <label htmlFor="cat-warranty" className="text-sm font-medium text-foreground">
              Bảo hành mặc định (tháng)
            </label>
            <input
              id="cat-warranty"
              type="number"
              min={0}
              aria-invalid={!!errors.defaultWarrantyMonths}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("defaultWarrantyMonths")}
            />
            {errors.defaultWarrantyMonths && <p className="text-xs text-destructive">{errors.defaultWarrantyMonths.message}</p>}
          </div>
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
