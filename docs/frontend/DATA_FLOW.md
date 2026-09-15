# DATA FLOW

> `FRONTEND_RECOMMENDATION` — mô tả luồng dữ liệu đề xuất, khớp `STATE_MAPPING.md`/`API_LAYER` đã phân tích, chưa implement.

## 1. Luồng đọc dữ liệu (query)

```
UI (component)
 ↓ render, cần data
Page/Feature component
 ↓ gọi hook
useXxxQuery(params)                (React Query hook, ví dụ useDocumentsQuery)
 ↓
queryFn → api/documents.api.ts → axios instance
 ↓
Axios request interceptor: gắn Authorization: Bearer <accessToken>
 ↓
Backend API (route → middleware → controller → service → model → DB)
 ↓
Response 200 {success,message?,data,pagination?}
 ↓
Axios response interceptor: (chỉ can thiệp khi lỗi — xem Mục 3)
 ↓
unwrapResponse() → chuẩn hoá về {data, pagination?}
 ↓
React Query cache (theo query key)
 ↓
Component nhận {data, isLoading, isError, error}
 ↓
Render: loading → skeleton | error → ErrorState | data.length===0 → EmptyState | có data → render thật
```

## 2. Luồng ghi dữ liệu (mutation)

```
User action (submit form / click button)
 ↓
useXxxMutation() (React Query mutation)
 ↓
mutationFn → api layer → axios (POST/PUT/PATCH/DELETE)
 ↓
Backend xử lý (validate DTO → service → model → DB)
 ↓
Thành công 200/201
 ↓
onSuccess: queryClient.invalidateQueries(["<domain>"]) (list + detail liên quan)
 ↓
Toast "Thành công" + đóng Modal/Drawer + (điều hướng nếu cần, vd tạo xong → chuyển sang trang detail)

Thất bại 4xx/5xx
 ↓
onError: parseApiError(err) (xem ERROR_HANDLING.md Mục 4)
 ↓
Hiển thị lỗi TẠI FORM (field-level nếu có details.path) hoặc Toast (lỗi chung, vd 403/500)
```

## 3. Auth flow (đầy đủ, khớp `AUTH_RBAC_MAP.md`)

```
User nhập username/password → POST /auths/login
 ↓ 200
{accessToken, refreshToken, user}
 ↓
accessToken → Zustand (in-memory)
refreshToken → localStorage
user → Zustand + React Query cache ["users","me"] (seed sẵn, tránh gọi lại /users/me ngay)
 ↓
Redirect /dashboard (hoặc route đích nếu có redirect-after-login)

--- Mọi request tiếp theo ---
Request → interceptor gắn Authorization: Bearer accessToken

--- Access token hết hạn (8 giờ) ---
Request → 401
 ↓
Interceptor: đã retry request này chưa?
 chưa → giữ 1 "refresh lock" promise dùng chung cho MỌI request 401 đồng thời
      → POST /auths/refresh-token {refreshToken}
         200 → accessToken mới → lưu Zustand → retry TẤT CẢ request đang chờ (không chỉ request đầu tiên)
         401 (refresh token cũng hết hạn/revoked) → LOGOUT (Mục 4)
 đã retry rồi → LOGOUT (tránh vòng lặp vô hạn)

--- User bấm Logout ---
POST /auths/logout (revoke server-side) → dù thành công hay lỗi đều:
 xoá accessToken (Zustand), xoá refreshToken (localStorage), xoá React Query cache liên quan user
 → redirect /login
```

## 4. Luồng đặc thù — Workflow approve (liên domain)

```
Trang /documents/:id (Document đang workflowStatus="pending")
 ↓ hiển thị đồng thời 2 nguồn:
   useDocumentQuery(id)          → Document.workflowStatus (cho hiển thị badge chung)
   useWorkflowByDocumentQuery(id) → WorkflowInstance.status + steps[] chi tiết (cho UI duyệt từng bước)
 ↓
User (đủ quyền WORKFLOW_APPROVE + đúng role-per-step) bấm "Duyệt"
 ↓
POST /workflows/:id/approve {comment?}
 ↓ 200
invalidateQueries(["workflow", instanceId])
invalidateQueries(["documents","detail", documentId])   ← BẮT BUỘC, vì workflowStatus có thể đổi
invalidateQueries(["assets","detail", relatedAssetId])  ← NẾU document.subType==="CHECK_DAMAGE"
                                                            (backend tự động sync Asset — xem
                                                            DOCUMENT_DOMAIN_MAP.md Mục 2)
```

## 5. Luồng file (upload/download)

```
Upload:
<input type=file multiple> → FormData("files", file[]) → axios POST /upload
 (Content-Type để axios TỰ set multipart boundary, KHÔNG set thủ công)
 → onSuccess: invalidateQueries(["uploads","list"])

Download/Export (Excel):
Click "Xuất Excel" → axios GET .../export {responseType:"blob"}
 → nhận Blob → URL.createObjectURL(blob) → tạo <a download="ten-file.xlsx"> ẩn → click → revokeObjectURL
 (KHÔNG dùng window.open(url) trực tiếp — token phải qua header Authorization,
 không thể nhúng vào URL query an toàn)
```

## 6. Ghi chú

- Mọi luồng trên là **RECOMMENDED**, dựa trên hành vi API đã xác nhận ở `API_REFERENCE.md`/`ERROR_HANDLING.md`/`AUTH_RBAC_MAP.md` — chưa implement, có thể điều chỉnh khi code thật phát sinh chi tiết chưa lường trước.
