/**
 * passwordReset.template.ts — nội dung email reset mật khẩu.
 * Tách riêng khỏi service để dễ chỉnh sửa nội dung/giao diện mà không đụng
 * vào logic nghiệp vụ trong `auths.service.ts`.
 */
export const buildPasswordResetEmail = (params: {
  fullName?: string;
  resetLink: string;
  expiresInMinutes: number;
}) => {
  const { fullName, resetLink, expiresInMinutes } = params;

  const subject = "Yêu cầu đặt lại mật khẩu";

  const greeting = fullName ? `Xin chào ${fullName},` : "Xin chào,";

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <p>${greeting}</p>
      <p>Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
      <p>
        <a href="${resetLink}"
           style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;
                  text-decoration:none;border-radius:6px;">
          Đặt lại mật khẩu
        </a>
      </p>
      <p>Hoặc copy đường dẫn sau vào trình duyệt:</p>
      <p style="word-break: break-all; color: #555;">${resetLink}</p>
      <p>Đường dẫn này sẽ hết hạn sau <strong>${expiresInMinutes} phút</strong>.</p>
      <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này — mật khẩu hiện tại của bạn vẫn an toàn.</p>
    </div>
  `;

  const text =
    `${greeting}\n\n` +
    `Hệ thống nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n` +
    `Truy cập đường dẫn sau để đặt lại mật khẩu (hết hạn sau ${expiresInMinutes} phút):\n` +
    `${resetLink}\n\n` +
    `Nếu bạn không yêu cầu, vui lòng bỏ qua email này.`;

  return { subject, html, text };
};