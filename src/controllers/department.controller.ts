import { Request, Response } from "express";
import {
  createDepartmentService,
  getAllDepartmentsService,
  getDepartmentByIdService,
  updateDepartmentService,
  deleteDepartmentService,
} from "../services/departments.service";

// ================================ CONTROLLER MỚI CHUYỂN LOGIC XỬ LÝ LIÊN QUAN ĐẾN DEPARTMENT VỀ ĐÂY ================================
// Controller sẽ nhận request, gọi service để xử lý nghiệp vụ, và trả về response cho client
// ============================================================================================================================
// Ví dụ: nếu có logic phức tạp liên quan đến department, ví dụ: kiểm tra điều kiện đặc biệt khi tạo khoa, hoặc có liên quan đến nhiều model khác nhau, thì nên chuyển vào service để dễ bảo trì và tái sử dụng
// Ví dụ: nếu có logic liên quan đến audit khi thao tác với department, thì cũng nên đặt ở service để đảm bảo tính nhất quán và dễ quản lý
/**
 * CREATE
 */
export const createDepartment = async (req: Request, res: Response) => {
  try {
    const department = await createDepartmentService(
      req.body,
      req.user?.id
    );

    res.status(201).json({
      message: "Tạo khoa thành công",
      data: department,
    });
  } catch (error: any) {
    res.status(400).json({
      message: error.message || "Lỗi tạo khoa",
    });
  }
};

/**
 * GET ALL
 */
export const getAllDepartments = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await getAllDepartmentsService(req.query);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi lấy danh sách khoa",
      error,
    });
  }
};

/**
 * GET BY ID
 */
export const getDepartmentById = async (req: Request, res: Response) => {
  try {
    const department = await getDepartmentByIdService(
      req.params.id,
      req.user?.id
    );

    res.json(department);
  } catch (error: any) {
    res.status(404).json({
      message: error.message || "Lỗi lấy chi tiết khoa",
    });
  }
};

/**
 * UPDATE
 */
export const updateDepartment = async (req: Request, res: Response) => {
  try {
    const department = await updateDepartmentService(
      req.params.id,
      req.body,
      req.user?.id
    );

    res.json({
      message: "Cập nhật khoa thành công",
      data: department,
    });
  } catch (error: any) {
    res.status(400).json({
      message: error.message || "Lỗi cập nhật khoa",
    });
  }
};

/**
 * DELETE
 */
export const deleteDepartment = async (req: Request, res: Response) => {
  try {
    await deleteDepartmentService(
      req.params.id,
      req.user?.id
    );

    res.json({
      message: "Xóa khoa thành công",
    });
  } catch (error: any) {
    res.status(400).json({
      message: error.message || "Lỗi xóa khoa",
    });
  }
};






// import { Request, Response } from "express";
// import Department from "../models/department.model";
// import mongoose from "mongoose";
// import UserAudit from "../models/userAudit.model";
// /**
//  * CREATE khoa
//  */
// export const createDepartment = async (req: Request, res: Response) => {
//   try {
//     const { code, name } = req.body;

//     if (!code || !name) {
//       return res.status(400).json({ message: "Thiếu code hoặc tên khoa" });
//     }

//     const existed = await Department.findOne({ code });
//     if (existed) {
//       return res.status(400).json({ message: "Khoa đã tồn tại" });
//     }

//     const department = await Department.create({ code, name });

//     res.status(201).json({
//       message: "Tạo khoa thành công",
//       data: department
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Lỗi tạo khoa", error });
//   }
// };

// /**
//  * GET ALL khoa
//  */
// export const getAllDepartments = async (_req: Request, res: Response) => {
//   try {
//     const departments = await Department.find().sort({ code: 1 });

//     res.json({
//       total: departments.length,
//       data: departments
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Lỗi lấy danh sách khoa", error });
//   }
// };

// // GET DEPARTMENT BY ID
// export const getDepartmentById = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const { id } = req.params;
//     const department = await Department.findById(id);

//     if (!department) {
//       return res
//         .status(404)
//         .json({ message: "Không tìm thấy khoa" });
//     }

//     // 📜 Audit
//     // await UserAudit.create({
//     //   user: req.user!.id,
//     //   action: "DEPARTMENT_VIEW",
//     //   performedBy: req.user!.id,
//     //   note: `Xem chi tiết khoa: ${department.code}`,
//     // });

//     res.json(department);
//   } catch (error) {
//     res.status(500).json({
//       message: "Lỗi lấy chi tiết khoa",
//       error,
//     });
//   }
// };

// /**
//  * UPDATE khoa
//  */
// export const updateDepartment = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;
//     const { code, name } = req.body;

//     const department = await Department.findByIdAndUpdate(
//       id,
//       { code, name },
//       { new: true }
//     );

//     if (!department) {
//       return res.status(404).json({ message: "Không tìm thấy khoa" });
//     }

//     res.json({
//       message: "Cập nhật khoa thành công",
//       data: department
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Lỗi cập nhật khoa", error });
//   }
// };

// /**
//  * DELETE khoa
//  */
// export const deleteDepartment = async (req: Request, res: Response) => {
//   try {
//     const { id } = req.params;

//     const department = await Department.findByIdAndDelete(id);

//     if (!department) {
//       return res.status(404).json({ message: "Không tìm thấy khoa" });
//     }

//     res.json({ message: "Xóa khoa thành công" });
//   } catch (error) {
//     res.status(500).json({ message: "Lỗi xóa khoa", error });
//   }
// };
