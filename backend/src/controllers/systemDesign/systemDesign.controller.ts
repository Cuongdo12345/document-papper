import { Request, Response } from "express";
import { catchAsync } from "../../shared/utils/catchAsync";
import { getSystemDesignService } from "../../services/systemDesign/systemDesign.service";

/**
 * DEV-073 (2026-09-21) — `GET /api/system-design`, gate `SYSTEM_DESIGN_VIEW`
 * (route). Trả bản đồ module/model/quan hệ đọc TRỰC TIẾP từ Mongoose schema
 * đang chạy — không có input, không có side-effect, không đọc DB thật
 * (chỉ đọc metadata schema đã compile sẵn trong process).
 */
export const getSystemDesign = catchAsync(async (_req: Request, res: Response) => {
  const data = getSystemDesignService();

  res.json({
    success: true,
    data,
  });
});
