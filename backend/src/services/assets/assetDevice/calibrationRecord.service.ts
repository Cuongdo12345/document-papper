// services/assets/calibrationRecord.service.ts
//
// GIAI ĐOẠN 2 — luồng ghi nhận kiểm định. Bọc transaction NGAY TỪ ĐẦU khi
// build (đúng quyết định đã chốt ở module-quan-ly-thiet-bi-y-te.md §4/§7.3
// — khác với `AssetAssignmentHistory`, vốn phải vá transaction thêm SAU khi
// phát hiện vấn đề qua thực tế chạy, không lặp lại cách làm đó ở đây).

import mongoose from "mongoose";
import fs from "fs";
import { Asset } from "../../../models/assets/asset.model";
import { MedicalDeviceProfile } from "../../../models/assets/medicalDeviceProfile.model";
import { CalibrationRecord } from "../../../models/assets/calibrationRecord.model";
import ApiError from "../../../shared/errors/ApiError";
import { Upload } from "../../../models/uploadFiles/upload.model";
import { withTransaction } from "../../../shared/utils/withTransaction";

const CALIBRATION_RECORD_POPULATE = {
  path: "recordedBy",
  select: "username fullName",
};

/**
 * 📌 CREATE — ghi nhận 1 lần kiểm định mới cho thiết bị y tế (theo assetId).
 *
 * 2 write (tạo CalibrationRecord + update MedicalDeviceProfile) atomic với
 * nhau qua `withTransaction` — mirror đúng pattern đã dùng ở
 * `assetAssignment.service.ts` (mutate document trong memory TRƯỚC, rồi
 * `save({ session })` cùng lúc với `create([...], { session })` bên trong
 * transaction).
 * 
 * GIAI ĐOẠN 5: nếu có `certificateFile` (multer đã lưu vào disk qua
 * `certificateUploader` ở route), tạo thêm 1 `Upload` document TRONG CÙNG
 * transaction — atomic với việc tạo `CalibrationRecord`, tránh trường hợp
 * Upload tạo thành công nhưng CalibrationRecord thất bại (mồ côi file trên
 * disk không ai biết tới) hoặc ngược lại. KHÔNG tái dùng `saveFilesToDB`
 * (`services/upload/upload.service.ts`) — hàm đó hiện chưa hỗ trợ
 * `uploadedBy`/`isUsed` và chưa nhận `session` cho transaction; viết trực
 * tiếp ở đây gọn hơn là sửa hàm dùng chung cho 1 nhu cầu đặc thù của module
 * này. `certificateFileUrl` VẪN LÀ STRING THUẦN TUÝ trên `CalibrationRecord`
 * (đúng quyết định §9.2 — không đổi schema khi chuyển S3 sau này), chỉ khác
 * là giá trị string đó giờ TRỎ TỚI 1 Upload record thật thay vì do người
 * dùng tự gõ tay.
 */
export const createCalibrationRecordService = async (
  assetId: any,
  payload: any,
  userId?: any,
  certificateFile?: Express.Multer.File,
) => {
  // ⚠️ SỬA (phát hiện khi review lại Giai đoạn 5): multer đã GHI FILE THẬT
  // LÊN DISK NGAY TỪ route middleware (`certificateUploader.single(...)`),
  // TRƯỚC KHI hàm này chạy — nghĩa là nếu BẤT KỲ bước validate/transaction
  // nào bên dưới throw lỗi (kể cả lỗi xảy ra RẤT SỚM, VD "không tìm thấy
  // tài sản"), file đã ghi vẫn còn MỒ CÔI trên disk, không có bản ghi DB
  // nào trỏ tới, không ai dọn — rò rỉ dung lượng disk tích luỹ dần theo
  // thời gian nếu client gửi request lỗi nhiều lần. Bọc TOÀN BỘ thân hàm
  // trong try/catch: bất kỳ lỗi nào xảy ra SAU KHI đã nhận `certificateFile`
  // đều dọn file trên disk (best-effort, không che lỗi gốc) trước khi ném
  // lại lỗi.
  // Đánh dấu transaction đã commit thành công hay chưa — quan trọng để
  // catch bên dưới KHÔNG xoá nhầm file khi transaction đã thành công (file
  // + CalibrationRecord đã lưu hợp lệ) nhưng 1 bước SAU transaction (VD
  // `.populate()`) mới throw lỗi — trường hợp đó file KHÔNG mồ côi, xoá nó
  // sẽ để lại `CalibrationRecord.certificateFileUrl` trỏ tới file không
  // còn tồn tại.
  let committed = false;

  try {
    if (!mongoose.Types.ObjectId.isValid(assetId)) {
      throw ApiError.badRequest("ID tài sản không hợp lệ");
    }

    // GIAI ĐOẠN 5 — không cho cung cấp CẢ file upload LẪN certificateFileUrl
    // dạng string cùng lúc, tránh mập mờ "cái nào mới là URL thật sự được
    // lưu". Fail-fast ngay đầu hàm, trước khi chạm DB.
    if (certificateFile && payload.certificateFileUrl) {
      throw ApiError.badRequest(
        "Chỉ được cung cấp 1 trong 2: file upload (certificateFile) HOẶC certificateFileUrl dạng link, không cả hai.",
      );
    }

    // ⚠️ SỬA (theo yêu cầu đồng bộ khi review lại): thêm check Asset.isActive
    // — nhất quán với `createMedicalDeviceProfileService` và 2 hàm GET/UPDATE
    // profile đã sửa cùng đợt. Asset đã DISPOSED/xoá mềm thì không ghi nhận
    // kiểm định mới được nữa.
    const asset = await Asset.findOne({ _id: assetId, isActive: true });
    if (!asset) {
      throw ApiError.notFound("Không tìm thấy tài sản");
    }

    const profile = await MedicalDeviceProfile.findOne({ asset: assetId });
    if (!profile) {
      throw ApiError.notFound(
        "Tài sản này chưa có profile thiết bị y tế — dùng API tạo (POST .../profile) trước",
      );
    }

    // ĐÃ QUYẾT ĐỊNH (xác nhận với người phụ trách nghiệp vụ khi review): CHO
    // PHÉP ghi nhận kiểm định ngay cả khi `profile.requiresCalibration ===
    // false` — kiểm định "tự nguyện"/ngoài lịch bắt buộc theo luật vẫn là 1
    // sự kiện hợp lệ đáng lưu vết (VD: đơn vị mua thêm dịch vụ kiểm tra định
    // kỳ dù luật không bắt buộc với class thiết bị đó). KHÔNG chặn ở đây.

    // ⚠️ SỬA (phát hiện khi review lại): trước đây KHÔNG kiểm tra
    // `payload.calibratedAt` có mới hơn `profile.lastCalibrationDate` hiện
    // tại hay không. Nếu nhập 1 bản ghi kiểm định CŨ HƠN bản ghi mới nhất đã
    // có (nhập nhầm ngày, hoặc backfill dữ liệu quá khứ) SAU KHI
    // `lastCalibrationDate` đã được set bởi 1 lần kiểm định mới hơn,
    // `profile.nextCalibrationDueDate` sẽ bị ghi đè LÙI VỀ QUÁ KHỨ bằng dữ
    // liệu cũ — khiến cron cảnh báo (Giai đoạn 3) đọc sai hạn kiểm định
    // thật. Chặn ngay tại đây thay vì để lọt xuống DB.
    if (
      profile.lastCalibrationDate &&
      payload.calibratedAt <= profile.lastCalibrationDate
    ) {
      throw ApiError.conflict(
        `calibratedAt (${payload.calibratedAt.toISOString()}) phải mới hơn lần kiểm định gần nhất đã ghi nhận (${profile.lastCalibrationDate.toISOString()}). Nếu cần bổ sung/sửa 1 bản ghi kiểm định trong quá khứ, hãy dùng chức năng sửa trực tiếp bản ghi đó (chưa có ở Giai đoạn 2 — cần bổ sung riêng nếu có nhu cầu), không tạo bản ghi mới.`,
      );
    }

    // Mutate trong memory TRƯỚC (chưa save) — theo đúng field mà
    // `MEDICAL_DEVICE_PROFILE_UPDATE_WHITELIST` CỐ TÌNH loại trừ khỏi PUT
    // thường (xem `assets.constants.ts`): các field này chỉ được đổi qua
    // đúng hành động nghiệp vụ này.
    profile.lastCalibrationDate = payload.calibratedAt;
    profile.nextCalibrationDueDate = payload.nextDueDate;
    // Reset cờ chặn gửi trùng cảnh báo — thiết bị vừa kiểm định xong thì hạn
    // mới đã dời ra xa, cảnh báo cũ (nếu cron từng gửi) không còn ý nghĩa;
    // cho phép cron gửi cảnh báo mới khi tới hạn kế tiếp (Giai đoạn 3).
    // Dùng `undefined` (không phải `null`) để khớp kiểu `Date | undefined`
    // khai báo ở `IMedicalDeviceProfile` — Mongoose xử lý gán `undefined`
    // giống hệt `null` khi save (đều $unset field), không có khác biệt hành
    // vi ở DB.
    profile.calibrationAlertSentAt = undefined;
    profile.updatedBy = userId;

    const record = await withTransaction(async (session) => {
      // GIAI ĐOẠN 5 — nếu có file thật, tạo Upload doc TRONG transaction,
      // đánh dấu `isUsed: true` NGAY (khác với luồng upload chung
      // `POST /api/upload`, nơi `isUsed` mặc định `false` cho tới khi có ai
      // đó gán file vào 1 resource khác — ở đây biết chắc chắn ngay lúc tạo
      // là file này CHỈ dùng cho đúng bản ghi kiểm định này, không cần bước
      // "đánh dấu used sau" riêng).
      let certificateFileUrl: string | undefined = payload.certificateFileUrl;

      if (certificateFile) {
        const [uploadDoc] = await Upload.create(
          [
            {
              fileName: certificateFile.originalname,
              fileUrl: `/uploads/${certificateFile.filename}`,
              fileSize: certificateFile.size,
              mimeType: certificateFile.mimetype,
              uploadedBy: userId,
              isUsed: true,
            },
          ],
          { session },
        );
        // `uploadDoc.fileUrl` được Mongoose tự suy luận kiểu `string | null |
        // undefined` (field `fileUrl` trong `upload.model.ts` không khai
        // `required: true`) — coalesce `null` về `undefined` cho khớp kiểu
        // `certificateFileUrl` của `ICalibrationRecord`. Thực tế luôn có giá
        // trị vì vừa tạo document với `fileUrl` tường minh ngay phía trên.
        certificateFileUrl = uploadDoc.fileUrl ?? undefined;
      }

      const [created] = await CalibrationRecord.create(
        [
          {
            deviceProfile: profile._id,
            calibratedAt: payload.calibratedAt,
            calibratedBy: payload.calibratedBy,
            result: payload.result,
            certificateFileUrl,
            nextDueDate: payload.nextDueDate,
            recordedBy: userId,
          },
        ],
        { session },
      );

      await profile.save({ session });

      return created;
    });

    committed = true;

    return await record.populate(CALIBRATION_RECORD_POPULATE);
  } catch (error) {
    // Chỉ dọn file khi transaction CHƯA commit (file thực sự mồ côi — không
    // có bản ghi DB nào trỏ tới). Nếu transaction đã commit thành công
    // (committed=true) mà lỗi xảy ra ở bước SAU (VD `.populate()`),
    // KHÔNG xoá — file đó đang được tham chiếu hợp lệ bởi
    // `CalibrationRecord.certificateFileUrl` đã lưu trong DB.
    if (certificateFile && !committed) {
      fs.unlink(certificateFile.path, (unlinkErr) => {
        if (unlinkErr) {
          // Best-effort — không throw lỗi dọn file, chỉ log để không che
          // mất lỗi GỐC (lý do thật khiến request thất bại) bằng 1 lỗi phụ
          // (dọn file thất bại) ít quan trọng hơn.
          console.error(
            `[calibrationRecord] Không xoá được file mồ côi "${certificateFile.path}":`,
            unlinkErr,
          );
        }
      });
    }
    throw error;
  }
};

/**
 * 📌 GET — lịch sử kiểm định theo assetId, mới nhất trước, có phân trang.
 * Mirror đúng pattern `getAssetAssignmentHistoryService`
 * (`assetAssignment.service.ts`).
 */
export const getCalibrationHistoryService = async (
  assetId: any,
  query: any,
) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw ApiError.badRequest("ID tài sản không hợp lệ");
  }

  const profile = await MedicalDeviceProfile.findOne({ asset: assetId });
  if (!profile) {
    throw ApiError.notFound("Tài sản này chưa có profile thiết bị y tế");
  }

  const { page = 1, limit = 20 } = query;
  const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
  const pageSize = Math.max(parseInt(limit, 10) || 20, 1);
  const skip = (pageNumber - 1) * pageSize;

  const [history, total] = await Promise.all([
    CalibrationRecord.find({ deviceProfile: profile._id })
      .populate(CALIBRATION_RECORD_POPULATE)
      .sort({ calibratedAt: -1 })
      .skip(skip)
      .limit(pageSize),
    CalibrationRecord.countDocuments({ deviceProfile: profile._id }),
  ]);

  return {
    data: history,
    pagination: {
      page: pageNumber,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};