# 11 — PERFORMANCE MONITORING — CODE REVIEW

> REVIEW-11. Chỉ review, KHÔNG sửa source. Phạm vi: `controllers/performances`, `models/apiPerformance`, `middlewares/performance.middleware.ts`, `shared/performance/performanceLogBuffer.ts`, `routes/performances`, đối chiếu `app.ts` (vị trí mount middleware) và `config/database/database.shutdown.ts` (graceful shutdown flush).
>
> Nguồn đọc trực tiếp: toàn văn cả 5 file chính (566 dòng gộp), `backend/src/app.ts` (dòng mount middleware/route), `backend/src/config/database/database.shutdown.ts`, `backend/src/shared/constants/permission.constant.ts` (đối chiếu `PERFORMANCE_VIEW`).
>
> Baseline đã đọc trước khi verify source: `docs/00_PROJECT_MEMORY.md`, `docs/10_PERFORMANCE_ANALYSIS.md` (PERF-12, PERF-13 — batch/sampling đã ghi nhận tích cực), `docs/05_API_ANALYSIS.md` (dòng 356: ghi "check role.name===ADMIN cứng trong controller" cho `GET /performances/dashboard`).
>
> **Xung đột quan trọng với baseline lịch sử, đã xử lý theo CLAUDE.md §3 (Source Code > Historical Documentation)**: `docs/05_API_ANALYSIS.md` (Phase 05) ghi nhận endpoint `GET /api/performances/dashboard` "check `role.name === 'ADMIN'` cứng trong controller". Đọc trực tiếp `performance.controller.ts` HIỆN TẠI xác nhận **KHÔNG CÓ** đoạn check này — controller không có bất kỳ điều kiện phân quyền nào. Tài liệu Phase 05 ĐÃ LỖI THỜI ở điểm này (RV11-01) — nguồn sự thật là source code hiện tại, không phải tài liệu Phase 05.

---

## A. TÓM TẮT

| # | ID | Severity | Category | Trạng thái |
|---|----|----------|----------|------------|
| 1 | RV11-01 | **HIGH** | Authorization | CONFIRMED — finding MỚI, xung đột với Phase 05 (tài liệu lỗi thời) |
| 2 | RV11-02 | **HIGH** | Metrics Correctness | CONFIRMED — finding MỚI |
| 3 | RV11-03 | MEDIUM | Metrics Correctness / Data Quality | CONFIRMED — finding MỚI |
| 4 | RV11-04 | LOW | Database / Index | CONFIRMED — finding MỚI |
| 5 | RV11-05 | LOW | Validation | CONFIRMED — finding MỚI |
| 6 | RV11-06 | INFO (positive) | — | CONFIRMED |

---

## B. FINDINGS CHI TIẾT

### RV11-01 — `GET /api/performances/dashboard` KHÔNG có bất kỳ kiểm tra phân quyền nào ngoài `authenticate` — mọi user đăng nhập đều xem được (HIGH, CONFIRMED — finding MỚI)

- **File 1**: `backend/src/routes/performances/performance.routes.ts`
- **File 2**: `backend/src/controllers/performances/performance.controller.ts` (`getPerformanceDashboard`)
- **File 3 (đối chiếu)**: `backend/src/shared/constants/permission.constant.ts`

**Observed behavior**: Route:
```ts
router.get("/dashboard", authenticate, getPerformanceDashboard);
```
Comment ngay phía trên route TỰ KHẲNG ĐỊNH: *"phân quyền cho endpoint này chỉ cần check `role.name === 'ADMIN'` ở tầng controller... Nếu sau này cần cho phép user có quyền cụ thể (không chỉ ADMIN)... thêm lại `authorizePermission('PERFORMANCE_VIEW')`"* — nhưng đọc toàn văn `getPerformanceDashboard` (`performance.controller.ts`) xác nhận **KHÔNG CÓ dòng nào kiểm tra `req.user.role.name`** hay bất kỳ điều kiện phân quyền nào khác — hàm chạy thẳng từ `const {from, to} = req.query` tới `res.json(...)`. `grep` toàn bộ `backend/src` xác nhận permission `PERFORMANCE_VIEW` được nhắc tới DUY NHẤT trong chính dòng comment này — **CHƯA TỪNG được định nghĩa** trong `permission.constant.ts`.

**Evidence**: đọc toàn văn `performance.controller.ts` (97-194, phần code đang chạy) — không có `if (req.user...role...)`; `grep "PERFORMANCE_VIEW" backend/src -r` chỉ khớp đúng dòng comment nêu trên.

**Impact**: **BẤT KỲ user đã đăng nhập nào** (không phân biệt role, không cần permission gì) đều xem được toàn bộ dashboard hiệu năng hệ thống — thống kê theo từng endpoint (`totalCalls`, `avgTime`, `maxTime`, `slowCount`, `errorCount`). Đây là hồi quy (regression) so với chủ đích thiết kế RÕ RÀNG đã ghi trong chính comment của route — code hiện tại KHÔNG khớp với ý định đã document. Mức độ nhạy cảm của dữ liệu bị lộ ở mức TRUNG BÌNH (không phải PII/business data — chỉ là metadata vận hành hệ thống: endpoint nào chậm, endpoint nào hay lỗi) nhưng vẫn là thông tin nội bộ hữu ích cho kẻ tấn công dò tìm điểm yếu (VD endpoint hay lỗi/chậm có thể là mục tiêu ưu tiên để thử khai thác thêm), và rõ ràng KHÔNG đúng ý định thiết kế ban đầu.

**Recommendation**: Bổ sung lại check `role.name === "ADMIN"` (đúng như comment đã mô tả) hoặc tạo permission `PERFORMANCE_VIEW` thật và gắn `authorizePermission` ở route — 2 lựa chọn đều đã được chính code hiện tại "hứa" nhưng chưa lựa chọn/triển khai lựa chọn nào.

**Confidence**: HIGH.

---

### RV11-02 — `endpoint` ghi nhận theo `req.route.path` KHÔNG bao gồm tiền tố router mount — hàng chục domain khác nhau bị GỘP LẪN vào cùng 1 nhóm thống kê (HIGH, CONFIRMED — finding MỚI)

- **File 1**: `backend/src/middlewares/performance.middleware.ts:131` (`endpoint: req.route?.path || req.originalUrl`)
- **File 2**: `backend/src/controllers/performances/performance.controller.ts:153-154` (`$group: {_id: "$endpoint"}`)
- **File 3 (đối chiếu)**: `backend/src/app.ts:101-115` (danh sách `app.use("/api/<domain>", <domain>Routes)`)

**Observed behavior**: `req.route.path` trong Express CHỈ là pattern path ĐĂNG KÝ Ở ROUTER CON (VD `router.get("/:id", ...)` bên trong `document.route.ts`), **KHÔNG bao gồm tiền tố mount** (`/api/documents`) mà `app.ts` gắn router đó vào (`app.use("/api/documents", documentRoutes)`) — đây là hành vi CHUẨN, có tài liệu của Express, không phải bug của Express.

Vì rất nhiều router khác nhau trong hệ thống dùng chung các pattern path phổ biến (`"/"`, `"/:id"`, `"/:id/read"`...), khi `performance.controller.ts` chạy `$group: {_id: "$endpoint"}`, các request tới NHIỀU domain HOÀN TOÀN KHÁC NHAU nhưng cùng pattern path sẽ bị GỘP CHUNG vào 1 nhóm thống kê. VD (liệt kê dựa trên các route đã đọc ở REVIEW-05→10): `GET /api/documents/:id`, `GET /api/assets/:id`, `GET /api/departments/:id`, `GET /api/users/:id`, `GET /api/upload/:id`, `GET /api/rbac/roles/:id`... đều có `req.route.path === "/:id"` — TẤT CẢ bị gộp vào CÙNG 1 dòng `"endpoint": "/:id"` trong dashboard, không thể phân biệt được đây là chậm ở domain nào.

**Evidence**: đọc toàn văn middleware (dòng ghi `endpoint`) + đối chiếu cách `app.ts` mount router (không truyền tiền tố vào `req.route`) + hành vi Express chuẩn (`req.route` luôn tương đối theo router con, không có prefix).

**Impact**: Đây là lỗi làm HỎNG Ý NGHĨA CỐT LÕI của toàn bộ tính năng — mục đích của dashboard hiệu năng là "biết endpoint NÀO chậm/lỗi để ưu tiên xử lý", nhưng với cách nhóm hiện tại, thông tin "endpoint nào" gần như VÔ NGHĨA cho bất kỳ pattern path phổ biến nào (`/`, `/:id`, `/:id/read`...) — không có cách nào từ output của dashboard này biết được request chậm thuộc domain Documents hay Assets hay Users. Đây là finding "Metrics correctness" nghiêm trọng nhất mà task yêu cầu kiểm tra.

**Recommendation**: Đổi cách ghi `endpoint` sang `req.baseUrl + (req.route?.path || "")` (Express cung cấp sẵn `req.baseUrl` = tiền tố mount thật của router khớp) — VD sẽ ghi đúng `"/api/documents/:id"` thay vì chỉ `"/:id"`. Đây là thay đổi 1 dòng ở middleware, không ảnh hưởng schema.

**Confidence**: HIGH (hành vi `req.route`/`req.baseUrl` là hành vi chuẩn, có tài liệu chính thức của Express, không phải suy đoán).

---

### RV11-03 — Fallback `req.originalUrl` (khi route không match) tạo giá trị `endpoint` cardinality cao, làm loãng dữ liệu thống kê (MEDIUM, CONFIRMED — finding MỚI)

- **File**: `backend/src/middlewares/performance.middleware.ts:131`

**Observed behavior**: `endpoint: req.route?.path || req.originalUrl` — khi request KHÔNG khớp route nào (404, hoặc bị chặn bởi middleware TRƯỚC khi routing, VD lỗi `authenticate`/`validateParams` xảy ra trước khi Express gán `req.route`), `req.route` là `undefined` → fallback dùng `req.originalUrl` — chuỗi này chứa FULL query string VÀ giá trị ID thật (VD `/api/documents/64f1a2b3c4.../read?foo=bar`), khác hẳn 1 pattern path cố định.

**Evidence**: đọc trực tiếp dòng code + hiểu biết chuẩn về thời điểm Express gán `req.route` (chỉ gán SAU KHI 1 route handler thực sự được gọi, không gán nếu request bị chặn ở middleware sớm hơn hoặc không khớp route nào).

**Impact**: Mỗi request lỗi 404/bị chặn sớm tạo ra 1 giá trị `endpoint` GẦN NHƯ DUY NHẤT (do chứa ID/query khác nhau mỗi lần) — làm `$group by endpoint` sinh ra rất nhiều nhóm chỉ có 1 bản ghi, làm loãng bảng thống kê thay vì gộp đúng thành "các request lỗi 404" là 1 nhóm có ý nghĩa. Vì middleware LUÔN log 100% request lỗi (status ≥400, bao gồm 404) bất kể sampling, đây KHÔNG phải trường hợp hiếm — mọi typo URL/link hỏng của client đều tạo rác dữ liệu kiểu này.

**Recommendation**: Cân nhắc dùng `req.path` (không có query string) thay cho `req.originalUrl` làm fallback, hoặc gộp mọi request không khớp route thành 1 giá trị cố định (VD `"(unmatched)"`) — tuỳ mục đích muốn giữ chi tiết debug 404 hay muốn dashboard sạch.

**Confidence**: HIGH.

---

### RV11-04 — Index trùng lặp trên field `createdAt` (LOW, CONFIRMED — finding MỚI)

- **File**: `backend/src/models/apiPerformance/apiPerformance.model.ts:89-90,118-121`

**Observed behavior**: Model khai 2 index ĐỘC LẬP trên CÙNG 1 field:
```ts
ApiPerformanceSchema.index({ createdAt: -1 });               // dòng 90
...
ApiPerformanceSchema.index({ createdAt: 1 }, { expireAfterSeconds: ... });  // dòng 118-121 (TTL)
```
Index đơn field (`{createdAt:1}` hoặc `{createdAt:-1}`) hỗ trợ traverse HAI CHIỀU như nhau trong MongoDB (chiều `-1`/`1` chỉ ảnh hưởng thứ tự trả về mặc định khi không có `.sort()` ngược lại, không ảnh hưởng khả năng dùng index cho range query/sort bất kỳ chiều nào) — index TTL (`{createdAt:1, expireAfterSeconds}`) đã ĐỦ để phục vụ mọi truy vấn/sort theo `createdAt` mà `getPerformanceDashboard` cần (`$match: {createdAt: {$gte/$lte}}`).

**Evidence**: đọc toàn văn model — 2 lời gọi `.index()` riêng biệt cùng field `createdAt`, khác nhau duy nhất ở option `expireAfterSeconds`.

**Impact**: THẤP — chi phí tăng gấp đôi write overhead cho việc maintain index trên field này (mỗi lần `insertMany` batch phải cập nhật CẢ 2 index thay vì 1), tăng dung lượng lưu index trên đĩa. Không gây sai kết quả, chỉ lãng phí tài nguyên nhẹ, phù hợp mức LOW cho 1 collection có TTL 30 ngày (kích thước bị giới hạn tự nhiên).

**Recommendation**: Xoá index `{createdAt:-1}` (dòng 90), chỉ giữ lại index TTL (`{createdAt:1, expireAfterSeconds}`) — đã đủ phục vụ mọi query hiện có.

**Confidence**: HIGH.

---

### RV11-05 — `from`/`to` query param không validate trước khi đưa vào `new Date()` (LOW, CONFIRMED — finding MỚI)

- **File**: `backend/src/controllers/performances/performance.controller.ts:129-136`

**Observed behavior**:
```ts
const { from, to } = req.query;
const match: any = {};
if (from || to) {
  match.createdAt = {};
  if (from) match.createdAt.$gte = new Date(from as string);
  if (to) match.createdAt.$lte = new Date(to as string);
}
```
Không có validate (Zod DTO hay check thủ công) cho `from`/`to` trước khi `new Date(...)` — nếu client truyền giá trị không parse được (VD `?from=abc`), `new Date("abc")` tạo `Invalid Date`, lọt thẳng vào `$match.createdAt.$gte`.

**Evidence**: đọc toàn văn hàm — không có `ApiError.badRequest`/validate nào cho 2 param này (khác hẳn mẫu hình `parseOptionalDate()` đã áp dụng đúng ở Dashboard — REVIEW-07).

**Impact**: THẤP — endpoint chỉ dành cho ADMIN (theo ý định thiết kế, dù hiện đang bị RV11-01 làm hở), không phải input từ user thường/không tin cậy cao; hệ quả của `Invalid Date` trong MongoDB filter thường là không khớp document nào (trả mảng rỗng) thay vì lỗi 500 — gây khó chịu UX (không rõ tại sao không có dữ liệu) hơn là rủi ro bảo mật.

**Recommendation**: Dùng lại `parseOptionalDate()` (đã có sẵn ở `shared/utils/Queryparsing.util.ts`, dùng tốt ở Dashboard) cho `from`/`to` ở đây — đồng bộ pattern, tránh viết lại logic tương tự.

**Confidence**: HIGH.

---

### RV11-06 — Positive findings

1. **Batch + sampling là thiết kế TỐT NHẤT về hiệu năng thuần trong toàn bộ chuỗi review tới nay cho chính module TỰ ĐO HIỆU NĂNG** — giảm 50-100 lần round-trip DB (đúng như comment), sample 10% request bình thường nhưng LUÔN log 100% request chậm/lỗi (đúng dữ liệu quan trọng nhất không bị bỏ sót).
2. **Tự nhận biết và sửa đúng vấn đề "dữ liệu rỗng nhưng trông như đã đo"**: field `dbTime`/`serviceTime`/`controllerTime` (không layer nào thực sự cập nhật, luôn = 0) đã được XOÁ HẲN khỏi cả interface, middleware, và schema — không giữ lại "cho có vẻ đầy đủ". Đây là mẫu hình tốt hiếm thấy: phát hiện dữ liệu giả rồi dọn dẹp triệt để thay vì để nguyên gây hiểu lầm.
3. **Comment tự cảnh báo rõ ràng về giới hạn của sampling**: `getPerformanceDashboard` có docstring giải thích `totalCalls`/`avgTime` là SỐ ƯỚC LƯỢNG (không phải đếm chính xác), trong khi `slowCount`/`errorCount` là CHÍNH XÁC TUYỆT ĐỐI — phân biệt rõ ràng, giúp người đọc dashboard không hiểu nhầm số liệu.
4. **TTL retention (30 ngày) có lý do nghiệp vụ hợp lý** (log hiệu năng mất giá trị nhanh theo thời gian, khác `UserAudit` cần giữ lâu dài) và có cảnh báo triển khai RẤT KỸ (tự ghi rõ rủi ro xoá hàng loạt dữ liệu cũ ngay lần quét đầu khi deploy lên collection đã có sẵn dữ liệu, khuyến nghị tạo index thủ công có kiểm soát ở production).
5. **Graceful shutdown flush được wire ĐÚNG**: `flushPerformanceLogBuffer()` được gọi từ `database.shutdown.ts` khi nhận `SIGINT`/`SIGTERM` — không mất dữ liệu buffer còn lại lúc server tắt có kiểm soát; `flushTimer.unref()` tránh giữ process sống chỉ vì timer phụ trợ.
6. **Không log dữ liệu nhạy cảm**: schema `ApiPerformance` chỉ lưu `method`/`endpoint`/`status`/`totalTime`/`user` (ObjectId, không phải email/tên)/`isSlow` — không có request body, header, query string đầy đủ (trừ trường hợp fallback RV11-03), hay bất kỳ nội dung nghiệp vụ nào — an toàn theo tiêu chí "Sensitive information" mà task yêu cầu kiểm tra.
7. **`Promise` không chặn response**: middleware không `await` bất cứ gì trước `next()` — đo thời gian và ghi buffer hoàn toàn không ảnh hưởng latency thực của request đang xử lý (đúng tiêu chí "Runtime overhead" thấp nhất có thể).

---

## C. CÁC MỤC ĐÃ XÁC MINH LẠI, KHÔNG PHÁT HIỆN THÊM VẤN ĐỀ

- **`flush()` reset buffer đồng bộ TRƯỚC khi `await insertMany`** — đúng, tránh race condition giữa request mới push vào buffer trong lúc đang flush (đã đọc kỹ để xác nhận không có lỗ hổng mất dữ liệu do thứ tự thực thi).
- **`insertMany(..., {ordered:false})`** — đúng lựa chọn cho log phụ trợ (1 document lỗi schema không chặn các document hợp lệ khác trong cùng batch).
- **`performanceMiddleware` mount TRƯỚC mọi route** (`app.ts:93`, trước dòng 101+) nhưng vẫn đọc đúng `req.user` ở thời điểm `res.on("finish")` (chạy SAU khi toàn bộ pipeline, kể cả `authenticate` per-route, đã hoàn tất) — không có vấn đề thứ tự middleware.

---

## D. UNKNOWN CÒN TỒN ĐỌNG

- RV11-01: mức độ nghiêm trọng thực tế phụ thuộc việc RBAC hiện tại đã gán role nào các permission gì — nhưng đây là lỗ hổng ở TẦNG ROUTE (không qua RBAC permission nào cả), nên không phụ thuộc cấu hình RBAC — mọi user ĐĂNG NHẬP đều bị ảnh hưởng, không có UNKNOWN nào giảm nhẹ mức độ này.
- RV11-02/03: chưa xác nhận được liệu FE/consumer thực tế có dựa vào giá trị `endpoint` hiện tại theo cách nào khác (VD hiển thị thô không qua group) — nếu có, sửa RV11-02 (thêm `req.baseUrl`) có thể là breaking change cho FE, cần phối hợp.

---

**Review hoàn tất. Không có thay đổi nào được thực hiện trên source code trong quá trình review này.**
