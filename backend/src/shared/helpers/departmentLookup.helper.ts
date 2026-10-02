import Department from "../../models/departments/department.model";
import ApiError from "../errors/ApiError";

/**
 * Chuẩn hoá key để so khớp department KHÔNG phân biệt hoa/thường — dùng
 * thống nhất ở cả `findDepartmentsCaseInsensitive` (build map) lẫn nơi gọi
 * (tra cứu theo đúng key đã chuẩn hoá này).
 */
export const normalizeDepartmentKey = (name: string) => name.trim().toLowerCase();

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * 🐛 SỬA: trước đây `importDocumentsExcel` query + map tên khoa PHÂN BIỆT
 * hoa/thường tuyệt đối, trong khi `syncDepartmentFromExcel` dedupe department
 * theo `toLowerCase()` (không tạo trùng "Khoa Nội" / "khoa nội"). Hệ quả: DB
 * có "Khoa Nội" (từ sync) nhưng file import gõ "khoa nội" → báo lỗi "Không
 * tìm thấy khoa" dù khoa đó CÓ tồn tại — sai khác hành vi giữa 2 hàm dùng
 * chung 1 workflow.
 *
 * Hàm này query bằng regex case-insensitive (`i` flag) và trả về Map đã
 * chuẩn hoá key (trim + lowercase), khớp đúng quy ước của
 * `syncDepartmentFromExcel`. Dùng `new RegExp("^...$", "i")` thay vì so
 * khớp thường để MongoDB match đúng toàn bộ tên (không match theo substring).
 */
export const findDepartmentsCaseInsensitive = async (names: Iterable<string>): Promise<Map<string, any>> => {
  const nameList = Array.from(names);
  if (!nameList.length) return new Map();

  const departments = await Department.find({
    name: { $in: nameList.map((name) => new RegExp(`^${escapeRegExp(name)}$`, "i")) },
  });

  // BR-06 (DEV-100): vẫn lấy cả khoa đã xoá mềm, để nơi gọi báo đúng lỗi
  // "đã bị xoá" thay vì "không tìm thấy". `name` không unique, nên nếu 1 khoa
  // đang hoạt động và 1 khoa đã xoá trùng tên thì khoa đang hoạt động được ưu tiên.
  const map = new Map<string, any>();
  for (const d of departments as any[]) {
    const key = normalizeDepartmentKey(d.name);
    const current = map.get(key);
    if (!current || isDepartmentDeleted(current)) map.set(key, d);
  }
  return map;
};

/**
 * BR-06 (DEV-100): khoa/phòng đã xoá mềm (DEV-086) KHÔNG được nhận dữ liệu
 * mới (user, tài liệu, tài sản, cấp phát, vật tư, dự trù, import Excel). So
 * `=== false` (không phải `!isActive`) để bản ghi cũ thiếu field vẫn coi là
 * đang hoạt động, đúng `default: true` của schema.
 */
export const isDepartmentDeleted = (department: { isActive?: boolean } | null | undefined) =>
  department?.isActive === false;

export const deletedDepartmentMessage = (department: { name?: string; code?: string }) =>
  `Khoa/phòng "${department.name ?? department.code}" đã bị xoá (ngừng hoạt động)`;

/** Ném 400 nếu khoa đã bị xoá mềm. Gọi SAU bước kiểm tra tồn tại sẵn có. */
export const assertDepartmentNotDeleted = (department: { isActive?: boolean; name?: string; code?: string }) => {
  if (isDepartmentDeleted(department)) {
    throw ApiError.badRequest(deletedDepartmentMessage(department));
  }
};