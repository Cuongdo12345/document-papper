// services/documents/documentPdf.service.ts
//
// Roadmap B5 (2026-09-18) — Xuất báo cáo PDF chính thức cho Document, kèm
// bảng phê duyệt (lấy từ WorkflowInstance.steps) và "ký nội bộ" xác thực
// tính toàn vẹn dữ liệu tại thời điểm xuất (xem
// `shared/utils/pdfSignature.util.ts` cho giới hạn pháp lý — KHÔNG PHẢI chữ
// ký số CA). Phạm vi: TẤT CẢ category/subType (user đã xác nhận qua
// AskUserQuestion, không chỉ 3 subType PROPOSAL như Excel export) — `meta`
// không có schema cố định với REPORT/MANUAL nên dùng fallback bảng
// key-value thô cho các subType không có shape biết trước.
import path from "path";
import pdfMake from "pdfmake";
import QRCode from "qrcode";
import mongoose from "mongoose";
import { Document, DocumentSubType } from "../../models/documents/document.model";
import WorkflowInstance from "../../models/documents/workflowInstance.model";
import DocumentPdfExport from "../../models/documents/documentPdfExport.model";
import ApiError from "../../shared/errors/ApiError";
import { hashPayload, signPayload, verifySignature } from "../../shared/utils/pdfSignature.util";

/* ===============================
   PDFMAKE SETUP (1 lần/tiến trình)
=============================== */
const ROBOTO_DIR = path.join(path.dirname(require.resolve("pdfmake/package.json")), "fonts", "Roboto");
pdfMake.addFonts({
  Roboto: {
    normal: path.join(ROBOTO_DIR, "Roboto-Regular.ttf"),
    bold: path.join(ROBOTO_DIR, "Roboto-Medium.ttf"),
    italics: path.join(ROBOTO_DIR, "Roboto-Italic.ttf"),
    bolditalics: path.join(ROBOTO_DIR, "Roboto-MediumItalic.ttf"),
  },
});
// Đã verify trực tiếp (smoke test PDF thật, không suy đoán): Roboto bundled
// theo pdfmake render ĐÚNG dấu tiếng Việt — không cần nhúng font riêng.
pdfMake.setUrlAccessPolicy(() => false); // Không cần tải resource ngoài — chặn hẳn, giảm bề mặt SSRF.
pdfMake.setLocalAccessPolicy((p: string) => p.startsWith(ROBOTO_DIR)); // Chỉ cho đọc đúng font đã khai báo, không mở quyền đọc file cục bộ tuỳ ý.

const ORG_DISPLAY_NAME = process.env.ORG_DISPLAY_NAME || "ĐƠN VỊ Y TẾ";

/* ===============================
   HELPERS
=============================== */
function formatCurrencyVN(n: unknown): string {
  const num = Number(n ?? 0);
  return Number.isFinite(num) ? `${num.toLocaleString("vi-VN")} đ` : "—";
}

function formatDateVN(d: unknown): string {
  if (!d) return "—";
  const date = new Date(d as string);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("vi-VN");
}

const WORKFLOW_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã huỷ",
  completed: "Hoàn tất",
};

const STEP_STATUS_LABEL: Record<string, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
  cancelled: "Đã huỷ",
};

/**
 * Mapping shape `meta` theo `subType` — ĐỒNG BỘ với nguồn sự thật phía FE
 * (`frontend/src/features/documents/utils/documentMeta.ts::getMetaShape`,
 * xác nhận bằng dữ liệu thật, FE-04). Không import chéo được (2 codebase
 * riêng) nên duy trì thủ công — đổi 1 bên phải soát lại bên kia.
 */
function getMetaShape(subType: string): "issue" | "items-procurement" | "items-inspection" | "raw" {
  if (subType === DocumentSubType.PROPOSE_REPAIR) return "issue";
  if (subType === DocumentSubType.PROPOSE_INK || subType === DocumentSubType.PROPOSE_PROCUREMENT) return "items-procurement";
  if (subType === DocumentSubType.CHECK_DAMAGE || subType === DocumentSubType.CONFIRM_STATUS) return "items-inspection";
  return "raw";
}

/** Bảng items dùng chung cho 2 shape "items-procurement"/"items-inspection" — chỉ khác tên cột đầu + có/không cột "Ghi chú". */
function buildItemsTable(items: Record<string, any>[], nameKey: string, nameHeader: string, showNote: boolean): any {
  const header = [nameHeader, "SL", "Đơn giá", "Thành tiền", ...(showNote ? ["Ghi chú"] : [])];
  const body = items.map((it) => [
    String(it[nameKey] ?? "—"),
    String(it.quantity ?? "—"),
    formatCurrencyVN(it.unitPrice),
    formatCurrencyVN(it.totalPrice),
    ...(showNote ? [String(it.note ?? "—")] : []),
  ]);
  return {
    table: {
      headerRows: 1,
      widths: showNote ? ["*", "auto", "auto", "auto", "*"] : ["*", "auto", "auto", "auto"],
      body: [header, ...body],
    },
    layout: "lightHorizontalLines",
    fontSize: 9,
    margin: [0, 4, 0, 8],
  };
}

/** Nội dung PDF cho phần "Nội dung" — rẽ nhánh theo shape, fallback key-value thô khi meta không có shape biết trước (REPORT ngoài 2 subType đã biết / MANUAL / dữ liệu bất thường). */
function buildMetaContent(subType: string, meta: Record<string, any>): any[] {
  const shape = getMetaShape(subType);
  const m = meta ?? {};

  if (shape === "issue") {
    const parts: any[] = [{ text: String(m.issue ?? "—"), margin: [0, 2, 0, 4] }];
    if (m.repairResult) {
      parts.push({ text: `Kết quả sửa chữa: ${m.repairResult === "REPAIRED" ? "Đã sửa xong" : "Không thể sửa"}`, fontSize: 10 });
    }
    return parts;
  }

  if (shape === "items-procurement" || shape === "items-inspection") {
    const items = Array.isArray(m.items) ? (m.items as Record<string, any>[]) : [];
    const content: any[] = [];
    if (shape === "items-inspection" && m.inspectionResult) {
      content.push({ text: [{ text: "Kết quả kiểm tra: ", bold: true }, String(m.inspectionResult)], margin: [0, 0, 0, 4] });
    }
    content.push(
      buildItemsTable(
        items,
        shape === "items-procurement" ? "deviceName" : "description",
        shape === "items-procurement" ? "Thiết bị/Vật tư" : "Hạng mục",
        shape === "items-procurement",
      ),
    );
    if (typeof m.totalAmount === "number") {
      content.push({ text: `Tổng cộng: ${formatCurrencyVN(m.totalAmount)}`, alignment: "right", bold: true, fontSize: 10 });
    }
    return content;
  }

  // "raw" — không có shape cố định (MANUAL, hoặc dữ liệu meta bất thường ở subType khác). Dump key-value thô, GIỐNG hệt fallback FE (`DocumentMetaView.tsx`).
  return [
    {
      text: JSON.stringify(m, null, 2),
      fontSize: 8,
      font: "Roboto",
      preserveLeadingSpaces: true,
      margin: [0, 2, 0, 4],
    },
  ];
}

type WorkflowStepView = {
  name?: string;
  role?: string;
  status?: string;
  approvedBy?: { fullName?: string; username?: string } | null;
  approvedAt?: Date | null;
  comment?: string | null;
};

function buildApprovalTable(steps: WorkflowStepView[]): any {
  const header = ["Bước", "Vai trò", "Người xử lý", "Trạng thái", "Ngày xử lý", "Ghi chú"];
  const body = steps.map((s) => [
    String(s.name ?? "—"),
    String(s.role ?? "—"),
    s.approvedBy ? (s.approvedBy.fullName ?? s.approvedBy.username ?? "—") : "—",
    STEP_STATUS_LABEL[s.status ?? ""] ?? s.status ?? "—",
    formatDateVN(s.approvedAt),
    String(s.comment ?? "—"),
  ]);
  return {
    table: { headerRows: 1, widths: ["auto", "auto", "*", "auto", "auto", "*"], body: [header, ...body] },
    layout: "lightHorizontalLines",
    fontSize: 9,
  };
}

/* ===============================
   EXPORT PDF
=============================== */
export const exportDocumentPdfService = async (
  documentId: any,
  actorUserId: any,
): Promise<{ buffer: Buffer; fileName: string }> => {
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw ApiError.badRequest("Document ID không hợp lệ");
  }

  const doc = await Document.findOne({ _id: documentId, isActive: true })
    .populate("department", "name code")
    .populate("createdBy", "fullName username");
  if (!doc) throw ApiError.notFound("Không tìm thấy document");

  let steps: WorkflowStepView[] = [];
  if (doc.workflowInstanceId) {
    const wf = await WorkflowInstance.findById(doc.workflowInstanceId).populate("steps.approvedBy", "username fullName");
    if (wf) steps = wf.steps as unknown as WorkflowStepView[];
  }

  // Payload canonical để hash+ký — CHỈ field thực sự hiển thị trong PDF (đủ
  // để "xác thực đúng nội dung đã xuất", không cần thêm field ẩn khác của
  // Document). Thứ tự key CỐ ĐỊNH (object literal) — không cần thư viện
  // canonical-JSON vì không cần khớp lại hash cũ qua thời gian (verify chỉ
  // kiểm tra chữ ký khớp ĐÚNG hash đã LƯU tại thời điểm xuất, không tính lại
  // từ DB hiện tại — xem `verifyDocumentPdfExportService`).
  const payload = JSON.stringify({
    documentId: String(doc._id),
    documentCode: doc.documentCode,
    title: doc.title,
    category: doc.category,
    subType: doc.subType,
    meta: doc.meta,
    workflowStatus: doc.workflowStatus,
    steps: steps.map((s) => ({
      name: s.name,
      role: s.role,
      status: s.status,
      approvedBy: s.approvedBy ? String((s.approvedBy as any)._id ?? "") : null,
      approvedAt: s.approvedAt ? new Date(s.approvedAt).toISOString() : null,
      comment: s.comment ?? null,
    })),
  });
  const contentHash = hashPayload(payload);
  const { signature, algorithm } = signPayload(contentHash);

  const exportRecord = await DocumentPdfExport.create({
    document: doc._id,
    exportedBy: actorUserId,
    contentHash,
    signature,
    algorithm,
  });

  const qrDataUrl = await QRCode.toDataURL(`PDFEXPORT:${exportRecord._id}`, { margin: 1, width: 120 });

  const department = doc.department as any;
  const createdBy = doc.createdBy as any;
  const now = new Date();

  const docDefinition: any = {
    pageMargins: [40, 50, 40, 60],
    defaultStyle: { font: "Roboto", fontSize: 10 },
    content: [
      { text: ORG_DISPLAY_NAME, bold: true, fontSize: 13 },
      { text: `Khoa/Phòng: ${department?.name ?? "—"}`, fontSize: 10, margin: [0, 0, 0, 10] },
      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5 }], margin: [0, 0, 0, 10] },

      { text: doc.title, bold: true, fontSize: 14, margin: [0, 0, 0, 4] },
      { text: `Mã: ${doc.documentCode ?? "—"}  ·  Loại: ${doc.category} / ${doc.subType}`, fontSize: 9, color: "#555555" },

      {
        columns: [
          { text: [{ text: "Người tạo: ", bold: true }, createdBy?.fullName ?? "—"], fontSize: 9 },
          { text: [{ text: "Ngày tạo: ", bold: true }, formatDateVN(doc.createdAt)], fontSize: 9 },
          { text: [{ text: "Trạng thái: ", bold: true }, WORKFLOW_STATUS_LABEL[doc.workflowStatus] ?? doc.workflowStatus], fontSize: 9 },
        ],
        margin: [0, 6, 0, 12],
      },

      { text: "Nội dung", bold: true, fontSize: 11, margin: [0, 0, 0, 4] },
      ...buildMetaContent(doc.subType, doc.meta as Record<string, any>),

      { text: "Phê duyệt", bold: true, fontSize: 11, margin: [0, 10, 0, 4] },
      steps.length > 0
        ? buildApprovalTable(steps)
        : { text: "Tài liệu chưa được submit vào workflow nào.", fontSize: 9, color: "#777777" },

      { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5 }], margin: [0, 16, 0, 8] },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "Xác thực nội bộ hệ thống", bold: true, fontSize: 9 },
              { text: `Mã xác thực: ${exportRecord._id}`, fontSize: 8, color: "#555555" },
              { text: `Xuất lúc: ${formatDateVN(now)}`, fontSize: 8, color: "#555555" },
              {
                text:
                  "Đây là xác thực NỘI BỘ nhằm đảm bảo tính toàn vẹn dữ liệu tại thời điểm xuất PDF này (hệ thống tự ký bằng khoá riêng, không do người duyệt tự tay ký). KHÔNG PHẢI chữ ký số theo quy định pháp luật Việt Nam (không do tổ chức cung cấp dịch vụ chứng thực chữ ký số — CA — cấp). Vui lòng đóng dấu/ký tay bổ sung nếu cần lưu hồ sơ chính thức.",
                fontSize: 7,
                italics: true,
                color: "#777777",
                margin: [0, 4, 0, 0],
              },
            ],
          },
          { width: 90, image: qrDataUrl, fit: [80, 80], alignment: "right" },
        ],
      },
    ],
  };

  const buffer: Buffer = await pdfMake.createPdf(docDefinition).getBuffer();
  const fileName = `${doc.documentCode || doc._id}.pdf`;

  return { buffer, fileName };
};

/* ===============================
   VERIFY
=============================== */
export const verifyDocumentPdfExportService = async (exportId: any) => {
  if (!mongoose.Types.ObjectId.isValid(exportId)) {
    throw ApiError.badRequest("Mã xác thực không hợp lệ");
  }

  const record = await DocumentPdfExport.findById(exportId);
  if (!record) throw ApiError.notFound("Không tìm thấy bản ghi xuất PDF");

  const valid = verifySignature(record.contentHash, record.signature);

  return {
    valid,
    documentId: record.document,
    exportedBy: record.exportedBy,
    exportedAt: record.createdAt,
    algorithm: record.algorithm,
    disclaimer:
      "Xác thực NỘI BỘ hệ thống — KHÔNG PHẢI chữ ký số theo quy định pháp luật Việt Nam (không do CA cấp).",
  };
};
