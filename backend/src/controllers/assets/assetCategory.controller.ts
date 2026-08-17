import { Request, Response } from "express";
import {
  createAssetCategoryService,
  getAllAssetCategoriesService,
  getAssetCategoryByIdService,
  updateAssetCategoryService,
  deleteAssetCategoryService,
  hardDeleteAssetCategoryService,
  restoreAssetCategoryService,
} from "../../services/assets/assetDevice/assetCategory.service";
import { catchAsync } from "../../shared/utils/catchAsync";

/**
 * CREATE
 */
export const createAssetCategory = catchAsync(
  async (req: Request, res: Response) => {
    const category = await createAssetCategoryService(req.body);

    res.status(201).json({
      message: "Tạo danh mục tài sản thành công",
      data: category,
    });
  },
);

/**
 * GET ALL
 */
export const getAllAssetCategories = catchAsync(
  async (req: Request, res: Response) => {
    const result = await getAllAssetCategoriesService(req.query);

    res.json({
      message: "Lấy danh sách danh mục tài sản thành công",
      ...result,
    });
  },
);

/**
 * GET BY ID
 */
export const getAssetCategoryById = catchAsync(
  async (req: Request, res: Response) => {
    const category = await getAssetCategoryByIdService(req.params.id);

    res.json({
      message: "Lấy chi tiết danh mục tài sản thành công",
      data: category,
    });
  },
);

/**
 * UPDATE
 */
export const updateAssetCategory = catchAsync(
  async (req: Request, res: Response) => {
    const category = await updateAssetCategoryService(
      req.params.id,
      req.body,
    );

    res.json({
      message: "Cập nhật danh mục tài sản thành công",
      data: category,
    });
  },
);

/**
 * DELETE (soft delete)
 */
export const deleteAssetCategory = catchAsync(
  async (req: Request, res: Response) => {
    await deleteAssetCategoryService(req.params.id, req.user?._id);

    res.json({
      message: "Xoá danh mục tài sản thành công",
    });
  },
);

/**
 * HARD DELETE (xoá vĩnh viễn — chỉ áp dụng cho danh mục đã soft-delete trước đó)
 */
export const hardDeleteAssetCategory = catchAsync(
  async (req: Request, res: Response) => {
    await hardDeleteAssetCategoryService(req.params.id);

    res.json({
      message: "Xoá vĩnh viễn danh mục tài sản thành công",
    });
  },
);

/**
 * RESTORE (khôi phục danh mục đã soft-delete)
 */
export const restoreAssetCategory = catchAsync(
  async (req: Request, res: Response) => {
    const category = await restoreAssetCategoryService(req.params.id);

    res.json({
      message: "Khôi phục danh mục tài sản thành công",
      data: category,
    });
  },
);
