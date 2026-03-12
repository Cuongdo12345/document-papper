// models/document.model.ts
import { Schema, model, Types } from "mongoose";
import mongoose from "mongoose";

/* ===== ENUM ===== */
// Loại giấy tờ chính (Đề xuất, Biên bản)
export enum DocumentCategory {
  PROPOSAL = "PROPOSAL",
  REPORT = "REPORT",
}

export enum DocumentSubType {
  // PROPOSAL 3 loại giấy đề xuất sửa chữa, đề xuất mực, đề xuất mua sắm
  PROPOSE_REPAIR = "PROPOSE_REPAIR",
  PROPOSE_INK = "PROPOSE_INK",
  PROPOSE_PROCUREMENT = "PROPOSE_PROCUREMENT",

  // REPORT 2 loại biên bản kiểm tra hư hỏng, biên bản xác nhận tình trạng...
  CHECK_DAMAGE = "CHECK_DAMAGE",
  CONFIRM_STATUS = "CONFIRM_STATUS",
}

/* ===== INTERFACE ===== */

export interface IDocument {
  category: DocumentCategory;
  subType: DocumentSubType;
  title: string;
  documentCode?: string;
  isActive?: boolean;
  department: Types.ObjectId;
  createdBy: Types.ObjectId;
  updatedBy: Types.ObjectId;
  deletedBy?: Types.ObjectId;

  // status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

  /** 🔗 Biên bản trỏ về giấy đề xuất */
  referenceTo?: Types.ObjectId[];

  /** Dữ liệu động theo từng loại giấy */
  meta: Record<string, any>;

  serviceDate?: Date;
  actualCost?: number;
  repairStatus?: "PENDING" | "IN_PROGRESS" | "DONE";

  signedBy?: {
    role: string;
    user?: Types.ObjectId;
    signedAt?: Date;
  }[];

  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

/* ===== SCHEMA ===== */

const DocumentSchema = new Schema<IDocument>(
  {
    documentCode: {
      type: String,
      unique: true,
      index: true,
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
      // required: true,
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

    repairStatus: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "DONE"],
      default: "PENDING",
      index: true,
    },

    // status: {
    //   type: String,
    //   enum: ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED"],
    //   default: "DRAFT",
    // },

    /** ⛓ CHỈ DÙNG CHO REPORT */
    referenceTo: [
      {
        type: Schema.Types.ObjectId,
        ref: "Document",
        index: true,
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
DocumentSchema.index({ title: "text", documentCode: "text" });

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
 */
// DocumentSchema.index({
//   referenceTo: 1,
//   category: 1,
//   isActive: 1,
//   createdAt: 1,
// });

export const Document = model<IDocument>("Document", DocumentSchema);
