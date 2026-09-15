// controllers/assets/calibrationRecord.controller.ts
import { Request, Response } from "express";
import {
  createCalibrationRecordService,
  getCalibrationHistoryService,
  getCalibrationCertificateFileService,
  updateCalibrationCertificateService,
} from "../../services/assets/assetDevice/calibrationRecord.service";
import { catchAsync } from "../../shared/utils/catchAsync";

/**
 * CREATE — ghi nhận 1 lần kiểm định mới.
 */
export const createCalibrationRecord = catchAsync(
  async (req: Request, res: Response) => {
    const record = await createCalibrationRecordService(
      req.params.assetId,
      req.body,
      req.user?._id,
      req.file, // GIAI ĐOẠN 5 — file certificate (tuỳ chọn), undefined nếu client không gửi kèm file
    );

    res.status(201).json({
      message: "Ghi nhận kiểm định thành công",
      data: record,
    });
  },
);

/**
 * GET — lịch sử kiểm định (có phân trang).
 */
export const getCalibrationHistory = catchAsync(
  async (req: Request, res: Response) => {
    const result = await getCalibrationHistoryService(
      req.params.assetId,
      req.query,
    );

    res.json({
      message: "Lấy lịch sử kiểm định thành công",
      ...result,
    });
  },
);

/**
 * DOWNLOAD — nội dung file giấy chứng nhận kiểm định thật. (A2, 2026-09-15)
 */
export const downloadCalibrationCertificate = catchAsync(
  async (req: Request, res: Response) => {
    const { filePath, fileName } = await getCalibrationCertificateFileService(
      req.params.assetId,
      req.params.recordId,
    );

    res.download(filePath, fileName);
  },
);

/**
 * UPDATE CERTIFICATE — thay thế file/link chứng nhận đã lưu (sửa lỗi upload
 * nhầm file), theo yêu cầu user sau khi hoàn thành A2 gốc.
 */
export const updateCalibrationCertificate = catchAsync(
  async (req: Request, res: Response) => {
    const record = await updateCalibrationCertificateService(
      req.params.assetId,
      req.params.recordId,
      req.body,
      req.user?._id,
      req.file,
    );

    res.json({
      message: "Cập nhật giấy chứng nhận thành công",
      data: record,
    });
  },
);
