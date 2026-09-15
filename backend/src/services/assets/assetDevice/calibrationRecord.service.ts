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
import { resolveUploadedFilePath } from "../../../shared/utils/uploadStorage.util";

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
 * này.
 *
 * (A2, 2026-09-15 — SỬA bug đường dẫn chết): TRƯỚC ĐÂY khi có file thật,
 * `Upload.fileUrl` (`/uploads/<filename>`) được gán thẳng vào
 * `certificateFileUrl` — nhưng đó là ĐƯỜNG DẪN CHẾT, không `express.static`
 * nào phục vụ (đúng lỗi đã tìm và vá cho domain Upload chung ở FE-15, xem
 * `upload.controller.ts:downloadFile`), FE không tải được. Nay: `Upload._id`
 * được lưu riêng vào `certificateFileId`, `certificateFileUrl` CHỈ còn dùng
 * cho link nhập tay thật (`payload.certificateFileUrl`) — file thật tải qua
 * `getCalibrationCertificateFileService` bên dưới.
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
      // `certificateFileUrl` CHỈ còn dùng cho link nhập tay — KHÔNG bị ghi
      // đè bởi nhánh upload file thật bên dưới nữa (xem comment A2 ở JSDoc
      // trên hàm).
      const certificateFileUrl: string | undefined = payload.certificateFileUrl;
      let certificateFileId: mongoose.Types.ObjectId | undefined;

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
        certificateFileId = uploadDoc._id as mongoose.Types.ObjectId;
      }

      const [created] = await CalibrationRecord.create(
        [
          {
            deviceProfile: profile._id,
            calibratedAt: payload.calibratedAt,
            calibratedBy: payload.calibratedBy,
            result: payload.result,
            certificateFileUrl,
            certificateFileId,
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

/**
 * 📌 DOWNLOAD — trả về đường dẫn thật trên đĩa + tên file gốc của giấy chứng
 * nhận kiểm định đã upload, để controller gọi `res.download()`. (A2,
 * 2026-09-15)
 *
 * Dùng `certificateFileId` (KHÔNG dùng `certificateFileUrl` — field đó giờ
 * chỉ chứa link nhập tay, xem comment ở `createCalibrationRecordService`).
 * Quyền truy cập dựa trên PERMISSION (`MEDICAL_DEVICE_VIEW`, gắn ở route) —
 * KHÁC pattern ownership-check của `upload.controller.ts:downloadFile`
 * (chỉ chủ sở hữu/ADMIN) — vì giấy chứng nhận là hồ sơ của THIẾT BỊ/khoa
 * phòng, không phải tài sản riêng của người đã upload nó; bất kỳ ai xem
 * được lịch sử kiểm định của thiết bị đều hợp lý được tải chứng nhận đi kèm.
 */
export const getCalibrationCertificateFileService = async (
  assetId: any,
  recordId: any,
) => {
  if (
    !mongoose.Types.ObjectId.isValid(assetId) ||
    !mongoose.Types.ObjectId.isValid(recordId)
  ) {
    throw ApiError.badRequest("ID không hợp lệ");
  }

  const profile = await MedicalDeviceProfile.findOne({ asset: assetId });
  if (!profile) {
    throw ApiError.notFound("Tài sản này chưa có profile thiết bị y tế");
  }

  // Xác nhận record THUỘC ĐÚNG profile của :assetId — chặn trường hợp
  // recordId đúng nhưng assetId khác (record thuộc thiết bị khác), tránh lộ
  // nhầm chứng nhận của thiết bị khác nếu ai đó đoán/tự sửa URL.
  const record = await CalibrationRecord.findOne({
    _id: recordId,
    deviceProfile: profile._id,
  });
  if (!record) {
    throw ApiError.notFound("Không tìm thấy bản ghi kiểm định");
  }

  if (!record.certificateFileId) {
    throw ApiError.notFound(
      record.certificateFileUrl
        ? "Bản ghi này dùng link chứng nhận nhập tay (không phải file upload) — mở trực tiếp link đã lưu, không tải qua endpoint này"
        : "Bản ghi này chưa đính kèm giấy chứng nhận",
    );
  }

  const upload = await Upload.findById(record.certificateFileId);
  if (!upload || upload.isDeleted) {
    throw ApiError.notFound("File chứng nhận không còn tồn tại");
  }
  if (!upload.fileUrl || !upload.fileName) {
    throw ApiError.notFound("File thiếu dữ liệu, không thể tải");
  }

  const filePath = resolveUploadedFilePath(upload.fileUrl);
  if (!fs.existsSync(filePath)) {
    throw ApiError.notFound("File không còn tồn tại trên server");
  }

  return { filePath, fileName: upload.fileName as string };
};

/**
 * 📌 UPDATE CERTIFICATE — thay thế file/link chứng nhận đã lưu trên 1 bản
 * ghi kiểm định (KHÔNG đổi field nào khác — `calibratedAt`/`result`/
 * `nextDueDate`/... giữ nguyên, và profile KHÔNG bị đụng tới vì các field
 * đó đã được set đúng lúc CREATE). Bổ sung theo yêu cầu user SAU khi A2 gốc
 * hoàn thành: "upload nhầm file thì sửa lại được" — hiện chưa có cách sửa
 * TOÀN BỘ 1 bản ghi kiểm định (xem comment `calibratedAt` conflict ở
 * `createCalibrationRecordService`), CHỦ Ý thu hẹp phạm vi chỉ đúng phần
 * chứng nhận — tránh mở lại rủi ro đồng bộ `profile.lastCalibrationDate`/
 * `nextCalibrationDueDate` (vốn chỉ nên đổi qua đúng 1 hành động nghiệp vụ
 * "ghi nhận kiểm định MỚI").
 *
 * Giống `createCalibrationRecordService`, `certificateFile` (nếu có) đã
 * được multer ghi ra đĩa TRƯỚC khi hàm này chạy — bọc try/catch dọn file mồ
 * côi nếu lỗi xảy ra sau đó, cùng pattern.
 */
export const updateCalibrationCertificateService = async (
  assetId: any,
  recordId: any,
  payload: any,
  userId?: any,
  certificateFile?: Express.Multer.File,
) => {
  let committed = false;

  try {
    if (
      !mongoose.Types.ObjectId.isValid(assetId) ||
      !mongoose.Types.ObjectId.isValid(recordId)
    ) {
      throw ApiError.badRequest("ID không hợp lệ");
    }

    if (certificateFile && payload.certificateFileUrl) {
      throw ApiError.badRequest(
        "Chỉ được cung cấp 1 trong 2: file upload mới (certificateFile) HOẶC certificateFileUrl mới, không cả hai.",
      );
    }
    if (!certificateFile && !payload.certificateFileUrl) {
      throw ApiError.badRequest(
        "Phải cung cấp file mới (certificateFile) hoặc link mới (certificateFileUrl) để thay thế chứng nhận đã lưu.",
      );
    }

    const profile = await MedicalDeviceProfile.findOne({ asset: assetId });
    if (!profile) {
      throw ApiError.notFound("Tài sản này chưa có profile thiết bị y tế");
    }

    // Cùng lý do IDOR-safety đã áp dụng ở `getCalibrationCertificateFileService`.
    const record = await CalibrationRecord.findOne({
      _id: recordId,
      deviceProfile: profile._id,
    });
    if (!record) {
      throw ApiError.notFound("Không tìm thấy bản ghi kiểm định");
    }

    // Lưu lại Upload CŨ (nếu có) để soft-delete SAU KHI bản ghi mới đã lưu
    // thành công — tránh mất dấu file cũ giữa chừng nếu bước ghi mới thất bại.
    const oldCertificateFileId = record.certificateFileId;

    const updated = await withTransaction(async (session) => {
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
        record.certificateFileId = uploadDoc._id as mongoose.Types.ObjectId;
        record.certificateFileUrl = undefined;
      } else {
        record.certificateFileUrl = payload.certificateFileUrl;
        record.certificateFileId = undefined;
      }

      await record.save({ session });

      // Soft-delete Upload CŨ — cùng semantics `deleteFile`
      // (`upload.controller.ts`: `isDeleted = true`, KHÔNG xoá file vật lý
      // trên đĩa). File mới đã lưu thành công (transaction), file cũ không
      // còn được tham chiếu bởi bất kỳ CalibrationRecord nào nữa.
      if (oldCertificateFileId) {
        await Upload.updateOne(
          { _id: oldCertificateFileId },
          { isDeleted: true },
          { session },
        );
      }

      return record;
    });

    committed = true;

    return await updated.populate(CALIBRATION_RECORD_POPULATE);
  } catch (error) {
    if (certificateFile && !committed) {
      fs.unlink(certificateFile.path, (unlinkErr) => {
        if (unlinkErr) {
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