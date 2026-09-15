# STATE MAPPING

> `FRONTEND_RECOMMENDATION` toàn bộ tài liệu này — phân loại state dựa trên bản chất dữ liệu backend (server-owned vs client-only), không phải quyết định đã chốt code.

## 1. Server State (React Query — KHÔNG đưa vào Zustand)

Mọi dữ liệu có nguồn gốc từ 1 trong ~90 endpoint (`API_REFERENCE.md`) đều là server state:

| Domain | Query key gợi ý | Ghi chú cache |
|---|---|---|
| Documents | `["documents","list",params]`, `["documents","detail",id]`, `["documents","reports",proposalId]` | Invalidate cả `list` lẫn `detail` sau mutation update/delete/restore |
| Workflow | `["workflow","pending",params]`, `["workflow","instance",id]`, `["workflow","byDocument",documentId]` | Approve/reject/cancel/complete → invalidate cả `workflow.*` VÀ `documents.detail(documentId)` (2 domain liên kết) |
| Users | `["users","list",params]`, `["users","detail",id]`, `["users","me"]` | `me` invalidate riêng sau `PATCH /users/me`/`change-password` |
| Departments | `["departments","list",params]`, `["departments","detail",id]` | |
| RBAC | `["rbac","permissions",...]`, `["rbac","roles",...]`, `["rbac","policies",...]` | Đổi role/permission 1 user → cân nhắc invalidate `users.*` liên quan (permission cache backend có độ trễ vài giây, xem `AUTH_RBAC_MAP.md`) |
| Assets | `["assets","list",params]`, `["assets","detail",id]`, `["assets","assignmentHistory",id]` | assign/transfer/return → invalidate `detail`+`assignmentHistory`+`list` |
| Asset Categories | `["assetCategories","list",params]` | |
| Medical Devices | `["medicalDevices","profile",assetId]`, `["medicalDevices","calibrationRecords",assetId]` | |
| Notifications | `["notifications","list"]`, `["notifications","unreadCount"]` | `unreadCount` nên `refetchInterval` ngắn (polling) hoặc invalidate mỗi khi vào trang Notifications |
| Audit Logs | `["auditLogs","list",params]`, `["auditLogs","dashboard",params]` | |
| Dashboard | `["dashboard","adminSummary"]`, `["dashboard","kpi",kpiName,params]`, ... (12 key riêng theo endpoint) | Dashboard filter (month/year/department) đưa vào query key, KHÔNG vào Zustand |
| Upload | `["uploads","list",params]`, `["uploads","detail",id]` | |
| Excel Import/Export | Import history: `["excelImport","history",params]` | Export/Import THAO TÁC (không phải GET list) dùng mutation, không cache |

**Nguyên tắc chung**: filter/sort/pagination của MỌI danh sách đưa vào query key (React Query tự cache riêng theo tổ hợp params) — KHÔNG lưu filter hiện tại của 1 trang cụ thể vào Zustand global (trừ trường hợp cần PERSIST filter qua lần reload trang — xem Mục 2).

## 2. Client State (Zustand)

> ✅ **IMPLEMENTED tại FE-01**: `stores/authStore.ts` (2.1) + `stores/uiStore.ts` (2.2 — `sidebarCollapsed` persist localStorage, `mobileNavOpen` không persist) đúng như thiết kế dưới đây. Thêm 1 store KHÔNG có trong thiết kế gốc: `stores/toastStore.ts` (toast/notification tạm thời, transient, không persist — thuộc nhóm UI state, tự viết nhẹ thay vì thêm dependency, xem `docs/frontend/tasks/FE-01.md`).

**CHỈ 2 nhóm, không hơn:**

### 2.1 Auth/Session store
```
{
  accessToken: string | null       // in-memory, mất khi reload (phải refresh lại)
  user: User | null                // từ GET /users/me sau login
  isAuthenticated: boolean          // derived
  login(), logout(), setUser()
}
```
`refreshToken` KHÔNG nằm trong Zustand — lưu trực tiếp `localStorage` (đọc/ghi qua API layer, không qua store, tránh re-render không cần thiết khi token đổi).

### 2.2 UI state store
```
{
  sidebarCollapsed: boolean
  theme: "light" | "dark" | "system"
  // filter PERSIST qua reload (nếu cần, KHÔNG bắt buộc P0) — vd filter mặc định
  // của trang Documents mà user muốn giữ giữa các lần ghé thăm — đây là NGOẠI
  // LỆ duy nhất filter được phép vào Zustand, và CHỈ dùng làm default value ban
  // đầu cho React Query key, KHÔNG thay thế React Query.
}
```

**KHÔNG đưa vào Zustand**: bất kỳ list/detail data nào từ API (đó là server state), loading/error state của 1 request cụ thể (React Query tự quản lý), giá trị form đang nhập (local component state, Mục 3).

## 3. Local Component State

- Form đang nhập (create/edit) — dùng state cục bộ của form (React Hook Form hoặc `useState`, quyết định cụ thể ở FE-03).
- Modal/Drawer đang mở/đóng — state cục bộ nơi trigger, KHÔNG global trừ khi 1 Modal cần mở từ nhiều nơi khác nhau trong app (hiếm, xử lý riêng nếu phát sinh).
- UI tạm thời (đang hover, đang kéo-thả, step hiện tại của 1 wizard nhiều bước) — state cục bộ.

## 4. Sơ đồ tổng hợp

```
┌─────────────────────────────────────────────┐
│ Zustand (session + ui)                       │  ← nhỏ, sống lâu (persist localStorage
│  auth: {accessToken, user}                    │    cho theme/sidebar, KHÔNG persist
│  ui:   {sidebarCollapsed, theme}              │    accessToken)
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ React Query (server state)                    │  ← nguồn CHÍNH cho toàn bộ dữ liệu
│  documents.*, workflow.*, users.*, assets.*   │    nghiệp vụ, tự cache/refetch/invalidate
│  dashboard.*, notifications.*, ...             │
└─────────────────────────────────────────────┘
┌─────────────────────────────────────────────┐
│ Local component state                          │  ← form nháp, modal open/close
└─────────────────────────────────────────────┘
```
