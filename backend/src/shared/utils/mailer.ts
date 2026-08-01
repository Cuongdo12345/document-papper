import nodemailer, { Transporter } from "nodemailer";

/**
 * mailer.ts — cấu hình transporter SMTP dùng chung toàn hệ thống.
 *
 * ENV cần có (thêm vào .env, chưa từng tồn tại trước đây vì module Auth chưa
 * tích hợp email — trước đây `forgotPassword` trả thẳng `resetToken` qua
 * response cho FE hiển thị modal, chỉ dùng nội bộ/testing):
 *   SMTP_HOST       - vd smtp.gmail.com / email-smtp.ap-southeast-1.amazonaws.com
 *   SMTP_PORT       - vd 587 (STARTTLS) hoặc 465 (SSL)
 *   SMTP_SECURE     - "true" nếu dùng port 465, "false" nếu 587/STARTTLS
 *   SMTP_USER       - username/API key SMTP
 *   SMTP_PASS       - password/API secret SMTP
 *   MAIL_FROM       - địa chỉ hiển thị ở "From", vd '"Hệ thống" <no-reply@domain.com>'
 *   CLIENT_URL      - domain FE để build link reset password, vd https://app.domain.com
 *
 * ⚠️ Nếu project đã có sẵn 1 mailer dùng chung (ví dụ cho tính năng khác), NÊN
 * DÙNG LẠI transporter đó thay vì file này để tránh mở nhiều connection pool
 * SMTP song song không cần thiết.
 */
let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * sendMail — gửi email qua SMTP transporter dùng chung.
 *
 * KHÔNG bắt lỗi ở đây — để nơi gọi (service) tự quyết định xử lý khi gửi thất
 * bại (ví dụ: log lỗi nhưng vẫn trả response "silent" cho client để không lộ
 * thông tin qua timing/response khác nhau giữa "gửi thành công" và "gửi lỗi").
 */
export const sendMail = async ({ to, subject, html, text }: SendMailOptions) => {
  const mailer = getTransporter();

  await mailer.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    html,
    text,
  });
};