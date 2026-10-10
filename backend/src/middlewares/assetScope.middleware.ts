// middlewares/assetScope.middleware.ts
//
// DEV-115 (tách module Tài sản, Giai đoạn 4 — docs/development/ASSET_MODULE_SPLIT_PLAN.md mục 4.3).
// Cô lập theo loại cho `/api/it-assets` và `/api/medical-assets`: tài sản / danh mục / kế hoạch bảo trì /
// chứng chỉ thuộc loại khác bị coi là KHÔNG TỒN TẠI (404), không lộ sự tồn tại dữ liệu của module kia.
//
// `setAssetScope(type)` gắn loại vào `res.locals`; các controller dùng chung đọc `getAssetScope(res)` để
// truyền xuống service (undefined trên route dùng chung cho cả hai loại, vd dashboard tổng hợp -> không lọc).
// Các `require*InScope` chạy SAU `validateParams` và TRƯỚC controller trên mọi route có id.

import type { NextFunction, Request, RequestHandler, Response } from "express";
import { AssetType } from "../interfaces/assets/asset.interface";
import { AssetMaintenancePlan } from "../models/assets/assetMaintenancePlan.model";
import { OperatorCertificate } from "../models/medicalDevices/operatorCertificate.model";
import { ASSET_VIEW_PERMISSION_BY_TYPE, assertAssetOfType, assertCategoryOfType } from "../services/assets/assetType.helper";
import { authorizePermission } from "./authorizePermission.middleware";
import ApiError from "../shared/errors/ApiError";

export const setAssetScope =
  (assetType: AssetType): RequestHandler =>
  (_req, res, next) => {
    res.locals.assetType = assetType;
    next();
  };

/** Loại của module đang xử lý request; `undefined` trên route dùng chung cho cả hai loại. */
export const getAssetScope = (res: Response): AssetType | undefined => res.locals.assetType as AssetType | undefined;

/** Đánh dấu để test duyệt router và chắc chắn mọi route có id đều có chốt cô lập. */
export const SCOPE_GUARD_MARK = "isAssetScopeGuard";

const scoped = (check: (id: string, assetType: AssetType) => Promise<void>, param: string): RequestHandler => {
  const handler: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const assetType = getAssetScope(res);
      if (!assetType) throw new Error("assetScope: route chưa gắn setAssetScope");
      await check(String(req.params[param]), assetType);
      next();
    } catch (err) {
      next(err);
    }
  };
  return Object.assign(handler, { [SCOPE_GUARD_MARK]: true });
};

/** `req.params[param]` phải là tài sản thuộc loại của module (kể cả đã xoá mềm). */
export const requireAssetInScope = (param = "id"): RequestHandler =>
  scoped((id, type) => assertAssetOfType(id, type), param);

/** `req.params[param]` phải là danh mục thuộc nhánh của module (kể cả đã xoá mềm). */
export const requireCategoryInScope = (param = "id"): RequestHandler =>
  scoped((id, type) => assertCategoryOfType(id, type), param);

/** `req.params[param]` là kế hoạch bảo trì của tài sản thuộc loại của module. */
export const requireMaintenancePlanInScope = (param = "id"): RequestHandler =>
  scoped(async (id, type) => {
    const plan = await AssetMaintenancePlan.findById(id).select("asset").lean();
    if (!plan) throw ApiError.notFound("Không tìm thấy kế hoạch bảo trì");
    await assertAssetOfType(plan.asset, type).catch(() => {
      throw ApiError.notFound("Không tìm thấy kế hoạch bảo trì");
    });
  }, param);

/** `req.params[param]` là chứng chỉ vận hành có danh mục thiết bị thuộc nhánh của module. */
export const requireOperatorCertificateInScope = (param = "id"): RequestHandler =>
  scoped(async (id, type) => {
    const cert = await OperatorCertificate.findById(id).select("deviceCategory").lean();
    if (!cert) throw ApiError.notFound("Không tìm thấy chứng chỉ vận hành");
    await assertCategoryOfType(cert.deviceCategory, type).catch(() => {
      throw ApiError.notFound("Không tìm thấy chứng chỉ vận hành");
    });
  }, param);

/**
 * Route DÙNG CHUNG cho cả hai loại (vd dashboard tổng hợp `/api/dashboard/assets/*`) nhận `?assetType=IT|MEDICAL`
 * (GĐ 6). Không truyền -> không lọc, giữ hành vi tổng hợp cũ. Có truyền: sai giá trị -> 400; đúng thì yêu cầu thêm
 * quyền xem đúng loại (IT_ASSET_VIEW / MEDICAL_ASSET_VIEW, thiếu -> 403) rồi gắn loại vào `res.locals`
 * để controller đọc bằng `getAssetScope(res)`. Đặt SAU `authenticate` và quyền chung của route.
 */
export const authorizeAssetTypeQuery = (): RequestHandler => (req, res, next) => {
  const raw = req.query.assetType;
  if (raw === undefined || raw === "") return next();
  if (typeof raw !== "string" || !Object.values(AssetType).includes(raw as AssetType)) {
    return next(ApiError.badRequest("assetType không hợp lệ (chỉ nhận IT hoặc MEDICAL)"));
  }
  const assetType = raw as AssetType;
  res.locals.assetType = assetType;
  return authorizePermission(ASSET_VIEW_PERMISSION_BY_TYPE[assetType])(req, res, next);
};
