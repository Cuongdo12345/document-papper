# FE-01 MICRO-FIX — Session Restore

## Trạng thái

**PASS (đã sửa)** — Session Restore trước fix bị lỗi thật (không phải chỉ giả thuyết), đã xác nhận qua source trace + đã sửa tối thiểu.

## Nguyên nhân

**BUG THẬT — CONFIRMED (không phải giả thuyết).**

- File: `frontend/src/routes/ProtectedRoute.tsx`
- Trước fix: `if (!isAuthenticated) return <Navigate to="/login" replace />;` chạy **đồng bộ, ngay lập tức** khi `isAuthenticated` (derive từ `accessToken` in-memory ở `authStore.ts`) là `false` — luôn đúng ngay sau reload vì `accessToken` không persist.
- File: `frontend/src/hooks/useCurrentUser.ts` — `enabled: isAuthenticated` → khi `isAuthenticated=false`, `GET /users/me` KHÔNG được gọi.
- Hệ quả: sau reload, **không có request authenticated nào được bắn ra** → axios response interceptor (refresh-lock, `axios.ts:69-100`) không bao giờ nhận được 401 để kích hoạt refresh → `refreshToken` trong `localStorage` (vẫn còn hạn) **không bao giờ được dùng tới** → user bị đá thẳng về `/login` dù session còn hợp lệ.
- Dòng 122 `docs/frontend/tasks/FE-01.md` (report FE-01 gốc) mô tả giả định: "Không có 'restore token lúc app khởi động' riêng — refresh-lock tự xử lý transparent ở request đầu tiên" — **giả định này SAI**, chưa từng được verify runtime thật ở FE-01 (Known Issue #1 của FE-01.md đã tự ghi nhận "chưa verify luồng authenticated thật").

## Trạng thái trước khi sửa

```
Reload
  ↓
authStore reset (accessToken=null, isAuthenticated=false — Zustand không persist store này)
  ↓
ProtectedRoute: !isAuthenticated → Navigate /login NGAY (đồng bộ)
  ↓
useCurrentUser() enabled=false → không có request nào bắn ra
  ↓
refreshToken (localStorage, còn hạn) KHÔNG BAO GIỜ được dùng
  ↓
Session mất dù vẫn còn hợp lệ
```

## Thay đổi đã thực hiện

Nguyên tắc: thêm 1 bước bootstrap chạy 1 lần lúc app khởi động, TRƯỚC khi route guard đọc `isAuthenticated` — tái sử dụng nguyên vẹn `refreshAccessToken()` đã có trong `axios.ts` (không viết logic refresh thứ 2), không đổi `authStore`/`ProtectedRoute`/`PublicRoute`/`RootRedirect`/`useCurrentUser` behavior hiện có ngoài phần bổ sung tối thiểu dưới đây.

1. `frontend/src/stores/authStore.ts` — thêm field `isInitializing: boolean` (default `true`) + action `setInitializing()`. Không đổi `login()`/`logout()`/`isAuthenticated` logic.
2. `frontend/src/api/axios.ts` — đổi `async function refreshAccessToken()` (private) thành `export async function refreshAccessToken()` để bootstrap tái sử dụng đúng 1 implementation. Không đổi logic bên trong hàm.
3. `frontend/src/hooks/useAuthBootstrap.ts` (**file mới**) — hook chạy 1 lần lúc mount:
   - Không có `refreshToken` trong `localStorage` → bỏ qua ngay, không gọi API thừa.
   - Có `refreshToken` → gọi `refreshAccessToken()` → thành công thì `authStore` tự có `accessToken` mới (`isAuthenticated=true`) → thất bại thì `logout()` + `clearRefreshToken()` (không loop, không throw tiếp).
   - Dùng promise module-level (`bootstrapPromise`) để tránh gọi 2 lần khi React StrictMode double-invoke effect ở dev.
4. `frontend/src/App.tsx` — gọi `useAuthBootstrap()`; khi `isInitializing=true`, render `LoadingState` (component có sẵn, không tạo UI mới) thay vì `RouterProvider`, tránh flash `/login` sai (UI flicker).

**Không đổi**: token storage strategy (`accessToken` vẫn in-memory, `refreshToken` vẫn `localStorage`), refresh-lock 401 hiện có, `ProtectedRoute`/`PublicRoute`/`RootRedirect`/`usePermission`/`PermissionGuard`, Design System, App Shell.

## Session Restore Flow (sau fix)

```
Reload
  ↓
App.tsx mount → useAuthBootstrap() effect chạy
  ↓
Có refreshToken (localStorage)?
  ├─ KHÔNG → isInitializing=false ngay, render RouterProvider bình thường
  │           (isAuthenticated=false → PublicRoute/RootRedirect → /login, đúng)
  │
  └─ CÓ → refreshAccessToken()
            ├─ Thành công → accessToken mới → isAuthenticated=true
            │   → isInitializing=false → RouterProvider render
            │   → ProtectedRoute cho qua → useCurrentUser() (enabled=true)
            │     tự fetch GET /users/me → user + permissions[] hydrate
            │     → Sidebar/PermissionGuard dùng permission thật ngay
            │
            └─ Thất bại (refreshToken hết hạn/invalid) → logout()
                + clearRefreshToken() → isInitializing=false
                → isAuthenticated=false → /login (đúng, không loop)
```

## Các file đã thay đổi

- `frontend/src/stores/authStore.ts` (sửa — thêm `isInitializing`)
- `frontend/src/api/axios.ts` (sửa — export `refreshAccessToken`)
- `frontend/src/hooks/useAuthBootstrap.ts` (**mới**)
- `frontend/src/App.tsx` (sửa — gọi bootstrap, gate `RouterProvider`)

Không sửa file nào khác. `git status --porcelain backend` = 89 (không đổi trong suốt task — xác nhận backend không bị đụng).

## Kết quả kiểm thử

| Test | Kết quả | Ghi chú |
|---|---|---|
| Login | **PASS (HTTP contract verified)** | `POST /auths/login` (admin/*** — tài khoản có sẵn trong DB dev, không tạo mới) → 200, trả đúng `{accessToken, refreshToken, user}` khớp `LoginResponseData` |
| GET /users/me (sau login) | **PASS (HTTP contract verified)** | Trả đúng `role.isSystemRole` + `permissions[]` (DEV-026), khớp `CurrentUser` type |
| Reload (session restore) | **PARTIAL — code-path verified, browser F5 thật KHÔNG VERIFIED** | Không có browser automation tool trong môi trường hiện tại để tự bấm F5 quan sát React re-render thật. Đã verify: (a) source trace xác nhận bug thật trước fix, (b) `POST /auths/refresh-token` bằng `refreshToken` thật từ bước login → 200, trả `accessToken` mới đúng shape `RefreshTokenResponseData`, (c) `GET /users/me` với accessToken mới → 200 đầy đủ permissions — tức là TOÀN BỘ chuỗi API mà `useAuthBootstrap()` gọi đã verify hoạt động đúng ở tầng HTTP. Phần React runtime (mount effect, Zustand set state, re-render RouterProvider) chỉ được verify bằng đọc code, KHÔNG bằng quan sát browser thật |
| Refresh Flow (concurrent 401) | **NOT VERIFIED (không đổi)** | Refresh-lock cơ chế cũ giữ nguyên, không sửa — kế thừa trạng thái NOT VERIFIED từ FE-01 (chưa từng test concurrent 401 bằng browser thật) |
| ProtectedRoute | **PASS (source review)** | Đọc code xác nhận: KHÔNG còn redirect `/login` trước khi bootstrap xong (do `App.tsx` chặn render `RouterProvider`, `ProtectedRoute` chỉ mount SAU khi `isAuthenticated` đã ổn định) |
| RBAC restoration | **PASS (HTTP contract verified)** | `GET /users/me` sau refresh trả đúng 76 permission thật của role ADMIN (không phải `["ALL"]`, không bypass) — `usePermission()` sẽ đọc đúng mảng này qua React Query cache như thiết kế |
| Logout | **PASS (source review, không đổi logic)** | `useLogout.ts` không bị sửa, vẫn `storeLogout()` + `clearRefreshToken()` + `queryClient.clear()` ở `onSettled` — không tương tác với `isInitializing` (chỉ set 1 lần lúc app mount) |
| Reload nhiều lần / refresh thất bại | **NOT VERIFIED (browser thật)** | Logic source (`try/catch` trong `useAuthBootstrap.ts`, `bootstrapPromise` singleton) được review kỹ để đảm bảo không loop/không gọi API thừa, nhưng chưa quan sát runtime nhiều lần F5 thật |

## Typecheck

**PASS** — `npm run typecheck` (`tsc -b --noEmit`) 0 lỗi.

## Lint

**PASS** — `npm run lint` (oxlint) chỉ còn 1 warning pre-existing từ FE-00 (`components/ui/button.tsx` fast-refresh export), không liên quan tới fix này.

## Build

**PASS** — `npm run build` thành công, bundle 577.11 kB / gzip 186.58 kB (không tăng đáng kể so với FE-01: 576 kB), cùng cảnh báo chunk-size bình thường đã ghi nhận ở FE-01.

## Runtime Verification

- Có sẵn 1 tài khoản test hợp lệ trong MongoDB dev (`admin`, do backend seed từ trước — KHÔNG phải do task này tạo, không tạo thêm dữ liệu mới).
- Dùng tài khoản này, verify bằng `curl` (không phải browser) toàn bộ chuỗi API mà `useAuthBootstrap()` phụ thuộc: `POST /auths/login` → 200, `POST /auths/refresh-token` (dùng `refreshToken` vừa nhận) → 200 trả `accessToken` mới, `GET /users/me` (dùng `accessToken` mới) → 200 trả đúng `role.isSystemRole` + `permissions[]` (76 permission của ADMIN).
- **Giới hạn**: môi trường hiện tại không có browser automation tool (Playwright/Puppeteer...) khả dụng — KHÔNG thể tự mở trình duyệt, đăng nhập, bấm F5 và quan sát trực tiếp React re-render/Zustand state để verify TEST 2/3/5/6 trong spec gốc theo đúng nghĩa "runtime thật qua browser". Phần này được bù bằng source-code trace chi tiết (đọc từng file liên quan, xác nhận logic khớp chuỗi API đã verify) nhưng đây KHÔNG tương đương quan sát runtime browser thật.
- Khuyến nghị: người dùng tự mở `http://localhost:5173`, đăng nhập bằng tài khoản admin thật, vào `/app`, nhấn F5 nhiều lần và xác nhận không bị đá về `/login`, để có xác nhận runtime browser cuối cùng.

## Ảnh hưởng UI

- Thêm đúng 1 màn hình loading toàn trang ("Đang khôi phục phiên đăng nhập...") xuất hiện RẤT NGẮN lúc app khởi động (chỉ khi có `refreshToken` cần thử — nếu chưa từng đăng nhập, không có network call, thời gian hiển thị gần như 0). Dùng lại `LoadingState` (`variant="spinner" fullScreen`) — component đã có sẵn từ FE-01, KHÔNG tạo UI/style mới, KHÔNG đổi Design System.
- Không đổi Login page, App Shell, Sidebar, Header.

## Known Issues

1. Chưa verify bằng browser automation thật (xem "Runtime Verification") — chỉ verify được tầng HTTP contract + source trace.
2. Refresh-lock concurrent-401 (nhiều request 401 cùng lúc chỉ gọi 1 refresh) vẫn NOT VERIFIED bằng browser thật — kế thừa nguyên trạng từ FE-01, không thuộc phạm vi sửa của micro-fix này (cơ chế không đổi).
3. `isInitializing` không có timeout — nếu `POST /auths/refresh-token` treo vô thời hạn (network hang), user sẽ thấy loading vô hạn thay vì lỗi. Axios instance có `timeout: 15_000` sẵn nên về lý thuyết tối đa 15s rồi rơi vào nhánh `catch` → logout, nhưng chưa test thực tế trường hợp network timeout thật.

## Technical Debt

Không phát sinh nợ kỹ thuật mới ngoài phạm vi đã ghi ở Known Issues #3 (chấp nhận được ở quy mô hiện tại, timeout đã có sẵn qua axios instance).

## FE-02 Readiness

**READY** — Session Restore code-path đã được sửa đúng root cause xác nhận qua source + HTTP contract thật; `usePermission()`/`ProtectedRoute`/`useCurrentUser()` không đổi behavior nên mọi phần FE-01 khác vẫn giữ nguyên tính đúng đắn đã audit trước đó. Khuyến nghị người dùng làm 1 lần xác nhận browser F5 thật trước khi coi Session Restore là 100% production-ready.
