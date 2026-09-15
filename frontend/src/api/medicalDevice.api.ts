import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { Pagination } from "@/types/shared.types";
import type {
  MedicalDeviceProfile,
  CreateMedicalDeviceProfileRequest,
  UpdateMedicalDeviceProfileRequest,
  CalibrationRecordItem,
  CreateCalibrationRecordRequest,
  GetCalibrationHistoryParams,
  UpdateCalibrationCertificateRequest,
} from "@/types/medicalDevice.types";

/**
 * API layer domain Medical Device — mount tại `/api/assets/medical-devices`
 * (`app.ts:118`), mọi route theo `:assetId` (KHÔNG có `profileId` riêng).
 * Response envelope: `{message, data}` hoặc `{message, data, pagination}` —
 * KHÔNG có `success` (đã xác nhận trực tiếp `medicalDevice.controller.ts`/
 * `calibrationRecord.controller.ts`, cùng convention với domain Asset).
 */
export function getMedicalDeviceProfile(
  assetId: string,
): Promise<AxiosResponse<{ message: string; data: MedicalDeviceProfile }>> {
  return axiosInstance.get(`/assets/medical-devices/${assetId}/profile`);
}

export function createMedicalDeviceProfile(
  assetId: string,
  body: CreateMedicalDeviceProfileRequest,
): Promise<AxiosResponse<{ message: string; data: MedicalDeviceProfile }>> {
  return axiosInstance.post(`/assets/medical-devices/${assetId}/profile`, body);
}

export function updateMedicalDeviceProfile(
  assetId: string,
  body: UpdateMedicalDeviceProfileRequest,
): Promise<AxiosResponse<{ message: string; data: MedicalDeviceProfile }>> {
  return axiosInstance.put(`/assets/medical-devices/${assetId}/profile`, body);
}

export function getCalibrationHistory(
  assetId: string,
  params: GetCalibrationHistoryParams,
): Promise<AxiosResponse<{ message: string; data: CalibrationRecordItem[]; pagination: Pagination }>> {
  return axiosInstance.get(`/assets/medical-devices/${assetId}/calibration-records`, { params });
}

/**
 * (A2, roadmap) `certificateFile` giờ TUỲ CHỌN — khi truyền vào, gửi
 * `multipart/form-data` (đúng field `certificateFile` mà `certificateUploader`
 * backend nhận, xem `medicalDevice.routes.ts`); không truyền thì gửi JSON
 * thuần như trước (nhánh `certificateFileUrl` nhập tay không đổi hành vi).
 * Nới timeout riêng khi có file — cùng lý do `uploadFiles` (files.api.ts).
 */
export function createCalibrationRecord(
  assetId: string,
  body: CreateCalibrationRecordRequest,
  certificateFile?: File,
): Promise<AxiosResponse<{ message: string; data: CalibrationRecordItem }>> {
  if (certificateFile) {
    const formData = new FormData();
    formData.append("calibratedAt", body.calibratedAt);
    formData.append("calibratedBy", body.calibratedBy);
    formData.append("result", body.result);
    formData.append("nextDueDate", body.nextDueDate);
    formData.append("certificateFile", certificateFile);
    return axiosInstance.post(`/assets/medical-devices/${assetId}/calibration-records`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    });
  }
  return axiosInstance.post(`/assets/medical-devices/${assetId}/calibration-records`, body);
}

/**
 * (A2, roadmap) Tải file giấy chứng nhận kiểm định thật — CHỈ dùng được khi
 * `CalibrationRecordItem.certificateFileId` có giá trị (xem type). Trả PNG/
 * PDF thô (KHÔNG bọc JSON) — cùng pattern `downloadFile` (files.api.ts).
 */
export function downloadCalibrationCertificate(
  assetId: string,
  recordId: string,
): Promise<AxiosResponse<Blob>> {
  return axiosInstance.get(
    `/assets/medical-devices/${assetId}/calibration-records/${recordId}/certificate/download`,
    { responseType: "blob" },
  );
}

/**
 * Thay thế chứng nhận đã lưu — sửa lỗi upload nhầm file, bổ sung sau A2 theo
 * yêu cầu user. Cùng logic multipart-khi-có-file/JSON-khi-có-link với
 * `createCalibrationRecord` phía trên.
 */
export function updateCalibrationCertificate(
  assetId: string,
  recordId: string,
  body: UpdateCalibrationCertificateRequest,
  certificateFile?: File,
): Promise<AxiosResponse<{ message: string; data: CalibrationRecordItem }>> {
  const url = `/assets/medical-devices/${assetId}/calibration-records/${recordId}/certificate`;
  if (certificateFile) {
    const formData = new FormData();
    formData.append("certificateFile", certificateFile);
    return axiosInstance.put(url, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 60_000,
    });
  }
  return axiosInstance.put(url, body);
}
