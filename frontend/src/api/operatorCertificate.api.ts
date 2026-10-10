import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import { MEDICAL_ASSETS_API } from "@/api/assetPaths";
import type { Pagination } from "@/types/shared.types";
import type {
  OperatorCertificate,
  CreateOperatorCertificateRequest,
  UpdateOperatorCertificateRequest,
  RevokeOperatorCertificateRequest,
  GetOperatorCertificatesParams,
} from "@/types/operatorCertificate.types";

/**
 * [MỚI, DEV-077] API layer domain Operator Certificate — mount tại
 * `/api/medical-assets/operator-certificates` (GĐ 8: route cũ `/api/operator-certificates` đã gỡ). Response envelope: `{message,
 * data}` hoặc `{message, data, pagination}` — cùng convention
 * `medicalDevice.api.ts`/`vendor.api.ts`.
 */
export function createOperatorCertificate(
  body: CreateOperatorCertificateRequest,
): Promise<AxiosResponse<{ message: string; data: OperatorCertificate }>> {
  return axiosInstance.post(`${MEDICAL_ASSETS_API}/operator-certificates`, body);
}

export function getOperatorCertificates(
  params: GetOperatorCertificatesParams,
): Promise<AxiosResponse<{ message: string; data: OperatorCertificate[]; pagination: Pagination }>> {
  return axiosInstance.get(`${MEDICAL_ASSETS_API}/operator-certificates`, { params });
}

/**
 * Danh sách user hiện có chứng chỉ hợp lệ cho 1 danh mục thiết bị — dùng
 * cho picker khi cấp phát/chuyển giao thiết bị yêu cầu chứng chỉ vận hành.
 */
export function getCertifiedUsersForCategory(
  deviceCategory: string,
): Promise<AxiosResponse<{ message: string; data: OperatorCertificate[] }>> {
  return axiosInstance.get(`${MEDICAL_ASSETS_API}/operator-certificates/certified-users`, { params: { deviceCategory } });
}

/** [MỚI DEV-078] Sửa — CHỈ certificateNumber. */
export function updateOperatorCertificate(
  id: string,
  body: UpdateOperatorCertificateRequest,
): Promise<AxiosResponse<{ message: string; data: OperatorCertificate }>> {
  return axiosInstance.patch(`${MEDICAL_ASSETS_API}/operator-certificates/${id}`, body);
}

/** [MỚI DEV-078] Thu hồi — bắt buộc lý do. */
export function revokeOperatorCertificate(
  id: string,
  body: RevokeOperatorCertificateRequest,
): Promise<AxiosResponse<{ message: string; data: OperatorCertificate }>> {
  return axiosInstance.patch(`${MEDICAL_ASSETS_API}/operator-certificates/${id}/revoke`, body);
}

/** [MỚI DEV-078] Xoá mềm — lỗi nhập liệu, không bắt buộc lý do. */
export function deleteOperatorCertificate(
  id: string,
): Promise<AxiosResponse<{ message: string }>> {
  return axiosInstance.delete(`${MEDICAL_ASSETS_API}/operator-certificates/${id}`);
}
