import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppModal } from "@/components/shared/AppModal";
import { Button } from "@/components/ui/button";
import { useCreateMedicalDeviceProfile, useUpdateMedicalDeviceProfile } from "@/features/assets/hooks/useMedicalDeviceProfileActions";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";
import { MEDICAL_DEVICE_CLASSES, type MedicalDeviceClass, type MedicalDeviceProfile } from "@/types/medicalDevice.types";

/**
 * Khớp `CreateMedicalDeviceProfileDTO`/`UpdateMedicalDeviceProfileDTO` — CHỦ
 * Ý KHÔNG có `lastCalibrationDate`/`nextCalibrationDueDate` (chỉ đổi qua
 * "Ghi nhận kiểm định", xem `CalibrationRecordModal`). `calibrationIntervalMonths`
 * bắt buộc khi `requiresCalibration=true` — ràng buộc PHỤ THUỘC field khác,
 * validate bằng `superRefine` (Zod object thường không diễn đạt được gọn),
 * cùng nguyên tắc backend validate ở tầng service (không phải DTO).
 */
const profileSchema = z
  .object({
    deviceClass: z.enum(MEDICAL_DEVICE_CLASSES),
    registrationNumber: z.string().trim().optional(),
    licenseExpiredAt: z.string().optional(),
    requiresCalibration: z.boolean(),
    calibrationIntervalMonths: z.string().optional(),
    operatorCertificateRequired: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.requiresCalibration && !data.calibrationIntervalMonths) {
      ctx.addIssue({
        code: "custom",
        path: ["calibrationIntervalMonths"],
        message: "Bắt buộc khi yêu cầu kiểm định định kỳ",
      });
    }
  });

type ProfileFormValues = z.infer<typeof profileSchema>;

interface MedicalDeviceProfileModalProps {
  open: boolean;
  onClose: () => void;
  assetId: string;
  /** `undefined` = tạo mới, có giá trị = sửa. */
  profile?: MedicalDeviceProfile;
}

const DEVICE_CLASS_LABEL: Record<MedicalDeviceClass, string> = {
  A: "A — rủi ro thấp",
  B: "B — rủi ro thấp-trung bình",
  C: "C — rủi ro trung bình-cao",
  D: "D — rủi ro cao",
};

/** `key={profile?._id ?? "create"}` ở nơi gọi đảm bảo remount đúng khi đổi mode (cùng pattern `AssetEditModal`). */
export function MedicalDeviceProfileModal({ open, onClose, assetId, profile }: MedicalDeviceProfileModalProps) {
  const createMutation = useCreateMedicalDeviceProfile();
  const updateMutation = useUpdateMedicalDeviceProfile();
  const mutation = profile ? updateMutation : createMutation;

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      deviceClass: profile?.deviceClass ?? "A",
      registrationNumber: profile?.registrationNumber ?? "",
      licenseExpiredAt: profile?.licenseExpiredAt ? profile.licenseExpiredAt.slice(0, 10) : "",
      requiresCalibration: profile?.requiresCalibration ?? false,
      calibrationIntervalMonths: profile?.calibrationIntervalMonths ? String(profile.calibrationIntervalMonths) : "",
      operatorCertificateRequired: profile?.operatorCertificateRequired ?? false,
    },
  });

  const { register, handleSubmit, control, formState } = form;
  const requiresCalibration = useWatch({ control, name: "requiresCalibration" });
  const apiError = mutation.error ? parseApiError(mutation.error) : null;

  function onSubmit(values: ProfileFormValues) {
    const body = {
      deviceClass: values.deviceClass,
      registrationNumber: values.registrationNumber || undefined,
      licenseExpiredAt: values.licenseExpiredAt || undefined,
      requiresCalibration: values.requiresCalibration,
      calibrationIntervalMonths: values.calibrationIntervalMonths ? Number(values.calibrationIntervalMonths) : undefined,
      operatorCertificateRequired: values.operatorCertificateRequired,
    };

    if (profile) {
      updateMutation.mutate(
        { assetId, body },
        {
          onSuccess: () => {
            toast.success("Đã cập nhật hồ sơ thiết bị y tế");
            onClose();
          },
        },
      );
    } else {
      createMutation.mutate(
        { assetId, body },
        {
          onSuccess: () => {
            toast.success("Đã tạo hồ sơ thiết bị y tế");
            onClose();
          },
        },
      );
    }
  }

  return (
    <AppModal open={open} onClose={onClose} title={profile ? "Sửa hồ sơ thiết bị y tế" : "Tạo hồ sơ thiết bị y tế"} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="mdp-class" className="text-sm font-medium text-foreground">
              Phân loại thiết bị
            </label>
            <select
              id="mdp-class"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("deviceClass")}
            >
              {MEDICAL_DEVICE_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {DEVICE_CLASS_LABEL[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mdp-regnum" className="text-sm font-medium text-foreground">
              Số đăng ký lưu hành
            </label>
            <input
              id="mdp-regnum"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("registrationNumber")}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mdp-license" className="text-sm font-medium text-foreground">
              Hạn giấy phép lưu hành
            </label>
            <input
              id="mdp-license"
              type="date"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("licenseExpiredAt")}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" className="size-4 rounded border-input" {...register("requiresCalibration")} />
          Yêu cầu kiểm định định kỳ theo luật
        </label>

        {requiresCalibration && (
          <div className="space-y-1.5 sm:max-w-xs">
            <label htmlFor="mdp-interval" className="text-sm font-medium text-foreground">
              Chu kỳ kiểm định (tháng)
            </label>
            <input
              id="mdp-interval"
              type="number"
              min={1}
              aria-invalid={!!formState.errors.calibrationIntervalMonths}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("calibrationIntervalMonths")}
            />
            {formState.errors.calibrationIntervalMonths && (
              <p className="text-xs text-destructive">{formState.errors.calibrationIntervalMonths.message}</p>
            )}
          </div>
        )}

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" className="size-4 rounded border-input" {...register("operatorCertificateRequired")} />
          Người vận hành cần chứng chỉ riêng
        </label>

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
