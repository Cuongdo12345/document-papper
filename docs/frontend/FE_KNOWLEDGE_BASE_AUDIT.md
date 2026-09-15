# FE Knowledge Base Audit

> Audit sau khi tạo bộ Frontend Knowledge Base (2026-09-03). Không sửa backend/OpenAPI. Không viết FE code.

## Coverage

```text
[x] Authentication          — AUTH_RBAC_MAP.md Mục 1
[x] RBAC                    — AUTH_RBAC_MAP.md Mục 2-3
[x] Users                    — API_REFERENCE.md, UI_REQUIREMENTS.md
[x] Departments               — API_REFERENCE.md, UI_REQUIREMENTS.md
[x] Documents                  — DOCUMENT_DOMAIN_MAP.md (đầy đủ nhất, domain trung tâm)
[x] Workflow/Approval            — DOCUMENT_DOMAIN_MAP.md Mục 5, API_REFERENCE.md
[x] Assets/Asset Categories/       — API_REFERENCE.md, UI_REQUIREMENTS.md
    Medical Devices
[x] Dashboard                        — API_REFERENCE.md (kèm cảnh báo thiếu validate query)
[x] Audit                             — API_REFERENCE.md, UI_REQUIREMENTS.md
[x] Import/Export                      — API_REFERENCE.md, UI_REQUIREMENTS.md
[x] Upload                               — API_REFERENCE.md, ERROR_HANDLING.md (ngoại lệ error shape)
[x] Notifications                         — API_REFERENCE.md
[x] Error handling                          — ERROR_HANDLING.md
[x] Pagination/Filter/Sort                    — rải rác theo từng domain trong API_REFERENCE.md +
                                                 DOCUMENT_DOMAIN_MAP.md Mục 4 (bảng riêng cho Documents)
[x] API (tổng hợp)                              — API_REFERENCE.md
```

## Generated Files

```
docs/frontend/FE_CONTEXT.md
docs/frontend/FE_ARCHITECTURE.md
docs/frontend/API_REFERENCE.md
docs/frontend/AUTH_RBAC_MAP.md
docs/frontend/DOCUMENT_DOMAIN_MAP.md
docs/frontend/ROUTE_PERMISSION_MAP.md
docs/frontend/STATE_MAPPING.md
docs/frontend/DATA_FLOW.md
docs/frontend/UI_REQUIREMENTS.md
docs/frontend/ERROR_HANDLING.md
docs/frontend/SHARED_COMPONENTS_LIBRARY.md
docs/frontend/FRONTEND_MEMORY.md
docs/frontend/FE_KNOWLEDGE_BASE_AUDIT.md (file này)
```

13/13 file theo đúng "Expected Final Structure" yêu cầu.

## Backend ↔ FE Findings

### API inconsistencies / undocumented behavior
1. Response shape không đồng nhất 100% giữa domain — 4 dạng khác nhau quan sát được (`API_REFERENCE.md` phần đầu chưa liệt kê riêng, chi tiết ở `ERROR_HANDLING.md` Mục 2 + ghi chú rải rác `API_REFERENCE.md`).
2. Domain Upload — lỗi 404/403 không qua `error.middleware.ts` chuẩn, shape khác biệt hoàn toàn (`ERROR_HANDLING.md` Mục 4).
3. Dashboard — 12 endpoint hoàn toàn KHÔNG có `validateQuery`/Zod DTO, khác biệt rõ rệt so với phần còn lại hệ thống đã được chuẩn hoá kỹ (DEV-008/DEV-013...).
4. `details` trong error response có **2 shape khác nhau** tuỳ nguồn lỗi (Zod `ZodIssue[]` có `path` vs Mongoose string[] không `path`) — CONFIRMED qua source, không phải suy đoán.

### Permission gaps
5. `USER_VIEW`/`USER_VIEW_DETAIL` — 0 role hiện giữ, khiến `/users*` là ADMIN-only trên thực tế dù thiết kế generic.
6. `DELETE /documents/delete-by-month` — thiếu ADMIN-only guard, role `IT` (non-ADMIN) vẫn soft-delete hàng loạt được.
7. ABAC (Policy CRUD permission `POLICY_*`) hoạt động ở tầng lưu trữ nhưng KHÔNG có route nào áp dụng runtime (`enablePolicies` chưa bật ở đâu).

### Validation gaps
8. Dashboard (đã nêu ở #3) — rủi ro nhận input sai lặng lẽ thay vì 400 rõ ràng.

### Response inconsistencies
9. Đã liệt kê ở #1, #2.

### Potential FE risks
10. **Không có HTTP/E2E test nào ở backend** — toàn bộ hiểu biết trong bộ tài liệu này đến từ đọc source code + OpenAPI, CHƯA từng verify bằng request thật. Nếu hành vi thực tế (đặc biệt edge case) khác với đọc code, FE sẽ phát hiện muộn hơn (lúc code thật, không phải lúc đọc tài liệu).
11. `refreshToken` không rotate + lưu localStorage (không cookie httpOnly) — rủi ro bảo mật client-side cố hữu từ thiết kế backend, FE không khắc phục được mà không đổi backend.
12. `workflow.steps[].role` là string tự do (không ref Role thật) — form tạo template có thể tạo ra step với `role` không khớp bất kỳ Role nào tồn tại, không có lỗi nào báo (rơi vào "không ai duyệt được step đó" một cách âm thầm).

## Recommendations (chỉ cho FE)

1. Viết `unwrapResponse`/`parseApiError` linh hoạt xử lý ≥4 shape response/2 shape error đã quan sát — KHÔNG giả định 1 dạng duy nhất (Mục Findings #1, #4).
2. Tự validate `month`/`year`/`daysAhead`/`daysThreshold` phía client cho toàn bộ Dashboard TRƯỚC khi gọi API (Mục Findings #3, #8).
3. Ẩn/giới hạn UI cho `delete-by-month` và trang Policy (Beta) theo Mục Findings #6, #7 — dù backend permission không chặn.
4. Xác nhận với user (không tự quyết) trước khi code trang Users cho non-ADMIN — hiện 100% sẽ 403 (Mục Findings #5).
5. Khi bắt đầu FE-01 (hoặc task code đầu tiên), nên thực hiện 1 vòng gọi thử API THẬT (Postman/curl tối thiểu cho luồng Auth + 1-2 domain chính) để bù đắp khoảng trống #10 trước khi tin tưởng tuyệt đối vào tài liệu tĩnh này.
6. Trước khi implement, xác nhận lại: phạm vi MVP, styling foundation (Tailwind/shadcn), route `/register` public hay không — 3 quyết định vẫn UNKNOWN/CHƯA CHỐT (`FRONTEND_MEMORY.md` Mục 7).

## Confidence

| Domain | Confidence | Lý do |
|---|---|---|
| Authentication | HIGH | Toàn bộ flow đọc trực tiếp source, không có phần suy đoán |
| RBAC | HIGH | Permission catalog + role map đọc trực tiếp, đầy đủ |
| Documents/Workflow | HIGH | Domain đọc sâu nhất, có evidence business rule cụ thể (DEV-005 lịch sử) |
| Users/Departments | HIGH | DTO + route đọc trực tiếp |
| Assets/Asset Category/Medical Device | MEDIUM-HIGH | Đã đọc DTO chính + route/permission đầy đủ, nhưng CHƯA đọc sâu response shape chi tiết từng field (vd `MedicalDeviceProfile` schema đầy đủ) |
| Dashboard | MEDIUM | Endpoint/permission chắc chắn, nhưng thiếu validate khiến hành vi input-sai khó dự đoán chính xác 100% (đã ghi UNKNOWN đúng chỗ) |
| Audit Logs | HIGH | DTO đọc trực tiếp, đầy đủ |
| Upload | HIGH | Đã đọc kỹ (kể cả ngoại lệ error shape) |
| Excel Import/Export | MEDIUM | Đã có info cấu trúc/giới hạn chính, nhưng chưa đọc toàn bộ response shape `result.errors[]`/`preview[]` field-by-field |
| Notifications | MEDIUM | Model field đã có, nhưng chưa đọc route/service chi tiết filter (nếu có) |
| Error Handling | HIGH | Đọc trực tiếp `error.middleware.ts`/`validate.middleware.ts`/`ApiError.ts` — không suy đoán |

## Cross-check kết luận

`OpenAPI ↕ Backend source ↕ Backend documentation ↕ FE Knowledge Base` — không phát hiện conflict lớn (`OPENAPI_CONTRACT` khác `SOURCE_CODE_BEHAVIOR`) ở phạm vi đã đọc. Các điểm lệch tìm được đều là **hành vi runtime chưa được OpenAPI mô tả** (thiếu guard, thiếu validate) chứ không phải OpenAPI sai path/method — nhất quán với việc OpenAPI đã được nhiều DEV-XXX (DEV-012, DEV-013...) chủ động đồng bộ trong quá trình Development Stage.

**Giới hạn của audit này**: không đọc 100% mọi file model/service/DTO trong backend (theo đúng nguyên tắc tối ưu token của task) — tập trung vào các domain/luồng có khả năng ảnh hưởng thiết kế FE cao nhất. Các phần MEDIUM confidence ở trên nên được đọc sâu hơn khi task FE cụ thể của domain đó bắt đầu (vd đọc kỹ `MedicalDeviceProfile` schema khi code FE-10 phần Medical Device).
