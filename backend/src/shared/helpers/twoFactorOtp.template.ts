import { escapeHtml } from "../utils/html.util";

/**
 * twoFactorOtp.template.ts — nội dung email mã OTP 2FA (Roadmap C1, DEV-068,
 * 2026-09-19). Mirror `passwordReset.template.ts` (template-literal builder,
 * KHÔNG dùng `ejs` — xem `weeklyReport.template.ts` cho lý do). Dùng chung
 * cho 2 ngữ cảnh (đăng nhập/bật 2FA lần đầu) — phân biệt qua `context`.
 */
export const buildTwoFactorOtpEmail = (params: {
  fullName?: string;
  code: string;
  expiresInMinutes: number;
  context: "login" | "enable";
}) => {
  const { fullName, code, expiresInMinutes, context } = params;

  const subject = context === "login" ? "Mã xác thực đăng nhập" : "Mã xác nhận bật xác thực 2 lớp";
  const intro =
    context === "login"
      ? "Hệ thống nhận được yêu cầu đăng nhập vào tài khoản của bạn."
      : "Hệ thống nhận được yêu cầu bật xác thực 2 lớp (2FA) cho tài khoản của bạn.";

  const greeting = fullName ? `Xin chào ${escapeHtml(fullName)},` : "Xin chào,";
  const greetingText = fullName ? `Xin chào ${fullName},` : "Xin chào,";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <p>${greeting}</p>
      <p>${intro}</p>
      <p style="text-align:center; margin: 24px 0;">
        <span style="display:inline-block; padding:12px 24px; background:#f1f5f9; border-radius:8px;
                     font-size:28px; font-weight:700; letter-spacing:6px; color:#0f172a;">
          ${code}
        </span>
      </p>
      <p>Mã này sẽ hết hạn sau <strong>${expiresInMinutes} phút</strong>.</p>
      <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email và liên hệ IT/Quản trị hệ thống.</p>
    </div>
  `;

  const text =
    `${greetingText}\n\n` +
    `${intro}\n` +
    `Mã xác thực của bạn: ${code}\n` +
    `Mã hết hạn sau ${expiresInMinutes} phút.\n\n` +
    `Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email và liên hệ IT/Quản trị hệ thống.`;

  return { subject, html, text };
};
