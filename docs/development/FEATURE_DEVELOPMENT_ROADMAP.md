# ĐỀ XUẤT LỘ TRÌNH PHÁT TRIỂN TÍNH NĂNG MỚI

> Đây là đề xuất **tính năng nghiệp vụ**, khác với `ROADMAP_TOI_GO_LIVE.md` (vốn tập trung vá lỗi/
> hoàn thiện những gì đã xây). Một số mục dưới đây suy ra trực tiếp từ gap đã ghi nhận trong memory
> (đánh dấu 📋 — có bằng chứng cụ thể), số còn lại là đề xuất dựa trên đặc thù nghiệp vụ quản lý
> tài liệu + tài sản/thiết bị y tế bệnh viện (đánh dấu 💡 — cần bạn xác nhận có đúng nhu cầu thật
> không, tôi không có quyền tự cho là cần thiết chỉ vì phổ biến ở hệ thống khác).

---

## NHÓM A — Hoàn thiện tính năng đã xây một phần (ROI cao nhất, nên làm trước)

### 📋 A1. QR Code cho Asset

Đã ghi nhận trong quá trình lập kế hoạch review: "QR code theo Asset — chưa có UI". Với tài sản/
thiết bị y tế vật lý, đây gần như là tính năng bắt buộc trong thực tế vận hành (không chỉ "nice to
have"): dán tem QR lên thiết bị → nhân viên quét bằng điện thoại để xem ngay lịch sử bàn giao/kiểm
định, hoặc tạo nhanh đề xuất sửa chữa/báo hỏng ngay tại chỗ thay vì phải nhớ mã tài sản rồi vào hệ
thống tìm.
- Backend: sinh mã QR (embed `assetId` hoặc `assetCode`), có thể là 1 endpoint trả về ảnh QR hoặc
  chỉ trả link, để FE tự render bằng thư viện QR.
- Frontend: hiển thị QR trong AssetDetailPage (để in tem dán), trang quét QR (mobile-friendly) dẫn
  thẳng tới AssetDetailPage hoặc màn hình "báo hỏng nhanh" rút gọn.

### 📋 A2. Upload chứng nhận kiểm định thiết bị y tế qua UI (Calibration Record)

Memory ghi rõ: `certificateFileUrl` hiện có bug đường dẫn chết, và chưa có UI upload file chứng
nhận thật cho Calibration Record — đây là hồ sơ pháp lý quan trọng (bằng chứng thiết bị đã được
kiểm định đúng hạn), nên đóng sớm, không chỉ là UX gap thông thường.

### 📋 A3. Excel Import cho Asset (nếu FE thật sự chưa có, cần xác nhận lại)

Backend đã review kỹ Excel import Asset (pre-fetch category/department, tránh N+1 — REVIEW-06),
nhưng theo memory kế hoạch review ban đầu, UI cho luồng này (khác Document Excel import ở FE-15)
có thể chưa được xây riêng. Cần xác nhận lại 1 lần nữa (có thể đã có nhưng tôi chưa review tới) —
nếu chưa, đây là việc tận dụng lại backend có sẵn, chi phí thấp.

### 💡 A4. Lịch sử phiên bản tài liệu (Document versioning)

Hiện có audit trail (ai làm gì, khi nào), nhưng chưa rõ có xem lại được **nội dung** tài liệu ở
từng lần chỉnh sửa trước không (ví dụ nếu 1 đề xuất bị chỉnh sửa nhiều lần trước khi submit, hoặc
sau khi bị reject rồi resubmit — liên quan trực tiếp W3 tôi từng nêu ở review Workflow). Với tài
liệu hành chính, khả năng xem lại "trước khi sửa nó viết gì" đôi khi là yêu cầu kiểm toán thật.

---

## NHÓM B — Tính năng nghiệp vụ mới (giá trị cao cho bối cảnh bệnh viện)

### 💡 B1. SLA & nhắc việc cho Workflow (cảnh báo duyệt quá hạn)

Hiện tại 1 đề xuất có thể "nằm" ở 1 bước duyệt vô thời hạn nếu người có trách nhiệm quên/bận,
không có cơ chế nào cảnh báo. Đề xuất:
- Đặt SLA (số ngày) cho mỗi bước duyệt theo từng `WorkflowTemplate`.
- Cron job kiểm tra `WorkflowInstance` đang pending quá hạn → gửi Notification nhắc người duyệt +
  (tuỳ chọn) escalate lên cấp trên hoặc ADMIN nếu quá hạn 2 lần.
- Dashboard riêng "Đề xuất trễ hạn" cho quản lý theo dõi.

Đây là tính năng tận dụng đúng hạ tầng Notification + Workflow đã có sẵn, không cần xây module mới
từ đầu — chỉ thêm 1 cron job + vài field mới.

### 💡 B2. Lịch bảo trì/kiểm định định kỳ chủ động (Preventive Maintenance Schedule)

Hiện có cron cảnh báo khi **gần hết hạn** kiểm định (`assetAlerts.service.ts`), mang tính "phản
ứng". Với thiết bị y tế, thường cần thêm góc nhìn "chủ động": lịch bảo trì định kỳ đã lên kế hoạch
trước (theo tháng/quý), hiển thị dạng calendar, để phòng Vật tư-TTB chủ động sắp lịch thay vì chỉ
chờ cảnh báo.

### 💡 B3. Quản lý vật tư tiêu hao (Inventory/Consumables) — tách biệt với Asset cố định

`Asset` hiện mô hình hoá tài sản cố định (máy móc, thiết bị — có vòng đời assign/transfer/return).
Vật tư tiêu hao (mực in, giấy, vật tư y tế dùng 1 lần...) có bản chất khác: theo dõi **số lượng
tồn kho**, nhập/xuất kho, ngưỡng cảnh báo hết hàng — không phải "1 tài sản có ID theo dõi trọn đời".
Nếu bệnh viện đang cần quản lý cả 2 loại này, đây nên là module riêng, không gò vào model `Asset`
hiện tại (tránh lặp lại kiểu lỗi model quá tải đã thấy ở `WorkflowInstance.steps[].role` free
string).

### 💡 B4. Quản lý nhà cung cấp & hợp đồng bảo trì (Vendor & Contract Management)

Thiết bị y tế thường có hợp đồng bảo trì/bảo hành với nhà cung cấp cụ thể, có thời hạn, có điều
khoản. Hiện hệ thống chưa có khái niệm "Vendor"/"Contract" — nếu nghiệp vụ thật cần theo dõi (ví
dụ: thiết bị nào còn bảo hành, hợp đồng bảo trì nào sắp hết hạn), đây là module đáng cân nhắc, có
thể liên kết trực tiếp với `Asset`/`MedicalDeviceProfile` đã có.

### 💡 B5. Xuất báo cáo PDF chính thức (có mẫu, chữ ký, dấu) cho tài liệu đã duyệt

Hiện có Excel export (dữ liệu dạng bảng) nhưng tài liệu hành chính đã qua đủ các bước duyệt thường
cần xuất ra dạng **văn bản chính thức** (PDF theo mẫu, có thể kèm chữ ký số hoặc tối thiểu là bảng
"Người duyệt — ngày duyệt — ghi chú" trích từ lịch sử Workflow) để lưu hồ sơ giấy hoặc gửi đi.

### 💡 B6. Tìm kiếm toàn văn (Full-text search) xuyên suốt tài liệu

Hiện tại filter theo field cụ thể (department/status/subType...). Nếu khối lượng tài liệu lớn dần,
nhu cầu "tìm tài liệu có chứa từ khoá X trong nội dung/ghi chú" sẽ phát sinh — MongoDB có text
index sẵn có (Atlas Search hoặc `$text`), tận dụng được mà không cần thêm hạ tầng ngoài (Elastic...)
nếu quy mô chưa quá lớn.

### 💡 B7. Báo cáo định kỳ tự động gửi email (Scheduled Reports)

Tận dụng Dashboard/KPI đã có: cho phép lãnh đạo (BAN_GIAM_DOC, TRUONG_KHOA) đăng ký nhận báo cáo
tóm tắt định kỳ (tuần/tháng) qua email tự động, thay vì phải chủ động vào Dashboard xem.

---

## NHÓM C — Bảo mật & vận hành nên bổ sung (không phải "tính năng nghiệp vụ" nhưng đáng đầu tư)

### 💡 C1. Xác thực 2 lớp (2FA) cho ADMIN và các role duyệt cấp cao

Xét bối cảnh đã tìm ra **3 đường leo thang đặc quyền lên ADMIN độc lập** (dù đã fix hết) và tài
khoản ADMIN có quyền bypass gần như mọi kiểm soát trong hệ thống, thêm 2FA cho riêng nhóm tài khoản
này là lớp phòng thủ hợp lý (defense-in-depth), không phụ thuộc việc RBAC có bug hay không trong
tương lai.

### 💡 C2. Quản lý phiên đăng nhập (Session Management UI)

Cho phép user (đặc biệt ADMIN) xem danh sách thiết bị/phiên đang đăng nhập và chủ động thu hồi
("đăng xuất từ xa") — hữu ích khi nghi ngờ tài khoản bị lộ, và tận dụng đúng cơ chế `RefreshToken`
đã có sẵn (chỉ cần thêm UI liệt kê + action revoke theo từng token thay vì chỉ revoke toàn bộ khi
đổi mật khẩu như hiện tại).

### 💡 C3. Xuất báo cáo Audit Log theo mẫu cho thanh tra/Sở Y tế

Audit Log hiện có UI xem + export (FE-11), nhưng nếu cơ quan quản lý y tế có mẫu báo cáo tuân thủ
cụ thể (ví dụ báo cáo sử dụng thiết bị y tế định kỳ theo quy định Bộ Y tế), nên xác nhận format
export hiện tại có đáp ứng được không, hay cần thêm 1 export mẫu riêng.

---

## NHÓM D — Dài hạn, cân nhắc thêm nếu có nhu cầu rõ ràng

- **Mobile app/PWA** cho quét QR (A1) và duyệt nhanh ngay trên điện thoại khi lãnh đạo không ở bàn
  làm việc.
- **Tích hợp đồng bộ nhân sự/khoa phòng** với hệ thống nhân sự (HRM) hoặc HIS của bệnh viện nếu đã
  có sẵn — tránh phải nhập tay User/Department 2 lần ở 2 hệ thống.
- **Chatbot/tìm kiếm thông minh nội bộ** — chỉ đáng đầu tư khi khối lượng tài liệu/thắc mắc lặp lại
  đủ lớn để có ROI, không nên làm sớm chỉ vì "công nghệ mới".

---

## Cách tôi đề xuất tiếp cận

Nhóm A (4 mục) là tận dụng lại phần đã xây, chi phí thấp — nên làm trước hoặc xen kẽ với
`ROADMAP_TOI_GO_LIVE.md` Giai đoạn 0-1. Nhóm B/C là tính năng mới thật sự, nên làm **sau** khi hệ
thống hiện tại ổn định và đã go-live lần đầu — tránh vừa vá lỗi nền tảng vừa mở rộng tính năng cùng
lúc, dễ rối ưu tiên.

Bạn xem qua và cho tôi biết: trong Nhóm B/C, mục nào là nhu cầu THẬT của bệnh viện bạn (không phải
tôi đoán mà đúng phát sinh từ thực tế vận hành), để tôi giúp lên kế hoạch triển khai chi tiết cho
đúng mục đó trước.
