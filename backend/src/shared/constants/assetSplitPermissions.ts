// shared/constants/assetSplitPermissions.ts
//
// TÁCH MODULE TÀI SẢN (docs/development/ASSET_MODULE_SPLIT_PLAN.md, Giai đoạn 3 — DEV-114).
// Nguồn DUY NHẤT cho 46 quyền mới: (1) metadata để seed vào Permission catalog DB,
// (2) ánh xạ role đích (mục 4.4 của kế hoạch, kèm 2 quyết định của user ngày 2026-10-08:
// IT được cấp đủ quyền nhánh CNTT; IT được `IT_ASSET_DISPOSE`).
//
// `rolePermission.map.ts` spread từ `ASSET_SPLIT_ROLE_PERMISSIONS` (dữ liệu khởi tạo / e2e),
// còn DB dev/production được cập nhật bằng `scripts/seed-asset-split-permissions.ts`
// (cộng thêm, không ghi đè quyền khác của role — DB/UI "Phân quyền" mới là nguồn sự thật, DEV-041).
//
// Quyền xoá vĩnh viễn (`*_DELETE_PERMANENT`) CỐ TÌNH không gán cho role nào ngoài ADMIN,
// giữ nguyên tinh thần quyền xoá vĩnh viễn cũ (đã gỡ ở GĐ 8).

import { PERMISSIONS } from "./permission.constant";

export const ASSET_SPLIT_PERMISSION_NAMES: string[] = Object.values(PERMISSIONS).filter((name) =>
  /^(IT_ASSET|MEDICAL_ASSET|SOFTWARE_LICENSE)_/.test(name),
);

export interface AssetSplitPermissionMeta {
  name: string;
  /** Nhóm hiển thị ở màn "Phân quyền" (ma trận nhóm theo `resource`). */
  resource: string;
  action: string;
  description: string;
}

const ASSET_ACTIONS: Record<string, string> = {
  VIEW: "Xem danh sách {T}",
  VIEW_DETAIL: "Xem chi tiết {T}",
  CREATE: "Tạo {T} mới",
  UPDATE: "Cập nhật {T}",
  DELETE: "Xóa (mềm) {T}",
  DELETE_PERMANENT: "Xóa vĩnh viễn {T} (rủi ro cao — chỉ thực hiện được sau khi đã xóa mềm)",
  ASSIGN: "Cấp phát / luân chuyển / thu hồi {T}",
  DISPOSE: "Thanh lý {T} (qua quy trình duyệt document)",
  ALERTS_TRIGGER: "Chạy tay cảnh báo bảo hành/bảo trì {T}",
  EXCEL_EXPORT: "Xuất {T} ra file Excel",
  EXCEL_IMPORT: "Nhập {T} hàng loạt từ file Excel",
  INVENTORY_CHECK: "Kiểm kê {T} qua quét QR / check-in",
  MAINTENANCE_PLAN_VIEW: "Xem lịch bảo trì chủ động {T}",
  MAINTENANCE_PLAN_CREATE: "Tạo lịch bảo trì chủ động cho {T}",
  MAINTENANCE_PLAN_UPDATE: "Cập nhật lịch bảo trì chủ động {T} (gồm cả sửa/hoàn tất/huỷ)",
};

const CATEGORY_ACTIONS: Record<string, string> = {
  VIEW: "Xem danh sách danh mục {T}",
  CREATE: "Tạo danh mục {T} mới",
  UPDATE: "Cập nhật danh mục {T}",
  DELETE: "Xóa (mềm) danh mục {T}",
  DELETE_PERMANENT: "Xóa vĩnh viễn danh mục {T} (rủi ro cao)",
};

const LICENSE_ACTIONS: Record<string, string> = {
  VIEW: "Xem danh mục bản quyền phần mềm",
  CREATE: "Tạo bản quyền phần mềm mới",
  UPDATE: "Cập nhật bản quyền phần mềm",
  DELETE: "Xóa (mềm) bản quyền phần mềm",
  ASSIGN: "Gán / gỡ bản quyền phần mềm cho máy",
  ALERTS_TRIGGER: "Chạy tay cảnh báo bản quyền phần mềm sắp hết hạn",
};

const fill = (template: string, label: string) => template.replace("{T}", label);

function buildMeta(): AssetSplitPermissionMeta[] {
  const groups: { prefix: string; resource: string; actions: Record<string, string>; label: string }[] = [
    { prefix: "IT_ASSET", resource: "IT_ASSET", actions: ASSET_ACTIONS, label: "thiết bị CNTT" },
    { prefix: "IT_ASSET_CATEGORY", resource: "IT_ASSET", actions: CATEGORY_ACTIONS, label: "thiết bị CNTT" },
    { prefix: "MEDICAL_ASSET", resource: "MEDICAL_ASSET", actions: ASSET_ACTIONS, label: "thiết bị y tế" },
    { prefix: "MEDICAL_ASSET_CATEGORY", resource: "MEDICAL_ASSET", actions: CATEGORY_ACTIONS, label: "thiết bị y tế" },
    { prefix: "SOFTWARE_LICENSE", resource: "SOFTWARE_LICENSE", actions: LICENSE_ACTIONS, label: "" },
  ];
  const result: AssetSplitPermissionMeta[] = [];
  for (const g of groups) {
    for (const [suffix, template] of Object.entries(g.actions)) {
      const name = `${g.prefix}_${suffix}`;
      if (!ASSET_SPLIT_PERMISSION_NAMES.includes(name)) {
        throw new Error(`assetSplitPermissions: ${name} chưa khai báo trong PERMISSIONS`);
      }
      const action = name.slice(g.resource.length + 1);
      result.push({ name, resource: g.resource, action, description: fill(template, g.label) });
    }
  }
  return result;
}

export const ASSET_SPLIT_PERMISSION_META: AssetSplitPermissionMeta[] = buildMeta();

if (ASSET_SPLIT_PERMISSION_META.length !== ASSET_SPLIT_PERMISSION_NAMES.length) {
  throw new Error("assetSplitPermissions: metadata không phủ hết các quyền tách module tài sản");
}

const names = (prefix: string, suffixes: string[]): string[] => suffixes.map((s) => `${prefix}_${s}`);

const ASSET_ALL = Object.keys(ASSET_ACTIONS);
const ASSET_NO_PERMANENT = ASSET_ALL.filter((s) => s !== "DELETE_PERMANENT");
const CATEGORY_ALL = Object.keys(CATEGORY_ACTIONS);
const CATEGORY_NO_PERMANENT = CATEGORY_ALL.filter((s) => s !== "DELETE_PERMANENT");
const VIEW_ONLY = ["VIEW", "VIEW_DETAIL"];

/**
 * Quyền MỚI (trong 46 quyền tách module) mà từng role được nhận. ADMIN nhận toàn bộ qua wildcard
 * `Object.values(PERMISSIONS)` nên không liệt kê ở đây.
 */
export const ASSET_SPLIT_ROLE_PERMISSIONS: Record<string, string[]> = {
  // IT: quản lý thiết bị CNTT (D3) + bản quyền; thiết bị y tế chỉ xem (Q-F).
  IT: [
    ...names("IT_ASSET", ASSET_NO_PERMANENT),
    ...names("IT_ASSET_CATEGORY", CATEGORY_NO_PERMANENT),
    ...names("SOFTWARE_LICENSE", Object.keys(LICENSE_ACTIONS)),
    ...names("MEDICAL_ASSET", VIEW_ONLY),
    "MEDICAL_ASSET_CATEGORY_VIEW",
  ],
  // Phòng Vật tư-TTB: quản lý thiết bị y tế (D3, mức hiện có của ASSET_*); thiết bị CNTT chỉ xem (Q-F).
  PHONG_VAT_TU_TTB: [
    ...names("MEDICAL_ASSET", ASSET_NO_PERMANENT),
    ...names("MEDICAL_ASSET_CATEGORY", CATEGORY_NO_PERMANENT),
    ...names("IT_ASSET", VIEW_ONLY),
    "IT_ASSET_CATEGORY_VIEW",
  ],
  // USER: giữ đúng mức ASSET_* hiện tại (xem, xem chi tiết, kiểm kê QR, xem danh mục) cho cả hai loại.
  USER: [
    ...names("IT_ASSET", [...VIEW_ONLY, "INVENTORY_CHECK"]),
    "IT_ASSET_CATEGORY_VIEW",
    ...names("MEDICAL_ASSET", [...VIEW_ONLY, "INVENTORY_CHECK"]),
    "MEDICAL_ASSET_CATEGORY_VIEW",
  ],
  // Lãnh đạo / trưởng khoa / điều dưỡng trưởng: chỉ xem cả hai loại (như ASSET_VIEW/ASSET_VIEW_DETAIL trước GĐ 8).
  TRUONG_KHOA: [...names("IT_ASSET", VIEW_ONLY), ...names("MEDICAL_ASSET", VIEW_ONLY)],
  DIEU_DUONG_TRUONG: [...names("IT_ASSET", VIEW_ONLY), ...names("MEDICAL_ASSET", VIEW_ONLY)],
  BAN_GIAM_DOC: [...names("IT_ASSET", VIEW_ONLY), ...names("MEDICAL_ASSET", VIEW_ONLY)],
};

for (const [role, list] of Object.entries(ASSET_SPLIT_ROLE_PERMISSIONS)) {
  for (const name of list) {
    if (!ASSET_SPLIT_PERMISSION_NAMES.includes(name)) {
      throw new Error(`assetSplitPermissions: role ${role} tham chiếu quyền không tồn tại: ${name}`);
    }
  }
}
