/**
 * Type khớp response THẬT của `GET /api/users/me` sau **DEV-026 (RBAC
 * micro-fix, 2026-09-05)** — xác nhận trực tiếp
 * `backend/src/services/users/users.service.ts:getMeService()` +
 * `backend/src/docs/openAPI.yaml` (`MeResponseUser` schema).
 *
 * - `role.isSystemRole` — GIỜ CÓ (trước DEV-026 thì không, populate chỉ
 *   `"name"`; nay `.populate("role","name isSystemRole")`).
 * - `permissions: string[]` — effective permission ĐÃ TÍNH SẴN Ở BACKEND
 *   (`role.permissions ∪ extraPermissions − denyPermissions`, qua
 *   `getCachedPermissions()`/`getUserEffectivePermissions()`). Đây là
 *   NGUỒN DUY NHẤT FE dùng để check quyền (`usePermission.ts`) — FE
 *   TUYỆT ĐỐI KHÔNG tự tính lại effective permission.
 * - `extraPermissions`/`denyPermissions` — GIỮ NGUYÊN dạng ObjectId THÔ
 *   (backend KHÔNG đổi 2 field này, additive change) — KHÔNG dùng 2 field
 *   này để suy ra quyền ở FE, chỉ `permissions[]` mới đáng tin cậy.
 */
export interface CurrentUser {
  _id: string;
  username: string;
  fullName: string;
  email?: string;
  role: {
    _id: string;
    name: string;
    isSystemRole: boolean;
  };
  department?: {
    _id: string;
    code: string;
    name: string;
  };
  isActive: boolean;
  /** [MỚI 2026-09-18, Roadmap B7] Xem `UpdateMeRequest`. */
  subscribedToWeeklyReport?: boolean;
  /** [MỚI 2026-09-19, Roadmap C1] CHỈ tự bật được qua `POST /auths/2fa/enable`+`/confirm` — xem `useTwoFactorActions.ts`. */
  twoFactorEnabled?: boolean;
  /** Effective permission (đã tính sẵn ở backend) — NGUỒN DUY NHẤT cho `usePermission()`. */
  permissions: string[];
  /** ObjectId THÔ — KHÔNG dùng để tự tính permission ở FE (xem `permissions[]`). */
  extraPermissions?: string[];
  /** ObjectId THÔ — KHÔNG dùng để tự tính permission ở FE (xem `permissions[]`). */
  denyPermissions?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

/**
 * `user` trả về từ POST /auths/login là SUBSET hẹp hơn `CurrentUser` — xác
 * nhận trực tiếp `auths.service.ts:login()` (chỉ `{_id, username, fullName,
 * role, department}`, KHÔNG có `email`/`isActive`/`extraPermissions`/
 * `denyPermissions`). KHÔNG dùng object này làm nguồn lâu dài — chỉ seed
 * tạm UI ngay sau login, `useLogin.ts` tự ép refetch `["users","me"]` đầy đủ
 * hơn ngay sau đó qua `invalidateQueries()`. [SỬA 2026-09-09] Dòng cũ ở đây
 * từng ghi "staleTime mặc định 0" — KHÔNG ĐÚNG với `useCurrentUser.ts` thật
 * (có `staleTime:60_000`) — sai lệch này khiến refetch KHÔNG hề xảy ra suốt
 * 60s đầu sau login (bug thật, xem `docs/frontend/tasks/FE-09.md`), nay đã
 * vá bằng `invalidateQueries()` tường minh thay vì trông chờ staleTime.
 */
export interface LoginUser {
  _id: string;
  username: string;
  fullName: string;
  role: { _id: string; name: string };
  department?: { _id: string; code: string; name: string };
}

/** Nhánh đăng nhập THÀNH CÔNG (có token ngay) — user KHÔNG bật 2FA, hoặc đã qua bước 2 (`verifyLoginOtp`). */
export interface LoginSuccessData {
  accessToken: string;
  refreshToken: string;
  user: LoginUser;
}

/**
 * [MỚI 2026-09-19, Roadmap C1] Nhánh trả về khi tài khoản ĐÃ bật 2FA —
 * `POST /auths/login` CHƯA cấp token, chỉ gửi OTP qua email. FE phải gọi
 * tiếp `POST /auths/login/verify-otp` (`username` + mã 6 số) để nhận
 * `LoginSuccessData` thật.
 */
export interface LoginPendingTwoFactorData {
  requiresTwoFactor: true;
  username: string;
}

/** Response THẬT của POST /auths/login — phẳng, bọc trong {message, data}, KHÔNG qua unwrapResponse chung. */
export type LoginResponseData = LoginSuccessData | LoginPendingTwoFactorData;

/** Khớp `VerifyLoginOtpDTO` (`POST /auths/login/verify-otp`) — bước 2 khi tài khoản đã bật 2FA. */
export interface VerifyLoginOtpRequest {
  username: string;
  code: string;
}

/** Khớp `ConfirmTwoFactorDTO` (`POST /auths/2fa/confirm`). */
export interface ConfirmTwoFactorRequest {
  code: string;
}

/** Khớp `DisableTwoFactorDTO` (`POST /auths/2fa/disable`) — `password` HIỆN TẠI, không phải mật khẩu mới. */
export interface DisableTwoFactorRequest {
  password: string;
}

export interface RefreshTokenResponseData {
  accessToken: string;
}

/**
 * Khớp `UpdateUserDTO` NHƯNG chỉ 2 field thực sự có tác dụng qua `PATCH
 * /users/me` — `updateMeService()` (`users.service.ts`) allowlist CỨNG
 * `["fullName","username"]`, mọi field khác (role/department/isActive) bị
 * lọc bỏ ở tầng service dù DTO validate không chặn — KHÔNG gửi field khác ở
 * đây để tránh hiểu lầm form có tác dụng đổi role/department của chính mình.
 */
export interface UpdateMeRequest {
  fullName?: string;
  username?: string;
  /** [MỚI 2026-09-18, Roadmap B7] Bật/tắt nhận "Báo cáo tuần" qua email — chỉ có tác dụng thật với role BAN_GIAM_DOC/TRUONG_KHOA. */
  subscribedToWeeklyReport?: boolean;
}

/** Khớp `ChangePasswordDTO` (`PATCH /users/change-password`) — tự đổi mật khẩu CỦA CHÍNH MÌNH (`req.user!._id`, không nhận id khác). */
export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ForgotPasswordRequest {
  username: string;
}

/**
 * `token` lấy từ query string link trong email
 * (`${CLIENT_URL}/reset-password?token=...`) — AUTH_RBAC_MAP.md Mục 1.2.
 */
export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

/**
 * Roadmap C2 (Quản lý phiên đăng nhập, DEV-069, 2026-09-19) — khớp schema
 * `Session` (`GET /auths/sessions` self-service, `GET /users/:id/sessions`
 * ADMIN xem hộ). `isCurrent` CHỈ có ở response self-service.
 */
export interface Session {
  _id: string;
  browser: string;
  os: string;
  ip: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent?: boolean;
}

/**
 * Roadmap C3 (Giám sát phiên đăng nhập toàn hệ thống, DEV-070, 2026-09-19) —
 * khớp response `GET /users/sessions` (ADMIN, danh sách TẤT CẢ user). CHỈ
 * response này có field `user` (đã populate) — `GET /auths/sessions`/
 * `GET /users/:id/sessions` đã biết trước user từ context/param nên không
 * cần lặp lại.
 */
export interface SessionWithUser extends Session {
  user: { _id: string; username: string; fullName: string } | null;
}
