import Department from "../../models/departments/department.model";

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

  return new Map(departments.map((d: any) => [normalizeDepartmentKey(d.name), d]));
};