# DOCUMENT DOMAIN MAP

> Domain quan trọng nhất của hệ thống. Nguồn: `backend/src/models/documents/document.model.ts`, `services/documents/document.service.ts`, `documents.constants.ts`, `dto/documents/documents.dto.ts`, `shared/constants/documentRules.ts`, `services/documents/workflow.service.ts`, `docs/00_PROJECT_MEMORY.md` (mục DEV-005). Xác minh trực tiếp source 2026-09-03.

---

## 1. Category / SubType (đầy đủ, từ source thật)

```text
DocumentCategory:
  PROPOSAL   — Đề xuất (cần duyệt qua Workflow)
  REPORT     — Biên bản (thường tham chiếu ngược 1 PROPOSAL)
  REFERENCE  — Tài liệu tham khảo (KHÔNG cần duyệt, KHÔNG referenceTo)

DocumentSubType:
  PROPOSE_REPAIR       (category=PROPOSAL) — Đề xuất sửa chữa, BẮT BUỘC relatedAsset
  PROPOSE_INK          (category=PROPOSAL) — Đề xuất mực in
  PROPOSE_PROCUREMENT  (category=PROPOSAL) — Đề xuất mua sắm
  CHECK_DAMAGE         (category=REPORT)   — Biên bản kiểm tra hư hỏng
  CONFIRM_STATUS       (category=REPORT)   — Biên bản xác nhận tình trạng
  MANUAL               (category=REFERENCE)— Tài liệu hướng dẫn/kỹ thuật, có thể gắn relatedAsset (optional)
```

**UI select cho `subType` phải lọc theo `category` đã chọn trước** — không hiển thị `CHECK_DAMAGE` khi `category=PROPOSAL`.

## 2. Business Rules đã CONFIRMED (evidence trực tiếp source, KHÔNG suy diễn)

| Rule | Evidence | Chi tiết |
|---|---|---|
| `PROPOSE_REPAIR` bắt buộc `relatedAsset` | `document.service.ts:96-101` | Validate ở SERVICE (không phải Zod DTO) vì phụ thuộc `subType` — FE cũng nên validate tương tự (field bắt buộc CÓ ĐIỀU KIỆN theo subType đã chọn) trước khi submit, dù backend là nguồn xác nhận cuối cùng |
| Không tạo `PROPOSE_REPAIR` cho Asset `DISPOSED`/`LOST` | `document.service.ts:112-119` | Form tạo đề xuất sửa chữa nên lọc/disable Asset ở 2 trạng thái này trong dropdown chọn `relatedAsset` |
| Không tạo TRÙNG đề xuất sửa chữa khi Asset đã có 1 đề xuất `PROPOSE_REPAIR` khác **chưa duyệt xong** | `document.service.ts:121-129`, hàm `findPendingRepairProposalForAsset` | Backend trả `400` kèm `documentCode` của đề xuất đang pending — FE nên hiển thị rõ message này (đã an toàn hiển thị), có thể link sang đề xuất đó |
| ⚠️ **1 REPORT chỉ tham chiếu ĐÚNG 1 PROPOSAL** (`referenceTo`, quan hệ 1-1) | `documents.dto.ts:10-17` — DB vẫn là mảng `[ObjectId]` nhưng ràng buộc tối đa 1 phần tử ở tầng application | FE dùng Select đơn (không phải multi-select) cho `referenceTo` khi tạo REPORT |
| **Business rule quan trọng nhất — cặp Proposal↔Report đúng khi duyệt xong tự động sync Asset**: `PROPOSE_REPAIR ↔ CHECK_DAMAGE` | `workflow.service.ts:130` (`syncAssetOnDocumentApproved`), đã sửa qua DEV-005 sau 2 lần xác nhận với chủ dự án | Khi 1 Document `subType=CHECK_DAMAGE` được duyệt xong, Asset liên quan (qua proposal gốc) tự động đổi trạng thái (`resolveAssetMaintenanceService`, field `meta.repairResult`). **`PROPOSE_INK`/`CONFIRM_STATUS` KHÔNG liên quan gì tới `Asset.status`** — dễ nhầm vì tên nghe giống, PHẢI dùng đúng cặp `CHECK_DAMAGE`, không phải `CONFIRM_STATUS`, khi thiết kế form Report cho luồng sửa chữa thiết bị |
| `DOCUMENT_UPDATE_WHITELIST = ["title", "meta"]` | `documents.constants.ts` | `PUT /api/documents/:id` CHỈ chấp nhận đúng 2 field này — gửi field khác (kể cả `department`/`category`/`subType`) → `400 "Field không hợp lệ"`. Form Edit Document chỉ nên có 2 field này |
| Khoá sửa khi `workflowStatus` là `approved` HOẶC `completed` (không phải ADMIN) | `document.service.ts:352-364` | Form Edit nên tự disable/ẩn khi biết trước `workflowStatus` thuộc 2 giá trị này (UX, backend vẫn là chốt chặn cuối) |
| Khoá sửa document khác phòng ban (không phải ADMIN) | `document.service.ts:340-349` | Ẩn nút Edit nếu `document.department !== currentUser.department` và user không phải ADMIN |
| Soft-delete Document CHẶN nếu `WorkflowInstance` liên quan còn `pending` | DEV-016, `document.service.ts:449-454` | Nút Delete nên disable/cảnh báo nếu Document đang có workflow pending |
| Xoá hàng loạt theo tháng (`delete-by-month`) là **SOFT-DELETE** (DEV-006, không phải xoá vĩnh viễn) | `document.service.ts:487+` | UI nên ghi rõ "ẩn khỏi danh sách" thay vì "xoá vĩnh viễn" để không gây hiểu lầm |
| ⚠️ `DELETE /delete-by-month` hiện KHÔNG có guard ADMIN-only ở route (chỉ cần permission `DOCUMENT_DELETE`, role `IT` cũng có) | Đã ghi ở `docs/30_DEVELOPMENT_COMPLETION_AUDIT.md` Mục 3, còn OPEN | `FRONTEND_RECOMMENDATION`: tự giới hạn hiển thị nút bulk-delete-by-month chỉ cho ADMIN ở UI, dù backend hiện chưa chặn — giảm rủi ro thao tác nhầm |
| `documentCode` sinh tự động (`generateDocumentCode`), KHÔNG nhập tay | `shared/utils/generateDocumentCode.ts` | Không có field nhập `documentCode` ở form Create — hiển thị read-only sau khi tạo |

## 3. API Documents — tổng hợp (chi tiết đầy đủ ở `API_REFERENCE.md`)

| Method | Path | Permission | Business rule áp dụng |
|---|---|---|---|
| POST | `/api/documents/proposal` | `DOCUMENT_CREATE` | Tạo Document category=PROPOSAL; validate `relatedAsset` nếu `PROPOSE_REPAIR` |
| GET | `/api/documents` | `DOCUMENT_VIEW` | List, filter theo `FILTERABLE_DOCUMENT_FIELDS`, pagination+sort — xem Mục 4 |
| GET | `/api/documents/:id` | `DOCUMENT_VIEW_DETAIL` | Chi tiết 1 Document |
| PUT | `/api/documents/:id` | `DOCUMENT_UPDATE` | CHỈ `title`/`meta`, khoá theo workflowStatus/department (Mục 2) |
| DELETE | `/api/documents/:id` | `DOCUMENT_DELETE` | Soft-delete đơn lẻ, chặn nếu còn reference active |
| DELETE | `/api/documents/delete-by-month` | `DOCUMENT_DELETE` | Soft-delete hàng loạt theo `month`/`year`/filter, ⚠️ thiếu ADMIN-only (Mục 2) |
| PATCH | `/api/documents/restore/:id` | `DOCUMENT_UPDATE` | Khôi phục Document đã soft-delete |
| GET | `/api/documents/:proposalId/reports` | `DOCUMENT_VIEW` | Lấy toàn bộ REPORT tham chiếu tới 1 PROPOSAL cụ thể — dùng cho trang chi tiết Proposal hiển thị "Biên bản liên quan" |

## 4. Query params `GET /api/documents` (từ `QueryDocumentDTO`)

| Param | Kiểu | Ghi chú |
|---|---|---|
| `page` | number, default 1 | |
| `limit` | number, default 10, max 100 | |
| `sortBy` | enum: `createdAt\|updatedAt\|title\|documentCode\|serviceDate\|actualCost`, default `createdAt` | Whitelist cứng — FE chỉ hiển thị sort option trong danh sách này |
| `order` | `asc\|desc`, default `desc` | |
| `keyword` | string, max 100 | Search full-text (title/documentCode qua text index) |
| `isActive` | `"true"\|"false"` string, optional | Không truyền → mặc định `true` (chỉ hiện chưa xoá) |
| `category`, `subType` | enum tương ứng, optional | |
| `department`, `createdBy`, `relatedAsset` | ObjectId, optional | |
| `workflowStatus` | enum: `pending\|approved\|rejected\|cancelled\|completed`, optional | |
| `fromDate`, `toDate` | ISO date string, optional | |

Response: `{success:true, data: Document[], pagination:{page,limit,total,totalPages}}`.

## 5. Workflow liên kết (chi tiết đầy đủ ở domain riêng — xem `API_REFERENCE.md` nhóm Workflow)

```
Document (category=PROPOSAL, workflowStatus="pending" mặc định khi tạo)
   ↓ POST /api/workflows/submit {documentId, templateId}
WorkflowInstance (status="pending", steps[] theo template)
   ↓ POST /api/workflows/:id/approve (từng step, role-per-step free string)
   ↓ ... (nhiều step)
WorkflowInstance.status = "approved" | "rejected"
   ↓ (nếu approved VÀ document.subType === CHECK_DAMAGE)
Asset.status tự động cập nhật (syncAssetOnDocumentApproved)
   ↓ POST /api/workflows/:id/complete (đóng hẳn quy trình sau khi việc thực tế xong)
WorkflowInstance.status = "completed", Document.workflowStatus = "completed"
```

FE trang chi tiết Document nên hiển thị TRẠNG THÁI KÉP: `Document.workflowStatus` (dùng cho filter/danh sách) VÀ chi tiết từng step của `WorkflowInstance` (dùng cho màn hình duyệt) — 2 nguồn dữ liệu khác nhau, không trộn lẫn.

## 6. Index quan trọng (ảnh hưởng UX, không phải UI requirement trực tiếp)

- `{title:"text", documentCode:"text"}` — search `keyword` dùng MongoDB text search, không phải regex — kết quả sort theo relevance nếu không chỉ định `sortBy` khác.
- `{department:1, subType:1, createdAt:-1}` và `{isActive:1, deletedAt:1, createdAt:-1}` — filter theo các field này (kèm sort mặc định `createdAt desc`) sẽ nhanh; filter theo field KHÔNG có trong index (vd chỉ `keyword` không kèm gì khác) có thể chậm hơn với dataset lớn — không phải blocker UI, chỉ là kỳ vọng hiệu năng thực tế.

## 7. Known Gaps / Conflicts

- Không phát hiện conflict giữa OpenAPI và source cho domain Documents trong lần xác minh này (`OPENAPI_CONTRACT` khớp `SOURCE_CODE_BEHAVIOR`).
- 1 `SOURCE_CODE_BEHAVIOR` cần lưu ý: bulk-delete-by-month thiếu ADMIN-only guard (Mục 2) — OpenAPI không thể hiện điều này (OpenAPI chỉ mô tả contract, không mô tả thiếu sót authorization).
