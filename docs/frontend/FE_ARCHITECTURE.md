# FE ARCHITECTURE

> `FRONTEND_RECOMMENDATION`. Stack chỉ 1 mục đã CHỐT với user (Mục 1) — phần còn lại là đề xuất chờ xác nhận.

## 1. Stack

| Hạng mục | Lựa chọn | Trạng thái |
|---|---|---|
| Framework | React 18 + Vite + TypeScript | **ĐÃ CHỐT** (user xác nhận qua AskUserQuestion trước UI-00) |
| Routing | React Router v6 | Đề xuất |
| Server state | React Query (`@tanstack/react-query`) | Đề xuất |
| Client state | Zustand (chỉ auth + UI state — xem `STATE_MAPPING.md`) | Đề xuất |
| HTTP | Axios | Đề xuất |
| Styling | Tailwind CSS (+ shadcn/ui cho component phức tạp: Table/Select/DatePicker/Modal) | Đề xuất, **CHƯA CHỐT** — không phải Ant Design (design ngôn ngữ riêng mạnh, khó tuỳ biến, bundle nặng hơn nhu cầu 1 app nội bộ) |
| Type generation | Cân nhắc `openapi-typescript` sinh type từ `openAPI.yaml` thay vì viết tay | Đề xuất, quyết định cụ thể khi bắt đầu FE-00 |

Lý do KHÔNG chọn Ant Design/MUI: app nội bộ, không cần theo 1 ngôn ngữ thiết kế sẵn có thương hiệu riêng; Tailwind+shadcn cho phép áp token tuỳ biến (màu/spacing) mà không kéo theo bundle runtime nặng của 1 bộ component đầy đủ tính năng không dùng hết.

## 2. Layer breakdown

```
UI Layer (components/features/pages)
   ↓ gọi
Hook Layer (useXxxQuery/useXxxMutation — React Query)
   ↓ gọi
API Layer (api/<domain>.api.ts — 1 file/domain, hàm thuần gọi axios)
   ↓ dùng chung
Axios instance (interceptor request/response — auth, error normalize)
   ↓
Backend API (nguồn sự thật — xem API_REFERENCE.md)

Song song:
Auth Layer (Zustand auth store + ProtectedRoute + PermissionGuard)
Routing Layer (React Router config — xem ROUTE_PERMISSION_MAP.md)
Component Layer (SHARED_COMPONENTS_LIBRARY.md — dùng chung mọi feature)
Utility Layer (unwrapResponse, parseApiError, formatDate, escapeHtml hiển thị...)
Types Layer (sinh từ OpenAPI hoặc viết tay khớp DTO backend)
```

**Nguyên tắc phân lớp**: component KHÔNG gọi axios trực tiếp — luôn qua Hook Layer. Hook Layer KHÔNG chứa logic UI (loading/error rendering) — chỉ trả `{data, isLoading, isError, error}` cho component tự quyết định render.

## 3. Cấu trúc thư mục đề xuất

```
frontend/
├── src/
│   ├── api/              # 1 file/domain: documents.api.ts, users.api.ts, assets.api.ts...
│   ├── features/         # feature-based, mỗi domain 1 thư mục con
│   │   ├── auth/ documents/ workflow/ users/ departments/ rbac/
│   │   ├── assets/ upload/ notifications/ audit-logs/ dashboard/
│   ├── components/       # dùng chung, KHÔNG thuộc riêng 1 feature (SHARED_COMPONENTS_LIBRARY.md)
│   ├── layouts/           # AppLayout (sidebar+header), AuthLayout
│   ├── routes/             # route config + ProtectedRoute
│   ├── stores/             # authStore.ts, uiStore.ts (Zustand)
│   ├── hooks/               # usePermission, useDebounce... (không thuộc riêng feature)
│   ├── types/                 # sinh từ OpenAPI hoặc viết tay
│   ├── constants/               # copy PERMISSIONS, DocumentCategory/SubType, AssetStatus... khớp backend
│   ├── utils/                     # unwrapResponse, parseApiError, formatDate...
│   ├── config/                      # env, baseURL
│   └── main.tsx
├── public/
└── vite.config.ts
```

Lý do feature-based: 15 domain backend độc lập, mức độ phức tạp khác nhau — gom theo domain giữ mỗi thay đổi (PR/task) đụng đúng 1 thư mục.

## 4. Không cần thiết (ghi nhận, tránh over-engineer)

- Không cần state machine library (XState...) — số trạng thái/luồng hiện tại (workflow 5 status, asset 6 status) đủ đơn giản để quản lý bằng enum + React Query, chưa cần công cụ chuyên biệt.
- Không cần GraphQL client — backend REST/JSON thuần, không có GraphQL endpoint nào.
- Không cần SSR/Next.js — app nội bộ sau login, không cần SEO, thêm framework server-side là over-engineer không cần thiết.
- Không cần i18n library — hệ thống chỉ tiếng Việt (toàn bộ message backend đã tiếng Việt cứng, không có cơ chế đa ngôn ngữ).
