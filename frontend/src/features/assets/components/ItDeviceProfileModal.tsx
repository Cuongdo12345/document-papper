import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useUpsertItDeviceProfile } from "@/features/assets/hooks/useItDeviceProfile";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import type { ItDeviceProfile, UpsertItDeviceProfileRequest } from "@/types/itDeviceProfile.types";

const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6 = /^[0-9a-fA-F:]+$/;
const MAC = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

/**
 * Khớp `UpsertItDeviceProfileDTO` (backend) — mọi trường tuỳ chọn; để trống = xoá trường khi đã có giá trị.
 * Kiểm định dạng IP/MAC/VLAN ngay ở form để báo sớm; backend vẫn là nơi kiểm cuối cùng (`net.isIP`, regex MAC).
 */
const schema = z.object({
  cpu: z.string().trim().max(200),
  ram: z.string().trim().max(200),
  storage: z.string().trim().max(200),
  gpu: z.string().trim().max(200),
  ipAddress: z
    .string()
    .trim()
    .refine((v) => v === "" || IPV4.test(v) || (v.includes(":") && IPV6.test(v)), "Địa chỉ IP không hợp lệ"),
  macAddress: z
    .string()
    .trim()
    .refine((v) => v === "" || MAC.test(v), "Địa chỉ MAC không hợp lệ (dạng AA:BB:CC:DD:EE:FF)"),
  hostname: z.string().trim().max(100),
  vlan: z
    .string()
    .trim()
    .refine((v) => v === "" || (Number.isInteger(Number(v)) && Number(v) >= 1 && Number(v) <= 4094), "VLAN từ 1 đến 4094"),
  osName: z.string().trim().max(100),
  osVersion: z.string().trim().max(100),
  firmwareVersion: z.string().trim().max(100),
});
type FormValues = z.infer<typeof schema>;

const INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring";

interface ItDeviceProfileModalProps {
  open: boolean;
  onClose: () => void;
  assetId: string;
  /** `null`/`undefined` = chưa có hồ sơ (tạo mới); PUT là upsert nên cùng một form. */
  profile?: ItDeviceProfile | null;
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

/** Hồ sơ thiết bị CNTT (FE-43). Gửi `null` cho ô để trống để XOÁ trường (PUT chỉ đổi trường được gửi). */
export function ItDeviceProfileModal({ open, onClose, assetId, profile }: ItDeviceProfileModalProps) {
  const mutation = useUpsertItDeviceProfile();
  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cpu: profile?.cpu ?? "",
      ram: profile?.ram ?? "",
      storage: profile?.storage ?? "",
      gpu: profile?.gpu ?? "",
      ipAddress: profile?.ipAddress ?? "",
      macAddress: profile?.macAddress ?? "",
      hostname: profile?.hostname ?? "",
      vlan: profile?.vlan != null ? String(profile.vlan) : "",
      osName: profile?.osName ?? "",
      osVersion: profile?.osVersion ?? "",
      firmwareVersion: profile?.firmwareVersion ?? "",
    },
  });
  const errors = formState.errors;
  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  function onSubmit(values: FormValues) {
    const orNull = (v: string) => (v === "" ? null : v);
    const body: UpsertItDeviceProfileRequest = {
      cpu: orNull(values.cpu),
      ram: orNull(values.ram),
      storage: orNull(values.storage),
      gpu: orNull(values.gpu),
      ipAddress: orNull(values.ipAddress),
      macAddress: orNull(values.macAddress),
      hostname: orNull(values.hostname),
      vlan: values.vlan === "" ? null : Number(values.vlan),
      osName: orNull(values.osName),
      osVersion: orNull(values.osVersion),
      firmwareVersion: orNull(values.firmwareVersion),
    };
    mutation.mutate(
      { assetId, body },
      {
        onSuccess: (response) => {
          toast.success("Đã lưu hồ sơ thiết bị CNTT");
          // IP trùng KHÔNG chặn lưu (quyết định Q-A3) — chỉ báo để người dùng rà lại.
          const duplicate = response.warnings?.find((w) => w.code === "DUPLICATE_IP");
          if (duplicate) toast.warning(duplicate.message ?? "Địa chỉ IP đang trùng với thiết bị khác còn hoạt động");
          onClose();
        },
      },
    );
  }

  return (
    <AppModal open={open} onClose={onClose} title={profile ? "Sửa hồ sơ thiết bị CNTT" : "Tạo hồ sơ thiết bị CNTT"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">Cấu hình phần cứng</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="itp-cpu" label="CPU">
              <input id="itp-cpu" className={INPUT_CLASS} {...register("cpu")} />
            </Field>
            <Field id="itp-ram" label="RAM">
              <input id="itp-ram" className={INPUT_CLASS} placeholder="VD: 16GB" {...register("ram")} />
            </Field>
            <Field id="itp-storage" label="Ổ lưu trữ">
              <input id="itp-storage" className={INPUT_CLASS} placeholder="VD: 512GB SSD" {...register("storage")} />
            </Field>
            <Field id="itp-gpu" label="GPU">
              <input id="itp-gpu" className={INPUT_CLASS} {...register("gpu")} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">Mạng</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="itp-ip" label="Địa chỉ IP" error={errors.ipAddress?.message}>
              <input id="itp-ip" aria-invalid={!!errors.ipAddress} className={INPUT_CLASS} placeholder="VD: 10.0.0.15" {...register("ipAddress")} />
            </Field>
            <Field id="itp-mac" label="Địa chỉ MAC" error={errors.macAddress?.message}>
              <input id="itp-mac" aria-invalid={!!errors.macAddress} className={INPUT_CLASS} placeholder="AA:BB:CC:DD:EE:FF" {...register("macAddress")} />
            </Field>
            <Field id="itp-host" label="Hostname" error={errors.hostname?.message}>
              <input id="itp-host" className={INPUT_CLASS} {...register("hostname")} />
            </Field>
            <Field id="itp-vlan" label="VLAN (1–4094)" error={errors.vlan?.message}>
              <input id="itp-vlan" type="number" min={1} max={4094} aria-invalid={!!errors.vlan} className={INPUT_CLASS} {...register("vlan")} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-foreground">Hệ điều hành &amp; firmware</legend>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field id="itp-os" label="Hệ điều hành">
              <input id="itp-os" className={INPUT_CLASS} placeholder="VD: Windows" {...register("osName")} />
            </Field>
            <Field id="itp-osver" label="Phiên bản HĐH">
              <input id="itp-osver" className={INPUT_CLASS} placeholder="VD: 11 Pro" {...register("osVersion")} />
            </Field>
            <Field id="itp-fw" label="Phiên bản firmware">
              <input id="itp-fw" className={INPUT_CLASS} {...register("firmwareVersion")} />
            </Field>
          </div>
        </fieldset>

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
            {profile ? "Lưu thay đổi" : "Tạo hồ sơ"}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
