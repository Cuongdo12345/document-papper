// controllers/assets/calibrationRecord.controller.ts
import { Request, Response } from "express";
import {
  createCalibrationRecordService,
  getCalibrationHistoryService,
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
