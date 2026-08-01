// services/assets/assetQRCode.service.ts
//
// GIAI ĐOẠN 5 — QR code kiểm kê tài sản.
//
// QR code encode NGUYÊN VĂN `assetCode` (không phải URL, không phải
// `assetId`) — lý do: `assetCode` là mã CON NGƯỜI ĐỌC ĐƯỢC in kèm trên tem
// dán vật lý (VD "TB-CNTT-2026-0001"), nhân viên kiểm kê có thể đối chiếu
// bằng mắt giữa tem giấy và app khi máy quét lỗi. Dùng `assetId` (ObjectId)
// sẽ vô nghĩa nếu phải đọc bằng mắt. Dùng URL đầy đủ lại phụ thuộc domain
// môi trường (dev/staging/prod khác nhau) — encode domain vào hàng nghìn
// tem giấy đã in rồi thì không đổi được nữa nếu domain đổi sau này.

import QRCode from "qrcode";
import mongoose from "mongoose";
import { Asset } from "../../models/assets/asset.model";
import ApiError from "../../shared/errors/ApiError";

/**
 * 📌 Sinh ảnh QR code (PNG buffer) cho 1 asset — encode `assetCode`.
 */
export const generateAssetQRCodeService = async (assetId: any): Promise<Buffer> => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const asset = await Asset.findOne({ _id: assetId, isActive: true }).select(
    "assetCode",
  );
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }

  return QRCode.toBuffer(asset.assetCode, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 300,
  });
};

/**
 * 📌 CHECK-IN kiểm kê — quét QR (hoặc gõ tay `assetCode`/`assetId`) để xác
 * nhận "vẫn thấy tài sản này ở đây". Chỉ cập nhật `lastInventoryCheckAt`/`By`,
 * KHÔNG đổi `status`/`department`/`assignedTo` — kiểm kê là hành động XÁC
 * NHẬN SỰ TỒN TẠI, không phải hành động thay đổi vòng đời (đã có
 * assign/transfer/return riêng ở Giai đoạn 2 cho việc đó).
 */
export const checkInAssetService = async (assetId: any, actorUserId: any) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const asset = await Asset.findOne({ _id: assetId, isActive: true });
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }

  asset.lastInventoryCheckAt = new Date();
  asset.lastInventoryCheckBy = actorUserId;
  await asset.save();

  return asset;
};

/**
 * 📌 Tra cứu asset theo `assetCode` (đọc từ QR quét được) — trả về `_id` để
 * FE gọi tiếp `POST /:id/check-in`. Tách riêng bước "tra cứu" và "check-in"
 * (thay vì gộp 1 API "check-in bằng assetCode") để FE có thể HIỂN THỊ
 * thông tin asset cho nhân viên xác nhận trước khi thực sự ghi nhận kiểm
 * kê — tránh quét nhầm mã rồi check-in oan cho asset khác.
 */
export const findAssetByCodeService = async (assetCode: string) => {
  const asset = await Asset.findOne({
    assetCode: assetCode.trim(),
    isActive: true,
  })
    .populate("category", "code name")
    .populate("department", "code name");

  if (!asset) {
    throw ApiError.notFound(`Không tìm thấy tài sản với mã: ${assetCode}`);
  }

  return asset;
};
