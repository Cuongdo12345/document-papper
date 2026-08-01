import { Request, Response } from "express";
import {
  createDepartmentService,
  getAllDepartmentsService,
  getDepartmentByIdService,
  updateDepartmentService,
  deleteDepartmentService,
} from "../../services/departments/departments.service";
import { catchAsync } from "../../shared/utils/catchAsync";

// ================================ CONTROLLER MỚI CHUYỂN LOGIC XỬ LÝ LIÊN QUAN ĐẾN DEPARTMENT VỀ ĐÂY ================================
// Controller sẽ nhận request, gọi service để xử lý nghiệp vụ, và trả về response cho client
// ============================================================================================================================
// Ví dụ: nếu có logic phức tạp liên quan đến department, ví dụ: kiểm tra điều kiện đặc biệt khi tạo khoa, hoặc có liên quan đến nhiều model khác nhau, thì nên chuyển vào service để dễ bảo trì và tái sử dụng
// Ví dụ: nếu có logic liên quan đến audit khi thao tác với department, thì cũng nên đặt ở service để đảm bảo tính nhất quán và dễ quản lý
/**
 * CREATE
 */
export const createDepartment = catchAsync(
  async (req: Request, res: Response) => {
    const department = await createDepartmentService(req.body, req.user?._id);

    res.status(201).json({
      message: "Tạo khoa thành công",
      data: department,
    });
  },
);

/**
 * GET ALL
 */
export const getAllDepartments = catchAsync(
  async (req: Request, res: Response) => {
    const result = await getAllDepartmentsService(req.query);

    res.json({
      success: "Lấy danh sách khoa thành công",
      ...result,
    });
  },
);

/**
 * GET BY ID
 */
export const getDepartmentById = catchAsync(
  async (req: Request, res: Response) => {
    const department = await getDepartmentByIdService(
      req.params.id,
      req.user?._id,
    );

    res.json({
      message: "Lấy chi tiết khoa thành công",
      data: department,
    });
  },
);

/**
 * UPDATE
 */
export const updateDepartment = catchAsync(
  async (req: Request, res: Response) => {
    const department = await updateDepartmentService(
      req.params.id,
      req.body,
      req.user?._id,
    );

    res.json({
      message: "Cập nhật khoa thành công",
      data: department,
    });
  },
);

/**
 * DELETE
 */
export const deleteDepartment = catchAsync(
  async (req: Request, res: Response) => {
    await deleteDepartmentService(req.params.id, req.user?._id);

    res.json({
      message: "Xóa khoa thành công",
    });
  },
);

