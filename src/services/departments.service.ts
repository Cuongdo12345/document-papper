import mongoose from "mongoose";
import Department from "../models/department.model";
import UserAudit from "../models/userAudit.model";
import ApiError from "../shared/errors/ApiError";
import User from "../models/user.model";
import {Document} from "../models/document.model";

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
  } = query;

  const filter: any = {};

  // 🔎 SEARCH KEYWORD CHUNG
  if (keyword) {
    filter.$or = [
      { code: { $regex: keyword, $options: "i" } },
      { name: { $regex: keyword, $options: "i" } },
    ];
  }

  // 🔎 FILTER RIÊNG
  if (code) {
    filter.code = { $regex: code, $options: "i" };
  }

  if (name) {
    filter.name = { $regex: name, $options: "i" };
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
  userId?: any
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID khoa không hợp lệ");
  }

  const department = await Department.findById(id);

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

  const department = await Department.findByIdAndUpdate(
    id,
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
 * 📌 DELETE DEPARTMENT
 */
export const deleteDepartmentService = async (
  id: any,
  userId?: any
) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw ApiError.badRequest("ID khoa không hợp lệ");
  }

  const department = await Department.findById(id);
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

  await Department.deleteOne({ _id: id });

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
