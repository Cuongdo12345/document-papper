// models/document.model.ts
import { Schema, model, Types } from "mongoose";
import type { IDocument } from "../../interfaces/documents/document.interface";

/* ===== ENUM ===== */
// Loại giấy tờ chính (Đề xuất, Biên bản)
export enum DocumentCategory {
  PROPOSAL = "PROPOSAL",
  REPORT = "REPORT",
  // GIAI ĐOẠN 3 (đính kèm manual thiết bị) — category MỚI, tách riêng
  // khỏi PROPOSAL/REPORT vì bản chất khác hẳn: đây là tài liệu THAM KHẢO
  // (không cần ai duyệt, không tham chiếu ngược PROPOSAL nào)
  REFERENCE = "REFERENCE",
}

export enum DocumentSubType {
  // PROPOSAL 3 loại giấy đề xuất sửa chữa, đề xuất mực, đề xuất mua sắm
  PROPOSE_REPAIR = "PROPOSE_REPAIR",
  PROPOSE_INK = "PROPOSE_INK",
  PROPOSE_PROCUREMENT = "PROPOSE_PROCUREMENT",

  // REPORT 2 loại biên bản kiểm tra hư hỏng, biên bản xác nhận tình trạng...
  CHECK_DAMAGE = "CHECK_DAMAGE",
  CONFIRM_STATUS = "CONFIRM_STATUS",
  // REFERENCE — tài liệu kỹ thuật/hướng dẫn sử dụng, thường gắn với 1 Asset
  // cụ thể qua `relatedAsset` (không bắt buộc)
  MANUAL = "MANUAL",
}

/* ===== SCHEMA ===== */

const DocumentSchema = new Schema<IDocument>(
  {
    documentCode: {
      type: String,
    },

    category: {
      type: String,
      enum: Object.values(DocumentCategory),
      required: true,
    },

    // PROPOSAL | REPORT
    subType: {
      type: String,
      enum: Object.values(DocumentSubType),
      required: true,
    },

    title: { type: String, required: true },

    isActive: { type: Boolean, default: true },

    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    deletedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    deletedAt: { type: Date, default: undefined },

    serviceDate: {
      type: Date,
      index: true,
    },

    actualCost: {
      type: Number,
    },

    workflowInstanceId: {
      type: Schema.Types.ObjectId,
      ref: "WorkflowInstance",
    },

    workflowStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "completed"],
      default: "pending",
    },

    // 🔗 GIAI ĐOẠN 3 (module Asset) — xem giải thích đầy đủ ở interface
    // `IDocument.relatedAsset` phía trên.
    relatedAsset: {
      type: Schema.Types.ObjectId,
      ref: "Asset",
    },

    /** ⛓ CHỈ DÙNG CHO REPORT */
    referenceTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "Document",
        // index: true,
        default: [],
      },
    ],
    meta: {
      type: Schema.Types.Mixed,
      required: true,
    },

    signedBy: [
      {
        role: String,
        user: { type: Schema.Types.ObjectId, ref: "User" },
        signedAt: Date,
      },
    ],

    createdAt: { type: Date, default: Date.now() },
    updatedAt: { type: Date, default: Date.now() },
  },
  { timestamps: true },
);

/* ===== INDEX QUAN TRỌNG ===== */
/**
 * SEARCH / LOOKUP
 */
DocumentSchema.index({ documentCode: 1 }, { unique: true });

/**
 * [MỚI 2026-09-18, DEV-063 — Roadmap B6 "Tìm kiếm toàn văn"] Thay index text
 * cũ `{title:"text", documentCode:"text"}` (định nghĩa sẵn từ trước nhưng
 * KHÔNG hề được dùng — `getAllDocumentsService` search bằng `$regex` thủ
 * công, không phải `$text`) bằng index text MỚI mở rộng sang `meta` (nội
 * dung/ghi chú tự do — mô tả sự cố, ghi chú hạng mục, kết quả kiểm tra; xem
 * `documentMeta.ts` phía FE cho đủ các shape).
 *
 * `{"$**": "text"}` — WILDCARD text index (index MỌI field string trong
 * toàn document, không riêng `meta`). Đã THỬ giới hạn wildcard chỉ trong
 * subtree `{"meta.$**": "text"}` kết hợp thêm 2 field text tường minh
 * (`title`/`documentCode`) — MongoDB từ chối spec đó ("Index key contains an
 * illegal field name") vì KHÔNG hỗ trợ trộn wildcard subtree với field text
 * tường minh khác trong CÙNG 1 index. Dùng wildcard toàn document + `weights`
 * để bù lại (field không liệt kê trong `weights` mặc định weight 1) — hệ quả
 * phụ CHẤP NHẬN ĐƯỢC: vài field string ngắn khác (`workflowStatus`,
 * `signedBy.role`...) cũng bị index/search được, không gây hại (không rò rỉ
 * thêm dữ liệu nhạy cảm nào ngoài field vốn đã trả về qua API list).
 *
 * MongoDB CHỈ cho phép 1 text index/collection — `weights` ưu tiên khớp ở
 * `title`/`documentCode` cao hơn nội dung `meta` (thường dài, dễ khớp nhiều
 * từ ngẫu nhiên hơn). `default_language: "none"` TẮT stemming/stopword
 * tiếng Anh mặc định của MongoDB (không có stemmer tiếng Việt) — tránh biến
 * dạng sai từ tiếng Việt, giữ so khớp theo token nguyên văn (vẫn không phân
 * biệt hoa/thường và dấu nhờ Unicode case-folding mặc định của MongoDB).
 *
 * ⚠️ Đổi 1 text index đang tồn tại sang spec khác BẮT BUỘC migrate thủ công
 * (MongoDB báo lỗi IndexOptionsConflict nếu chỉ sửa schema rồi khởi động lại
 * app với `autoIndex`) — xem `scripts/migrate-document-fulltext-index.ts`
 * (đã chạy 1 lần trên DB dev khi triển khai DEV-063, gọi `Document.
 * syncIndexes()`).
 */
DocumentSchema.index(
  { "$**": "text" },
  {
    name: "document_fulltext_search",
    weights: { title: 10, documentCode: 5 },
    default_language: "none",
  },
);

/**
 * WORKFLOW INDEX
 */
DocumentSchema.index({ subType: 1, department: 1 });

/**
 * REFERENCE LOOKUP
 */
DocumentSchema.index({ referenceTo: 1 });

/**
 * LIST + FILTER INDEX (quan trọng nhất)
 */
DocumentSchema.index({
  department: 1,
  subType: 1,
  // status: 1,
  createdAt: -1,
});

/**
 * USER RELATED
 */
DocumentSchema.index({ createdBy: 1 });

/**
 * DATE FILTER
 */
DocumentSchema.index({ createdAt: -1 });

/**
 * COMPOSITE INDEX CHO CÁC TRƯỜNG THƯỜNG DÙNG CÙNG NHAU
 * 1. Tìm kiếm theo referenceTo + category (tìm report theo proposal)
 * 2. Tìm kiếm theo category + subType + isActive (lọc danh sách theo loại và trạng thái)
 * 3. Tìm kiếm theo department + subType (lọc danh sách theo khoa và loại)
 * 4. Tìm kiếm theo referenceTo + category + isActive (tìm report theo proposal và trạng thái)
 *
 * Bật lại (P3.1, MODULE_P3_PERFORMANCE_PLAN.md): index này trước đây bị
 * comment, khiến `getReportsByProposalService`/`findReportsByProposal`
 * (documents.query.ts) phải collection-scan thay vì dùng index đúng shape
 * đã thiết kế sẵn. Không breaking — chỉ đổi tốc độ truy vấn, không đổi kết
 * quả trả về. Nên chạy `explain("executionStats")` sau khi deploy để xác
 * nhận `IXSCAN` thay vì `COLLSCAN`.
 */
DocumentSchema.index({
  referenceTo: 1,
  category: 1,
  isActive: 1,
  createdAt: 1,
});

/**
 * DASHBOARD INDEX (DEV-018/IMP-024, PERF-03/RV07-02)
 *
 * `services/dashboard/dashboard.service.ts` lọc `{ isActive: true,
 * deletedAt: null }` ở 8+ vị trí `$match`/`find()` (kèm sort `createdAt`
 * ở phần lớn), nhưng schema trước đây KHÔNG có index nào chứa `isActive`
 * hay `deletedAt` — mọi truy vấn dashboard COLLSCAN toàn bộ collection dù
 * `isActive`/`deletedAt` có selectivity thấp (đa số document `isActive:
 * true`) nên vẫn cần `createdAt` trong cùng index để index-only phục vụ
 * luôn phần sort, giảm bước `SORT` riêng sau `IXSCAN`.
 */
DocumentSchema.index({ isActive: 1, deletedAt: 1, createdAt: -1 });

export const Document = model<IDocument>("Document", DocumentSchema);
