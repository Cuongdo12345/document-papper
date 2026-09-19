import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "../../models/users/user.model";
import { Role } from "../../models/rbac/role.model";
import RefreshToken from "../../models/auth/refreshToken.model";
import UserAudit from "../../models/users/userAudit.model";
import PasswordResetToken from "../../models/auth/passwordResetToken.model";
import TwoFactorOtp from "../../models/auth/twoFactorOtp.model";
import ApiError from "../../shared/errors/ApiError";
import {
  generateAccessToken,
  generateRefreshToken,
  hashResetToken,
  generateResetToken,
  generateOtpCode,
} from "../../shared/helpers/auth.helper";
import { sendMail } from "../../shared/utils/mailer";
import { buildPasswordResetEmail } from "../../shared/helpers/passwordReset.template";
import { buildTwoFactorOtpEmail } from "../../shared/helpers/twoFactorOtp.template";
import { parseUserAgent } from "../../shared/helpers/userAgent.helper";

/**
 * Roadmap C1 (Xác thực 2 lớp qua email OTP, DEV-068, 2026-09-19) — CHỈ 4 role
 * này mới bật được 2FA (đúng mô tả roadmap "ADMIN và các role duyệt cấp
 * cao"), user xác nhận qua AskUserQuestion KHÔNG mở rộng thêm
 * PHONG_VAT_TU_TTB dù role đó cũng có `WORKFLOW_APPROVE`.
 */
const TWO_FACTOR_ELIGIBLE_ROLE_NAMES = ["ADMIN", "TRUONG_KHOA", "DIEU_DUONG_TRUONG", "BAN_GIAM_DOC"] as const;

const OTP_EXPIRES_MINUTES = 10;
/** Chặn brute-force mã 6 số (1 triệu khả năng) — quá 5 lần sai phải đăng nhập/yêu cầu lại từ đầu. */
const OTP_MAX_ATTEMPTS = 5;

// ⚠️ ĐÃ XÁC NHẬN qua `role.model.ts`: `Role` là NAMED export
// (`export const Role = model<IRole>(...)`), KHÔNG PHẢI default export — bản
// trước đó của file này dùng `import Role from ...` (sai, sẽ lỗi runtime/type
// "Role is not a constructor" hoặc undefined). Đã sửa thành named import.
//
// ⚠️ VẪN CẦN XÁC NHẬN: đường dẫn `../../models/rbac/role.model` là SUY ĐOÁN
// dựa theo cấu trúc thư mục `../../models/documents/...`, `../../models/users/...`
// đã thấy ở các module khác — chưa có file cấu trúc thư mục thật để xác nhận
// `role.model.ts` có nằm đúng ở `models/rbac/` hay không (có thể là
// `models/users/role.model.ts` hoặc khác). Sửa lại đường dẫn này nếu sai khi
// merge vào repo thật.

// ⚠️ SỬA (theo yêu cầu): chuyển từ `export class AuthService { static async ... }`
// sang `export const fn = async (...) => {}` thuần — đồng bộ style với
// `document.service.ts`/`workflow.service.ts`/`rbac.service.ts`. KHÔNG đổi
// logic nghiệp vụ bên trong từng hàm.
//
// ⚠️ SỬA (dọn dẹp lần này):
//  1. XOÁ REGRESSION nghiêm trọng ở `forgotPassword()`: dòng
//     `if(!user) throw ApiError.badRequest("Username không tồn tại")` đã bị
//     thêm thủ công vào bản trước, PHÁ VỠ chống enumeration mà bản vá gốc cố
//     tình làm (luôn trả `{silent:true}` bất kể user tồn tại hay không). Đã
//     xoá, khôi phục đúng hành vi chống enumeration.
//  2. XOÁ toàn bộ khối dead code ~320 dòng ở cuối file (1 bản `class
//     AuthService` cũ, đã comment sẵn, từ trước khi tích hợp email) — không
//     có tác dụng gì, chỉ gây nhiễu khi audit code sau này.

// Tên role mặc định gán cho user mới tự đăng ký — nên đưa ra ENV để dễ đổi mà
// không phải sửa code, đề phòng tên role thực tế khác "USER".
const DEFAULT_REGISTER_ROLE_NAME = process.env.DEFAULT_REGISTER_ROLE_NAME || "USER";

// Hash "vô hại" dùng để chạy `bcrypt.compare` khi user không tồn tại — mục đích
// duy nhất là giữ thời gian xử lý gần bằng nhánh "user tồn tại nhưng sai mật
// khẩu", giảm timing side-channel cho việc dò username hợp lệ qua độ trễ phản
// hồi. Đây KHÔNG phải hash thật của tài khoản nào.
const DUMMY_PASSWORD_HASH =
  "$2b$10$CwTycUXWue0Thq9StjUM0uJ8n7wOwGmhchXvL0J6HqL0Yqz8G9c1O";

/**
 * REGISTER — tự đăng ký tài khoản mới
 *
 * ⚠️ Thiết kế dưới đây là DIỄN GIẢI HỢP LÝ dựa trên pattern đã thấy ở
 * `login()`/`resetPassword()` trong cùng file — CẦN BẠN XÁC NHẬN LẠI các
 * quyết định sau trước khi coi là hoàn chỉnh, vì đây đều là quyết định
 * nghiệp vụ/bảo mật, không phải lỗi kỹ thuật đơn thuần:
 *
 *   1. **Cho phép tự đăng ký công khai** (không cần admin duyệt trước).
 *      Nếu hệ thống của bạn chỉ nên tạo user qua Admin (UserService riêng,
 *      có kiểm soát role/department chặt hơn), route "/register" này
 *      KHÔNG NÊN mở public — cân nhắc bỏ hẳn hoặc giới hạn `authorizePermission`
 *      (chỉ Admin gọi được) thay vì để ai cũng tự đăng ký.
 *   2. **`isActive: true` ngay khi đăng ký** (không cần xác thực email trước).
 *      Nếu cần bắt buộc verify email trước khi kích hoạt tài khoản, cần
 *      thêm cờ `isActive: false` + luồng gửi email xác thực riêng (không
 *      nằm trong phạm vi "vá code hiện có" — là tính năng mới hoàn toàn).
 *   3. **Gán mặc định role `DEFAULT_REGISTER_ROLE_NAME`** ("USER" nếu không
 *      cấu hình ENV) — cần xác nhận role này tồn tại sẵn trong DB
 *      (seed data), nếu không hàm này sẽ luôn lỗi 500 vì không tìm thấy role
 *      gán cho user mới.
 *   4. **Không gán `department`** — DTO hiện không thu thập department lúc
 *      đăng ký. Nếu nghiệp vụ yêu cầu user luôn thuộc 1 department ngay từ
 *      lúc tạo (giống ở Document module), cần bổ sung field này vào
 *      `RegisterDTO` và bắt buộc chọn.
 *
 * Logic thực thi:
 *  - Check trùng username VÀ email (báo lỗi 409 Conflict, không leak field
 *    nào trùng cụ thể để tránh dò email/username tồn tại qua message chi
 *    tiết — chỉ nói chung "đã tồn tại").
 *  - Hash password bcrypt cost 10 (đồng bộ với `resetPassword()` hiện có).
 *  - Ghi audit log hành động REGISTER.
 *  - KHÔNG tự động đăng nhập sau khi đăng ký (không trả accessToken/refreshToken)
 *    — buộc user đăng nhập lại bằng `/login` cho rõ ràng luồng, tránh nhầm
 *    lẫn giữa 2 trách nhiệm (đăng ký vs đăng nhập). Nếu bạn muốn auto-login
 *    ngay sau đăng ký, có thể gọi lại logic của `login()` ở cuối hàm này.
 */
export const register = async (payload: {
  username: string;
  email: string;
  password: string;
  fullName: string;
}) => {
  const { username, email, password, fullName } = payload;

  const existing = await User.findOne({
    $or: [{ username }, { email }],
  }).select("_id");

  if (existing) {
    throw ApiError.conflict("Username hoặc email đã được sử dụng");
  }

  const defaultRole = await Role.findOne({ name: DEFAULT_REGISTER_ROLE_NAME }).select("_id");

  if (!defaultRole) {
    // Lỗi cấu hình hạ tầng (thiếu seed role mặc định) — KHÔNG phải lỗi input
    // của user, nên trả 500 thay vì 400, để phân biệt rõ với lỗi do user
    // nhập sai.
    throw ApiError.internal(
      `Không tìm thấy role mặc định "${DEFAULT_REGISTER_ROLE_NAME}" để gán cho user mới — cần seed role này trước.`
    );
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    username,
    email,
    fullName,
    password: hashedPassword,
    role: defaultRole._id,
    isActive: true,
  });

  await UserAudit.create({
    user: user._id,
    action: "REGISTER",
    performedBy: user._id,
    note: "User tự đăng ký tài khoản",
  });

  return {
    _id: user._id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
  };
};

/**
 * LOGIN
 * Kiểm tra username + password
 * Kiểm tra isActive
 * Gộp permissions từ role + user vào token
 * Lưu refresh token vào DB để quản lý
 * Ghi log audit
 * Trả về access token + refresh token + thông tin user (không bao gồm password)
 *
 * ⚠️ SỬA (review Auth module):
 *  - Gộp message lỗi "user không hợp lệ" và "sai mật khẩu" thành 1 message
 *    chung, tránh account enumeration qua nội dung response (trước đây 2
 *    nhánh trả message khác nhau).
 *  - Khi user không tồn tại/bị khoá, vẫn chạy `bcrypt.compare` với 1 hash
 *    "vô hại" cố định để thời gian phản hồi gần bằng nhánh sai mật khẩu thật
 *    — giảm timing side-channel.
 */
/**
 * Roadmap C1 (DEV-068, 2026-09-19) — phần "cấp token thật" của `login()`
 * TÁCH RIÊNG thành hàm dùng chung, vì giờ có 2 điểm cần cấp token sau khi đã
 * xác thực xong: (a) `login()` khi user KHÔNG bật 2FA (như hành vi cũ), (b)
 * `verifyLoginOtpService()` sau khi user bật 2FA nhập ĐÚNG mã OTP. Logic bên
 * trong GIỮ NGUYÊN 100% hành vi gốc của `login()` trước khi có C1.
 */
/** Roadmap C2 (DEV-069, 2026-09-19) — metadata thiết bị, TUỲ CHỌN, đính kèm lúc cấp token. */
type SessionMeta = { userAgent?: string; ip?: string };

const issueLoginTokens = async (user: any, meta: SessionMeta = {}) => {
  // DEV-021/SEC-04: trước đây truyền thêm `role`/`department` (object đã
  // populate) vào payload JWT dù `generateAccessToken`'s doc-comment khẳng
  // định "chỉ gồm {id}" — JWT chỉ ký, không mã hoá, lộ thông tin dư thừa cho
  // bất kỳ ai decode token. `authenticate` middleware chỉ dùng `decoded.id`.
  const accessToken = generateAccessToken({
    id: user._id.toString(),
  });

  const refreshToken = generateRefreshToken(user._id.toString());

  // Lưu refresh token vào database để quản lý (có thể thêm trường revoked để thu hồi token khi cần)
  // DEV-014/MEDIUM-05: lưu HASH (SHA-256) thay vì plaintext — nếu DB bị lộ
  // (backup, injection, insider), attacker không có ngay token dùng được.
  // Client vẫn nhận `refreshToken` GỐC (raw) trong response — chỉ bản lưu
  // trong DB được hash, giống hệt quy ước `PasswordResetToken` đã có.
  await RefreshToken.create({
    user: user._id,
    token: hashResetToken(refreshToken),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    // Roadmap C2 (DEV-069) — ghi lại thiết bị/IP lúc đăng nhập cho tính năng
    // "Quản lý phiên đăng nhập".
    userAgent: meta.userAgent,
    ip: meta.ip,
  });

  // Ghi log audit
  await UserAudit.create({
    user: user._id,
    action: "LOGIN",
    performedBy: user._id,
    note: "User đăng nhập hệ thống"
  });

  return {
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,          // đã populate
      department: user.department
      }
  };
};

/**
 * Roadmap C1 (DEV-068, 2026-09-19) — tạo + gửi email 1 mã OTP mới cho user,
 * dùng chung cho `login()` (context "login") và `enableTwoFactorService()`
 * (context "enable"). Xoá OTP CŨ chưa dùng của user trước khi tạo mới (cùng
 * pattern `forgotPassword()` xoá `PasswordResetToken` cũ) — luôn chỉ có TỐI
 * ĐA 1 OTP hiệu lực tại 1 thời điểm.
 */
const issueTwoFactorOtp = async (user: any, context: "login" | "enable") => {
  await TwoFactorOtp.deleteMany({ user: user._id });

  const code = generateOtpCode();
  await TwoFactorOtp.create({
    user: user._id,
    codeHash: await bcrypt.hash(code, 10),
    expiresAt: new Date(Date.now() + OTP_EXPIRES_MINUTES * 60 * 1000),
  });

  const { subject, html, text } = buildTwoFactorOtpEmail({
    fullName: user.fullName,
    code,
    expiresInMinutes: OTP_EXPIRES_MINUTES,
    context,
  });

  // KHÁC `forgotPassword()` (im lặng để chống enumeration) — ở đây user ĐÃ
  // xác thực xong username/password (hoặc đang tự thao tác lúc đăng nhập),
  // không có rủi ro lộ thông tin nào khi báo lỗi rõ ràng nếu gửi mail thất
  // bại, nên throw thẳng thay vì nuốt lỗi.
  try {
    await sendMail({ to: user.email, subject, html, text });
  } catch (err) {
    console.error("[twoFactor] Gửi email mã OTP thất bại:", err);
    throw ApiError.internal("Không gửi được mã xác thực, vui lòng thử lại sau");
  }
};

export const login = async (username: string, password: string, meta: SessionMeta = {}) => {
  const user = await User.findOne({ username }).select("+password").populate("role", "name")
  .populate("department", "code name");

  if (!user || !user.isActive) {
    // Vẫn tốn thời gian tương đương 1 lần bcrypt.compare thật, tránh việc
    // nhánh "user không tồn tại" trả lời nhanh hơn hẳn nhánh "sai mật khẩu".
    await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
    throw ApiError.unauthorized("Tên đăng nhập hoặc mật khẩu không đúng");
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    // Cùng 1 message + cùng statusCode (401) như nhánh user không hợp lệ ở
    // trên — không còn phân biệt được 2 trường hợp qua response.
    throw ApiError.unauthorized("Tên đăng nhập hoặc mật khẩu không đúng");
  }

  // Roadmap C1 (DEV-068, 2026-09-19) — user ĐÃ bật 2FA (self-service, opt-in)
  // → CHƯA cấp token ngay, gửi OTP qua email, trả marker để FE chuyển sang
  // bước nhập mã (`verifyLoginOtpService`). Username/password đã đúng ở đây
  // rồi nên bước 2 CHỈ cần `username` + `code`, không hỏi lại password.
  if (user.twoFactorEnabled) {
    await issueTwoFactorOtp(user, "login");
    return { requiresTwoFactor: true, username: user.username };
  }

  return issueLoginTokens(user, meta);
};

/**
 * Roadmap C1 (DEV-068, 2026-09-19) — bước 2 của đăng nhập khi user đã bật
 * 2FA. KHÔNG hỏi lại password (đã xác thực đúng ở `login()` mới sinh ra OTP)
 * — chỉ cần `username` để biết tra OTP của ai, giống tinh thần
 * `resetPassword(token, ...)` không cần username vì token đã định danh user.
 */
export const verifyLoginOtp = async (username: string, code: string, meta: SessionMeta = {}) => {
  const user = await User.findOne({ username }).populate("role", "name").populate("department", "code name");

  if (!user || !user.isActive || !user.twoFactorEnabled) {
    throw ApiError.unauthorized("Yêu cầu xác thực không hợp lệ");
  }

  const otp = await TwoFactorOtp.findOne({ user: user._id, used: false, expiresAt: { $gt: new Date() } }).sort({
    createdAt: -1,
  });

  if (!otp) {
    throw ApiError.unauthorized("Mã xác thực không hợp lệ hoặc đã hết hạn, vui lòng đăng nhập lại");
  }

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw ApiError.unauthorized("Đã nhập sai mã quá số lần cho phép, vui lòng đăng nhập lại");
  }

  const isMatch = await bcrypt.compare(code, otp.codeHash);
  if (!isMatch) {
    otp.attempts += 1;
    await otp.save();
    throw ApiError.unauthorized("Mã xác thực không đúng");
  }

  otp.used = true;
  await otp.save();

  return issueLoginTokens(user, meta);
};

/**
 * Roadmap C1 (DEV-068, 2026-09-19) — BƯỚC 1 tự bật 2FA (self-service,
 * opt-in — user xác nhận KHÔNG bắt buộc). Chỉ role "cấp cao" mới bật được
 * (xem `TWO_FACTOR_ELIGIBLE_ROLE_NAMES`), và PHẢI có `email` (dùng để gửi
 * OTP) — 2 điều kiện chặn TRƯỚC khi gửi mã, tránh sinh OTP vô dụng.
 */
export const enableTwoFactor = async (userId: any) => {
  const user = await User.findById(userId).populate("role", "name");
  if (!user || !user.isActive) throw ApiError.badRequest("Không tìm thấy hoặc không hoạt động");

  if (user.twoFactorEnabled) throw ApiError.badRequest("Tài khoản đã bật xác thực 2 lớp");

  const roleName = (user.role as any)?.name;
  if (!TWO_FACTOR_ELIGIBLE_ROLE_NAMES.includes(roleName)) {
    throw ApiError.forbidden("Vai trò của bạn không thuộc phạm vi áp dụng xác thực 2 lớp");
  }

  if (!user.email) {
    throw ApiError.badRequest("Tài khoản chưa có email — liên hệ IT/Quản trị hệ thống để được bổ sung trước khi bật tính năng này");
  }

  await issueTwoFactorOtp(user, "enable");
  return { silent: true };
};

/**
 * Roadmap C1 (DEV-068, 2026-09-19) — BƯỚC 2 tự bật 2FA: xác nhận mã OTP vừa
 * gửi ở `enableTwoFactor()`, chỉ khi đúng mới thực sự set `twoFactorEnabled
 * = true`. Cùng pattern chống brute-force với `verifyLoginOtp()`.
 */
export const confirmEnableTwoFactor = async (userId: any, code: string) => {
  const user = await User.findById(userId);
  if (!user || !user.isActive) throw ApiError.badRequest("Không tìm thấy hoặc không hoạt động");

  const otp = await TwoFactorOtp.findOne({ user: user._id, used: false, expiresAt: { $gt: new Date() } }).sort({
    createdAt: -1,
  });
  if (!otp) throw ApiError.badRequest("Mã xác thực không hợp lệ hoặc đã hết hạn, vui lòng yêu cầu lại");

  if (otp.attempts >= OTP_MAX_ATTEMPTS) {
    throw ApiError.badRequest("Đã nhập sai mã quá số lần cho phép, vui lòng yêu cầu lại");
  }

  const isMatch = await bcrypt.compare(code, otp.codeHash);
  if (!isMatch) {
    otp.attempts += 1;
    await otp.save();
    throw ApiError.badRequest("Mã xác thực không đúng");
  }

  otp.used = true;
  await otp.save();

  user.twoFactorEnabled = true;
  await user.save();

  await UserAudit.create({ user: user._id, action: "ENABLE_2FA", performedBy: user._id, note: "Bật xác thực 2 lớp" });

  return { twoFactorEnabled: true };
};

/**
 * Roadmap C1 (DEV-068, 2026-09-19) — tự TẮT 2FA, yêu cầu nhập lại password
 * hiện tại (KHÁC bật — không cần OTP) để chặn trường hợp phiên đăng nhập bị
 * chiếm cũng đủ để âm thầm tắt lớp bảo vệ này, cùng mức xác thực lại đã dùng
 * cho `changePassword()` (`oldPassword`).
 */
export const disableTwoFactor = async (userId: any, password: string) => {
  const user = await User.findById(userId).select("+password");
  if (!user || !user.isActive) throw ApiError.badRequest("Không tìm thấy hoặc không hoạt động");

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) throw ApiError.unauthorized("Mật khẩu không đúng");

  user.twoFactorEnabled = false;
  await user.save();
  await TwoFactorOtp.deleteMany({ user: user._id });

  await UserAudit.create({ user: user._id, action: "DISABLE_2FA", performedBy: user._id, note: "Tắt xác thực 2 lớp" });

  return { twoFactorEnabled: false };
};

/**
 * REFRESH ACCESS TOKEN
 * Kiểm tra refresh token có tồn tại trong DB và chưa bị thu hồi
 * Kiểm tra user liên quan đến token có tồn tại và isActive
 * Nếu hợp lệ, tạo mới access token và trả về
 * Nếu không hợp lệ, trả về lỗi
 * Không cần tạo refresh token mới, vẫn dùng token cũ cho đến khi hết hạn hoặc bị thu hồi
 *
 * ⚠️ SỬA (review Auth module):
 *  - `jwt.verify` giờ whitelist `algorithms: ["HS256"]`, đồng bộ với
 *    `authenticate` middleware (trước đây bỏ sót, chỉ access token được vá).
 *  - Access token mới sinh ra qua đúng `generateAccessToken` (helper dùng
 *    chung với `login()`) — KHÔNG tự `jwt.sign` riêng lẻ nữa.
 *  - `role`/`department` giờ được populate LỒNG từ `user` (trước đây
 *    `populate("user")` không populate lồng, nên 2 field này là ObjectId
 *    thô, khác hẳn payload từ `login()` — nay populate đủ để token từ
 *    refresh có shape giống hệt token từ login).
 *
 * ⚠️ SỬA (DEV-014):
 *  - MEDIUM-05: `RefreshToken.token` giờ lưu HASH — tra cứu DB phải hash
 *    `refreshToken` (raw, client gửi lên) trước khi `findOne`, khớp cách lưu
 *    ở `login()`.
 *  - MEDIUM-06: `jwt.verify()` trước đây KHÔNG bọc try/catch — token hết
 *    hạn/hỏng ném lỗi thư viện (`JsonWebTokenError`/`TokenExpiredError`)
 *    thẳng ra ngoài, rơi vào nhánh lỗi 500 chung của `errorHandler` (lộ
 *    message thư viện, sai status code — đúng phải 401). Nay bọc try/catch,
 *    map về `ApiError.unauthorized`.
 */
export const refresh = async (refreshToken: string) => {
  if (!refreshToken) {
    throw ApiError.badRequest("REFRESH_TOKEN_REQUIRED");
  }

  // DEV-021/SEC-04: trước đây populate cả `role`/`department` của `user` để
  // đưa vào payload JWT — nay `generateAccessToken()` chỉ ký `{id}`, phần
  // dưới hàm này chỉ còn dùng `user.isActive`/`user._id` nên bỏ populate lồng
  // không cần thiết (đỡ 1 lượt query phụ mỗi lần refresh).
  const storedToken = await RefreshToken.findOne({
    token: hashResetToken(refreshToken),
    revoked: false
  }).populate({ path: "user", select: "isActive" });

  if (!storedToken) {
    throw ApiError.badRequest("Refresh token không hợp lệ hoặc đã bị thu hồi");
  }

  const user: any = storedToken.user;

  if (!user.isActive) {
    throw ApiError.badRequest("Tài khoản đã bị khóa");
  }

  try {
    jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string,
      { algorithms: ["HS256"] }
    );
  } catch (err) {
    throw ApiError.unauthorized("Refresh token không hợp lệ hoặc đã hết hạn");
  }

  // DEV-021/SEC-04: cùng lý do như `login()` ở trên — chỉ ký `{id}`.
  const newAccessToken = generateAccessToken({
    id: user._id.toString(),
  });

  return { accessToken: newAccessToken };
};

/**
 * LOGOUT
 * Kiểm tra refresh token có tồn tại trong DB VÀ thuộc về đúng user đang gọi
 * Đánh dấu token là revoked để không thể sử dụng lại
 * Ghi log audit
 * Trả về thành công
 *
 * ⚠️ SỬA (review Auth module): thêm điều kiện `user: userId` vào filter —
 * trước đây chỉ match theo `token`, nghĩa là user A (đã authenticate hợp lệ)
 * có thể truyền refreshToken của user B trong body và revoke được token của
 * B. Nay chỉ tự thu hồi được token của chính mình.
 *
 * ⚠️ SỬA (DEV-014/MEDIUM-05): `RefreshToken.token` giờ lưu HASH — hash
 * `refreshToken` (raw) trước khi so khớp, khớp cách lưu ở `login()`.
 */
export const logout = async (refreshToken: string, userId: any) => {
  if (!refreshToken) {
    throw ApiError.badRequest("token đăng xuất không được cung cấp");
  }

  await RefreshToken.findOneAndUpdate(
    { token: hashResetToken(refreshToken), user: userId },
    { revoked: true }
  );

  await UserAudit.create({
    user: userId,
    action: "LOGOUT",
    performedBy: userId,
    note: "User đăng xuất"
  });

  return true;
};

/**
 * Roadmap C2 (Quản lý phiên đăng nhập, DEV-069, 2026-09-19) — chuẩn hoá 1
 * `RefreshToken` document thành shape trả về cho FE (KHÔNG bao giờ trả
 * `token` — dù đã hash, vẫn không cần thiết lộ ra ngoài).
 */
const toSessionDTO = (rt: any, isCurrent: boolean) => {
  const { browser, os } = parseUserAgent(rt.userAgent);
  return {
    _id: rt._id,
    browser,
    os,
    ip: rt.ip ?? null,
    createdAt: rt.createdAt,
    expiresAt: rt.expiresAt,
    isCurrent,
  };
};

/**
 * LIST MY SESSIONS — self-service, KHÔNG cần permission riêng (giống
 * `changePassword`/`getMe` — hành động tự-scope). Chỉ trả phiên CÒN hiệu
 * lực (`revoked:false` VÀ chưa hết hạn — token đã hết hạn dù `revoked:false`
 * cũng không dùng đăng nhập được nữa, không có ý nghĩa hiển thị/thu hồi).
 *
 * `isCurrent` xác định bằng HEURISTIC so khớp `userAgent`+`ip` của request
 * HIỆN TẠI với từng phiên đã lưu — KHÔNG cần client gửi lại refreshToken
 * (tránh phải truyền token nhạy cảm qua body của 1 API "chỉ xem"). Đánh đổi:
 * lý thuyết có thể đánh dấu nhầm nếu 2 thiết bị THẬT SỰ trùng cả UA lẫn IP
 * (hiếm — NAT dùng chung + cùng trình duyệt/phiên bản) — chấp nhận được cho
 * mục đích hiển thị, không phải cơ chế bảo mật.
 */
export const listMySessions = async (userId: any, meta: SessionMeta = {}) => {
  const sessions = await RefreshToken.find({
    user: userId,
    revoked: false,
    expiresAt: { $gt: new Date() },
  }).sort({ createdAt: -1 });

  return sessions.map((rt: any) =>
    toSessionDTO(rt, !!meta.userAgent && rt.userAgent === meta.userAgent && !!meta.ip && rt.ip === meta.ip),
  );
};

/**
 * REVOKE MY SESSION — self-service, thu hồi ĐÚNG 1 phiên của CHÍNH MÌNH
 * (lọc `user: userId` — không cho revoke phiên của user khác dù biết đúng
 * `_id`, trả 404 thay vì 403 để không lộ phiên đó có tồn tại hay không).
 */
export const revokeMySession = async (userId: any, sessionId: any) => {
  const result = await RefreshToken.findOneAndUpdate(
    { _id: sessionId, user: userId, revoked: false },
    { revoked: true },
  );
  if (!result) throw ApiError.notFound("Không tìm thấy phiên đăng nhập");
  return true;
};

/**
 * FORGOT PASSWORD
 * Kiểm tra username có tồn tại và isActive
 * Giới hạn số lần yêu cầu reset password trong 15 phút (ví dụ: 3 lần)
 * Tạo token reset password (crypto.randomBytes + hash để tăng bảo mật)
 * Lưu token vào DB với thông tin user và thời gian hết hạn (15 phút)
 * Gửi email cho user với link chứa token reset password
 * Ghi log audit
 * Trả về thành công (không leak thông tin về username có tồn tại hay không)
 *
 * ⚠️ QUAN TRỌNG — ĐÃ XOÁ 1 REGRESSION: bản trước có thêm dòng
 * `if(!user) throw ApiError.badRequest("Username không tồn tại")` ngay sau
 * khi tìm user — dòng này PHÁ VỠ hoàn toàn cơ chế chống enumeration bên
 * dưới, vì nó throw lỗi NGAY LẬP TỨC cho username không tồn tại, lộ rõ
 * username nào có thật trong hệ thống qua status code/message khác biệt. Đã
 * xoá, khôi phục đúng hành vi: cả 2 nhánh (tồn tại/không tồn tại) đều đi qua
 * cùng 1 đường xử lý, trả về CÙNG 1 response `{ silent: true }`.
 *
 * Response cho CẢ 2 nhánh (user tồn tại / không tồn tại) đều là
 * `{ silent: true }` — không phân biệt được qua response hay qua việc có
 * `resetToken` trong body hay không (đã bỏ hẳn field này, gửi qua email thay
 * vì trả trong response — xem `sendMail`/`buildPasswordResetEmail` bên dưới).
 * Nếu gửi email thất bại (SMTP lỗi...), KHÔNG throw lỗi ra client — chỉ log
 * lỗi ở server, response vẫn trả `{ silent: true }` bình thường.
 */
export const forgotPassword = async (username: string) => {

  if (!username) throw ApiError.badRequest("Username không được để trống");

  const user = await User.findOne({ username });

  const now = new Date();
  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

  // không leak info user
  if (!user || !user.isActive) {
    // Dummy query để cân bằng thời gian phản hồi với nhánh user tồn tại —
    // không đọc/ghi dữ liệu thật của ai (điều kiện không match bản ghi nào).
    await PasswordResetToken.countDocuments({
      user: "000000000000000000000000",
      createdAt: { $gte: fifteenMinutesAgo }
    });
    return { silent: true };
  }

  const requestCount = await PasswordResetToken.countDocuments({
    user: user._id,
    createdAt: { $gte: fifteenMinutesAgo }
  });

  if (requestCount >= 3) {
    throw ApiError.tooManyRequests("Quá nhiều yêu cầu reset mật khẩu trong khoảng thời gian 15 phút");
  }

  await PasswordResetToken.deleteMany({ user: user._id });

  const rawToken = generateResetToken();
  const hashedToken = hashResetToken(rawToken);
  const expiresInMinutes = 15;

  await PasswordResetToken.create({
    user: user._id,
    token: hashedToken,
    expiresAt: new Date(now.getTime() + expiresInMinutes * 60 * 1000)
  });

  await UserAudit.create({
    user: user._id,
    action: "FORGOT_PASSWORD",
    performedBy: user._id,
    note: "User yêu cầu reset mật khẩu"
  });

  // Gửi email — KHÔNG để lỗi gửi mail làm hỏng luồng / lộ thông tin ra client.
  try {
    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${rawToken}`;
    const { subject, html, text } = buildPasswordResetEmail({
      fullName: user.fullName,
      resetLink,
      expiresInMinutes,
    });

    if (!user.email) {
      // User cũ tạo trước khi field `email` tồn tại (xem migration note ở
      // `user.model.ts`) — không có email để gửi. Log lại để biết cần
      // backfill, KHÔNG throw ra client (giữ nguyên response `{silent:true}`).
      console.warn(`[forgotPassword] User ${user._id} chưa có email — không thể gửi link reset.`);
    } else {
      await sendMail({
        to: user.email,
        subject,
        html,
        text,
      });
    }
  } catch (err) {
    // Chỉ log server-side để dev/DevOps biết SMTP có vấn đề — không throw,
    // không đổi response trả về client (vẫn phải trả `{ silent: true }` để
    // không lộ khác biệt giữa "gửi mail thành công" và "gửi mail lỗi").
    console.error("[forgotPassword] Gửi email reset mật khẩu thất bại:", err);
  }

  return { silent: true };
};

/**
 * RESET PASSWORD BY TOKEN
 * Kiểm tra token có tồn tại trong DB, chưa bị sử dụng và chưa hết hạn
 * Kiểm tra user liên quan đến token có tồn tại và isActive
 * Hash mật khẩu mới và cập nhật cho user
 * Đánh dấu token là đã sử dụng để tránh dùng lại
 * Thu hồi tất cả refresh token hiện tại của user để buộc đăng nhập lại với mật khẩu mới
 * Ghi log audit
 * Trả về thành công nếu reset password thành công
 * Nếu token không hợp lệ, đã được sử dụng hoặc đã hết hạn, trả về lỗi
 * Nếu user liên quan đến token không tồn tại hoặc đã bị khóa, trả về lỗi
 * Sử dụng hash để so sánh token reset password để tăng bảo mật, tránh trường hợp token bị lộ ra ngoài có thể sử dụng trực tiếp để reset password
 * Khi user reset password thành công, đánh dấu token là đã sử dụng hoặc xóa token để tránh dùng lại
 * Khi user reset password thành công, thu hồi tất cả refresh token hiện tại của user để buộc đăng nhập lại với mật khẩu mới
 * Ghi log audit khi user reset password thành công để theo dõi hoạt động liên quan đến bảo mật của user
 */
export const resetPassword = async (token: string, newPassword: string) => {

  if (!token || !newPassword) {
    throw ApiError.badRequest("Token hoặc mật khẩu mới không được để trống");
  }

  const hashedToken = hashResetToken(token);
  const resetToken = await PasswordResetToken.findOne({
    token: hashedToken,
    used: false,
    expiresAt: { $gt: new Date() }
  }).populate("user");

  if (!resetToken) {
    throw ApiError.badRequest("Token reset mật khẩu không hợp lệ");
  }

  const user: any = resetToken.user;

  if (!user.isActive) {
    throw ApiError.badRequest("Tài khoản đã bị khóa");
  }

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();

  resetToken.used = true;
  await resetToken.save();

  await RefreshToken.updateMany(
    { user: user._id },
    { revoked: true }
  );

  await UserAudit.create({
    user: user._id,
    action: "RESET_PASSWORD",
    performedBy: user._id,
    note: "User reset mật khẩu bằng token"
  });

  return true;
};


