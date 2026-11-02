# Quyết định: trần độ dài CLAUDE.md

**Trạng thái:** còn hiệu lực.

- **Ngày:** 2026-11-02. **Người quyết:** user.
- **Quyết định:** CLAUDE.md không vượt **600 dòng**. Mỗi lần thêm vào file, chạy `wc -l CLAUDE.md`; nếu vượt thì dừng, đề nghị user rút gọn trước, chỉ rút gọn khi user đồng ý (CLAUDE.md §42).
- **Vì sao:** file từng phình tới 1.557 dòng / 41,6 KB và được nạp mỗi phiên. Cách "quá 50 dòng" ban đầu bị bỏ vì file đã vượt từ trước nên lần nào cũng kích hoạt; "phần thêm quá 50 dòng" không chặn được việc phình dần bằng nhiều lần thêm nhỏ.
- **Cách áp dụng:** nội dung dài/chỉ cần cho một loại việc thì ghi vào `docs/rules/` và để một dòng chỉ đường trong CLAUDE.md. Trần này chỉ áp dụng cho CLAUDE.md, không áp dụng cho SKILL.md hay tài liệu khác.
