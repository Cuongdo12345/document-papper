// export const generateDepartmentCode = (name: string): string => {
//   return name
//     .normalize("NFD")
//     .replace(/[\u0300-\u036f]/g, "")
//     .replace(/[^a-zA-Z0-9]/g, "")
//     .substring(0, 10)
//     .toUpperCase();
// };

import ApiError from "../../shared/errors/ApiError";

/**
 * Sửa Missing Validation (DOCUMENT_VALIDATION_ANALYSIS.md, mục "generate-code.ts"):
 * trước đây không kiểm tra `name` rỗng/`undefined` trước khi `.normalize()`, và
 * nếu input toàn ký tự đặc biệt (bị loại bỏ hết), hàm trả về chuỗi rỗng `""`
 * làm mã phòng ban mà không có cảnh báo nào. Nay throw rõ ràng thay vì để lọt
 * 1 department code rỗng vào DB.
 *
 * LƯU Ý: việc validate `name` không rỗng NGAY TỪ ĐẦU (ở `CreateDepartmentDTO`)
 * vẫn là lớp phòng thủ nên có — hàm này chỉ là lớp phòng thủ thứ 2, phòng khi
 * hàm được gọi trực tiếp không qua DTO. `CreateDepartmentDTO` nằm ngoài phạm
 * vi các file được cung cấp (module Department, không phải Document).
 */
export const generateDepartmentCode = (name: string): string => {
  if (!name || !name.trim()) {
    throw ApiError.badRequest("Tên phòng ban không được để trống");
  }

  const code = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .substring(0, 10)
    .toUpperCase();

  if (!code) {
    throw ApiError.badRequest(
      `Không thể sinh mã phòng ban từ tên "${name}" (chỉ chứa ký tự đặc biệt/không hỗ trợ)`
    );
  }

  return code;
};