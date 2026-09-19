import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { AssetMultiPicker, type PickedAsset } from "@/features/vendors/components/AssetMultiPicker";
import { useVendors } from "@/features/vendors/hooks/useVendors";
import { useCreateContract } from "@/features/vendors/hooks/useContractActions";
import { parseApiError } from "@/utils/parseApiError";

const schema = z
  .object({
    vendor: z.string().min(1, "Vui lòng chọn nhà cung cấp"),
    contractNumber: z.string().trim().optional(),
    title: z.string().trim().min(1, "Vui lòng nhập tên hợp đồng"),
    description: z.string().trim().optional(),
    startDate: z.string().min(1, "Vui lòng chọn ngày bắt đầu"),
    endDate: z.string().min(1, "Vui lòng chọn ngày kết thúc"),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "Ngày kết thúc phải sau ngày bắt đầu",
    path: ["endDate"],
  });
type FormValues = z.infer<typeof schema>;

interface CreateContractModalProps {
  open: boolean;
  onClose: () => void;
  /** Đã biết trước vendor (gọi từ `VendorDetailPage`) — ẩn select chọn NCC. */
  vendorId?: string;
  vendorLabel?: string;
}

/** Roadmap B4 — tạo hợp đồng mới, áp dụng cho 1 hoặc nhiều tài sản (`AssetMultiPicker`). */
export function CreateContractModal({ open, onClose, vendorId: fixedVendorId, vendorLabel }: CreateContractModalProps) {
  const [pickedAssets, setPickedAssets] = useState<PickedAsset[]>([]);
  const [assetsError, setAssetsError] = useState<string | undefined>();
  const vendorsQuery = useVendors({ limit: 100 });
  const createMutation = useCreateContract();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      vendor: fixedVendorId ?? "",
      contractNumber: "",
      title: "",
      description: "",
      startDate: "",
      endDate: "",
    },
  });
  const { register, handleSubmit, formState } = form;
  const apiError = createMutation.error ? parseApiError(createMutation.error) : null;

  function onSubmit(values: FormValues) {
    if (pickedAssets.length === 0) {
      setAssetsError("Chọn ít nhất 1 tài sản");
      return;
    }
    setAssetsError(undefined);

    createMutation.mutate(
      {
        vendor: values.vendor,
        assets: pickedAssets.map((a) => a.id),
        contractNumber: values.contractNumber || undefined,
        title: values.title,
        description: values.description || undefined,
        startDate: values.startDate,
        endDate: values.endDate,
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title="Tạo hợp đồng mới" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {!fixedVendorId && (
          <div className="space-y-1.5">
            <label htmlFor="c-vendor" className="text-sm font-medium text-foreground">
              Nhà cung cấp
            </label>
            <select
              id="c-vendor"
              aria-invalid={!!formState.errors.vendor}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("vendor")}
            >
              <option value="">-- Chọn nhà cung cấp --</option>
              {vendorsQuery.data?.data.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name}
                </option>
              ))}
            </select>
            {formState.errors.vendor && <p className="text-xs text-destructive">{formState.errors.vendor.message}</p>}
          </div>
        )}
        {fixedVendorId && vendorLabel && (
          <p className="text-sm text-muted-foreground">
            Nhà cung cấp: <span className="font-medium text-foreground">{vendorLabel}</span>
          </p>
        )}

        <div className="space-y-1.5">
          <span className="text-sm font-medium text-foreground">Tài sản áp dụng</span>
          <AssetMultiPicker value={pickedAssets} onChange={setPickedAssets} error={assetsError} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="c-title" className="text-sm font-medium text-foreground">
              Tên hợp đồng
            </label>
            <input
              id="c-title"
              placeholder="VD: Hợp đồng bảo trì máy X-quang 2026"
              aria-invalid={!!formState.errors.title}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("title")}
            />
            {formState.errors.title && <p className="text-xs text-destructive">{formState.errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="c-number" className="text-sm font-medium text-foreground">
              Số hợp đồng (tuỳ chọn)
            </label>
            <input
              id="c-number"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("contractNumber")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="c-start" className="text-sm font-medium text-foreground">
              Ngày bắt đầu
            </label>
            <input
              id="c-start"
              type="date"
              aria-invalid={!!formState.errors.startDate}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("startDate")}
            />
            {formState.errors.startDate && <p className="text-xs text-destructive">{formState.errors.startDate.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="c-end" className="text-sm font-medium text-foreground">
              Ngày kết thúc
            </label>
            <input
              id="c-end"
              type="date"
              aria-invalid={!!formState.errors.endDate}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("endDate")}
            />
            {formState.errors.endDate && <p className="text-xs text-destructive">{formState.errors.endDate.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="c-description" className="text-sm font-medium text-foreground">
            Điều khoản/ghi chú (tuỳ chọn)
          </label>
          <textarea
            id="c-description"
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("description")}
          />
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
            Tạo hợp đồng
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
