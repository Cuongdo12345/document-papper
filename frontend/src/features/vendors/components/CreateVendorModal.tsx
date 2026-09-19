import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useCreateVendor } from "@/features/vendors/hooks/useVendorActions";
import { parseApiError } from "@/utils/parseApiError";

const schema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên nhà cung cấp"),
  contactPerson: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.union([z.string().trim().email("Email không hợp lệ"), z.literal("")]).optional(),
  address: z.string().trim().optional(),
  taxCode: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});
type FormValues = z.infer<typeof schema>;

interface CreateVendorModalProps {
  open: boolean;
  onClose: () => void;
}

/** Roadmap B4 — tạo nhà cung cấp mới. */
export function CreateVendorModal({ open, onClose }: CreateVendorModalProps) {
  const createMutation = useCreateVendor();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", contactPerson: "", phone: "", email: "", address: "", taxCode: "", notes: "" },
  });
  const { register, handleSubmit, formState } = form;
  const apiError = createMutation.error ? parseApiError(createMutation.error) : null;

  function onSubmit(values: FormValues) {
    createMutation.mutate(
      {
        name: values.name,
        contactPerson: values.contactPerson || undefined,
        phone: values.phone || undefined,
        email: values.email || undefined,
        address: values.address || undefined,
        taxCode: values.taxCode || undefined,
        notes: values.notes || undefined,
      },
      { onSuccess: () => onClose() },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title="Tạo nhà cung cấp mới">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="v-name" className="text-sm font-medium text-foreground">
            Tên nhà cung cấp
          </label>
          <input
            id="v-name"
            autoFocus
            aria-invalid={!!formState.errors.name}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("name")}
          />
          {formState.errors.name && <p className="text-xs text-destructive">{formState.errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="v-contact" className="text-sm font-medium text-foreground">
              Người liên hệ
            </label>
            <input
              id="v-contact"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("contactPerson")}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="v-phone" className="text-sm font-medium text-foreground">
              Điện thoại
            </label>
            <input
              id="v-phone"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("phone")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="v-email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="v-email"
              type="email"
              aria-invalid={!!formState.errors.email}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("email")}
            />
            {formState.errors.email && <p className="text-xs text-destructive">{formState.errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="v-taxcode" className="text-sm font-medium text-foreground">
              Mã số thuế
            </label>
            <input
              id="v-taxcode"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("taxCode")}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="v-address" className="text-sm font-medium text-foreground">
            Địa chỉ
          </label>
          <input
            id="v-address"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("address")}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="v-notes" className="text-sm font-medium text-foreground">
            Ghi chú (tuỳ chọn)
          </label>
          <textarea
            id="v-notes"
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("notes")}
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
            Tạo nhà cung cấp
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
