/**
 * [MỚI, DEV-077] Theo dõi chứng chỉ vận hành thiết bị y tế — khớp
 * `operatorCertificate.model.ts`/`operatorCertificate.dto.ts` (backend),
 * không suy đoán field. Gắn với 1 User cụ thể + 1 AssetCategory (danh mục
 * thiết bị, KHÔNG theo từng Asset) — quyết định đã xác nhận với user qua
 * AskUserQuestion (2026-09-24).
 * [CẬP NHẬT DEV-078] Ngày cấp/hạn vẫn append-only (không sửa được), nhưng
 * bản ghi giờ có thể: sửa `certificateNumber`, thu hồi (bắt buộc lý do),
 * hoặc xoá mềm (lỗi nhập liệu, không bắt buộc lý do) — xem
 * `isActive`/`revokedAt`/`revokedReason`/`deletedAt`.
 */
export interface OperatorCertificate {
  _id: string;
  user: string | { _id: string; username: string; fullName: string; email?: string };
  deviceCategory: string | { _id: string; code: string; name: string };
  certificateNumber?: string;
  issuedAt: string;
  expiresAt: string;
  /** Chỉ server set (chống gửi trùng cảnh báo hết hạn) — không gửi qua request body. */
  alertSentAt?: string;
  recordedBy?: string | { _id: string; username: string; fullName: string };
  /** [MỚI DEV-078] `false` = đã bị thu hồi hoặc xoá mềm — không còn tính là hợp lệ dù chưa hết hạn tự nhiên. */
  isActive?: boolean;
  revokedAt?: string;
  revokedBy?: string | { _id: string; username: string; fullName: string };
  revokedReason?: string;
  deletedAt?: string;
  deletedBy?: string | { _id: string; username: string; fullName: string };
  createdAt: string;
  updatedAt: string;
}

/** Khớp `CreateOperatorCertificateDTO`. */
export interface CreateOperatorCertificateRequest {
  user: string;
  deviceCategory: string;
  certificateNumber?: string;
  issuedAt: string;
  expiresAt: string;
}

/** [MỚI DEV-078] Khớp `UpdateOperatorCertificateDTO` — CHỈ certificateNumber. */
export interface UpdateOperatorCertificateRequest {
  certificateNumber: string;
}

/** [MỚI DEV-078] Khớp `RevokeOperatorCertificateDTO` — reason bắt buộc. */
export interface RevokeOperatorCertificateRequest {
  reason: string;
}

export interface GetOperatorCertificatesParams {
  page?: number;
  limit?: number;
  user?: string;
  deviceCategory?: string;
  validOnly?: boolean;
}
