# FRONTEND / UI RULES

> Chuyển NGUYÊN VĂN từ `CLAUDE.md` (§20, §21) ngày 2026-11-02 để file chính gọn. Số mục (§) giữ nguyên để các tài liệu khác vẫn trỏ đúng. Đọc khi task có đụng giao diện hoặc contract frontend/backend.

---

# 20. FRONTEND / UI RULES

Khi phát triển frontend:

- Ưu tiên component hiện có.
- Tái sử dụng shared components.
- Không tạo component trùng chức năng.
- Giữ consistency với UI hiện tại.
- Không thay đổi global layout nếu task không yêu cầu.
- Kiểm tra responsive behavior.
- Kiểm tra loading state.
- Kiểm tra empty state.
- Kiểm tra error state.
- Kiểm tra permission state.
- Kiểm tra form validation.
- Kiểm tra API integration.

Khi thay đổi frontend behavior, kiểm tra backend contract.

Khi thay đổi API, kiểm tra frontend consumers.

**[CẬP NHẬT 2026-09-23] Áp dụng design skill (nếu user cung cấp 1 skill thiết kế UI dạng "design
director", vd nhấn mạnh bản sắc hình ảnh riêng biệt/mạo hiểm thẩm mỹ) — áp dụng CÓ CHỌN LỌC, không
wholesale:**

- **DÙNG**: checklist chất lượng (kỷ luật type scale, tiết chế — 1 điểm nhấn/task, tránh sáo rỗng AI
  như eyebrow viết hoa toàn bộ, card-soup giống hệt nhau, "→" cuối link, chuỗi meta nối dấu chấm vô
  nghĩa), hướng dẫn viết copy (thể chủ động, tên nút khớp thông báo xác nhận sau đó, error/empty state
  trung thực không xin lỗi), và tiêu chuẩn nền tảng (responsive, keyboard focus, reduced motion, a11y).
- **KHÔNG DÙNG mặc định**: phần "tự do chọn bảng màu/kiểu chữ/bố cục mới, mạo hiểm thẩm mỹ". Project
  đã có hệ thống design token được quyết định và ghi lý do rõ ràng (`frontend/src/index.css` — hướng
  "Modern Healthcare Enterprise": xanh dương-teal/slate, KHÔNG neon/gradient/glassmorphism, 1 font
  Inter, màu chart đã validate qua `dataviz` skill). Đây KHÔNG PHẢI mặc định AI rập khuôn mà skill đó
  cảnh báo — là quyết định có chủ đích từ FE-01/FE-09. Đổi token màu/font là quyết định thương hiệu,
  chỉ làm khi user yêu cầu rõ ràng (theo đúng pattern comment `FE_DECISION` đã dùng ở file đó), không
  tự ý đổi dưới danh nghĩa "áp dụng design skill".
- Không áp dụng hướng dẫn "hero section" — đây là app quản trị nội bộ sau đăng nhập, không phải trang
  marketing.
- Vận hành: khi làm 1 task FE-XX có đụng UI, có thể thêm bước "tự phê bình theo lăng kính skill" (kế
  hoạch → đối chiếu → build → tự phê bình) nhưng vẫn nằm TRONG luồng task-based bình thường — vẫn tái
  sử dụng component/token hiện có (đúng §11/§12 ở trên), vẫn ghi task DEV-XXX/FE-XX, vẫn qua đủ
  build/lint/test. Không biến đây thành 1 đợt "rebrand" toàn app.

---

# 21. FRONTEND/BACKEND CONTRACT

Đối với full-stack task:

```text
User Action
↓
Component
↓
Handler
↓
State
↓
API Client
↓
HTTP Request
↓
Backend Route
↓
Middleware
↓
Controller
↓
Service
↓
Database
↓
Response
↓
API Client
↓
State
↓
UI
```

Không thay đổi một phía mà bỏ qua contract của phía còn lại.

