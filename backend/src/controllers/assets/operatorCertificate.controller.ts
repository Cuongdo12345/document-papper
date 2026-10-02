// controllers/assets/operatorCertificate.controller.ts
//
// MODULE MỚI (DEV-077).
import { Request, Response } from "express";
import {
  createOperatorCertificateService,
  getOperatorCertificatesService,
  getCertifiedUsersForCategoryService,
  updateOperatorCertificateService,
  revokeOperatorCertificateService,
  deleteOperatorCertificateService,
} from "../../services/assets/medicalDevice/operatorCertificate.service";
import { catchAsync } from "../../shared/utils/catchAsync";

export const createOperatorCertificate = catchAsync(
  async (req: Request, res: Response) => {
    const certificate = await createOperatorCertificateService(
      req.body,
      req.user?._id,
    );

    res.status(201).json({
      message: "Cấp chứng chỉ vận hành thành công",
      data: certificate,
    });
  },
);

export const getAllOperatorCertificates = catchAsync(
  async (req: Request, res: Response) => {
    const result = await getOperatorCertificatesService(req.query);

    res.json({
      message: "Lấy danh sách chứng chỉ vận hành thành công",
      ...result,
    });
  },
);

export const getCertifiedUsersForCategory = catchAsync(
  async (req: Request, res: Response) => {
    const users = await getCertifiedUsersForCategoryService(
      req.query.deviceCategory,
    );

    res.json({
      message: "Lấy danh sách người đủ điều kiện vận hành thành công",
      data: users,
    });
  },
);

/** [MỚI DEV-078] Sửa — chỉ `certificateNumber`. */
export const updateOperatorCertificate = catchAsync(
  async (req: Request, res: Response) => {
    const certificate = await updateOperatorCertificateService(
      req.params.id,
      req.body.certificateNumber,
    );

    res.json({
      message: "Cập nhật chứng chỉ vận hành thành công",
      data: certificate,
    });
  },
);

/** [MỚI DEV-078] Thu hồi — bắt buộc lý do. */
export const revokeOperatorCertificate = catchAsync(
  async (req: Request, res: Response) => {
    const certificate = await revokeOperatorCertificateService(
      req.params.id,
      req.body.reason,
      req.user?._id,
    );

    res.json({
      message: "Thu hồi chứng chỉ vận hành thành công",
      data: certificate,
    });
  },
);

/** [MỚI DEV-078] Xoá mềm — dùng cho lỗi nhập liệu. */
export const deleteOperatorCertificate = catchAsync(
  async (req: Request, res: Response) => {
    await deleteOperatorCertificateService(req.params.id, req.user?._id);

    res.json({
      message: "Xoá chứng chỉ vận hành thành công",
    });
  },
);
