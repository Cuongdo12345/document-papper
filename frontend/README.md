# DMS Frontend — Auth Module (Login Page)

Project tổng hợp từ các tài liệu phân tích:
`AUTH_MODULE_ANALYSIS.md` · `AUTH_UI_SPEC.md` · `API_LAYER_SPEC.md` · `STATE_MAPPING.md`

Phạm vi hiện tại: **SCR-01 LoginPage** (`/login`) + toàn bộ infrastructure cần thiết
(auth store, API client, React Query hook, route guard).
**Chưa bao gồm** Forgot Password / Reset Password.

---

## 1. Yêu cầu môi trường

- Node.js >= 18
- npm >= 9 (hoặc pnpm / yarn tương đương)
- Backend API đang chạy tại `http://localhost:3000/api` (hoặc cấu hình lại qua `.env`)

---

## 2. Cài đặt

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file môi trường
cp .env.example .env.development
```

Mở `.env.development` và chỉnh `VITE_API_BASE_URL` cho đúng backend của bạn:

```
VITE_API_BASE_URL=http://localhost:3000/api
```

---

## 3. Chạy dev server

```bash
npm run dev
```

App chạy tại `http://localhost:5173`. Mở `/login` để vào LoginPage
(route `/` tự redirect về `/login`).

---

## 4. Cấu trúc project

```
.
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env.example
├── public/
│   └── logo.svg
└── src/
    ├── main.tsx                  # Entry point
    ├── App.tsx                   # Router + Providers (QueryClient, AntD ConfigProvider)
    ├── index.css
    ├── vite-env.d.ts
    │
    ├── api/
    │   ├── client.ts             # Axios instance + interceptors (token attach, 401 refresh, 403/429/500)
    │   └── services/
    │       └── auth.service.ts   # POST /auths/login
    │
    ├── components/
    │   ├── common/
    │   │   └── AppButton/        # Shared button wrapper (variant -> AntD type)
    │   └── feedback/
    │       └── NotificationBridge.tsx  # Toast bridge (notification.store -> AntD message)
    │
    ├── hooks/
    │   └── queries/
    │       └── useAuth.ts        # useLogin() — React Query mutation
    │
    ├── layouts/
    │   └── AuthLayout/           # Card 420px, centered — dùng cho /login, /forgot-password, /reset-password
    │
    ├── lib/
    │   └── queryClient.ts        # QueryClient defaultOptions (staleTime, retry...)
    │
    ├── pages/
    │   └── auth/
    │       └── LoginPage/        # SCR-01
    │
    ├── router/
    │   ├── guards/
    │   │   └── AuthRoute.tsx     # Public-only guard — redirect nếu đã login
    │   └── routes/
    │       └── auth.routes.tsx   # Route config cho /login
    │
    ├── schemas/
    │   └── auth.schema.ts        # Zod: loginSchema (username, password)
    │
    ├── store/
    │   ├── auth.store.ts         # Zustand persist 'auth-storage' (user, accessToken, refreshToken)
    │   └── notification.store.ts # In-memory toast queue
    │
    └── types/
        └── auth.types.ts         # AuthUser, LoginPayload, LoginResponse, ApiErrorResponse
```

---

## 5. Luồng hoạt động Login

1. User nhập `username` + `password` → `LoginPage` validate bằng `loginSchema` (Zod, chỉ check non-empty).
2. Submit → `useLogin()` (`useAuth.ts`) gọi `authService.login()` → `POST /api/auths/login`.
3. **200 OK**:
   - `auth.store.setAuth(user, accessToken, refreshToken)` → Zustand persist vào `localStorage['auth-storage']`.
   - `queryClient.clear()` — xoá cache cũ.
   - Redirect theo `location.state.from` (nếu có) hoặc theo role:
     - `ADMIN` → `/dashboard`
     - `IT` / `USER` → `/documents/proposals`
4. **400 / 401**: hiển thị lỗi "Tên đăng nhập hoặc mật khẩu không đúng" dưới field password (không redirect).
5. **429**: hiển thị "Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút".
6. **500 / Network error**: xử lý global ở `api/client.ts` (toast qua `notification.store` + `NotificationBridge`).

---

## 6. Token & Auth Store

- `accessToken` (8h) + `refreshToken` (7d) lưu trong Zustand store, persist vào
  `localStorage` key `auth-storage` (chỉ `user`, `accessToken`, `refreshToken`).
- **Không** đọc token trực tiếp từ `localStorage` — luôn dùng
  `useAuthStore.getState().accessToken`.
- `api/client.ts` tự động:
  - Đính `Authorization: Bearer {accessToken}` vào mọi request.
  - Khi gặp `401` → thực hiện refresh token flow (Request Queue Pattern) →
    nếu fail → `logout()` + redirect `/login`.
- Cross-tab logout: `App.tsx` lắng nghe `window storage` event — khi tab khác
  xoá `auth-storage`, tab hiện tại tự logout.

---

## 7. Mở rộng tiếp theo (chưa làm trong phạm vi này)

Theo Build Checklist của `AUTH_MODULE_ANALYSIS.md`:

- [ ] `SCR-02 ForgotPasswordPage` — `/forgot-password`
- [ ] `SCR-03 ResetPasswordPage` — `/reset-password?token=...`
- [ ] `SCR-30 UnauthorizedPage` — `/403`
- [ ] `PrivateRoute` guard (protected routes + `allowedRoles`)
- [ ] `usePermission()` hook (`isAdmin`, `isAuthenticated`, `roleName`)
- [ ] Logout flow (ProfileDropdown trong Header)

Các route trên có thể thêm vào `router/routes/` và đăng ký trong `App.tsx`
theo cùng pattern với `auth.routes.tsx`.

---

## 8. Build production

```bash
npm run build
npm run preview
```

Nhớ tạo `.env.production` với `VITE_API_BASE_URL` tương ứng trước khi build.
