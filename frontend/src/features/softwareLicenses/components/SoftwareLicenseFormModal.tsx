import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { useVendors } from "@/features/vendors/hooks/useVendors";
import { useCreateSoftwareLicense, useUpdateSoftwareLicense } from "@/features/softwareLicenses/hooks/useSoftwareLicenseActions";
import { LICENSE_TYPE_LABELS } from "@/features/softwareLicenses/constants/softwareLicense.constants";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import { SOFTWARE_LICENSE_TYPES, type SoftwareLicense, type SoftwareLicenseListItem } from "@/types/softwareLicense.types";

/**
 * Khớp `CreateSoftwareLicenseDTO`/`UpdateSoftwareLicenseDTO` (backend). Quy tắc loại ↔ hạn:
 * thuê bao BẮT BUỘC có ngày hết hạn; vĩnh viễn KHÔNG có ngày hết hạn; hết hạn phải sau ngày mua.
 * KHÔNG có ô nhập khoá bản quyền (quyết định Q-A2) — chỉ số hợp đồng/đơn hàng.
 */
const schema = z
  .object({
    softwareName: z.string().trim().min(1, "Tên phần mềm không được để trống").max(200),
    edition: z.string().trim().max(100).optional(),
    version: z.string().trim().max(100).optional(),
    licenseType: z.enum(SOFTWARE_LICENSE_TYPES),
    totalSeats: z
      .string()
      .min(1, "Nhập số máy được cài")
      .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, "Số máy phải là số nguyên từ 1 trở lên"),
    purchaseDate: z.string().optional(),
    expiresAt: z.string().optional(),
    vendor: z.string().optional(),
    contractOrOrderNumber: z.string().trim().max(100).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.licenseType === "SUBSCRIPTION" && !v.expiresAt) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Bản quyền thuê bao phải có ngày hết hạn" });
    }
    if (v.expiresAt && v.purchaseDate && v.licenseType === "SUBSCRIPTION" && new Date(v.expiresAt) <= new Date(v.purchaseDate)) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Ngày hết hạn phải sau ngày mua" });
    }
  });

type FormValues = z.infer<typeof schema>;

interface SoftwareLicenseFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Không truyền = tạo mới; có = sửa. */
  license?: SoftwareLicense | SoftwareLicenseListItem;
}

const INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");

/** `key={license?._id ?? "create"}` ở nơi gọi để remount đúng khi đổi mode (cùng pattern `AssetEditModal`). */
export function SoftwareLicenseFormModal({ open, onClose, license }: SoftwareLicenseFormModalProps) {
  const isEdit = !!license;
  const { hasPermission } = usePermission();
  const canPickVendor = hasPermission(PERMISSIONS.VENDOR_VIEW);
  const vendorsQuery = useVendors({ limit: 100 }, canPickVendor);
  const createMutation = useCreateSoftwareLicense();
  const updateMutation = useUpdateSoftwareLicense();
  const mutation = isEdit ? updateMutation : createMutation;

  const { register, handleSubmit, control, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      softwareName: license?.softwareName ?? "",
      edition: license?.edition ?? "",
      version: license?.version ?? "",
      licenseType: license?.licenseType ?? "PERPETUAL",
      totalSeats: license ? String(license.totalSeats) : "1",
      purchaseDate: toDateInput(license?.purchaseDate),
      expiresAt: toDateInput(license?.expiresAt),
      vendor: license?.vendor?._id ?? "",
      contractOrOrderNumber: license?.contractOrOrderNumber ?? "",
    },
  });
  const licenseType = useWatch({ control, name: "licenseType" });
  const apiError = mutation.error ? parseApiError(mutation.error) : null;
  const errors = formState.errors;

  function onSubmit(values: FormValues) {
    const subscription = values.licenseType === "SUBSCRIPTION";
    if (isEdit && license) {
      // Sửa: chuỗi rỗng → null để backend XOÁ trường (không phải "bỏ qua").
      const orNull = (v?: string) => (v && v.trim() !== "" ? v : null);
      updateMutation.mutate(
        {
          id: license._id,
          body: {
            softwareName: values.softwareName,
            edition: orNull(values.edition),
            version: orNull(values.version),
            licenseType: values.licenseType,
            totalSeats: Number(values.totalSeats),
            purchaseDate: orNull(values.purchaseDate),
            expiresAt: subscription ? orNull(values.expiresAt) : null,
            vendor: orNull(values.vendor),
            contractOrOrderNumber: orNull(values.contractOrOrderNumber),
          },
        },
        {
          onSuccess: () => {
            toast.success("Đã cập nhật bản quyền");
            onClose();
          },
        },
      );
    } else {
      const orUndefined = (v?: string) => (v && v.trim() !== "" ? v : undefined);
      createMutation.mutate(
        {
          softwareName: values.softwareName,
          edition: orUndefined(values.edition),
          version: orUndefined(values.version),
          licenseType: values.licenseType,
          totalSeats: Number(values.totalSeats),
          purchaseDate: orUndefined(values.purchaseDate),
          expiresAt: subscription ? orUndefined(values.expiresAt) : undefined,
          vendor: orUndefined(values.vendor),
          contractOrOrderNumber: orUndefined(values.contractOrOrderNumber),
        },
        {
          onSuccess: () => {
            toast.success("Đã thêm bản quyền phần mềm");
            onClose();
          },
        },
      );
    }
  }

  return (
    <AppModal open={open} onClose={onClose} title={isEdit ? "Sửa bản quyền phần mềm" : "Thêm bản quyền phần mềm"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="sl-name" className="text-sm font-medium text-foreground">
              Tên phần mềm
            </label>
            <input id="sl-name" aria-invalid={!!errors.softwareName} className={INPUT_CLASS} {...register("softwareName")} />
            {errors.softwareName && <p className="text-xs text-destructive">{errors.softwareName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sl-edition" className="text-sm font-medium text-foreground">
              Phiên bản/edition (VD: Standard)
            </label>
            <input id="sl-edition" className={INPUT_CLASS} {...register("edition")} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sl-version" className="text-sm font-medium text-foreground">
              Đời phần mềm (VD: 2021)
            </label>
            <input id="sl-version" className={INPUT_CLASS} {...register("version")} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sl-type" className="text-sm font-medium text-foreground">
              Loại bản quyền
            </label>
            <select id="sl-type" className={INPUT_CLASS} {...register("licenseType")}>
              {SOFTWARE_LICENSE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LICENSE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sl-seats" className="text-sm font-medium text-foreground">
              Số máy được cài
            </label>
            <input id="sl-seats" type="number" min={1} aria-invalid={!!errors.totalSeats} className={INPUT_CLASS} {...register("totalSeats")} />
            {errors.totalSeats && <p className="text-xs text-destructive">{errors.totalSeats.message}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="sl-purchase" className="text-sm font-medium text-foreground">
              Ngày mua
            </label>
            <input id="sl-purchase" type="date" className={INPUT_CLASS} {...register("purchaseDate")} />
          </div>

          {licenseType === "SUBSCRIPTION" && (
            <div className="space-y-1.5">
              <label htmlFor="sl-expires" className="text-sm font-medium text-foreground">
                Ngày hết hạn
              </label>
              <input id="sl-expires" type="date" aria-invalid={!!errors.expiresAt} className={INPUT_CLASS} {...register("expiresAt")} />
              {errors.expiresAt && <p className="text-xs text-destructive">{errors.expiresAt.message}</p>}
            </div>
          )}

          {canPickVendor && (
            <div className="space-y-1.5">
              <label htmlFor="sl-vendor" className="text-sm font-medium text-foreground">
                Nhà cung cấp
              </label>
              <select id="sl-vendor" className={INPUT_CLASS} {...register("vendor")}>
                <option value="">Không chọn</option>
                {vendorsQuery.data?.data.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="sl-order" className="text-sm font-medium text-foreground">
              Số hợp đồng/đơn hàng
            </label>
            <input id="sl-order" className={INPUT_CLASS} {...register("contractOrOrderNumber")} />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Hệ thống không lưu khoá bản quyền (product key). Chứng từ mua hàng được tải lên ở trang chi tiết sau khi tạo.
        </p>

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
            {isEdit ? "Lưu thay đổi" : "Thêm bản quyền"}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
