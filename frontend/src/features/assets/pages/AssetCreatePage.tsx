import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";
import { useCreateAsset } from "@/features/assets/hooks/useCreateAsset";
import { useAssetCategories } from "@/features/assets/hooks/useAssetCategories";
import { useDepartments } from "@/features/departments/hooks/useDepartments";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";

const createAssetSchema = z.object({
  category: z.string().min(1, "Vui lòng chọn danh mục"),
  department: z.string().min(1, "Vui lòng chọn khoa/phòng"),
  name: z.string().trim().min(1, "Tên tài sản không được để trống"),
  serialNumber: z.string().trim().optional(),
  model: z.string().trim().optional(),
  manufacturer: z.string().trim().optional(),
  location: z.string().trim().optional(),
  purchaseDate: z.string().optional(),
  // `z.string()` thuần (KHÔNG `z.coerce.number()`) — tránh input/output type
  // lệch nhau trong `zodResolver` (cùng lý do `AssetEditModal.tsx`).
  purchasePrice: z
    .string()
    .optional()
    .refine((v) => !v || (!Number.isNaN(Number(v)) && Number(v) >= 0), "Giá mua phải là số không âm"),
  warrantyExpiredAt: z.string().optional(),
  supplier: z.string().trim().optional(),
});

type CreateAssetFormValues = z.infer<typeof createAssetSchema>;

/**
 * `/app/assets/create` — trang riêng (khớp `DocumentCreatePage`, nhiều field
 * hơn 1 `AppDrawer` phù hợp). Áp dụng CÙNG pattern khoá "Khoa/Phòng" như
 * DEV-033 (`DocumentCreatePage`): role `PHONG_VAT_TU_TTB` có `ASSET_CREATE`
 * NHƯNG KHÔNG có `DEPARTMENT_VIEW` (`rolePermission.map.ts`) — khoá field về
 * đúng khoa của người tạo thay vì nới RBAC. Khác Document: đây là hạn chế
 * CHƯA lý tưởng cho role này (Phòng Vật tư-TTB thực tế trang bị tài sản cho
 * CÁC khoa khác, không chỉ khoa của chính họ) — ghi nhận ở FE-06.md Remaining
 * Issues thay vì tự ý mở rộng RBAC ngoài phạm vi 1 task UI.
 */
export function AssetCreatePage() {
  const navigate = useNavigate();
  const createMutation = useCreateAsset();
  const { user, hasPermission } = usePermission();
  const canBrowseDepartments = hasPermission(PERMISSIONS.DEPARTMENT_VIEW);
  const canBrowseCategories = hasPermission(PERMISSIONS.ASSET_CATEGORY_VIEW);
  const departmentsQuery = useDepartments({ limit: 100 }, { enabled: canBrowseDepartments });
  const categoriesQuery = useAssetCategories({ limit: 100 }, { enabled: canBrowseCategories });

  const form = useForm<CreateAssetFormValues>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      category: "",
      department: canBrowseDepartments ? "" : (user?.department?._id ?? ""),
      name: "",
      serialNumber: "",
      model: "",
      manufacturer: "",
      location: "",
      purchaseDate: "",
      purchasePrice: "",
      warrantyExpiredAt: "",
      supplier: "",
    },
  });

  const { register, handleSubmit, formState } = form;
  const apiError = createMutation.error ? parseApiError(createMutation.error) : null;
  const isLoadingRefData = (canBrowseDepartments && departmentsQuery.isLoading) || (canBrowseCategories && categoriesQuery.isLoading);

  function onSubmit(values: CreateAssetFormValues) {
    createMutation.mutate(
      {
        category: values.category,
        department: values.department,
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
      {
        onSuccess: (response) => {
          toast.success("Đã thêm tài sản mới");
          navigate(`/app/assets/${response.data.data._id}`);
        },
      },
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Thêm tài sản mới" description="Khai báo tài sản mới vào hệ thống quản lý." />

      {isLoadingRefData ? (
        <LoadingState label="Đang tải dữ liệu tham chiếu..." />
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="max-w-2xl space-y-4">
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

            <div className="space-y-1.5">
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
                  <option value="">-- Chọn danh mục --</option>
                  {categoriesQuery.data?.data.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Tài khoản của bạn không có quyền xem danh mục tài sản — liên hệ quản trị viên.
                </p>
              )}
              {formState.errors.category && <p className="text-xs text-destructive">{formState.errors.category.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="asset-department" className="text-sm font-medium text-foreground">
                Khoa/Phòng
              </label>
              {canBrowseDepartments ? (
                <select
                  id="asset-department"
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
              ) : user?.department ? (
                <>
                  <input type="hidden" {...register("department")} />
                  <div className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                    {user.department.name} ({user.department.code})
                  </div>
                </>
              ) : (
                <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Tài khoản của bạn chưa được gán khoa/phòng.
                </p>
              )}
              {formState.errors.department && <p className="text-xs text-destructive">{formState.errors.department.message}</p>}
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
            <Button type="button" variant="secondary" size="sm" onClick={() => navigate("/app/assets")} disabled={createMutation.isPending}>
              Huỷ
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={createMutation.isPending}
              disabled={(!canBrowseDepartments && !user?.department) || !canBrowseCategories}
            >
              Tạo mới
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
