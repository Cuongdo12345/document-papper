# Cách đồng bộ tài liệu phân tích lịch sử (DEV-123)

**Trạng thái:** còn hiệu lực.

- **Ngày:** 2026-11-25. **Người quyết:** user.
- **Quyết định:** tài liệu lịch sử `docs/01`→`31` KHÔNG viết lại; chỉ banner "tài liệu lịch sử" đầu file (bảng đổi tên route/quyền cũ → mới, con trỏ tới tài liệu hiện hành) + ghi chú `[CẬP NHẬT <ngày>]` tại chỗ nói sai về cấu trúc hiện tại. Tài liệu đang sống (`frontend/AUTH_RBAC_MAP.md`, `FE_CONTEXT.md`, `ROUTE_PERMISSION_MAP.md`, `DATA_FLOW.md`, `API_REFERENCE.md`, `00_PROJECT_MEMORY.md`) thì sửa trực tiếp cho đúng. `docs/module-reviews/` chỉ cập nhật khi task đụng tới.
- **Cách áp dụng:** lần đồng bộ sau, cập nhật số liệu trong banner (dòng "Số liệu tại lần rà soát") thay vì thêm banner thứ hai; số permission/role lấy bằng cách nạp thẳng file hằng số, không đếm bằng regex. Không sửa `04_DATABASE_ANALYSIS.md` và `32_PROJECT_FEATURE_GUIDE.md` khi chưa hỏi user (file của user).
