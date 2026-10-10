import type { Request, Response } from "express";
import { catchAsync } from "../../shared/utils/catchAsync";
import { getAssetLookupOptionByIdService, getAssetLookupOptionsService, getViewableAssetTypes } from "../../services/assets/assetDevice/assetLookup.service";

/**
 * GET /api/assets/lookup-options — tra cứu tài sản dùng chung cho Tài liệu / Hợp đồng (GĐ 6).
 * Quyền ở route: IT_ASSET_VIEW hoặc MEDICAL_ASSET_VIEW; loại trả về giới hạn theo quyền thật của người gọi.
 */
export const getAssetLookupOptions = catchAsync(async (req: Request, res: Response) => {
  const viewableTypes = await getViewableAssetTypes(req.user!);
  const result = await getAssetLookupOptionsService(req.query as any, viewableTypes);

  res.json({
    message: "Danh sách tài sản để chọn",
    ...result,
  });
});

/** GET /api/assets/lookup-options/:id — xem `getAssetLookupOptionByIdService`. */
export const getAssetLookupOptionById = catchAsync(async (req: Request, res: Response) => {
  const viewableTypes = await getViewableAssetTypes(req.user!);
  const data = await getAssetLookupOptionByIdService(String(req.params.id), viewableTypes);

  res.json({ message: "Thông tin tài sản", data });
});
