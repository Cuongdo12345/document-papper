import { Request, Response } from "express";
import {
  assignAssetService,
  transferAssetService,
  returnAssetService,
  getAssetAssignmentHistoryService,
} from "../../services/assets/assetDevice/assetAssignment.service";
import { catchAsync } from "../../shared/utils/catchAsync";

/**
 * ASSIGN — cấp phát tài sản từ kho cho khoa/phòng (và tuỳ chọn user)
 */
export const assignAsset = catchAsync(
  async (req: Request, res: Response) => {
    const asset = await assignAssetService(
      req.params.id,
      req.body,
      req.user?._id,
    );

    res.json({
      message: "Cấp phát tài sản thành công",
      data: asset,
    });
  },
);

/**
 * TRANSFER — luân chuyển tài sản đang sử dụng sang khoa/phòng hoặc user khác
 */
export const transferAsset = catchAsync(
  async (req: Request, res: Response) => {
    const asset = await transferAssetService(
      req.params.id,
      req.body,
      req.user?._id,
    );

    res.json({
      message: "Luân chuyển tài sản thành công",
      data: asset,
    });
  },
);

/**
 * RETURN — thu hồi tài sản về kho
 */
export const returnAsset = catchAsync(
  async (req: Request, res: Response) => {
    const asset = await returnAssetService(
      req.params.id,
      req.body,
      req.user?._id,
    );

    res.json({
      message: "Thu hồi tài sản thành công",
      data: asset,
    });
  },
);

/**
 * GET ASSIGNMENT HISTORY — lịch sử cấp phát/luân chuyển/thu hồi của 1 asset
 */
export const getAssetAssignmentHistory = catchAsync(
  async (req: Request, res: Response) => {
    const result = await getAssetAssignmentHistoryService(
      req.params.id,
      req.query,
    );

    res.json({
      message: "Lấy lịch sử cấp phát/luân chuyển tài sản thành công",
      ...result,
    });
  },
);
