import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { AssetMultiPicker, type PickedAsset } from "@/features/vendors/components/AssetMultiPicker";
import { useUpdateContract } from "@/features/vendors/hooks/useContractActions";
import { parseApiError } from "@/utils/parseApiError";
import type { Contract } from "@/types/contract.types";

const schema = z
  .object({
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

interface EditContractModalProps {
  open: boolean;
  onClose: () => void;
  contract: Contract;
}

function toDateInputValue(iso: string) {
  return iso.slice(0, 10);
}

/** Roadmap B4 — sửa hợp đồng CÒN "active". `assets` LUÔN populate đầy đủ ở GET chi tiết nên khởi tạo picker trực tiếp từ đó. */
export function EditContractModal({ open, onClose, contract }: EditContractModalProps) {
  const [pickedAssets, setPickedAssets] = useState<PickedAsset[]>(
    contract.assets.map((a) => (typeof a === "string" ? { id: a, label: a } : { id: a._id, label: `${a.assetCode} — ${a.name}` })),
  );
  const [assetsError, setAssetsError] = useState<string | undefined>();
  const updateMutation = useUpdateContract();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      contractNumber: contract.contractNumber ?? "",
      title: contract.title,
      description: contract.description ?? "",
      startDate: toDateInputValue(contract.startDate),
      endDate: toDateInputValue(contract.endDate),
    },
  });
  const { register, handleSubmit, formState } = form;
  const apiError = updateMutation.error ? parseApiError(updateMutation.error) : null;

  function onSubmit(values: FormValues) {
    if (pickedAssets.length === 0) {
      setAssetsError("Chọn ít nhất 1 tài sản");
      return;
    }
    setAssetsError(undefined);

    updateMutation.mutate(
      {
        id: contract._id,
        body: {
          assets: pickedAssets.map((a) => a.id),
          contractNumber: values.contractNumber || undefined,
          title: values.title,
          description: values.description || undefined,
          startDate: values.startDate,
          endDate: values.endDate,
        },
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title="Sửa hợp đồng" size="lg">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <span className="text-sm font-medium text-foreground">Tài sản áp dụng</span>
          <AssetMultiPicker value={pickedAssets} onChange={setPickedAssets} error={assetsError} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="ec-title" className="text-sm font-medium text-foreground">
              Tên hợp đồng
            </label>
            <input
              id="ec-title"
              aria-invalid={!!formState.errors.title}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("title")}
            />
            {formState.errors.title && <p className="text-xs text-destructive">{formState.errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ec-number" className="text-sm font-medium text-foreground">
              Số hợp đồng (tuỳ chọn)
            </label>
            <input
              id="ec-number"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("contractNumber")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="ec-start" className="text-sm font-medium text-foreground">
              Ngày bắt đầu
            </label>
            <input
              id="ec-start"
              type="date"
              aria-invalid={!!formState.errors.startDate}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("startDate")}
            />
            {formState.errors.startDate && <p className="text-xs text-destructive">{formState.errors.startDate.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ec-end" className="text-sm font-medium text-foreground">
              Ngày kết thúc
            </label>
            <input
              id="ec-end"
              type="date"
              aria-invalid={!!formState.errors.endDate}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("endDate")}
            />
            {formState.errors.endDate && <p className="text-xs text-destructive">{formState.errors.endDate.message}</p>}
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ec-description" className="text-sm font-medium text-foreground">
            Điều khoản/ghi chú (tuỳ chọn)
          </label>
          <textarea
            id="ec-description"
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
