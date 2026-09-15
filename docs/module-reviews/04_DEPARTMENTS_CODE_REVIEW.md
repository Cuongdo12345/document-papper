# REVIEW-04 — DEPARTMENTS — CODE REVIEW

> Ngày: 2026-08-30 | Commit tham chiếu: `5b58fb1` | Loại: Module code review (không phải historical Phase 01-13) | KHÔNG sửa source code trong task này.

## 1. Phạm vi

- `backend/src/routes/departments/department.routes.ts`
- `backend/src/controllers/departments/department.controller.ts`
- `backend/src/services/departments/departments.service.ts`
- `backend/src/models/departments/department.model.ts`
- `backend/src/dto/departments/departments.dto.ts`
- Dependency trực tiếp inspect thêm để trả lời câu hỏi orphan reference: `models/users/user.model.ts` (field `department`), `models/documents/document.model.ts` (field `department`), `models/assets/asset.model.ts` (field `department`), `models/assets/assetAssignmentHistory.model.ts` (field `fromDepartment`/`toDepartment`), `shared/constants/permission.constant.ts` (`DEPARTMENT_*`), `middlewares/error.middleware.ts` (đối chiếu hành vi lỗi Mongo duplicate-key).

Tài liệu đã đọc trước: `CLAUDE.md`, `docs/00_PROJECT_MEMORY.md`, `docs/04_DATABASE_ANALYSIS.md` (§4.8 Department + §Relationships + §Index), `docs/07_AUTH_RBAC_ANALYSIS.md`.

## 2. Kiến trúc module (tóm tắt xác nhận từ source)

```
Route (department.routes.ts)
  → authenticate + authorizePermission("DEPARTMENT_*")   [có trên cả 5 route — KHÔNG có validateBody/validateQuery nào]
  → Controller (department.controller.ts) — mỏng, chỉ gọi service
  → Service (departments.service.ts) — chứa toàn bộ validation thủ công + business rule
  → Department model (chỉ 2 field nghiệp vụ: code [unique], name)
```

Model **không có** `isActive`/`deletedAt` — Department chỉ có **hard-delete** (`Department.deleteOne`), không có khái niệm soft-delete ở tầng này.

## 3. Findings

---

### RV04-01 — HIGH — Referential Integrity — Xóa Department để lại orphan reference trên Asset (bắt buộc) và AssetAssignmentHistory

**File**: `backend/src/services/departments/departments.service.ts` — `deleteDepartmentService()` (dòng 179-221)

**Observed Behavior**: Trước khi xóa cứng (`Department.deleteOne`), hàm chỉ kiểm tra 2 tham chiếu:
```ts
const userExists = await User.exists({ department: id, isActive: true });
if (userExists) throw ApiError.badRequest("Không thể xoá khoa vì vẫn còn user thuộc khoa này");

const documentExists = await Document.exists({ department: id });
if (documentExists) throw ApiError.badRequest("Không thể xoá khoa vì vẫn còn document thuộc khoa này");

await Department.deleteOne({ _id: id });
```
Không có bất kỳ check nào với `Asset` hay `AssetAssignmentHistory`, dù cả hai đều có foreign-key thực sự tới `Department`:
```ts
// asset.model.ts
department: { type: Schema.Types.ObjectId, ref: "Department", required: true }
// assetAssignmentHistory.model.ts
fromDepartment: { type: Schema.Types.ObjectId, ref: "Department" },
toDepartment: { type: Schema.Types.ObjectId, ref: "Department" },
```

**Evidence**: `Asset.department` là **`required: true`** (`backend/src/models/assets/asset.model.ts:38-42`) — nghĩa là mọi Asset hiện có PHẢI đang trỏ tới 1 Department nào đó. Nếu Department đó bị xóa, các document `Asset` này lập tức trở thành **orphan reference** (con trỏ tới một `_id` không còn tồn tại) mà không có cơ chế nào ngăn hoặc cảnh báo.

**Impact**:
- `populate("department")` trên các Asset bị ảnh hưởng sẽ trả về `null` một cách âm thầm → UI/API list Asset hiển thị thiếu tên khoa mà không có lỗi rõ ràng.
- Aggregate/dashboard theo Department (đã ghi nhận ở `docs/04_DATABASE_ANALYSIS.md` — `Document.aggregate([...$lookup departments...])`) sẽ bỏ sót các Asset "mồ côi" này khỏi báo cáo theo khoa, gây sai lệch số liệu KPI mà không có exception nào được ném ra.
- Tạo Asset mới cho khoa đó vẫn generate được `assetCode` cũ nếu counter logic không kiểm tra lại — nhưng **không thể sửa/quản lý các Asset cũ đã orphan** một cách nhất quán vì `department` không còn resolve được.
- `AssetAssignmentHistory.fromDepartment/toDepartment` orphan tương tự → lịch sử điều chuyển tài sản mất khả năng truy vết chính xác khoa nguồn/đích.

**Recommendation**: Bổ sung 2 check tương tự (`Asset.exists({department:id})`, `AssetAssignmentHistory.exists({$or:[{fromDepartment:id},{toDepartment:id}]})`) vào `deleteDepartmentService()` trước khi `deleteOne`, cùng pattern với check `User`/`Document` hiện có — đây là **implementation gap trong chính defense pattern module đã tự thiết lập**, không phải thiếu ý tưởng thiết kế (module đã biết phải chặn xóa khi còn tham chiếu, chỉ liệt kê thiếu 2 model).

**Confidence**: HIGH (evidence trực tiếp — required field + không có check nào trong service).

---

### RV04-02 — MEDIUM — Referential Integrity (bổ sung RV04-01) — Check User chỉ xét `isActive:true`, bỏ sót user đã bị vô hiệu hóa

**File**: `backend/src/services/departments/departments.service.ts:193`

**Observed Behavior**:
```ts
const userExists = await User.exists({ department: id, isActive: true });
```
User đã bị `disable()` (soft-delete, `isActive: false`) nhưng vẫn còn `department = id` **không được tính** — Department vẫn có thể bị xóa dù còn user (dù đã vô hiệu hóa) tham chiếu tới nó.

**Impact**: Khi user đó được `restore()` lại (Users module có endpoint `PATCH /restore/:id` — xem REVIEW-03), field `department` của họ trỏ tới 1 Department không còn tồn tại — orphan reference tương tự RV04-01, cộng thêm dữ liệu lịch sử (`UserAudit`, hồ sơ cũ) mất khả năng resolve tên khoa.

**Recommendation**: Bỏ điều kiện `isActive:true` khi check (dùng `User.exists({department:id})` không lọc `isActive`), hoặc nếu chủ đích cho phép xóa khi chỉ còn user inactive thì cần đồng thời "gỡ" `department` khỏi các user đó (set `null`) thay vì để orphan âm thầm — quyết định business rule này cần xác nhận từ chủ dự án (hiện là **UNKNOWN**, không có tài liệu nào mô tả behavior mong muốn).

**Confidence**: HIGH (evidence trực tiếp, logic rõ ràng).

---

### RV04-03 — MEDIUM — Validation — DTO đã viết đầy đủ nhưng KHÔNG được wire vào route (khác pattern "comment out" ở RV02-03/RV03-02/RV03-03)

**File**: `backend/src/routes/departments/department.routes.ts` (toàn bộ file) đối chiếu `backend/src/dto/departments/departments.dto.ts`

**Observed Behavior**: `department.routes.ts` không import `validateBody`/`validateQuery`/`validateParams` ở bất kỳ đâu — không phải bị comment out (như đã thấy ở Users/UserAudit trong REVIEW-03), mà **chưa từng được gắn vào từ đầu**. `CreateDepartmentDTO`, `UpdateDepartmentDTO`, `QueryDepartmentDTO` tồn tại đầy đủ, hợp lệ về mặt Zod, nhưng không được import ở bất kỳ file route/controller/service nào trong module (đã grep xác nhận không có reference).

**Evidence bổ sung — DTO còn lệch với model thực tế**:
- `UpdateDepartmentDTO.isActive: z.boolean().optional()` — model `Department` **không có field `isActive`** → dù có wire DTO vào, field này vẫn là dead field (tương tự RV03-05 ở Users, nhưng ở đây còn chưa từng chạy).
- `CreateDepartmentDTO.description`/`UpdateDepartmentDTO.description` — model **không có field `description`** → cùng vấn đề.

**Impact**: Validation hiện tại hoàn toàn dựa vào check thủ công trong service (`if (!code || !name) throw badRequest`) — không kiểm tra type, độ dài, hay loại bỏ field lạ. Vì Mongoose schema mặc định `strict: true`, mass-assignment thực sự (field lạ ghi vào DB) **không xảy ra** ở `create()` (dùng `Department.create({code, name})` — chỉ lấy đúng 2 field). Nhưng `updateDepartmentService()` truyền thẳng `payload` (toàn bộ `req.body`, không lọc) vào `findByIdAndUpdate(id, payload, {new:true})` — nếu Mongoose strict mode bị vô hiệu hóa ở bất kỳ đâu trong tương lai (schema-level hoặc global `mongoose.set`), đây sẽ là điểm mass-assignment tiềm ẩn không có lớp phòng vệ thứ hai (khác với RBAC — RV02-04 — nơi có double-layer DTO + whitelist).

**Recommendation**: Wire `validateBody(CreateDepartmentDTO)` / `validateBody(UpdateDepartmentDTO)` / `validateQuery(QueryDepartmentDTO)` vào route tương ứng; đồng thời làm sạch DTO khỏi field `isActive`/`description` không tồn tại trên model (hoặc bổ sung field đó vào model nếu đây là business requirement thực sự chưa implement — cần hỏi lại chủ dự án, hiện là **UNKNOWN**).

**Confidence**: HIGH (grep xác nhận không có `validate*` trong routes file; đối chiếu field DTO vs model trực tiếp).

---

### RV04-04 — MEDIUM — Injection / Availability — Regex filter dựng trực tiếp từ input người dùng, không escape (ReDoS)

**File**: `backend/src/services/departments/departments.service.ts:64-78` — `getAllDepartmentsService()`

**Observed Behavior**:
```ts
if (keyword) {
  filter.$or = [
    { code: { $regex: keyword, $options: "i" } },
    { name: { $regex: keyword, $options: "i" } },
  ];
}
if (code) filter.code = { $regex: code, $options: "i" };
if (name) filter.name = { $regex: name, $options: "i" };
```
`keyword`/`code`/`name` (query string từ client) được đưa thẳng vào `$regex` mà **không escape ký tự đặc biệt regex** (`.`, `*`, `+`, `(`, `|`, ...) và không giới hạn độ dài input.

**Impact**: Khác với NoSQL operator injection (ISS-04 — dùng bracket syntax `?field[$ne]=` để CHÈN operator mới), đây là **regex injection/ReDoS**: người dùng có quyền `DEPARTMENT_VIEW` (không cần ADMIN) có thể gửi 1 pattern regex catastrophic-backtracking (vd `?keyword=(a+)+$`) khiến MongoDB tốn CPU cao bất thường khi evaluate trên từng document — với bảng Department nhỏ (theo `docs/04_DATABASE_ANALYSIS.md` §9: "bảng nhỏ, rủi ro thấp") impact thực tế THẤP ở quy mô hiện tại, nhưng là anti-pattern nên sửa vì cùng code pattern có thể được copy sang module khác có bảng lớn hơn.

**Recommendation**: Escape input trước khi đưa vào `$regex` (vd hàm `escapeRegExp()` chuẩn), hoặc giới hạn độ dài `keyword`/`code`/`name` qua DTO (liên hệ RV04-03 — nếu DTO được wire, có thể thêm `.max(100)` ở đây).

**Confidence**: HIGH (evidence trực tiếp — không có bất kỳ escape/sanitize nào trong code).

---

### RV04-05 — LOW — Error Handling — Duplicate `code` khi UPDATE không được pre-check, rơi vào nhánh lộ raw Mongo error (liên hệ RV00-02)

**File**: `backend/src/services/departments/departments.service.ts:144-174` — `updateDepartmentService()`, đối chiếu `backend/src/middlewares/error.middleware.ts:102-109`

**Observed Behavior**: `createDepartmentService()` có pre-check `Department.findOne({code})` trước khi tạo (dòng 27-30) để trả lỗi rõ ràng "Khoa đã tồn tại" (400). `updateDepartmentService()` **không có pre-check tương tự** khi đổi `code` — gọi thẳng `Department.findByIdAndUpdate(id, payload, {new:true})`. Nếu `payload.code` trùng với `code` của 1 Department khác đã tồn tại, MongoDB ném `MongoServerError` (E11000 duplicate key) do unique index trên `code`.

**Evidence**: `error.middleware.ts` không có nhánh riêng cho `MongoServerError`/mã lỗi `11000` — lỗi này không phải `ApiError`, không có `name === "CastError"`/`"ValidationError"`, nên rơi vào nhánh fallback cuối (dòng 102-109): trả **status 500** kèm `message: err.message` — với E11000, message gốc của MongoDB có dạng `E11000 duplicate key error collection: <db>.departments index: code_1 dup key: { code: "..." }`, **lộ tên collection và tên index nội bộ** ra response cho client — đúng pattern đã ghi nhận ở RV00-02 nhưng đây là 1 instance cụ thể, có thể trigger bởi user thường (không cần lỗi hệ thống) chỉ bằng 1 request `PUT /api/departments/:id` hợp lệ về mặt authorization.

**Impact**: Thông tin nội bộ (collection/index name) bị lộ; status code sai (500 thay vì 409 Conflict) khiến client khó phân biệt "lỗi do trùng dữ liệu" (có thể sửa lại request) với "lỗi hệ thống thực sự".

**Recommendation**: Thêm pre-check tương tự `createDepartmentService()` (kiểm tra `code` mới có trùng Department khác không, loại trừ chính `id` đang update) trước khi `findByIdAndUpdate`, HOẶC bắt riêng lỗi `err.code === 11000` trong `error.middleware.ts` để trả 409 với message thân thiện — sửa ở middleware sẽ fix chung cho toàn bộ hệ thống (liên hệ RV00-02), còn sửa ở service chỉ fix riêng module này.

**Confidence**: HIGH (evidence trực tiếp qua đọc code cả 2 file, không cần chạy thử).

---

### RV04-06 — LOW — Audit Trail — Tái sử dụng `UserAudit` cho hành động Department làm giảm khả năng truy vết

**File**: `backend/src/services/departments/departments.service.ts` (cả 4 hàm CREATE/VIEW_DETAIL/UPDATE/DELETE)

**Observed Behavior**: Module Department dùng lại model `UserAudit` (thiết kế cho hành động liên quan tới User) để ghi log, với field `user` được gán bằng chính `userId` của người thực hiện hành động (`user: userId, performedBy: userId` — cùng 1 giá trị ở cả 2 field), không có field nào lưu `departmentId` bị tác động — thông tin khoa chỉ nằm trong `note` dạng free-text (vd `` `Xóa khoa ${department.code}` ``).

**Impact**: Không thể query "toàn bộ audit log liên quan tới Department X" bằng field có cấu trúc (phải parse text `note`), và ý nghĩa field `user` bị overload (vốn nên là "user bị tác động", ở đây lại luôn trùng `performedBy"). Đây là vấn đề traceability/maintainability, không phải lỗ hổng bảo mật.

**Recommendation**: Cân nhắc thêm field `targetType`/`targetId` chung (polymorphic) vào `UserAudit`, hoặc tạo audit log riêng cho các entity ngoài User (Department, Role, Asset...) — thuộc phạm vi cải tiến kiến trúc rộng hơn 1 module, KHÔNG đề xuất tự thực hiện trong review này.

**Confidence**: MEDIUM (thiết kế/maintainability, không phải bug có evidence lỗi runtime cụ thể).

---

## 4. Không có finding ở các mục sau (đã kiểm tra, không phát hiện vấn đề)

- **Authorization**: Cả 5 route đều có `authenticate` + `authorizePermission("DEPARTMENT_*")` với permission granular riêng cho từng action (VIEW/VIEW_DETAIL/CREATE/UPDATE/DELETE) — không có route nào thiếu authorization hay dùng nhầm permission của module khác.
- **Unique code**: Được đảm bảo ở tầng DB (`unique: true` trên `code`) + pre-check thủ công ở `create()` — không có race-condition nghiêm trọng thực tế do đã có unique index làm lớp bảo vệ cuối (2 request đồng thời cùng code: 1 sẽ pre-check pass rồi bị DB reject bằng E11000 — rơi vào RV04-05, không phải lỗi race mới).
- **CastError cho `:id` sai format**: Không cần dựa vào `error.middleware.ts` — cả `getDepartmentByIdService`/`updateDepartmentService`/`deleteDepartmentService` đều tự check `mongoose.Types.ObjectId.isValid(id)` trước, trả `badRequest` rõ ràng.

## 5. Đối chiếu với 13-phase historical analysis

`docs/04_DATABASE_ANALYSIS.md` §9 (Index coverage) đã ghi nhận trước: "Department | ❌ (chỉ unique `code`) | bảng nhỏ, rủi ro thấp" — REVIEW-04 xác nhận lại đúng hiện trạng, không có thay đổi. Historical analysis **chưa từng đề cập** tới việc `deleteDepartmentService` thiếu check Asset/AssetAssignmentHistory (RV04-01) — đây là finding MỚI, không trùng ID lịch sử nào.

## 6. Bảng tổng hợp finding

| ID | Severity | Category | Tóm tắt | Status |
|---|---|---|---|---|
| RV04-01 | HIGH | Referential Integrity | Xóa Department không check Asset (required field)/AssetAssignmentHistory → orphan reference | OPEN |
| RV04-02 | MEDIUM | Referential Integrity | Check User trước khi xóa chỉ xét `isActive:true`, bỏ sót user đã vô hiệu hóa | OPEN |
| RV04-03 | MEDIUM | Validation | DTO viết đầy đủ nhưng chưa từng được wire vào route; DTO còn lệch field với model (`isActive`, `description`) | OPEN |
| RV04-04 | MEDIUM | Injection/Availability | Regex filter từ input không escape — ReDoS tiềm ẩn | OPEN |
| RV04-05 | LOW | Error Handling | Update trùng `code` không pre-check → lộ raw Mongo error (liên hệ RV00-02) | OPEN |
| RV04-06 | LOW | Audit/Maintainability | Tái sử dụng `UserAudit` cho Department làm giảm khả năng truy vết theo entity | OPEN |

**Trả lời trực tiếp câu hỏi "đặc biệt kiểm tra"**: **CÓ** — xóa Department hiện tại chắc chắn để lại orphan reference trên `Asset` (field `department` là `required: true`) và trên `AssetAssignmentHistory` (`fromDepartment`/`toDepartment`), vì `deleteDepartmentService()` chỉ kiểm tra `User` (và chỉ với `isActive:true`) và `Document`, không kiểm tra 2 model còn lại (RV04-01, RV04-02).

## 7. Unknowns

- Business rule mong muốn khi Department còn user đã `disable()` tham chiếu: có nên cho phép xóa hay không — **UNKNOWN**, cần xác nhận từ chủ dự án trước khi lên implementation plan cho RV04-02.
- Ý định ban đầu của field `isActive`/`description` trong DTO (model chưa có) — có phải tính năng dự kiến làm nhưng chưa hoàn thiện, hay code thừa từ refactor cũ — **UNKNOWN**.

---

**Không có thay đổi source code nào được thực hiện trong review này.**
