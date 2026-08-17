// services/assets/assetMaintenance.service.ts
//
// GIAI ĐOẠN 3 — nối Document (PROPOSE_REPAIR/CONFIRM_STATUS) với Asset.
//
// CHỦ Ý KHÔNG tạo model `AssetMaintenanceHistory` riêng: bản thân chuỗi
// Document (PROPOSE_REPAIR → workflow duyệt → CONFIRM_STATUS → workflow
// duyệt) ĐÃ LÀ lịch sử bảo trì đầy đủ (ai đề xuất, ai duyệt, khi nào, kết
// quả ra sao) — xem lại phần "2.4 Bảo trì — tái dùng Document" trong tài
// liệu phân tích thiết kế ban đầu. 2 hàm ở đây CHỈ làm 1 việc: đổi
// `Asset.status`, không ghi thêm bất kỳ bản ghi lịch sử nào (khác với
// `assetAssignment.service.ts` — nơi MỌI thao tác đều ghi
// `AssetAssignmentHistory`, vì đó là hành động cấp phát/luân chuyển vật lý
// cần audit trail riêng, còn bảo trì thì Document đã tự đóng vai trò đó).

import mongoose from "mongoose";
import { Asset, AssetStatus } from "../../../models/assets/asset.model";
import ApiError from "../../../shared/errors/ApiError";

export type RepairOutcome = "REPAIRED" | "UNREPAIRABLE";

/**
 * 📌 START MAINTENANCE — gọi khi 1 Document `PROPOSE_REPAIR` duyệt xong
 * TOÀN BỘ workflow (`workflow.service.ts` → `approveStep`).
 *
 * Chuyển asset sang `UNDER_MAINTENANCE`. Chấp nhận asset đang ở `IN_USE`
 * (trường hợp phổ biến nhất — thiết bị đang dùng thì hỏng) hoặc `IN_STOCK`
 * (thiết bị trong kho phát hiện hỏng trước khi kịp cấp phát). KHÔNG cho
 * phép nếu asset đã `UNDER_MAINTENANCE` (tránh xử lý trùng 2 đề xuất sửa
 * chữa cùng lúc cho 1 asset), `DISPOSED`, hoặc `LOST`.
 */
export const startAssetMaintenanceService = async (
  assetId: any,
  actorUserId: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const asset = await Asset.findOne({ _id: assetId, isActive: true });
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }

  if (
    asset.status !== AssetStatus.IN_USE &&
    asset.status !== AssetStatus.IN_STOCK
  ) {
    throw ApiError.badRequest(
      `Không thể chuyển tài sản sang bảo trì từ trạng thái hiện tại (${asset.status})`,
    );
  }

  asset.status = AssetStatus.UNDER_MAINTENANCE;
  asset.maintenanceStartedAt = new Date(); // 🔗 Giai đoạn 4 — mốc tính "bảo trì bao lâu rồi"
  asset.updatedBy = actorUserId;
  await asset.save();

  return asset;
};

/**
 * 📌 RESOLVE MAINTENANCE — gọi khi 1 Document `CONFIRM_STATUS` (biên bản
 * xác nhận tình trạng sau sửa chữa, tham chiếu ngược về `PROPOSE_REPAIR`
 * gốc qua `referenceTo`) duyệt xong TOÀN BỘ workflow.
 *
 * - `outcome === "REPAIRED"`     → asset quay lại `IN_USE` (sửa xong, dùng tiếp).
 * - `outcome === "UNREPAIRABLE"` → asset chuyển sang `DISPOSED` (không sửa được, thanh lý).
 *
 * Chỉ xử lý được nếu asset đang ở đúng trạng thái `UNDER_MAINTENANCE` —
 * nếu không (VD asset đã bị xử lý thủ công/xoá giữa chừng), throw lỗi rõ
 * ràng thay vì âm thầm ghi đè sai trạng thái.
 */
export const resolveAssetMaintenanceService = async (
  assetId: any,
  outcome: RepairOutcome,
  actorUserId: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const asset = await Asset.findOne({ _id: assetId, isActive: true });
  if (!asset) {
    throw ApiError.notFound("Không tìm thấy tài sản");
  }

  if (asset.status !== AssetStatus.UNDER_MAINTENANCE) {
    throw ApiError.badRequest(
      `Tài sản không ở trạng thái đang bảo trì (hiện tại: ${asset.status}) — không thể xác nhận kết quả sửa chữa`,
    );
  }

  asset.status =
    outcome === "REPAIRED" ? AssetStatus.IN_USE : AssetStatus.DISPOSED;
  asset.maintenanceStartedAt = undefined; // 🔗 Giai đoạn 4 — hết bảo trì, xoá mốc
  asset.updatedBy = actorUserId;
  await asset.save();

  return asset;
};
