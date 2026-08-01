/**
 * assets.constants.ts — whitelist field cho phép sửa ở Asset/AssetCategory.
 *
 * Cùng pattern phòng thủ 2 lớp đã dùng ở `documents.constants.ts`
 * (DOCUMENT_UPDATE_WHITELIST) và `rbac.constants.ts`: lớp 1 là DTO
 * (`assets.dto.ts`, Zod tự strip field lạ), lớp 2 là whitelist Ở TẦNG
 * SERVICE này — đảm bảo dù route lỡ gắn sai DTO/thiếu validate ở 1 điểm
 * nào đó trong tương lai, service vẫn tự chặn field ngoài whitelist.
 *
 * QUAN TRỌNG: `status`, `assignedTo`, `department` CỐ TÌNH KHÔNG có trong
 * ASSET_UPDATE_WHITELIST — đây là các field thay đổi vòng đời tài sản,
 * phải đi qua service/route riêng (cấp phát, thu hồi, thanh lý — Giai đoạn
 * 2) để đảm bảo ghi lại lịch sử luân chuyển và validate điều kiện chuyển
 * trạng thái, không cho phép PATCH thẳng qua update thông thường.
 */

export const ASSET_UPDATE_WHITELIST = [
  "category",
  "name",
  "serialNumber",
  "model",
  "manufacturer",
  "location",
  "purchaseDate",
  "purchasePrice",
  "warrantyExpiredAt",
  "supplier",
  "specs",
  "isActive",
] as const;

export const ASSET_CATEGORY_UPDATE_WHITELIST = [
  "name",
  "parentCategory",
  "defaultWarrantyMonths",
  "isActive",
] as const;

/**
 * pickWhitelisted — chỉ lấy field nằm trong whitelist từ `payload`, bỏ qua
 * mọi field khác (không throw — DTO đã throw 400 cho field lạ trước khi
 * tới đây; ở service chỉ lọc âm thầm cho chắc).
 */
export const pickWhitelisted = <T extends readonly string[]>(
  payload: Record<string, any>,
  whitelist: T,
): Record<string, any> => {
  const result: Record<string, any> = {};
  for (const key of whitelist) {
    if (key in payload) result[key] = payload[key];
  }
  return result;
};
