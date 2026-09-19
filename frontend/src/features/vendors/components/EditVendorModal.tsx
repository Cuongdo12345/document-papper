import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useUpdateVendor } from "@/features/vendors/hooks/useVendorActions";
import { parseApiError } from "@/utils/parseApiError";
import type { Vendor } from "@/types/vendor.types";

const schema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên nhà cung cấp"),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.union([z.string().trim().email("Email không hợp lệ"), z.literal("")]).optional(),
  address: z.string().trim().optional(),
  taxCode: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  isActive: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

interface EditVendorModalProps {
  open: boolean;
  onClose: () => void;
  vendor: Vendor;
}

/** Roadmap B4 — sửa thông tin nhà cung cấp, bao gồm bật/tắt hoạt động. */
export function EditVendorModal({ open, onClose, vendor }: EditVendorModalProps) {
  const updateMutation = useUpdateVendor();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: vendor.name,
      contactPerson: vendor.contactPerson ?? "",
      phone: vendor.phone ?? "",
      email: vendor.email ?? "",
      address: vendor.address ?? "",
      taxCode: vendor.taxCode ?? "",
      notes: vendor.notes ?? "",
      isActive: vendor.isActive,
    },
  });
  const { register, handleSubmit, formState } = form;
  const apiError = updateMutation.error ? parseApiError(updateMutation.error) : null;

  function onSubmit(values: FormValues) {
    updateMutation.mutate(
      {
        id: vendor._id,
        body: {
          name: values.name,
          contactPerson: values.contactPerson || undefined,
          phone: values.phone || undefined,
          email: values.email || undefined,
          address: values.address || undefined,
          taxCode: values.taxCode || undefined,
          notes: values.notes || undefined,
          isActive: values.isActive,
        },
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title="Sửa thông tin nhà cung cấp">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="ev-name" className="text-sm font-medium text-foreground">
            Tên nhà cung cấp
          </label>
          <input
            id="ev-name"
            autoFocus
            aria-invalid={!!formState.errors.name}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("name")}
          />
          {formState.errors.name && <p className="text-xs text-destructive">{formState.errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="ev-contact" className="text-sm font-medium text-foreground">
              Người liên hệ
            </label>
            <input
              id="ev-contact"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("contactPerson")}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ev-phone" className="text-sm font-medium text-foreground">
              Điện thoại
            </label>
            <input
              id="ev-phone"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("phone")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="ev-email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="ev-email"
              type="email"
              aria-invalid={!!formState.errors.email}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("email")}
            />
            {formState.errors.email && <p className="text-xs text-destructive">{formState.errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ev-taxcode" className="text-sm font-medium text-foreground">
              Mã số thuế
            </label>
            <input
              id="ev-taxcode"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("taxCode")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ev-address" className="text-sm font-medium text-foreground">
            Địa chỉ
          </label>
          <input
            id="ev-address"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("address")}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="ev-notes" className="text-sm font-medium text-foreground">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            id="ev-notes"
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("notes")}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" className="size-4 rounded border-input" {...register("isActive")} />
          Đang hợp tác (bỏ chọn để ngừng hợp tác với nhà cung cấp này)
        </label>

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
