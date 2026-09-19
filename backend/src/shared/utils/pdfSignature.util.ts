// shared/utils/pdfSignature.util.ts
//
// Roadmap B5 (2026-09-18) — "ký nội bộ" cho PDF xuất từ Document. ĐÂY KHÔNG
// PHẢI chữ ký số theo Luật Giao dịch điện tử (yêu cầu chứng thư số do 1 CA
// được cấp phép như VNPT-CA/Viettel-CA/FPT-CA cấp) — user đã xác nhận rõ
// (AskUserQuestion) chấp nhận mức "self-signed nội bộ, ghi rõ không thay
// CA" để xác thực TÍNH TOÀN VẸN dữ liệu tại thời điểm xuất PDF, không nhằm
// tạo giá trị pháp lý. MỌI nơi hiển thị kết quả của module này (PDF, API)
// PHẢI kèm chú thích rõ ràng về giới hạn này.
//
// 1 cặp khoá RSA DÙNG CHUNG cho toàn hệ thống (không phải khoá riêng từng
// user) — vì tại thời điểm duyệt (approveStep/rejectStep, workflow.service.ts)
// người duyệt KHÔNG hề nhập mật khẩu/PIN nào để "ký" cả, chỉ có
// role+userId+timestamp ghi vào WorkflowInstance.steps. Việc "ký" ở đây là
// HỆ THỐNG xác nhận: "các bản ghi phê duyệt trong PDF này khớp đúng dữ liệu
// đang lưu trong DB tại thời điểm xuất, chưa bị chỉnh sửa lại sau đó" — không
// phải "người duyệt X đã tự tay ký". Sinh khoá 1 lần bằng
// `scripts/generate-pdf-signing-keys.ts`, mỗi môi trường (dev/staging/prod)
// PHẢI có khoá RIÊNG (không copy qua lại), cùng nguyên tắc với JWT_SECRET.
import crypto from "crypto";

const SIGNATURE_ALGORITHM = "RSA-SHA256";

function decodePemFromEnv(envValue: string | undefined, envName: string): string {
  if (!envValue) {
    throw new Error(
      `${envName} chưa được cấu hình (.env) — chạy \`ts-node scripts/generate-pdf-signing-keys.ts\` để sinh khoá rồi dán vào .env trước khi dùng tính năng xuất PDF (Roadmap B5).`,
    );
  }
  return Buffer.from(envValue, "base64").toString("utf8");
}

let cachedPrivateKey: string | undefined;
let cachedPublicKey: string | undefined;

function getPrivateKey(): string {
  if (cachedPrivateKey === undefined) {
    cachedPrivateKey = decodePemFromEnv(process.env.PDF_SIGN_PRIVATE_KEY, "PDF_SIGN_PRIVATE_KEY");
  }
  return cachedPrivateKey;
}

function getPublicKey(): string {
  if (cachedPublicKey === undefined) {
    cachedPublicKey = decodePemFromEnv(process.env.PDF_SIGN_PUBLIC_KEY, "PDF_SIGN_PUBLIC_KEY");
  }
  return cachedPublicKey;
}

/** SHA-256 hex của 1 chuỗi payload đã canonical hoá (JSON.stringify với key cố định thứ tự — xem `documentPdf.service.ts`). */
export function hashPayload(payload: string): string {
  return crypto.createHash("sha256").update(payload, "utf8").digest("hex");
}

/** Ký `payload` bằng khoá RIÊNG TƯ của hệ thống — trả về signature dạng base64 + tên thuật toán đã dùng. */
export function signPayload(payload: string): { signature: string; algorithm: string } {
  const signer = crypto.createSign(SIGNATURE_ALGORITHM);
  signer.update(payload, "utf8");
  signer.end();
  const signature = signer.sign(getPrivateKey(), "base64");
  return { signature, algorithm: SIGNATURE_ALGORITHM };
}

/** Xác minh `signature` (base64) khớp đúng `payload` bằng khoá CÔNG KHAI của hệ thống. */
export function verifySignature(payload: string, signature: string): boolean {
  const verifier = crypto.createVerify(SIGNATURE_ALGORITHM);
  verifier.update(payload, "utf8");
  verifier.end();
  try {
    return verifier.verify(getPublicKey(), signature, "base64");
  } catch {
    // Chữ ký sai định dạng (base64 hỏng, độ dài không khớp khoá...) — coi là KHÔNG hợp lệ thay vì để lỗi văng ra.
    return false;
  }
}
