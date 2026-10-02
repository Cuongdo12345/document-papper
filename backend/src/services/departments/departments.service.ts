import mongoose from "mongoose";
import Department from "../../models/departments/department.model";
import UserAudit from "../../models/users/userAudit.model";
import ApiError from "../../shared/errors/ApiError";
import { User } from "../../models/users/user.model";
import {Document} from "../../models/documents/document.model";
import { Asset } from "../../models/assets/asset.model";
import { ConsumableItem } from "../../models/inventory/consumableItem.model";
import { ConsumableRequest } from "../../models/inventory/consumableRequest.model";
import { ConsumableRequestStatus } from "../../interfaces/inventory/consumableRequest.interface";
import { escapeRegex } from "../../shared/utils/regex.util";
import { runBulkDelete } from "../../shared/utils/bulkDelete.util";

// ================================ SERVICE MỚI CHUYỂN LOGIC XỬ LÝ LIÊN QUAN ĐẾN DEPARTMENT VỀ ĐÂY ================================
// Service sẽ chứa logic xử lý nghiệp vụ liên quan đến department, ví dụ: tạo khoa, lấy danh sách khoa, v.v.
// Controller sẽ gọi service để lấy dữ liệu và trả về cho client
// ============================================================================================================================
// Ví dụ: nếu có logic phức tạp liên quan đến department, ví dụ: kiểm tra điều kiện đặc biệt khi tạo khoa, hoặc có liên quan đến nhiều model khác nhau, thì nên chuyển vào service để dễ bảo trì và tái sử dụng
// Ví dụ: nếu có logic liên quan đến audit khi thao tác với department, thì cũng nên đặt ở service để đảm bảo tính nhất quán và dễ quản lý
/**
 * 📌 CREATE DEPARTMENT
 */
export const createDepartmentService = async (
  payload: { code: string; name: string },
  userId?: any
) => {
  const { code, name } = payload;

  if (!code || !name) {
    throw ApiError.badRequest("Thiếu code hoặc tên khoa");
  }

  const existed = await Department.findOne({ code });
  if (existed) {
    throw ApiError.badRequest("Khoa đã tồn tại");
  }

  const department = await Department.create({ code, name });

  // 🧾 Audit (bật nếu cần)
  if (userId) {
    await UserAudit.create({
      user: userId,
      action: "CREATE",
      performedBy: userId,
      note: `Tạo khoa ${code}`,
    });
  }

  return department;
};

/**
 * 📌 GET ALL DEPARTMENTS
 */
export const getAllDepartmentsService = async (query: any) => {
  const {
    keyword,
    code,
    name,
    page = "1",
    limit = "10",
    sortBy = "code",
    order = "asc",
    isActive,
  } = query;

  // [DEV-086] Cùng pattern `getAllAssetCategoriesService` — mặc định chỉ
  // khoa/phòng đang hoạt động khi client KHÔNG truyền `isActive` (qua
  // `QueryDepartmentDTO`, đã là boolean/`undefined`), truyền `false` để xem
  // danh sách đã xoá mềm.
  const filter: any = { isActive: isActive === undefined ? true : isActive };

  // 🔎 SEARCH KEYWORD CHUNG
  // DEV-010/IMP-015 (SEC-36/RV06-02): escape trước khi đưa vào $regex —
  // chặn ReDoS/lỗi regex khi keyword chứa ký tự đặc biệt.
  if (keyword) {
    const safeKeyword = escapeRegex(keyword);
    filter.$or = [
      { code: { $regex: safeKeyword, $options: "i" } },
      { name: { $regex: safeKeyword, $options: "i" } },
    ];
  }

  // 🔎 FILTER RIÊNG
  if (code) {
    filter.code = { $regex: escapeRegex(code), $options: "i" };
  }

  if (name) {
    filter.name = { $regex: escapeRegex(name), $options: "i" };
  }

  // 📄 PAGINATION
  const pageNumber = Math.max(parseInt(page, 10), 1);
  const pageSize = Math.max(parseInt(limit, 10), 1);
  const skip = (pageNumber - 1) * pageSize;

  // ↕️ SORT
  const sortOption: any = {
    [sortBy]: order === "asc" ? 1 : -1,
  };

  const [departments, total] = await Promise.all([
    Department.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(pageSize),

    Department.countDocuments(filter),
  ]);

  return {
    data: departments,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};


/**
 * 📌 GET DEPARTMENT BY ID
 */
export const getDepartmentByIdService = async (
  id: any,
  userId: any
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID khoa không hợp lệ");
  }

  // [DEV-086] Chỉ khoa ĐANG hoạt động — cùng pattern `getAssetCategoryByIdService`
  // (khoa đã xoá mềm không lộ qua "xem chi tiết" thông thường, chỉ liệt kê
  // được qua `GET /?isActive=false` để khôi phục).
  const department = await Department.findOne({ _id: id, isActive: true });

  if (!department) {
    throw ApiError.notFound("Không tìm thấy khoa");
  }

  // 🧾 Audit
  if (userId) {
    await UserAudit.create({
      user: userId,
      action: "VIEW_DETAIL",
      performedBy: userId,
      note: `Xem chi tiết khoa ${department.code}`,
    });
  }

  return department;
};

/**
 * 📌 UPDATE DEPARTMENT
 */
export const updateDepartmentService = async (
  id: any,
  payload: { code?: string; name?: string },
  userId?: any
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID khoa không hợp lệ");
  }

  // [DEV-086] Chỉ sửa được khoa ĐANG hoạt động — cùng pattern
  // `updateAssetCategoryService` (khoa đã xoá mềm phải khôi phục trước).
  const department = await Department.findOneAndUpdate(
    { _id: id, isActive: true },
    payload,
    { new: true }
  );

  if (!department) {
    throw ApiError.notFound("Không tìm thấy khoa");
  }

  // 🧾 Audit
  if (userId) {
    await UserAudit.create({
      user: userId,
      action: "UPDATE",
      performedBy: userId,
      note: `Cập nhật khoa ${department.code}`,
    });
  }

  return department;
};

/**
 * 📌 DELETE DEPARTMENT (xoá mềm — DEV-086)
 *
 * Đổi từ hard-delete (`deleteOne`) sang soft-delete, cùng convention
 * `deleteAssetCategoryService` — có thể khôi phục nếu xoá nhầm. 3 điều kiện
 * chặn (còn user/document/asset thuộc khoa) GIỮ NGUYÊN như cũ (user đã xác
 * nhận: xoá mềm vẫn phải chặn khi còn dữ liệu tham chiếu, không nới lỏng).
 */
export const deleteDepartmentService = async (
  id: any,
  userId?: any
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID khoa không hợp lệ");
  }

  const department = await Department.findOne({ _id: id, isActive: true });
  if (!department) {
    throw ApiError.notFound("Không tìm thấy khoa");
  }

  // ✅ CHECK USER TRONG KHOA
  const userExists = await User.exists({ department: id, isActive: true });
  if (userExists) {
    throw ApiError.badRequest(
      "Không thể xoá khoa vì vẫn còn user thuộc khoa này"
    );
  }

  // ✅ CHECK DOCUMENT THUỘC KHOA
  const documentExists = await Document.exists({ department: id });
  if (documentExists) {
    throw ApiError.badRequest(
      "Không thể xoá khoa vì vẫn còn document thuộc khoa này"
    );
  }

  // ✅ CHECK ASSET ĐANG GÁN CHO KHOA (DEV-012/IMP-017)
  // Asset.department là field bắt buộc (khoa/phòng đang quản lý tài sản) —
  // nếu xoá Department mà không check, tài sản sẽ mang reference "mồ côi"
  // vĩnh viễn. Chỉ check reference HIỆN TẠI (Asset.department), KHÔNG check
  // AssetAssignmentHistory (log bất biến, chỉ mang tính lịch sử/audit —
  // cho phép dangling reference ở đây, quyết định đã xác nhận với người
  // dùng, tránh khoá cứng không bao giờ xoá được Department từng có phát
  // sinh luân chuyển tài sản).
  const assetExists = await Asset.exists({ department: id });
  if (assetExists) {
    throw ApiError.badRequest(
      "Không thể xoá khoa vì vẫn còn tài sản đang gán cho khoa này"
    );
  }

  // ✅ CHECK VẬT TƯ TIÊU HAO + DỰ TRÙ VẬT TƯ (BR-06/DEV-100, user duyệt thêm)
  // Trước đây không kiểm tra: xoá khoa còn vật tư thì tồn kho của khoa biến
  // mất khỏi giao diện. Chỉ tính vật tư ĐANG hoạt động và dự trù ĐANG CHỜ
  // (PENDING) — vật tư đã ẩn và dự trù đã mua/huỷ là dữ liệu lịch sử.
  const consumableItemExists = await ConsumableItem.exists({ department: id, isActive: true });
  if (consumableItemExists) {
    throw ApiError.badRequest(
      "Không thể xoá khoa vì vẫn còn vật tư tiêu hao đang hoạt động thuộc khoa này"
    );
  }

  const pendingRequestExists = await ConsumableRequest.exists({
    department: id,
    status: ConsumableRequestStatus.PENDING,
  });
  if (pendingRequestExists) {
    throw ApiError.badRequest(
      "Không thể xoá khoa vì vẫn còn dự trù vật tư đang chờ của khoa này"
    );
  }

  department.isActive = false;
  department.deletedAt = new Date();
  department.deletedBy = userId;
  await department.save();

  // 🧾 Audit
  if (userId) {
    await UserAudit.create({
      user: userId,
      action: "DELETE",
      performedBy: userId,
      note: `Xóa khoa ${department.code}`,
    });
  }

  return true;
};

/**
 * 📌 BULK DELETE DEPARTMENT (xoá mềm hàng loạt — DEV-086)
 * Cùng pattern `bulkDeleteAssetCategoryService` — tái dùng nguyên vẹn
 * `deleteDepartmentService` qua `runBulkDelete`, 1 id lỗi (còn user/document/
 * asset tham chiếu) không chặn các id còn lại trong batch.
 */
export const bulkDeleteDepartmentService = async (ids: string[], userId?: any) => {
  return runBulkDelete(ids, (id) => deleteDepartmentService(id, userId));
};

/**
 * 📌 RESTORE DEPARTMENT — khôi phục khoa đã xoá mềm (DEV-086)
 */
export const restoreDepartmentService = async (id: any, userId?: any) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID khoa không hợp lệ");
  }

  const department = await Department.findById(id);
  if (!department) {
    throw ApiError.notFound("Không tìm thấy khoa");
  }

  if (department.isActive) {
    throw ApiError.badRequest("Khoa này chưa bị xoá");
  }

  department.isActive = true;
  department.deletedAt = undefined;
  department.deletedBy = undefined;
  await department.save();

  // 🧾 Audit
  if (userId) {
    await UserAudit.create({
      user: userId,
      action: "RESTORE",
      performedBy: userId,
      note: `Khôi phục khoa ${department.code}`,
    });
  }

  return department;
};

/**
 * 📌 BULK RESTORE DEPARTMENT (khôi phục hàng loạt — DEV-086)
 */
export const bulkRestoreDepartmentService = async (ids: string[], userId?: any) => {
  return runBulkDelete(ids, (id) => restoreDepartmentService(id, userId), "Khôi phục thất bại");
};
