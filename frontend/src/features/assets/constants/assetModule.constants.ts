import { PERMISSIONS, type Permission } from "@/constants/permissions";
import type { AssetType } from "@/types/asset.types";

/**
 * FE-42 (tách module Tài sản, Giai đoạn 7 — docs/development/ASSET_MODULE_SPLIT_PLAN.md mục 4.7).
 * MỘT bộ trang/hook dùng chung cho hai module "Thiết bị CNTT" và "Thiết bị y tế", tham số hoá bằng `assetType`
 * thay vì chép trang. Mọi khác biệt (đường dẫn API, đường dẫn trang, bộ quyền) khai báo ở ĐÂY, một chỗ duy nhất.
 */
export interface AssetModulePermissions {
  view: Permission;
  viewDetail: Permission;
  create: Permission;
  update: Permission;
  delete: Permission;
  deletePermanent: Permission;
  assign: Permission;
  dispose: Permission;
  alertsTrigger: Permission;
  excelExport: Permission;
  excelImport: Permission;
  inventoryCheck: Permission;
  planView: Permission;
  planCreate: Permission;
  planUpdate: Permission;
  categoryView: Permission;
  categoryCreate: Permission;
  categoryUpdate: Permission;
  categoryDelete: Permission;
  categoryDeletePermanent: Permission;
}

export interface AssetModuleConfig {
  type: AssetType;
  /** Nhãn đầy đủ: tiêu đề trang, mục sidebar. */
  label: string;
  /** Đường dẫn API sau `/api`, vd `/it-assets`. */
  apiBase: string;
  /** Đường dẫn trang, vd `/app/it-assets`. */
  routeBase: string;
  permissions: AssetModulePermissions;
}

export const ASSET_MODULES: Record<AssetType, AssetModuleConfig> = {
  IT: {
    type: "IT",
    label: "Thiết bị CNTT",
    apiBase: "/it-assets",
    routeBase: "/app/it-assets",
    permissions: {
      view: PERMISSIONS.IT_ASSET_VIEW,
      viewDetail: PERMISSIONS.IT_ASSET_VIEW_DETAIL,
      create: PERMISSIONS.IT_ASSET_CREATE,
      update: PERMISSIONS.IT_ASSET_UPDATE,
      delete: PERMISSIONS.IT_ASSET_DELETE,
      deletePermanent: PERMISSIONS.IT_ASSET_DELETE_PERMANENT,
      assign: PERMISSIONS.IT_ASSET_ASSIGN,
      dispose: PERMISSIONS.IT_ASSET_DISPOSE,
      alertsTrigger: PERMISSIONS.IT_ASSET_ALERTS_TRIGGER,
      excelExport: PERMISSIONS.IT_ASSET_EXCEL_EXPORT,
      excelImport: PERMISSIONS.IT_ASSET_EXCEL_IMPORT,
      inventoryCheck: PERMISSIONS.IT_ASSET_INVENTORY_CHECK,
      planView: PERMISSIONS.IT_ASSET_MAINTENANCE_PLAN_VIEW,
      planCreate: PERMISSIONS.IT_ASSET_MAINTENANCE_PLAN_CREATE,
      planUpdate: PERMISSIONS.IT_ASSET_MAINTENANCE_PLAN_UPDATE,
      categoryView: PERMISSIONS.IT_ASSET_CATEGORY_VIEW,
      categoryCreate: PERMISSIONS.IT_ASSET_CATEGORY_CREATE,
      categoryUpdate: PERMISSIONS.IT_ASSET_CATEGORY_UPDATE,
      categoryDelete: PERMISSIONS.IT_ASSET_CATEGORY_DELETE,
      categoryDeletePermanent: PERMISSIONS.IT_ASSET_CATEGORY_DELETE_PERMANENT,
    },
  },
  MEDICAL: {
    type: "MEDICAL",
    label: "Thiết bị y tế",
    apiBase: "/medical-assets",
    routeBase: "/app/medical-assets",
    permissions: {
      view: PERMISSIONS.MEDICAL_ASSET_VIEW,
      viewDetail: PERMISSIONS.MEDICAL_ASSET_VIEW_DETAIL,
      create: PERMISSIONS.MEDICAL_ASSET_CREATE,
      update: PERMISSIONS.MEDICAL_ASSET_UPDATE,
      delete: PERMISSIONS.MEDICAL_ASSET_DELETE,
      deletePermanent: PERMISSIONS.MEDICAL_ASSET_DELETE_PERMANENT,
      assign: PERMISSIONS.MEDICAL_ASSET_ASSIGN,
      dispose: PERMISSIONS.MEDICAL_ASSET_DISPOSE,
      alertsTrigger: PERMISSIONS.MEDICAL_ASSET_ALERTS_TRIGGER,
      excelExport: PERMISSIONS.MEDICAL_ASSET_EXCEL_EXPORT,
      excelImport: PERMISSIONS.MEDICAL_ASSET_EXCEL_IMPORT,
      inventoryCheck: PERMISSIONS.MEDICAL_ASSET_INVENTORY_CHECK,
      planView: PERMISSIONS.MEDICAL_ASSET_MAINTENANCE_PLAN_VIEW,
      planCreate: PERMISSIONS.MEDICAL_ASSET_MAINTENANCE_PLAN_CREATE,
      planUpdate: PERMISSIONS.MEDICAL_ASSET_MAINTENANCE_PLAN_UPDATE,
      categoryView: PERMISSIONS.MEDICAL_ASSET_CATEGORY_VIEW,
      categoryCreate: PERMISSIONS.MEDICAL_ASSET_CATEGORY_CREATE,
      categoryUpdate: PERMISSIONS.MEDICAL_ASSET_CATEGORY_UPDATE,
      categoryDelete: PERMISSIONS.MEDICAL_ASSET_CATEGORY_DELETE,
      categoryDeletePermanent: PERMISSIONS.MEDICAL_ASSET_CATEGORY_DELETE_PERMANENT,
    },
  },
};

export const ASSET_MODULE_LIST: AssetModuleConfig[] = [ASSET_MODULES.IT, ASSET_MODULES.MEDICAL];

/** Đường dẫn trang chi tiết tài sản theo loại, vd `/app/it-assets/<id>`. */
export function assetDetailPath(type: AssetType, id: string): string {
  return `${ASSET_MODULES[type].routeBase}/${id}`;
}
