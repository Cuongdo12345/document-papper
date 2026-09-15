import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useUpdateAsset } from "@/features/assets/hooks/useUpdateAsset";
import { useAssetCategories } from "@/features/assets/hooks/useAssetCategories";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import type { Asset } from "@/types/asset.types";

/**
 * Khớp `UpdateAssetDTO` — CHỦ Ý KHÔNG có `status`/`assignedTo`/`department`
 * (đổi qua Assign/Transfer/Return riêng — `assets.dto.ts` comment gốc).
 */
const editAssetSchema = z.object({
  category: z.string().min(1, "Vui lòng chọn danh mục"),
  name: z.string().trim().min(1, "Tên tài sản không được để trống"),
  serialNumber: z.string().trim().optional(),
  model: z.string().trim().optional(),
  manufacturer: z.string().trim().optional(),
  location: z.string().trim().optional(),
  purchaseDate: z.string().optional(),
  // `z.string()` thuần (KHÔNG `z.coerce.number()`) — tránh input/output type
  // lệch nhau trong `zodResolver` (input `unknown` do coerce, output
  // `number`, khiến `useForm<T>` không infer khớp — lỗi build thật đã gặp).
  // Parse `Number(...)` thủ công lúc submit (`onSubmit`).
  purchasePrice: z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Giá mua phải là số không âm"),
  warrantyExpiredAt: z.string().optional(),
  supplier: z.string().trim().optional(),
});

type EditAssetFormValues = z.infer<typeof editAssetSchema>;

interface AssetEditModalProps {
  open: boolean;
  onClose: () => void;
  asset: Asset;
}

/** `key={asset._id}` ở nơi gọi đảm bảo remount khi đổi asset đang sửa (cùng pattern `DocumentEditModal`). */
export function AssetEditModal({ open, onClose, asset }: AssetEditModalProps) {
  const updateMutation = useUpdateAsset();
  const { hasPermission } = usePermission();
  const canBrowseCategories = hasPermission(PERMISSIONS.ASSET_CATEGORY_VIEW);
  const categoriesQuery = useAssetCategories({ limit: 100 }, { enabled: canBrowseCategories });

  const form = useForm<EditAssetFormValues>({
    resolver: zodResolver(editAssetSchema),
    defaultValues: {
      category: asset.category._id,
      name: asset.name,
      serialNumber: asset.serialNumber ?? "",
      model: asset.model ?? "",
      manufacturer: asset.manufacturer ?? "",
      location: asset.location ?? "",
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.slice(0, 10) : "",
      purchasePrice: asset.purchasePrice != null ? String(asset.purchasePrice) : "",
      warrantyExpiredAt: asset.warrantyExpiredAt ? asset.warrantyExpiredAt.slice(0, 10) : "",
      supplier: asset.supplier ?? "",
    },
  });

  const { register, handleSubmit, formState } = form;
  const apiError = updateMutation.error ? parseApiError(updateMutation.error) : null;

  function onSubmit(values: EditAssetFormValues) {
    updateMutation.mutate(
      {
        id: asset._id,
        body: {
          category: values.category,
          name: values.name,
          serialNumber: values.serialNumber || undefined,
          model: values.model || undefined,
          manufacturer: values.manufacturer || undefined,
          location: values.location || undefined,
          purchaseDate: values.purchaseDate || undefined,
          purchasePrice: values.purchasePrice === "" ? undefined : Number(values.purchasePrice),
          warrantyExpiredAt: values.warrantyExpiredAt || undefined,
          supplier: values.supplier || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success("Đã cập nhật tài sản");
          onClose();
        },
      },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title="Sửa tài sản" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="asset-name" className="text-sm font-medium text-foreground">
              Tên tài sản
            </label>
            <input
              id="asset-name"
              autoFocus
              aria-invalid={!!formState.errors.name}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("name")}
            />
            {formState.errors.name && <p className="text-xs text-destructive">{formState.errors.name.message}</p>}
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="asset-category" className="text-sm font-medium text-foreground">
              Danh mục
            </label>
            {canBrowseCategories ? (
              <select
                id="asset-category"
                aria-invalid={!!formState.errors.category}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("category")}
              >
                {categoriesQuery.data?.data.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input type="hidden" {...register("category")} />
                <div className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {asset.category.name}
                </div>
              </>
            )}
            {formState.errors.category && <p className="text-xs text-destructive">{formState.errors.category.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="asset-serial" className="text-sm font-medium text-foreground">
              Số serial
            </label>
            <input
              id="asset-serial"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("serialNumber")}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="asset-model" className="text-sm font-medium text-foreground">
              Model
            </label>
            <input
              id="asset-model"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("model")}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="asset-manufacturer" className="text-sm font-medium text-foreground">
              Hãng sản xuất
            </label>
            <input
              id="asset-manufacturer"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("manufacturer")}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="asset-location" className="text-sm font-medium text-foreground">
              Vị trí
            </label>
            <input
              id="asset-location"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("location")}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="asset-purchaseDate" className="text-sm font-medium text-foreground">
              Ngày mua
            </label>
            <input
              id="asset-purchaseDate"
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("purchaseDate")}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="asset-purchasePrice" className="text-sm font-medium text-foreground">
              Giá mua
            </label>
            <input
              id="asset-purchasePrice"
              type="number"
              min={0}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("purchasePrice")}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="asset-warranty" className="text-sm font-medium text-foreground">
              Hết bảo hành
            </label>
            <input
              id="asset-warranty"
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("warrantyExpiredAt")}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="asset-supplier" className="text-sm font-medium text-foreground">
              Nhà cung cấp
            </label>
            <input
              id="asset-supplier"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("supplier")}
            />
          </div>
        </div>

        {apiError && (
          <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {apiError.message}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={updateMutation.isPending}>
            Huỷ
          </Button>
          <Button type="submit" size="sm" loading={updateMutation.isPending}>
            Lưu thay đổi
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
