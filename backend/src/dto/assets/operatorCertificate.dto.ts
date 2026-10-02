// dto/assets/operatorCertificate.dto.ts
//
// MODULE MỚI (DEV-077) — xem `interfaces/assets/operatorCertificate.interface.ts`.
import { z } from "zod";
import { objectId } from "../common.dto";

export const CreateOperatorCertificateDTO = z
  .object({
    user: objectId("user không hợp lệ"),
    deviceCategory: objectId("deviceCategory không hợp lệ"),
    certificateNumber: z.string().trim().optional(),
    issuedAt: z.coerce.date(),
    expiresAt: z.coerce.date(),
  })
  .refine((data) => data.expiresAt > data.issuedAt, {
    message: "Hạn chứng chỉ (expiresAt) phải sau ngày cấp (issuedAt)",
    path: ["expiresAt"],
  });

export const QueryOperatorCertificateDTO = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  user: objectId().optional(),
  deviceCategory: objectId().optional(),
  /** true = chỉ liệt kê chứng chỉ CÒN HẠN (expiresAt > now) — dùng cho FE picker "người đủ điều kiện". */
  validOnly: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

/** Dùng cho `GET /operator-certificates/certified-users` — deviceCategory bắt buộc. */
export const CertifiedUsersQueryDTO = z.object({
  deviceCategory: objectId("deviceCategory không hợp lệ"),
});

/**
 * [MỚI DEV-078] "Sửa" — CHỈ field `certificateNumber` (xem giải thích ở
 * `interfaces/assets/operatorCertificate.interface.ts`). Bắt buộc có mặt
 * trong body (có thể chuỗi rỗng để xoá số cũ), KHÔNG optional — tránh PATCH
 * rỗng không làm gì.
 */
export const UpdateOperatorCertificateDTO = z.object({
  certificateNumber: z.string().trim(),
});

/** [MỚI DEV-078] "Thu hồi" — BẮT BUỘC lý do (khác "Xoá", xem giải thích interface). */
export const RevokeOperatorCertificateDTO = z.object({
  reason: z.string().trim().min(1, "Vui lòng nhập lý do thu hồi"),
});
