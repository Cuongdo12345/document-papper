# FE FOUNDATION SPECIFICATION

> Cầu nối chính thức: `Backend Source` → `Frontend Knowledge Base` (13 file `docs/frontend/`) → **tài liệu này** → `Frontend Implementation` (FE-01 trở đi). Task này KHÔNG implement code — chỉ định nghĩa foundation architecture + coding contract. Toàn bộ nội dung dưới đây kế thừa, KHÔNG lặp lại chi tiết đã có ở KB — mỗi mục trỏ về file nguồn cụ thể.
>
> Nhãn dùng xuyên suốt: `CONFIRMED` (đã chốt với user hoặc xác nhận trực tiếp từ source), `FE DECISION` (quyết định kiến trúc FE cần chốt ở task này), `FE RECOMMENDATION` (đề xuất, chưa chốt), `UNKNOWN`/`PENDING DECISION` (cần user quyết định trước khi code).

---

## 1. Technology Stack

| Hạng mục | Lựa chọn | Phân loại | Trạng thái |
|---|---|---|---|
| Framework | React 18 + Vite + TypeScript | Core | **CONFIRMED** (user, AskUserQuestion trước UI-00) |
| Routing | React Router v6 | Required | FE RECOMMENDATION |
| Server state | TanStack Query (React Query) v5 | Required | FE RECOMMENDATION |
| Client state | Zustand — CHỈ auth session + UI state nhỏ (`STATE_MAPPING.md` Mục 2) | Required | FE RECOMMENDATION |
| HTTP client | Axios (interceptor request/response) | Required | FE RECOMMENDATION |
| Styling | Tailwind CSS | Required | FE RECOMMENDATION, **CHƯA CHỐT** |
| Component phức tạp (Table/Select/DatePicker/Modal/Dropdown) | shadcn/ui (Radix primitives + Tailwind) | Domain-specific | FE RECOMMENDATION, **CHƯA CHỐT** |
| Forms | React Hook Form + Zod resolver | Required | FE RECOMMENDATION |
| Type generation | `openapi-typescript` sinh type từ `backend/src/docs/openAPI.yaml` | Optional | FE RECOMMENDATION — quyết định cụ thể khi bắt đầu FE-00 code bootstrap |
| Ant Design / MUI | — | **Not recommended** | Lý do: app nội bộ sau login, không cần ngôn ngữ thiết kế có thương hiệu riêng; Tailwind+shadcn cho phép áp token tuỳ biến mà không kéo bundle runtime nặng của bộ component đầy đủ tính năng không dùng hết (`FE_ARCHITECTURE.md` Mục 1) |
| GraphQL client / SSR / i18n / state machine lib | — | **Not needed** | Backend REST/JSON thuần, app nội bộ không cần SEO, chỉ tiếng Việt, workflow/asset status đủ đơn giản cho enum + React Query (`FE_ARCHITECTURE.md` Mục 4) |

**Vai trò Tailwind vs shadcn/ui** (`FE DECISION` — quy tắc bắt buộc để tránh 2 design system xử lý cùng 1 component không rule):
- Tailwind: utility class cho MỌI layout/spacing/typography/màu — không có ngoại lệ.
- shadcn/ui: CHỈ dùng cho component có hành vi phức tạp (state nội bộ, accessibility, keyboard nav) — Table (kết hợp TanStack Table nếu cần sort/column phức tạp), Select, DatePicker, Dialog/Modal, Dropdown Menu, Popover, Toast, Tabs. shadcn/ui copy source vào `components/ui/` (đúng bản chất "không phải thư viện cài qua npm") rồi override token theo Tailwind config — KHÔNG giữ nguyên default theme của shadcn.
- KHÔNG dùng shadcn cho: Button/Badge/Card đơn giản — tự viết bằng Tailwind thuần (`SHARED_COMPONENTS_LIBRARY.md`: AppButton, StatusBadge, PermissionBadge) để tránh phụ thuộc không cần thiết cho component không có logic phức tạp.

---

## 2. Project Structure

Theo đúng đề xuất đã có ở `FE_ARCHITECTURE.md` Mục 3 — KHÔNG lặp lại cây thư mục ở đây. Bổ sung trách nhiệm từng folder (phần `FE_ARCHITECTURE.md` chưa nêu rõ):

| Folder | Trách nhiệm | KHÔNG chứa |
|---|---|---|
| `api/` | 1 file/domain, hàm thuần gọi axios instance, KHÔNG chứa business logic/UI logic | React hook, component, state |
| `features/<domain>/` | UI page + component + hook đặc thù CHỈ domain đó | Component dùng chung ≥2 domain (→ `components/`) |
| `components/` | Component dùng chung toàn app (`SHARED_COMPONENTS_LIBRARY.md`) + `components/ui/` (shadcn copy) | Logic gọi API, business rule domain |
| `layouts/` | `AppLayout` (sidebar+header, dùng sau login), `AuthLayout` (trang public: login/forgot/reset) | Route guard logic (→ `routes/`) |
| `routes/` | Route config, `ProtectedRoute`, `PermissionGuard` wiring | UI hiển thị trang thật |
| `stores/` | `authStore.ts`, `uiStore.ts` — CHỈ 2 store theo `STATE_MAPPING.md` Mục 2 | Server state (list/detail data) |
| `hooks/` | Hook DÙNG CHUNG không thuộc riêng 1 feature: `usePermission`, `useDebounce`, `useQueryParams` | Hook riêng 1 domain (→ `features/<domain>/hooks/`) |
| `types/` | Type sinh từ OpenAPI hoặc viết tay khớp DTO backend | Type UI thuần (props component — để cạnh component) |
| `constants/` | Copy chính xác `PERMISSIONS`, `DocumentCategory`/`SubType`, `AssetStatus`, `workflowStatus` từ backend | Giá trị tự suy đoán/không có trong source |
| `utils/` | `unwrapResponse`, `parseApiError`, `formatDate`, format số/tiền tệ | Logic nghiệp vụ domain-specific |
| `config/` | Đọc `import.meta.env`, export hằng số config (baseURL...) | Secret (không đưa secret vào FE — Mục 23) |

---

## 3. Feature Architecture

Domain xác nhận từ backend (`API_REFERENCE.md`, `FE_CONTEXT.md` Mục 8):

```text
features/
├── auth/            — login, forgot/reset password
├── dashboard/        — 12 endpoint /dashboard/*
├── users/             — CRUD user, gán role, đổi/reset mật khẩu
├── departments/        — CRUD Khoa/Phòng
├── documents/            — Document CRUD + list + detail (domain trung tâm)
├── workflow/               — pending queue, approve/reject/complete, templates
├── assets/                  — Asset CRUD, assign/transfer/return, assignment history
├── asset-categories/         — danh mục tài sản
├── medical-devices/            — profile + calibration record (con của assets, xem UI_REQUIREMENTS.md)
├── rbac/                         — Permission/Role/Policy admin
├── audit-logs/                     — nhật ký audit
├── upload/                           — quản lý file chung
├── excel/                              — import/export Document + Asset
├── notifications/                        — self-scoped, mọi user
└── profile/                                 — /profile (GET/PATCH /users/me, đổi mật khẩu)
```

Tất cả 15 domain trên đã CONFIRMED tồn tại ở backend (`API_REFERENCE.md`) — không domain nào ở trạng thái `PENDING`.

**Boundary**:
- **Feature-specific**: component/hook/type chỉ dùng trong đúng 1 `features/<domain>/`.
- **Shared**: dùng ≥2 domain, không chứa business rule domain nào cụ thể (`components/`, `hooks/` gốc).
- **Global**: layout, route guard, store (auth/UI).
- **Infrastructure**: axios instance, React Query client config, error/logger utility.

`medical-devices` là sub-feature của `assets` về mặt nghiệp vụ (Asset là thiết bị y tế mới có Medical Device Profile) nhưng tách thư mục riêng vì API/DTO riêng biệt (`API_REFERENCE.md`).

---

## 4. API Layer

`src/api/` — 1 file/domain, khớp `features/` (`documents.api.ts`, `users.api.ts`, `assets.api.ts`, `workflow.api.ts`, `departments.api.ts`, `dashboard.api.ts`, `auditLogs.api.ts`, `rbac.api.ts`, `assetCategories.api.ts`, `medicalDevices.api.ts`, `upload.api.ts`, `excel.api.ts`, `notifications.api.ts`, `auth.api.ts`).

| Quy ước | Nội dung |
|---|---|
| Responsibility | Hàm thuần `async (params) => axiosInstance.get/post/put/patch/delete(...)` — trả **raw axios response**, KHÔNG unwrap ở đây (unwrap ở Hook Layer/interceptor, xem Mục 5) |
| Naming | `get<Domain>List`, `get<Domain>Detail`, `create<Domain>`, `update<Domain>`, `delete<Domain>` — khớp verb HTTP thật của endpoint (`API_REFERENCE.md`), KHÔNG tự đặt tên khác hành vi backend |
| Request convention | Query param object → 1 hàm build `URLSearchParams`/dùng `axios params` option trực tiếp, KHÔNG tự nối string URL thủ công |
| Response convention | Trả nguyên `AxiosResponse<T>` — Hook Layer gọi `unwrapResponse()` (Mục 5) |
| Error convention | KHÔNG try/catch ở API layer — để lỗi throw tự nhiên lên React Query, xử lý tập trung ở `onError` (Mục 5, 8) |
| Authentication | KHÔNG tự gắn header ở từng hàm — axios instance interceptor gắn `Authorization` tự động (Mục 9) |
| Retry | KHÔNG tự retry ở API layer — cấu hình `retry` ở React Query (Mục 13), riêng lỗi network/5xx có thể retry tối đa 2 lần, KHÔNG retry 4xx |
| Refresh token | KHÔNG xử lý ở API layer — hoàn toàn ở axios response interceptor (Mục 9) |
| Cancellation | Truyền `signal` từ React Query (`{signal}` queryFn thứ 2) xuống axios `{signal}` config — tận dụng auto-cancel khi component unmount/query key đổi |
| Timeout | Axios instance timeout mặc định 15s (đủ cho request thường); riêng Excel import/export và file lớn KHÔNG set timeout ngắn — dùng timeout riêng dài hơn hoặc bỏ timeout, có progress UI thay thế (Mục 20) |
| File upload | `FormData`, KHÔNG tự set `Content-Type` (để axios set multipart boundary tự động — `DATA_FLOW.md` Mục 5) |
| File download | `{responseType:"blob"}` — KHÔNG dùng `window.open()` trực tiếp (token qua header, không qua URL — `DATA_FLOW.md` Mục 5) |

---

## 5. Response Normalization

```text
Raw backend response (≥4 shape khác nhau quan sát được — ERROR_HANDLING.md, FE_KNOWLEDGE_BASE_AUDIT.md Finding #1)
        ↓
Axios response interceptor (CHỈ can thiệp lỗi — xem Mục 8; response THÀNH CÔNG đi qua nguyên vẹn)
        ↓
unwrapResponse<T>(axiosResponse) — Hook Layer gọi, KHÔNG gọi trong API layer
        ↓
React Query (nhận {data, pagination?} đã chuẩn hoá)
        ↓
Feature component
```

**`unwrapResponse()` KHÔNG được giả định 1 shape cố định** (`response.data.data`) — phải xử lý tối thiểu các case đã xác nhận:
1. `{success:true, message?, data, pagination?}` — chuẩn phổ biến nhất (đa số domain).
2. `{message, data}` — KHÔNG có `success` (vd `POST /auths/register`, `API_REFERENCE.md`).
3. `{accessToken, refreshToken, user}` — response phẳng KHÔNG có field `data` bọc ngoài (`POST /auths/login`, cần hàm riêng cho domain Auth, không dùng chung `unwrapResponse` generic).
4. Response Upload (`getFileDetail`/`deleteFile`) — trả trực tiếp object/`{message}`, KHÔNG có field `data` bọc ngoài — domain Upload cần hàm unwrap RIÊNG, không ép vào `unwrapResponse` chung (`ERROR_HANDLING.md` Mục 4).
5. Blob response (export/download) — KHÔNG qua `unwrapResponse`, dùng trực tiếp.

`FE DECISION`: viết `unwrapResponse<T>()` generic cho case 1+2, và 1 hàm `unwrapUploadResponse()` riêng cho domain Upload — KHÔNG cố gộp thành 1 hàm xử lý mọi shape (sẽ phải dùng nhiều nhánh `if` đoán shape, giòn hơn 2 hàm tường minh theo domain).

---

## 6. Error Handling

Kiến trúc dựa trực tiếp `ERROR_HANDLING.md` — không lặp lại bảng status code/shape ở đây.

| Loại lỗi | Nơi hiển thị |
|---|---|
| Global error (401 hết hạn không refresh được, network error mất kết nối) | Toast/banner toàn cục + (401) redirect `/login` |
| Page error (query GET chính của trang lỗi) | `ErrorState` component thay nội dung trang, có nút "Thử lại" (`SHARED_COMPONENTS_LIBRARY.md`) |
| Form field error (400 Zod, `details[].path`) | Inline dưới field tương ứng, map theo `path.join(".")` |
| Toast error (mutation lỗi không phải validation — 403/404/409/500) | Toast chung hiển thị `message` (an toàn hiển thị trực tiếp — `ERROR_HANDLING.md` Mục 2) |
| Inline error (409 VersionError Asset) | Banner trong trang detail + tự động `refetch`, không chỉ toast tĩnh (`ERROR_HANDLING.md` Mục 5) |

`parseApiError(err)` (`FE DECISION`, logic đã mô tả ở `ERROR_HANDLING.md` Mục 4) PHẢI phân biệt 3 nhánh:
1. `err.response.data.success === false` → dùng `{message, errorCode, details}` chuẩn — rẽ tiếp theo `errorCode`:
   - `"BAD_REQUEST"` → `details` là `ZodIssue[]`, đọc `details[].path` (mảng, cần `join(".")`) + `details[].message`.
   - `"VALIDATION_ERROR"` → `details` là `string[]` thuần, hiển thị dạng list, KHÔNG có field-level mapping.
2. `err.response.data` chỉ có `{message}` (không `success`) → domain Upload, `errorCode` mặc định `"UNKNOWN"`.
3. Không có `err.response` (network error/timeout) → tự đặt message FE: `"Không thể kết nối máy chủ, vui lòng kiểm tra kết nối mạng"`.

**Không tạo 1 parser chỉ xử lý 1 shape** — vi phạm trực tiếp phát hiện #1/#4 ở `FE_KNOWLEDGE_BASE_AUDIT.md`.

---

## 7. Authentication Architecture

Dựa `AUTH_RBAC_MAP.md` Mục 1 + `DATA_FLOW.md` Mục 3 — luồng đầy đủ đã mô tả ở 2 file đó, KHÔNG lặp lại ASCII diagram. Bảng trách nhiệm:

| Thành phần | Trách nhiệm | KHÔNG làm |
|---|---|---|
| Zustand `authStore` | Giữ `accessToken` (in-memory), `user`, `isAuthenticated`; expose `login()/logout()/setUser()` | Tự gọi API — không import axios trong store |
| `localStorage` | CHỈ giữ `refreshToken` — đọc/ghi qua 1 module riêng (`utils/tokenStorage.ts`), KHÔNG qua Zustand (tránh re-render không cần thiết) | Giữ `accessToken` (in-memory only — giảm bề mặt XSS đọc `localStorage`) |
| Axios request interceptor | Gắn `Authorization: Bearer <accessToken>` từ `authStore` vào MỌI request (trừ 6 route public `/auths/*` — vẫn gắn an toàn vì header thừa với route public không gây lỗi) | Tự parse token, tự kiểm tra hết hạn (để 401 tự nhiên xảy ra) |
| Axios response interceptor | Bắt 401 → refresh-lock (1 promise dùng chung cho MỌI request 401 đồng thời) → gọi `/auths/refresh-token` → thành công: cập nhật `authStore`, retry TẤT CẢ request đang chờ; thất bại hoặc đã retry rồi: logout | Refresh nhiều lần song song (PHẢI dùng lock, tránh gọi `/refresh-token` N lần cho N request 401 cùng lúc) |
| React Query | Cache `["users","me"]` seed ngay sau login (tránh gọi lại `/users/me` thừa) | Tự lưu accessToken/refreshToken trong cache |

**Backend constraint không đổi được từ FE** (`AUTH_RBAC_MAP.md` Mục 1.4, nhắc lại ngắn gọn vì ảnh hưởng trực tiếp code Auth):
- `refreshToken` KHÔNG rotate → FE không cần logic lưu refreshToken mới sau mỗi lần refresh (backend không trả cái mới).
- `/register` không tự động login → điều hướng `/login` sau khi đăng ký thành công, KHÔNG giả định đã có session.
- `refreshToken` trả JSON body, không cookie httpOnly → buộc `localStorage`, chấp nhận rủi ro XSS cao hơn thiết kế cookie lý tưởng — **KHÔNG tự sửa backend để "cải thiện"** (ngoài scope FE, đổi cơ chế token là thay đổi security model backend).

**Multi-request 401 handling** (chi tiết kỹ thuật, `FE DECISION`): dùng 1 biến module-level `refreshPromise: Promise<string> | null`. Request đầu tiên gặp 401 tạo `refreshPromise`; mọi request 401 tiếp theo trong lúc đó `await` CÙNG promise thay vì tạo mới. Sau khi `refreshPromise` resolve/reject, reset về `null` để lần 401 tiếp theo (sau khi đã refresh xong) tạo promise mới.

---

## 8. RBAC Architecture

Dựa `AUTH_RBAC_MAP.md` Mục 2, `SHARED_COMPONENTS_LIBRARY.md` (`PermissionGuard`, `ProtectedRoute`).

```text
usePermission() — hook đọc user.permissions từ cache React Query ["users","me"] (KHÔNG đọc Zustand
                  trực tiếp cho permission — user object đầy đủ nằm ở React Query cache, Zustand chỉ
                  giữ bản rút gọn cho auth check nhanh — xem STATE_MAPPING.md)
  → hasPermission(permission: string | string[], mode: "all"|"any" = "all"): boolean

PermissionGuard  — ẩn/disable children nếu thiếu permission (SHARED_COMPONENTS_LIBRARY.md)
ProtectedRoute   — chặn route: authenticate trước, permission sau (ROUTE_PERMISSION_MAP.md quy tắc)
```

**Phân biệt 4 tầng, KHÔNG trộn lẫn**:
1. **Authentication** — có `accessToken` hợp lệ hay không (axios interceptor + `ProtectedRoute` bước 1).
2. **Authorization** — có đủ permission hay không, luôn đọc từ `GET /users/me` runtime, KHÔNG decode JWT, KHÔNG hard-code theo role name (`AUTH_RBAC_MAP.md` Mục 2.2: permission cụ thể của 5 role non-ADMIN là UNKNOWN chi tiết, chỉ nguồn thật là `user.permissions`).
3. **UI visibility** — `PermissionGuard` ẩn nút/menu — **CHỈ là UX**, không phải bảo mật thật.
4. **Backend enforcement** — `authorizePermission` middleware — **ranh giới bảo mật DUY NHẤT thật sự**. Nhắc lại nguyên tắc xuyên suốt toàn bộ KB: FE permission check KHÔNG BAO GIỜ thay thế backend.

**Permission gap đã audit, PHẢI tự giới hạn UI dù backend chưa chặn** (KHÔNG tự sửa backend):

| Gap | FE xử lý |
|---|---|
| `USER_VIEW`/`USER_VIEW_DETAIL` — 0 role giữ | Trang `/users*` coi là ADMIN-only thực tế; nếu cần mở cho role khác — đây là quyết định nghiệp vụ, đưa vào Mục 31 Open Questions, KHÔNG tự quyết |
| `delete-by-month` — role `IT` cũng có `DOCUMENT_DELETE`, thiếu ADMIN-only guard | Ẩn nút bulk-delete-by-month nếu `user.role.name !== "ADMIN"` (check role, không phải permission, vì gap nằm ở chỗ permission không phân biệt được) |
| `POLICY_*` (ABAC) — CRUD hoạt động nhưng 0 tác dụng runtime | Gắn nhãn "Beta/chưa áp dụng" ở toàn bộ UI `/rbac/policies` |

---

## 9. Routing Architecture

Route map đầy đủ đã có ở `ROUTE_PERMISSION_MAP.md` — KHÔNG lặp lại bảng route ở đây, chỉ bổ sung cấu trúc kỹ thuật:

```text
routes/
├── index.tsx           — router config chính (createBrowserRouter hoặc <Routes>)
├── ProtectedRoute.tsx   — wrapper: authenticate? → permission? → render
├── publicRoutes.ts      — /login, /forgot-password, /reset-password, /register (PENDING, Mục 31)
├── protectedRoutes.ts    — toàn bộ route sau login, mỗi entry {path, permission, element}
└── fallback              — /403, /404
```

- **Public routes**: `/login`, `/forgot-password`, `/reset-password` (CONFIRMED tồn tại — backend có endpoint tương ứng). `/register` — **UNKNOWN**, xem Mục 31.
- **Protected routes**: mọi route còn lại theo bảng `ROUTE_PERMISSION_MAP.md`, permission cụ thể đã liệt kê đủ ở đó.
- **Admin routes**: không có nhóm route riêng biệt về mặt kỹ thuật — dùng CHUNG cơ chế `ProtectedRoute` + permission, vì model backend là permission-based (không phải role-based). Route "thường ADMIN" (RBAC admin, Policy) chỉ tình cờ ADMIN là role duy nhất giữ permission đó hiện tại, KHÔNG hard-code `role === "ADMIN"` trong route guard (ngoại lệ: 2 gap ở Mục 8 PHẢI check role vì bản thân permission model có lỗ hổng).
- **Fallback**: `/403` (thiếu permission — route quy tắc ở `ROUTE_PERMISSION_MAP.md` Mục "Quy tắc ProtectedRoute"), `/404` (route không khớp).
- Route con cụ thể cho `/import-export` — **PENDING DECISION** (`ROUTE_PERMISSION_MAP.md` Mục "Ghi chú UNKNOWN": FE RECOMMENDATION tách theo domain Document/Asset, chưa chốt).

---

## 10. State Management

Toàn bộ phân loại đã CONFIRMED-as-recommendation ở `STATE_MAPPING.md` — không lặp lại bảng query key. Quy tắc bổ sung:

**When NOT to use Zustand**:
- Bất kỳ data nào có nguồn từ 1 endpoint API (kể cả data "ít thay đổi" như danh sách Department/Role) — LUÔN React Query, không cache tay trong Zustand dù có vẻ tiện.
- Loading/error state của 1 request cụ thể — React Query tự quản lý (`isLoading`, `isError`, `error`), không tự tạo `loading: boolean` trong Zustand cho việc này.
- Filter/search của 1 trang danh sách — vào query key hoặc URL search params, KHÔNG vào Zustand global, TRỪ 1 ngoại lệ đã ghi rõ ở `STATE_MAPPING.md` Mục 2.2 (default filter persist qua reload — optional, không bắt buộc P0).

**When NOT to duplicate React Query data**:
- KHÔNG copy `data` từ 1 query vào `useState` cục bộ "để dễ sửa tạm" rồi mutate cục bộ — nếu cần optimistic update, dùng cơ chế optimistic update của React Query (`onMutate`/`setQueryData`), không tạo state² (2 nguồn sự thật lệch nhau).
- Component con cần data đã fetch ở component cha → gọi LẠI cùng `useXxxQuery` với cùng key (React Query dedupe tự động theo cache), KHÔNG prop-drill rồi biến thành state cục bộ ở con.

---

## 11. React Query Convention

| Hạng mục | Quy ước |
|---|---|
| Query keys | Mảng phân cấp `[domain, "list"\|"detail"\|..., params?]` — đã liệt kê đủ theo domain ở `STATE_MAPPING.md` Mục 1, dùng CHÍNH XÁC các key đó khi code, không tự đặt biến thể khác |
| Query functions | 1 hàm/API call trong `api/<domain>.api.ts`, KHÔNG inline function trong component |
| Mutation functions | Tương tự, đặt cạnh query function cùng file domain |
| Invalidation | Sau mutation thành công: invalidate TẤT CẢ query key liên quan trực tiếp (vd update Document → invalidate `list` VÀ `detail`; approve workflow → invalidate `workflow.*` VÀ `documents.detail` VÀ có điều kiện `assets.detail` — xem `DATA_FLOW.md` Mục 4) |
| Prefetching | Optional, chỉ dùng nếu UX cần (vd hover row → prefetch detail) — KHÔNG bắt buộc mọi trang |
| Caching / Stale time | Mặc định React Query (`staleTime: 0`, refetch on window focus bật) cho data thay đổi thường xuyên (Documents, Workflow, Assets); tăng `staleTime` (vd 5 phút) CHỈ cho data gần như tĩnh (Departments, Permissions catalog, Roles) |
| Retry | 4xx: KHÔNG retry (lỗi nghiệp vụ/permission, retry vô ích). 5xx/network: retry tối đa 2 lần, backoff mặc định của React Query |
| Pagination | `page`/`limit` vào query key trực tiếp — mỗi trang là 1 cache entry riêng (KHÔNG dùng `keepPreviousData`/`placeholderData` tuỳ chọn nếu muốn UX mượt khi chuyển trang — FE DECISION khi code FE-0x cụ thể) |
| Infinite query | KHÔNG cần cho danh sách hiện tại (tất cả dùng pagination trang, không có "load more" theo UI_REQUIREMENTS.md) — chỉ cân nhắc nếu phát sinh yêu cầu UI cụ thể sau này |
| Dependent queries | vd `useWorkflowByDocumentQuery(documentId)` chỉ `enabled: !!documentId` sau khi `useDocumentQuery` load xong id |
| Optimistic update | Optional, KHÔNG bắt buộc P0 — chỉ cân nhắc cho action tần suất cao/độ trễ cảm nhận rõ (vd đánh dấu đã đọc notification) |

---

## 12. TypeScript Architecture

| Loại type | Vị trí | Nguồn |
|---|---|---|
| API types (request/response DTO) | `types/api/<domain>.types.ts` | Sinh từ OpenAPI (nếu dùng `openapi-typescript`, Mục 1) hoặc viết tay khớp DTO backend (`documents.dto.ts`...) — KHÔNG tự suy đoán field không có trong DTO |
| Domain types (enum nghiệp vụ) | `types/domain/<domain>.types.ts` hoặc `constants/` nếu là runtime value | Copy TRỰC TIẾP từ model backend (`DocumentCategory`, `AssetStatus`...) |
| UI types (props component) | Cạnh file component (`Component.tsx` + type inline hoặc `Component.types.ts` nếu phức tạp) | Tự định nghĩa theo nhu cầu UI |
| Form types | Cạnh form component, thường suy ra từ Zod schema (`z.infer<typeof schema>`) | Tự định nghĩa, đối chiếu DTO backend để không gửi thừa/thiếu field |

**Không dùng `any`** trừ 1 trường hợp CHO PHÉP có ghi chú: field `meta` của Document (`z.record()` phía backend, không có schema cứng — `UI_REQUIREMENTS.md` "Documents Create") — dùng `Record<string, unknown>` thay vì `any`, ép kiểu cụ thể hơn ở từng form theo `subType` khi cần đọc field bên trong.

**Không duplicate type giữa feature** — type dùng chung (vd `Pagination<T>`, `ApiResponse<T>`, `ApiError`) đặt ở `types/shared.types.ts`, mọi domain import lại.

---

## 13. Forms / Validation

- Library: React Hook Form + Zod resolver (`@hookform/resolvers/zod`).
- **Client validation KHÔNG thay thế backend validation** — luôn coi response lỗi 400 từ backend là nguồn xác nhận cuối, client validation chỉ là UX (phản hồi nhanh, giảm round-trip không cần thiết).
- Zod schema phía FE nên khớp ràng buộc ĐÃ BIẾT từ DTO backend (vd `username` 3-50 `[a-zA-Z0-9_]`, `password`≥8 hầu hết chỗ trừ login≥5) — copy đúng con số, KHÔNG tự nới lỏng/siết chặt hơn backend.
- **Cross-field validation**: vd `confirmPassword === password` — validate client-side trước, backend cũng tự validate lại (không tin tưởng riêng client).
- **Async validation**: KHÔNG có trường hợp nào bắt buộc P0 hiện tại (không phát hiện DTO nào cần check unique real-time qua API riêng ngoài submit — trùng username/email chỉ biết qua response lỗi khi submit thật).
- **Server error mapping**: sau submit, nếu lỗi `errorCode:"BAD_REQUEST"` → dùng React Hook Form `setError(path.join("."), {message})` cho từng `details[].path`; nếu `"VALIDATION_ERROR"` (string[] không path) → hiển thị dạng list phía trên form, KHÔNG cố map vào field cụ thể.
- **Business-rule-dependent required field** (vd `relatedAsset` bắt buộc CHỈ khi `subType===PROPOSE_REPAIR`, `DOCUMENT_DOMAIN_MAP.md` Mục 2) — dùng Zod `.superRefine()` hoặc `refine` tuỳ theo field khác trong cùng form, KHÔNG tách rời khỏi schema chính.

---

## 14. UI Foundation

Phân loại theo `SHARED_COMPONENTS_LIBRARY.md` (đã liệt kê đủ 18 component, không lặp lại bảng) + `UI_REQUIREMENTS.md`:

| Nhóm | shadcn/ui | Custom shared component (Tailwind thuần) |
|---|---|---|
| Input phức tạp | Select, DatePicker (kết hợp `react-day-picker` — dependency của shadcn Calendar), Dialog/Modal, Dropdown Menu, Popover, Tabs, Toast (Sonner hoặc shadcn Toast) | Input/Textarea text đơn giản có thể dùng shadcn `Input` base nhưng KHÔNG bắt buộc |
| Bảng | `@tanstack/react-table` (headless) làm engine + Tailwind tự style, shadcn Table CHỈ phần visual (thead/tbody wrapper) | `DataTable` là component TỰ VIẾT bọc quanh, không phải shadcn có sẵn "DataTable" (shadcn không có sẵn, chỉ có Table nguyên thuỷ) |
| Button/Badge/Card | — | AppButton, StatusBadge, PermissionBadge (đơn giản, tự viết Tailwind — Mục 1) |
| Form | React Hook Form + shadcn Form wrapper (`FormField`/`FormItem`/`FormMessage`, pattern shadcn chính thức) | — |
| Upload | — | `FileUpload` tự viết (input file + drag-drop nếu cần, validate MIME/size client — Mục 20) |
| Empty/Loading/Error/Confirm | — | `EmptyState`, `LoadingState`, `ErrorState`, `ConfirmDialog` tự viết (dùng shadcn `AlertDialog` làm nền cho `ConfirmDialog` là hợp lý — có sẵn accessibility) |

Không implement component ở task này (đúng ràng buộc Mục 33 spec gốc).

---

## 15. Design System Rules

**PENDING DESIGN DECISION** cho toàn bộ token cụ thể — 4 file thiết kế gốc từ UI-00 (bao gồm `UI_DESIGN_SYSTEM.md` có màu/typography) đã bị xoá (`FRONTEND_MEMORY.md` Mục 1), CHƯA được tạo lại trong phạm vi Frontend Knowledge Base hay task này.

Những gì có thể xác định NGAY (không phải design token, mà là RÀNG BUỘC kỹ thuật/kiến trúc):

| Hạng mục | Trạng thái |
|---|---|
| Colors (bảng màu cụ thể, semantic màu status) | PENDING DESIGN DECISION |
| Typography (font family/scale cụ thể) | PENDING DESIGN DECISION |
| Spacing/Radius/Shadows/Borders | PENDING DESIGN DECISION — nên dùng scale mặc định Tailwind (4px base) làm điểm khởi đầu, KHÔNG tự tạo scale riêng nếu chưa có lý do cụ thể |
| Breakpoints | FE RECOMMENDATION: dùng breakpoint mặc định Tailwind (`sm/md/lg/xl/2xl`) — app nội bộ, ưu tiên desktop/tablet (không cần tối ưu mobile-first sâu vì đối tượng dùng là nhân viên bệnh viện thao tác bàn/tablet là chính, KHÔNG loại bỏ hoàn toàn responsive mobile) |
| StatusBadge color mapping | Cần 2 bảng RIÊNG cho `workflowStatus` (5 giá trị) và `AssetStatus` (6 giá trị) — đã ghi rõ ở `SHARED_COMPONENTS_LIBRARY.md`, giá trị màu cụ thể vẫn PENDING |

**Không tự tạo 1 design system chi tiết ở task này** (đúng ràng buộc Mục 17 spec gốc) — nếu cần, đây là ứng viên rõ ràng nhất cho 1 task riêng trước hoặc song song FE-00 bootstrap (xem Open Questions Mục 31).

---

## 16. Table Architecture

`DataTable` (`SHARED_COMPONENTS_LIBRARY.md`) — hành vi chi tiết (KHÔNG code):

| Hành vi | Nguồn sự thật | Ghi chú FE |
|---|---|---|
| Pagination | Server-side — `page`/`limit` gửi lên API, nhận `{data, pagination:{page,limit,total,totalPages}}` | KHÔNG client-side paginate toàn bộ dataset tải về 1 lần |
| Sorting | Server-side CHỈ với field có trong whitelist DTO (vd Documents: `createdAt\|updatedAt\|title\|documentCode\|serviceDate\|actualCost` — `DOCUMENT_DOMAIN_MAP.md` Mục 4) | KHÔNG hiển thị sort option ngoài whitelist — mỗi domain có whitelist RIÊNG, đọc từ DTO tương ứng khi code từng trang |
| Filtering | Server-side qua query param — vào React Query key (Mục 10, 11) | |
| Search | Server-side `keyword` (full-text index, Documents — `DOCUMENT_DOMAIN_MAP.md` Mục 6) hoặc filter thường tuỳ domain | Không tự thêm debounce quá ngắn (300ms là điểm khởi đầu hợp lý, tránh gọi API mỗi keystroke) |
| Row actions | Nhận mảng action đã pre-filter theo permission (`PermissionGuard` áp dụng TRƯỚC khi truyền vào `DataTable`, không để `DataTable` tự biết permission) | |
| Selection | KHÔNG bắt buộc P0 — chỉ cần nếu có bulk action UI xác nhận cần (hiện chỉ thấy `delete-by-month` là bulk, nhưng đó là action theo filter, không phải theo selection dòng) |
| Loading | Skeleton table (không phải spinner che toàn bộ — giữ khung cột hiển thị đỡ giật layout) |
| Empty state | `EmptyState` component, message theo domain + action gợi ý nếu có (vd "Chưa có tài liệu nào — Tạo mới") |
| Error | `ErrorState` + nút thử lại — KHÔNG để bảng trắng im lặng |
| Responsive | Bảng nhiều cột (vd Documents ≥6 cột) cần chiến lược cho màn hẹp — `FE RECOMMENDATION`: horizontal scroll trong container riêng (không phải scroll toàn trang) hoặc ẩn bớt cột phụ dưới breakpoint `md`, quyết định cụ thể khi code từng trang |
| Column visibility | Optional, KHÔNG bắt buộc P0 |
| Export action | Nút riêng (`ExportButton`), KHÔNG gộp vào `DataTable` — export là action cấp trang, không phải cấp bảng |

---

## 17. Filter Architecture

`FilterBar` (`SHARED_COMPONENTS_LIBRARY.md`):

- **URL filter**: filter chính của mọi trang danh sách (category/subType/department/workflowStatus/fromDate-toDate/keyword...) PHẢI phản ánh vào URL search params — cho phép reload/share link giữ nguyên filter, và là nguồn build React Query key trực tiếp (đọc từ URL, không phải state riêng rồi đồng bộ 2 chiều).
- **Client filter**: KHÔNG có trường hợp nào xác nhận cần (mọi filter liệt kê ở `UI_REQUIREMENTS.md` đều là param backend thật, không phải lọc thêm phía FE trên data đã tải).
- **Server filter**: tương đương URL filter ở trên — mọi filter đều gửi lên backend qua query param, KHÔNG tải toàn bộ rồi filter tay ở FE (dataset có thể lớn, vd Documents/Assets).
- **Temporary filter** (giá trị đang gõ trong input search TRƯỚC khi debounce/submit): local state của `FilterBar`, CHỈ đẩy vào URL sau debounce hoặc khi user bấm nút filter rõ ràng (tuỳ UX quyết định lúc code, không bắt buộc chọn 1 kiểu duy nhất cho mọi field — search text nên debounce, dropdown/date nên áp dụng ngay khi chọn).

**Dashboard là ngoại lệ** (`UI_REQUIREMENTS.md` Dashboard, `AUTH_RBAC_MAP.md`/`API_REFERENCE.md` ghi nhận backend KHÔNG validate query domain này): filter Dashboard (`month`/`year`/`daysAhead`/`daysThreshold`) PHẢI validate client-side TRƯỚC khi đưa vào query key/gọi API — xem Mục 21.

---

## 18. File Upload / Download

Dựa `SHARED_COMPONENTS_LIBRARY.md` (`FileUpload`), `DATA_FLOW.md` Mục 5, `ERROR_HANDLING.md` Mục 4.

| Hạng mục | Quy ước |
|---|---|
| Upload | `FormData`, validate MIME/size CLIENT-SIDE trước khi gửi (UX only — backend tự check lại, không thay thế) |
| Download/Export | `responseType:"blob"` → `URL.createObjectURL` → `<a download>` ẩn → click → `revokeObjectURL` ngay sau |
| Excel export | Domain Documents/Assets/Audit Logs — tên file theo convention `<domain>-export-<date>.xlsx` (FE tự đặt, backend không ép tên cụ thể theo `API_REFERENCE.md` đã đọc) |
| Excel import | Preview trước khi confirm (nếu backend có `dryRun` — CONFIRMED có ở Excel Document theo code DEV-025 đã sửa `excel.service.ts`), hiển thị rõ action `create`/`update` dự kiến cho từng dòng |
| Preview | Nếu API hỗ trợ dry-run, hiển thị bảng preview {dòng, action, lỗi nếu có} trước khi submit thật |
| Errors | Domain Upload dùng `unwrapUploadResponse`/`parseApiError` nhánh riêng (Mục 5, 6) — KHÔNG tái sử dụng logic error chuẩn giả định có `errorCode` |
| Loading | Progress indicator riêng cho file lớn (không dùng spinner chung — upload/export có thể mất nhiều giây, cần feedback tiến độ nếu axios hỗ trợ `onUploadProgress`/`onDownloadProgress`) |
| Success/Failure | Toast rõ ràng, với Import: hiển thị SỐ LƯỢNG dòng thành công/lỗi (không chỉ "Import thành công" chung chung) nếu response trả `result.errors[]` (MEDIUM confidence, `FE_KNOWLEDGE_BASE_AUDIT.md` — response shape `result.errors[]`/`preview[]` field-by-field chưa đọc sâu, cần verify khi code FE-0x Excel thật) |
| Giới hạn | `MAX_IMPORT_ROWS`/`MAX_SYNC_ROWS` = 5000 dòng/file (`FRONTEND_MEMORY.md` Mục 10) — FE nên cảnh báo sớm nếu file rõ ràng vượt ngưỡng (đếm dòng phía client trước khi gửi, nếu dễ làm với thư viện đọc Excel client-side; nếu không dễ, để backend tự chặn và hiển thị lỗi) |

---

## 19. Dashboard Foundation

`UI_REQUIREMENTS.md` Dashboard + `API_REFERENCE.md`/`FRONTEND_MEMORY.md` Mục 6.4 (backend KHÔNG validate query 12 endpoint này).

**Client-side validation BẮT BUỘC trước khi gọi API** (`FE DECISION`, vì đây là domain DUY NHẤT thiếu Zod validate ở backend):

| Param | Ràng buộc FE tự áp | Lý do |
|---|---|---|
| `month` | integer 1-12 | Backend không chặn, giá trị sai có thể trả rỗng/sai âm thầm thay vì 400 |
| `year` | integer hợp lý (vd 2000-2100, hoặc giới hạn quanh năm hiện tại ±10) | như trên |
| `daysAhead` | integer dương, giới hạn trên hợp lý (vd ≤365) | tránh query range quá lớn gây chậm không cần thiết |
| `daysThreshold` | integer dương | như trên |

- KHÔNG giả định backend sẽ tự trả 400 khi input sai — phải validate và CHẶN gọi API phía FE nếu input không hợp lệ (disable nút/filter thay vì gửi lên rồi nhận kết quả khó hiểu).
- Mỗi trong 12 endpoint là 1 query key riêng (`STATE_MAPPING.md` Mục 1), loading/error độc lập từng card (`UI_REQUIREMENTS.md` Dashboard).

---

## 20. Notification

`UI_REQUIREMENTS.md` (chưa có mục riêng, tổng hợp từ `API_REFERENCE.md`/`STATE_MAPPING.md`), `MEDIUM CONFIDENCE` theo `FE_KNOWLEDGE_BASE_AUDIT.md` (chưa đọc sâu route/service filter chi tiết).

| Hạng mục | Trạng thái |
|---|---|
| Toast (thông báo hành động tức thời — "Tạo thành công"...) | FE RECOMMENDATION, độc lập với Notification domain (không lưu DB, chỉ UI tạm thời) |
| Notification (persistent, từ `GET /notifications`) | CONFIRMED tồn tại (self-scoped, `AUTH_RBAC_MAP.md` Mục 3) |
| Unread state | `["notifications","unreadCount"]` — `STATE_MAPPING.md` đề xuất `refetchInterval` polling hoặc invalidate khi vào trang — **MEDIUM CONFIDENCE**: chưa xác nhận backend có filter/type phân loại thông báo hay không |
| Notification list | Hiển thị danh sách + đánh dấu đã đọc (`PATCH /:id/read`, `/read-all`) — CONFIRMED endpoint tồn tại |

**KHÔNG tự suy đoán** thêm loại notification/behavior chưa xác nhận (vd real-time push qua WebSocket) — backend hiện chỉ có REST polling-style, KHÔNG có WebSocket/SSE (`API_REFERENCE.md` không liệt kê endpoint nào dạng này) — nếu cần real-time thật, đó là thay đổi backend, ngoài scope FE.

---

## 21. Security Rules

| Quy tắc | Áp dụng cụ thể cho project này |
|---|---|
| No secrets in source | `JWT_SECRET`/`JWT_REFRESH_SECRET`/DB credential — hoàn toàn phía backend, FE không bao giờ cần các giá trị này |
| No hardcoded production credentials | Không có tài khoản test hard-code trong code FE (kể cả code demo/storybook nếu có sau này) |
| No permission trust | Nhắc lại Mục 8: `PermissionGuard`/`ProtectedRoute` KHÔNG BAO GIỜ là điểm chặn bảo mật thật |
| No sensitive logging | KHÔNG `console.log` accessToken/refreshToken/password ở BẤT KỲ đâu, kể cả môi trường dev (thói quen dễ vô tình commit) |
| No token leakage | KHÔNG nhúng token vào URL query (kể cả link download — dùng blob+Authorization header, Mục 18); KHÔNG log token vào error tracking third-party nếu sau này tích hợp Sentry/tương tự |
| No unnecessary localStorage usage | CHỈ `refreshToken` (bắt buộc, theo cơ chế backend hiện tại) + UI preference nhỏ (theme/sidebar) — KHÔNG cache data nghiệp vụ (đó là việc của React Query, không phải localStorage) |

**Phản ánh đúng backend hiện tại, KHÔNG tự tuyên bố đã giải quyết**: `refreshToken` trong `localStorage` là rủi ro XSS cố hữu từ thiết kế backend (JSON body, không cookie httpOnly) — FE tài liệu này KHÔNG được viết như thể vấn đề đã fix; nó vẫn OPEN, chỉ là ngoài khả năng sửa của FE mà không đổi backend (`AUTH_RBAC_MAP.md` Mục 1.4).

---

## 22. Environment Config

| File | Mục đích |
|---|---|
| `.env.example` | Checked-in, liệt kê tên biến (không giá trị thật) |
| `.env.development` | `VITE_API_BASE_URL=http://localhost:<port>/api` (khớp `backend/.env.example` port thật — verify khi bootstrap) |
| `.env.production` | `VITE_API_BASE_URL` trỏ domain thật khi deploy — KHÔNG commit file này nếu chứa giá trị thật khác localhost |
| `.env` | Local override, gitignore |

Biến cần xác định: `VITE_API_BASE_URL` (bắt buộc). Feature flag — hiện KHÔNG có nhu cầu xác nhận nào (không domain nào cần bật/tắt qua flag ở giai đoạn hiện tại) — chỉ thêm khi phát sinh nhu cầu thật cụ thể.

**Không đưa secret vào FE env** — mọi biến `VITE_*` bị bundle vào code client, public hoàn toàn (Vite doc), KHÔNG bao giờ đặt `JWT_SECRET`/API key bí mật ở đây.

---

## 23. Naming Convention

| Loại | Convention | Ví dụ |
|---|---|---|
| File component | PascalCase + hậu tố loại | `DocumentsPage.tsx`, `DocumentTable.tsx`, `DocumentCreateForm.tsx` |
| Hook | camelCase, tiền tố `use` | `useDocumentsQuery.ts`, `useDocumentMutation.ts`, `usePermission.ts` |
| Store | camelCase + hậu tố `Store` | `authStore.ts`, `uiStore.ts` |
| API file | camelCase + hậu tố `.api.ts` | `documents.api.ts`, `medicalDevices.api.ts` |
| Types file | camelCase + hậu tố `.types.ts` | `documents.types.ts` |
| Function | camelCase, verb-first | `getDocumentsList`, `createDocument`, `parseApiError` |
| Variable/Constant | camelCase (biến), SCREAMING_SNAKE_CASE (hằng số bất biến) | `documentList`, `MAX_IMPORT_ROWS` |
| Route path | kebab-case, khớp domain | `/asset-categories`, `/import-export/documents` (`ROUTE_PERMISSION_MAP.md`) |
| Query key | mảng string, domain trước, loại sau | `["documents","list",params]` (`STATE_MAPPING.md`, dùng đúng key đã định nghĩa) |

---

## 24. Coding Rules

- TypeScript `strict: true` trong `tsconfig.json` — không tắt để "code nhanh hơn".
- Không `any` không cần thiết (ngoại lệ duy nhất: Mục 12, field `meta`).
- Không duplicate business logic — logic tính toán/điều kiện nghiệp vụ (vd điều kiện hiển thị field theo `subType`) đặt ở 1 hàm dùng chung trong `features/documents/`, không copy-paste giữa Create/Edit form.
- Không gọi axios trực tiếp trong component — luôn qua Hook Layer (Mục 4, `FE_ARCHITECTURE.md` Mục 2 "Nguyên tắc phân lớp").
- Không đưa server state vào Zustand không có lý do (Mục 10).
- Không duplicate permission logic ở nhiều nơi — luôn qua `usePermission()`/`PermissionGuard`, không tự viết `user.permissions.includes(...)` rải rác.
- Không hardcode API path trong component/hook — path CHỈ xuất hiện trong file `api/<domain>.api.ts`.
- Không magic string cho permission/enum — import từ `constants/` (Mục 2), không gõ tay chuỗi `"DOCUMENT_VIEW"` lặp lại nhiều chỗ.

---

## 25. Testing Foundation

| Loại test | Priority | Ghi chú |
|---|---|---|
| Unit tests (utils: `unwrapResponse`, `parseApiError`, format functions) | **Cao** | Logic thuần, dễ test, giá trị cao vì được dùng khắp app |
| Hook tests (`usePermission`, custom hook không phụ thuộc network trực tiếp) | Cao | React Testing Library + `renderHook` |
| API layer tests | Trung bình | Mock axios, xác nhận đúng path/method/param được gọi — không cần test logic (đã ở unit test) |
| Component tests | Trung bình | Ưu tiên component dùng chung (`SHARED_COMPONENTS_LIBRARY.md`) trước — 1 lần đúng, dùng khắp app; component page cụ thể ưu tiên thấp hơn |
| Integration tests (feature flow: login → dashboard, tạo Document → duyệt workflow) | Cao (P0 cho luồng auth + Document/Workflow — domain trung tâm) | |
| E2E tests | Thấp cho giai đoạn đầu | Cân nhắc Playwright sau khi có ≥1 luồng chính ổn định, KHÔNG bắt buộc từ FE-01 |

**Ghi chú đặc biệt bắt buộc theo yêu cầu spec**: backend hiện **0 HTTP/E2E test** (`FRONTEND_MEMORY.md` Mục 8, `FE_KNOWLEDGE_BASE_AUDIT.md` Finding #10) — mọi hành vi API trong toàn bộ KB đến từ đọc source, CHƯA từng verify bằng request thật. Do đó khi bắt đầu code FE thật (FE-01 hoặc task code đầu tiên), **PHẢI** có 1 vòng gọi thử API THẬT tối thiểu (Postman/curl/hoặc integration test chạy against backend thật) cho luồng Auth + 1-2 domain chính TRƯỚC KHI tin tưởng tuyệt đối vào tài liệu tĩnh này để code (đã ghi ở `FE_KNOWLEDGE_BASE_AUDIT.md` Recommendation #5, nhắc lại ở đây vì ảnh hưởng trực tiếp Definition of Done Mục 29).

---

## 26. Observability / Debugging

| Hạng mục | Quy ước |
|---|---|
| Development logging | `console.log` cho phép trong dev, PHẢI xoá/guard `if (import.meta.env.DEV)` trước khi merge — không lộ ở production build |
| Error logging | Lỗi 5xx/network nên log ra console (dev) hoặc gửi error tracking (nếu tích hợp sau — KHÔNG bắt buộc P0) — KHÔNG log lỗi 401/403 dạng nghiêm trọng (là hành vi bình thường của hệ thống permission) |
| Network debugging | Dev dùng React Query Devtools (`@tanstack/react-query-devtools`) — CHỈ bundle trong dev build | |
| Query debugging | Devtools trên đã đủ — không cần thêm tool riêng | |
| Production logging restrictions | KHÔNG log bất kỳ response body nào chứa dữ liệu user thật (PII) ra console production; KHÔNG bundle React Query Devtools vào production build |

**Không log**: `accessToken`, `refreshToken`, `password`/`newPassword`/`oldPassword`, toàn bộ `req.body` thô của request Auth — kể cả trong dev, thói quen an toàn tránh vô tình commit log có token thật.

---

## 27. Definition of Done (áp dụng cho MỌI FE task từ FE-01 trở đi)

```text
[ ] TypeScript passes (tsc --noEmit)
[ ] Build passes (vite build)
[ ] API contract verified — đối chiếu API_REFERENCE.md, nếu phát hiện lệch với thực tế khi code
    (backend 0 E2E test — Mục 25), ghi nhận lại KB, không tự âm thầm "sửa cho khớp"
[ ] Permission verified — đúng permission string từ constants/, đúng theo ROUTE_PERMISSION_MAP.md
[ ] Loading state
[ ] Empty state
[ ] Error state
[ ] Validation (client theo Mục 13, đối chiếu response lỗi thật)
[ ] Responsive (tối thiểu không vỡ layout ở breakpoint md/lg — Mục 15)
[ ] Accessibility basics (label cho input, focus trap trong Modal/Dialog — có sẵn nếu dùng shadcn/Radix)
[ ] No console errors
[ ] No unnecessary duplication (Mục 24)
[ ] Relevant tests (theo priority Mục 25)
[ ] Documentation updated (UI_REQUIREMENTS.md/API_REFERENCE.md nếu phát hiện sai lệch cần sửa KB)
[ ] FRONTEND_MEMORY.md cập nhật khi architecture/state/decision thay đổi
```

---

## 28. FE Architecture Decisions

| # | Decision | Reason | Source | Status |
|---|---|---|---|---|
| 1 | React 18 + Vite + TypeScript | Đã hỏi user trực tiếp, xác nhận qua AskUserQuestion | Hội thoại trước UI-00 | **CONFIRMED** |
| 2 | Tailwind = layout/spacing/style toàn app; shadcn/ui = CHỈ component phức tạp (Table/Select/DatePicker/Modal/Dropdown/Tabs/Toast) | Tránh 2 design system cùng xử lý 1 component không rule (yêu cầu rõ ràng ở Mục 3 spec gốc) | `FE_ARCHITECTURE.md` Mục 1 + phân tích task này | RECOMMENDED |
| 3 | `unwrapResponse<T>()` generic (case chuẩn) + `unwrapUploadResponse()` riêng (KHÔNG gộp 1 hàm xử lý mọi shape) | ≥4 shape response quan sát được, gộp 1 hàm sẽ giòn/nhiều `if` đoán shape | `ERROR_HANDLING.md`, `FE_KNOWLEDGE_BASE_AUDIT.md` Finding #1 | RECOMMENDED |
| 4 | Refresh-lock pattern (1 promise dùng chung cho mọi 401 đồng thời) | Tránh gọi `/refresh-token` N lần song song khi N request cùng 401 | `DATA_FLOW.md` Mục 3 | RECOMMENDED |
| 5 | `accessToken` in-memory (Zustand), `refreshToken` localStorage — giữ nguyên theo cơ chế backend hiện tại | Backend trả JSON body, không cookie httpOnly — FE không có lựa chọn an toàn hơn mà không đổi backend | `AUTH_RBAC_MAP.md` Mục 1.4 | CONFIRMED (ràng buộc từ backend, không phải lựa chọn FE) |
| 6 | RBAC permission-based (đọc `user.permissions` runtime), KHÔNG hard-code theo role name — TRỪ 2 gap đã biết (`delete-by-month`, xem #7) | Đúng bản chất model backend, tránh vỡ khi backend đổi permission-role mapping | `AUTH_RBAC_MAP.md` Mục 2 | RECOMMENDED |
| 7 | Tự giới hạn UI (role-check, không permission-check) cho `delete-by-month` và ẩn/label "Beta" cho Policy UI | Bù đắp gap đã audit ở backend mà KHÔNG tự sửa backend | `FE_KNOWLEDGE_BASE_AUDIT.md` Finding #6, #7 | RECOMMENDED |
| 8 | Dashboard: validate `month`/`year`/`daysAhead`/`daysThreshold` client-side BẮT BUỘC trước khi gọi API | Backend domain này KHÔNG có Zod validate — input sai có thể trả kết quả sai âm thầm | `FE_KNOWLEDGE_BASE_AUDIT.md` Finding #3, #8 | RECOMMENDED |
| 9 | URL search params là nguồn filter chính cho mọi trang danh sách (không phải Zustand) | Cho phép reload/share link giữ filter, khớp trực tiếp React Query key | Phân tích task này, khớp `STATE_MAPPING.md` | RECOMMENDED |
| 10 | Trước khi code FE-01 thật, chạy 1 vòng verify API thật (Postman/curl) cho Auth + 1-2 domain chính | Backend 0 HTTP/E2E test — toàn bộ KB đến từ đọc source, chưa verify runtime thật | `FE_KNOWLEDGE_BASE_AUDIT.md` Recommendation #5 | RECOMMENDED (khuyến nghị mạnh, chưa phải quy trình bắt buộc đã ký) |

---

## 29. Open Questions

Chỉ liệt kê vấn đề THỰC SỰ cần user quyết định — không hỏi lại điều KB đã trả lời.

1. **Phạm vi MVP cụ thể** — domain nào code trước (Auth+Dashboard? Auth+Documents? Auth+Users?) — đã hỏi 2 lần trước đó, vẫn CHƯA CHỐT (`FRONTEND_MEMORY.md` Mục 7).
2. **Styling foundation** — xác nhận Tailwind+shadcn/ui (Mục 1 đề xuất) hay phương án khác — CHƯA CHỐT.
3. **`/register` public hay không** — cho phép tự đăng ký hay chỉ ADMIN tạo user qua `/users` (`ROUTE_PERMISSION_MAP.md` Mục "Ghi chú UNKNOWN") — CHƯA CHỐT.
4. **Design token (màu/typography/spacing cụ thể)** — 4 file gốc UI-00 đã xoá, cần task riêng nếu muốn có design system chi tiết trước khi code UI thật, hay chấp nhận dùng mặc định Tailwind + tự tinh chỉnh dần trong quá trình code — CHƯA CHỐT (Mục 15).
5. **Ant Design usage scope** — xác nhận KHÔNG dùng Ant Design (Mục 1 đã đề xuất loại bỏ hoàn toàn) — cần user xác nhận đồng ý loại bỏ, chưa hỏi trực tiếp câu này.
6. **shadcn usage scope** — xác nhận đúng phạm vi ở Mục 1/14 (chỉ component phức tạp) hay muốn dùng shadcn cho toàn bộ UI kit — CHƯA CHỐT.
7. **Quyết định nghiệp vụ `USER_VIEW`/`USER_VIEW_DETAIL`** — có nên gán permission này cho role khác ngoài ADMIN hay giữ nguyên hiện trạng (ADMIN-only trên thực tế) — đây là quyết định NGHIỆP VỤ backend, không phải FE, nhưng ảnh hưởng trực tiếp thiết kế trang Users (FE-04) — CHƯA CHỐT.

---

## 30. Cross-check Findings

Đối chiếu `FE_CONTEXT` ↕ `FE_ARCHITECTURE` ↕ `STATE_MAPPING` ↕ `DATA_FLOW` ↕ `API_REFERENCE` ↕ `AUTH_RBAC_MAP` ↕ `ROUTE_PERMISSION_MAP` ↕ `UI_REQUIREMENTS` ↕ tài liệu này.

**Không phát hiện conflict/inconsistency nào giữa các file KB và spec này** ở phạm vi đã đọc — mọi nội dung ở spec này được suy ra TRỰC TIẾP và NHẤT QUÁN với nội dung đã có ở 13 file KB, không có trường hợp nào 2 file KB tự mâu thuẫn nhau về cùng 1 sự kiện.

**1 điểm cần lưu ý** (không phải conflict, mà là khoảng trống chưa cross-reference tường minh trước đây): `UI_REQUIREMENTS.md` mục "Users" ghi "sort theo field có trong `GetUsersQueryDTO` (không có `sortBy` tường minh trong DTO này... UNKNOWN nếu cần sort tuỳ ý)" — spec này (Mục 16 Table Architecture) áp dụng nguyên tắc chung "chỉ hiển thị sort option trong whitelist DTO" cho MỌI domain, nghĩa là domain Users sẽ KHÔNG có UI chọn sort tuỳ ý (khác Documents có whitelist rõ 6 field) cho tới khi xác nhận lại DTO thật lúc code FE-04 — đây là suy luận nhất quán từ quy tắc chung, KHÔNG phải phát hiện conflict mới, chỉ ghi rõ để không bị bỏ sót khi implement.

Theo đúng yêu cầu spec gốc: **không tự sửa** nội dung 13 file KB hiện có dựa trên phát hiện này — chỉ ghi nhận ở đây.

---

## 31. Liên kết

`FE_CONTEXT.md` (entry point) · `FE_ARCHITECTURE.md` · `API_REFERENCE.md` · `AUTH_RBAC_MAP.md` · `DOCUMENT_DOMAIN_MAP.md` · `ROUTE_PERMISSION_MAP.md` · `STATE_MAPPING.md` · `DATA_FLOW.md` · `UI_REQUIREMENTS.md` · `ERROR_HANDLING.md` · `SHARED_COMPONENTS_LIBRARY.md` · `FRONTEND_MEMORY.md` · `FE_KNOWLEDGE_BASE_AUDIT.md`
