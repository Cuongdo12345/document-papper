import { Request, Response } from "express";
import {
  createAssetService,
  getAllAssetsService,
  getAssetByIdService,
  updateAssetService,
  deleteAssetService,
  hardDeleteAssetService,
  restoreAssetService,
} from "../../services/assets/assetDevice/asset.service";
import {
  generateAssetQRCodeService,
  checkInAssetService,
  findAssetByCodeService,
} from "../../services/assets/assetDevice/assetQRCode.service";
import {
  exportAssetsExcelPRO,
  getImportAssetsExcelTemplate,
  importAssetsExcel,
} from "../../services/assets/assetDevice/assetExcel.service";
import { catchAsync } from "../../shared/utils/catchAsync";
import { runAssetAlertsService } from "../../services/assets/assetDevice/assetAlerts.service";
import ApiError from "../../shared/errors/ApiError";

/**
 * CREATE
 */
export const createAsset = catchAsync(async (req: Request, res: Response) => {
  const asset = await createAssetService(req.body, req.user?._id);

  res.status(201).json({
    message: "Tạo tài sản thành công",
    data: asset,
  });
});

/**
 * GET ALL
 */
export const getAllAssets = catchAsync(async (req: Request, res: Response) => {
  const result = await getAllAssetsService(req.query);

  res.json({
    message: "Lấy danh sách tài sản thành công",
    ...result,
  });
});

/**
 * GET BY ID
 */
export const getAssetById = catchAsync(async (req: Request, res: Response) => {
  const asset = await getAssetByIdService(req.params.id);

  res.json({
    message: "Lấy chi tiết tài sản thành công",
    data: asset,
  });
});

/**
 * UPDATE
 */
export const updateAsset = catchAsync(async (req: Request, res: Response) => {
  const asset = await updateAssetService(
    req.params.id,
    req.body,
    req.user?._id,
  );

  res.json({
    message: "Cập nhật tài sản thành công",
    data: asset,
  });
});

/**
 * DELETE
 */
export const deleteAsset = catchAsync(async (req: Request, res: Response) => {
  await deleteAssetService(req.params.id, req.user?._id);

  res.json({
    message: "Xoá tài sản thành công",
  });
});

/**
 * HARD DELETE (xoá vĩnh viễn — chỉ áp dụng cho asset đã soft-delete trước đó)
 */
export const hardDeleteAsset = catchAsync(
  async (req: Request, res: Response) => {
    await hardDeleteAssetService(req.params.id);

    res.json({
      message: "Xoá vĩnh viễn tài sản thành công",
    });
  },
);

/**
 * RESTORE (khôi phục tài sản đã soft-delete)
 */
export const restoreAsset = catchAsync(async (req: Request, res: Response) => {
  const asset = await restoreAssetService(req.params.id, req.user?._id);

  res.json({
    message: "Khôi phục tài sản thành công",
    data: asset,
  });
});

/**
 * 🔗 GIAI ĐOẠN 4 — chạy tay cảnh báo bảo hành/bảo trì (không cần chờ cron
 * 8h sáng), hữu ích để test/demo.
 */
export const runAssetAlerts = catchAsync(
  async (req: Request, res: Response) => {
    const result = await runAssetAlertsService();

    res.json({
      message: "Chạy kiểm tra cảnh báo Asset thành công",
      data: result,
    });
  },
);

/* =====================================================================
   GIAI ĐOẠN 5 — Import/export Excel hàng loạt
===================================================================== */

/**
 * EXPORT — `exportAssetsExcelPRO` tự lo TOÀN BỘ response (stream Excel
 * trực tiếp + `res.end()` bên trong) — KHÔNG gọi `res.json/status/send`
 * sau khi hàm chạy xong (giống hệt quy ước của `exportDocumentsExcel`).
 */
export const exportAssets = catchAsync(async (req: Request, res: Response) => {
  await exportAssetsExcelPRO(req.query, res);
});

/**
 * TEMPLATE — file mẫu để tải về trước khi import.
 */
export const downloadAssetImportTemplate = catchAsync(
  async (req: Request, res: Response) => {
    await getImportAssetsExcelTemplate(res);
  },
);

/**
 * IMPORT — hỗ trợ dry-run: `?dryRun=true` để xem trước, không truyền
 * (hoặc `dryRun=false`) để import thật.
 */
export const importAssets = catchAsync(async (req: Request, res: Response) => {
  if (!req.file) {
    throw ApiError.badRequest("Vui lòng chọn file Excel");
  }

  const dryRun = String(req.query.dryRun).toLowerCase() === "true";

  const result = await importAssetsExcel(req.file.buffer, req.user?._id, {
    dryRun,
    fileName: req.file.originalname,
  });

  res.json({
    message: dryRun
      ? "Xem trước import thành công (chưa lưu dữ liệu)"
      : "Import thành công",
    data: result,
  });
});

/* =====================================================================
   GIAI ĐOẠN 5 — QR code kiểm kê
===================================================================== */

/**
 * GET QR CODE — trả về ảnh PNG trực tiếp (Content-Type: image/png), không
 * phải JSON — để FE có thể nhúng thẳng vào thẻ `<img src="...">` hoặc in ra
 * tem dán mà không cần xử lý base64 thủ công.
 */
export const getAssetQRCode = catchAsync(
  async (req: Request, res: Response) => {
    const buffer = await generateAssetQRCodeService(req.params.id);

    res.setHeader("Content-Type", "image/png");
    res.send(buffer);
  },
);

/**
 * LOOKUP BY ASSET CODE — dùng ngay sau khi quét QR (đầu đọc mã vạch/QR đa
 * số hoạt động như bàn phím, gõ thẳng nội dung mã vào ô input trên FE).
 * Trả về thông tin đầy đủ để FE hiển thị cho nhân viên XÁC NHẬN trước khi
 * gọi tiếp check-in — xem giải thích ở `findAssetByCodeService`.
 */
export const lookupAssetByCode = catchAsync(
  async (req: Request, res: Response) => {
    const asset = await findAssetByCodeService(String(req.params.assetCode));

    res.json({
      message: "Tìm thấy tài sản",
      data: asset,
    });
  },
);

/**
 * CHECK-IN — xác nhận đã kiểm kê thấy tài sản (không đổi status/department).
 */
export const checkInAsset = catchAsync(async (req: Request, res: Response) => {
  const asset = await checkInAssetService(req.params.id, req.user?._id);

  res.json({
    message: "Ghi nhận kiểm kê thành công",
    data: asset,
  });
});
