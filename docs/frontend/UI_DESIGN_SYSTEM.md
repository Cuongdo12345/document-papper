# UI_DESIGN_SYSTEM.md

**Trạng thái:** PROPOSAL cho phần LỚN tài liệu (đổi màu trang cụ thể theo Mục 2, rollout Mục 4 ra ngoài
Dashboard) — vẫn CHƯA đụng code, chờ duyệt. **NGOẠI LỆ đã triển khai thật**: Mục 6 (hạ tầng test
WCAG/visual regression) — DONE, `FE-17.md`. Mục 3/4 — DONE THÍ ĐIỂM CHỈ trên `DashboardPage` (`FE-18.md`,
2026-09-19), CHỜ user xem kết quả trên trình duyệt thật + duyệt trước khi có Pass 3 (rollout sang trang
khác, xem Mục 9). Mục 2 — DONE HOÀN TOÀN (`FE-19.md`, 2026-09-19→20): audit 23/36 trang dùng `--primary`
cho >1 action (số liệu đã sửa lại) + đổi default `ConfirmDialog`/`WorkflowActionModal` (primary→secondary
khi không `danger`, root cause đa số vi phạm) + xử lý lần lượt 14 trang GROUP C (call site không thể fix
bằng default) — chỉ 2/14 trang có vi phạm THẬT cần sửa (`AssetDetailPage`/`MedicalDeviceSection.tsx`,
`AssetScanPage.tsx`), 12/14 còn lại xác nhận không có vi phạm thật (audit gốc đếm tĩnh sai). Phần
active-state Sidebar xác nhận ĐÃ đúng từ trước (không cần sửa).
**Ngày:** 2026-09-19
**Phạm vi:** Toàn bộ frontend hiện có — 16 trang `FE-00`→`FE-16` + 15 trang phát sinh từ
`DEV-057`→`070` (Vendors/Contracts/Consumables/2FA/Sessions...) — và mọi trang tương lai.
**KHÔNG thay thế** `frontend/src/index.css` (token màu OKLCH hiện có, đã validate contrast
`ΔE` ở FE-01/FE-09) — tài liệu này chỉ bổ sung quy tắc SỬ DỤNG token, không đổi giá trị gốc.
**Nguồn gốc:** `FRONTEND_MEMORY.md` (mục "Ghi chú lịch sử") ghi nhận 1 file cùng tên đã bị
xoá ở UI-00 khi làm lại phân tích từ đầu, và yêu cầu tạo lại qua 1 task riêng khi cần — đây
là bản dựng lại đó, theo yêu cầu người dùng ngày 2026-09-19.

## 1. Vì sao cần tài liệu này

`FE-16` (Global UI Polish pass 1) audit toàn bộ 15 trang FE lúc đó và xác nhận:
spacing/table-density/modal-sizing/status-color/debounce/a11y-icon/responsive-width đã
NHẤT QUÁN sẵn từ khi xây, nhờ dùng chung shared components. Audit lại lần nữa (2026-09-19)
trên 15 trang phát sinh từ `DEV-057`→`070` cũng cho kết quả sạch tương tự (0 vi phạm cả 6
hạng mục kiểm tra).

Vấn đề không phải "thiếu nhất quán" — mà là **thiếu phân cấp thị giác**. Mọi Card/nút/màu
đều được dùng đồng đều ở mọi nơi, khiến giao diện đúng chuẩn nhưng phẳng, không có điểm nào
để mắt dừng lại trước. Tài liệu này chốt quy tắc PHÂN CẤP, không đổi lại từ đầu.

Mọi quyết định dưới đây đứng dưới `FE_UI_DEVELOPMENT_ROADMAP.md` Mục 33 (Master UI
Principle): **Clarity/Consistency/Trust/Speed/Accessibility/Maintainability** phải luôn
được ưu tiên hơn **Decoration/Animation/Visual complexity**. Đề xuất nào chỉ để "cho đẹp"
mà không phục vụ rõ một trong các tiêu chí trên thì không đưa vào tài liệu này.

## 2. Màu sắc — giữ nguyên token, siết lại quy tắc DÙNG

KHÔNG đổi giá trị OKLCH trong `index.css`. Đổi giá trị màu phải chạy lại kiểm tra contrast
(Mục 6), ngoài phạm vi 1 pass polish.

| Token | Hiện trạng | Quy tắc mới |
|---|---|---|
| `--primary` | Dùng cho phần lớn nút/badge, xuất hiện dày đặc mọi nơi | Chỉ dùng cho ĐÚNG 1 CTA chính/trang (hành động quan trọng nhất — "Tạo mới", "Lưu", "Duyệt"). Action phụ dùng biến thể `secondary`/`ghost`/`outline` sẵn có. |
| `--accent` (teal) | Gần như chỉ dùng cho chart | Dùng làm dấu hiệu nhận diện nhất quán: active state ở sidebar/tab. Không lặp lại vai trò của `--primary`. |
| `--muted` | Background phụ | Giữ nguyên, dùng thêm để gộp nhóm section trong 1 trang (Mục 4), thay cho việc mỗi khối đều có border riêng. |

**[XÁC NHẬN 2026-09-19, `FE-19.md`]** Dòng `--accent`/active-state phía trên viết dựa trên giả định SAI —
audit source thực tế (`Sidebar.tsx:59-61`, `index.css:75-76`/`:121-122`) cho thấy Sidebar active-state ĐÃ
dùng giá trị accent-teal từ trước (qua token riêng `--sidebar-accent`, alias cùng giá trị OKLCH với
`--accent`), không phải `--primary`. KHÔNG có thay đổi code nào cho Sidebar/AppLayout trong FE-19. Phần
audit `--primary` cho >1 action/trang (dòng đầu bảng) ĐÃ chạy — **23/36 trang vi phạm** (số liệu đã sửa lại
2026-09-20, xem `FE-19.md` đầu file), xem `FE-19.md` Mục 2. **[BỔ SUNG 2026-09-20]** Phân loại chi tiết
(`FE-19.md` Mục 2b) xác nhận KHÔNG trang nào chỉ có Confirm/Workflow đơn thuần (nhóm cần chờ quyết định thủ
công RỖNG) — đã tiến hành đổi default `variant` của `ConfirmDialog.tsx`/`WorkflowActionModal.tsx` từ
`primary` sang `secondary` khi không `danger` (Mục 2c), verify bằng Playwright trước/sau + FE-17 regression
đầy đủ. 23 trang vẫn giữ nguyên call site — KHÔNG tự sửa tay trang nào.

## 3. Typography — chỉ thêm 1 cấp mới, KHÔNG đổi cái đã chuẩn hoá

**[SỬA 2026-09-19]** Bản đầu của mục này viết sai: "mỗi trang tự chọn size/weight theo
cảm tính". Thực tế đã có `PageHeader.tsx` — shared component chính thức từ `FE-01`
(`SHARED_COMPONENTS_LIBRARY.md`), dùng ở MỌI trang danh sách/chi tiết, `<h1>` cố định
`text-xl font-semibold tracking-tight` (20px/600). Không phải tuỳ hứng — đã chuẩn hoá sẵn,
**giữ nguyên, không đổi**.

Giữ nguyên font `Inter`. Bảng dưới đây là giá trị ĐANG DÙNG THẬT (verify bằng code, không
suy đoán) và chỉ có 1 dòng thực sự MỚI:

| Cấp | Hiện trạng | Giá trị | Ghi chú |
|---|---|---|---|
| Tiêu đề trang (`PageHeader` `<h1>`) | ĐÃ CÓ, chuẩn hoá từ FE-01 | `text-xl` (20px) / 600 | Giữ nguyên. |
| Giá trị KPI thường (`KpiCard`) | ĐÃ CÓ | `text-2xl` (24px) / 600 | Giữ nguyên cho các KPI phụ. |
| **KPI chính — `display` (Mục 4)** | **MỚI, chưa tồn tại ở đâu khác** | `text-4xl` (36px) / 700 | Cấp DUY NHẤT thực sự thêm mới, chỉ dùng cho đúng 1 KPI ở Mục 4. |
| Section label (VD "Xu hướng...", `<h3>` trong card) | ĐÃ CÓ | `text-sm font-semibold` (14px/600) | Giữ nguyên — ngoài phạm vi Mục 4. |
| Body (nội dung, bảng, form) | ĐÃ CÓ — 601 lần dùng, áp đảo toàn app | `text-sm` (14px) / 400 | Giữ nguyên. |
| Label phụ/timestamp | ĐÃ CÓ — 291 lần dùng | `text-xs` (12px) | Giữ nguyên. |

Kết luận: Mục 3 không cần đổi token/CSS chung nào — chỉ cần dùng đúng 1 class mới
(`text-4xl font-bold` hoặc utility `.text-display`) tại đúng nơi ở Mục 4.

## 4. Phân cấp thị giác — đòn bẩy chính, làm thí điểm ở Dashboard trước

**[XÁC NHẬN 2026-09-19]** Đã đọc `DashboardSummaryLayout.tsx`/`KpiCard.tsx`: đúng như dự
đoán — mọi KPI render qua cùng 1 vòng lặp, cùng `KpiCard`, không phân biệt cái nào quan
trọng hơn (grid `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` đồng đều). Áp dụng:

- Tách 1 KPI quan trọng nhất (đề xuất: số tài liệu đang chờ duyệt, hoặc chỉ số phù hợp nhất
  với role đăng nhập) dùng type scale `display`, đứng đầu tiên, to hơn rõ rệt các KPI còn lại.
- KPI phụ giữ kích thước nhỏ hơn, gộp nhóm bằng nền `--muted` thay vì mỗi cái 1 border riêng.
- Border/divider dùng để phân nhóm dữ liệu có ý nghĩa thật (VD: nhóm "Tài liệu" tách khỏi
  nhóm "Thiết bị"), không phải trang trí đều khắp mọi khối.

**[DONE THÍ ĐIỂM 2026-09-19, `FE-18.md`]** Đã implement CHỈ trên `DashboardPage` (tab "Tổng quan"): KPI
chính = "Tổng tài liệu" (`size="display"`, `KpiCard.tsx`), 4 KPI phụ gộp 1 khối `bg-muted`
(`DashboardSummaryLayout.tsx`), divider CHỈ giữa nhóm "documents" (Đề xuất/Báo cáo) và "org" (Khoa/Phòng/
Người dùng) — KHÔNG rollout sang 2 tab "Tài sản"/"Thiết bị y tế" (cùng Dashboard nhưng khác widget, chưa
audit) hay bất kỳ trang nào khác. CHỜ user duyệt trên trình duyệt thật trước khi làm dòng dưới đây.

Áp dụng tương tự khi rollout sang các trang `DataTable` (Pass 3, CHƯA làm, CHƯA có task): tiêu đề trang
dùng `h1`, tách bậc rõ với filter/action bar bên dưới thay vì để ngang hàng.

## 5. Chuyển động — giữ nguyên, không thêm

Không thêm hover/fade-in mới ở card/row — đây là dấu hiệu rõ nhất của giao diện tràn lan
hiệu ứng không chủ đích. Giữ nguyên transition mở `AppModal`/`AppDrawer` qua Radix hiện có —
đã là "1 khoảnh khắc có chủ đích" đúng tinh thần restraint, không cần thêm gì khác.

Ngoại lệ DUY NHẤT: components/shared/Toaster.tsx hiện không có animation nào (verify bằng code — 0 kết quả animate/transition) trong khi đây là thành phần xuất hiện thường xuyên nhất (mỗi lần lưu/xoá/duyệt). Cho phép thêm enter/exit animation cho Toaster, dùng ĐÚNG bộ tw-animate-css đã dùng ở AppModal/AppDrawer (không thêm thư viện/pattern mới) — ví dụ slide-in từ trên + fade-in khi xuất hiện, fade-out khi biến mất. Ngoài đúng 1 chỗ này, không mở rộng thêm.

## 6. Nợ kỹ thuật cần vá SONG SONG, không để sau

Từ `FE-16` Mục 4, 2 việc còn ở trạng thái `UNKNOWN` — phải làm trước hoặc cùng lúc với Mục
2-4, để không "làm đẹp xong lại vỡ chỗ khác mà không ai biết":

- **Kiểm tra WCAG AA contrast tự động**: thêm `axe-core` (hoặc `@axe-core/playwright` nếu
  dựng Playwright ở dòng dưới) chạy như 1 test có sẵn trong CI, không cần công cụ ngoài.
- **Visual regression nhẹ**: dựng Playwright screenshot snapshot cho tối thiểu Dashboard, 1
  trang `DataTable` tiêu biểu, 1 Modal, 1 Drawer. Không cần phủ hết ngay, ưu tiên trang có
  thay đổi ở Mục 4 trước.

## 7. Phạm vi áp dụng

Áp dụng cho TOÀN BỘ trang hiện có, bao gồm 15 trang phát sinh từ `DEV-057`→`070`
(Vendors/Contracts/Consumables/2FA/Sessions...) — đã audit nhanh ngày 2026-09-19, toàn bộ
dùng đúng shared components (`DataTable`/`FilterBar`/`StatusBadge`/`useDebounce`) nên sẽ tự
động thừa hưởng khi Mục 2-3 được áp vào tầng component dùng chung ở Pass 3 — không cần sửa
tay từng trang.

## 8. Tham khảo (chỉ lấy pattern, không lấy code/identity)

`tablecn` (sadmann7/tablecn — mã nguồn mở, `shadcn/ui` + `TanStack Table`, cùng stack) —
tham khảo cách tổ chức bộ lọc kiểu Notion và action-bar khi chọn nhiều dòng, dùng khi nâng
cấp `DataTable.tsx`/`FilterBar.tsx` ở Pass 3 (không phải phạm vi tài liệu này).

## 9. Quy trình triển khai tiếp theo

1. **Duyệt tài liệu này trước** — chưa đụng code ở bước này.
2. **Pass 2 — thí điểm**: implement Mục 4 trên `DashboardPage`, review trên browser thật
   trước khi lan ra trang khác.
3. **Pass 3 — rollout**: sau khi duyệt Dashboard, áp Mục 2-3 (màu/type scale) vào shared
   components để lan tự động ra toàn bộ trang còn lại.
4. Tạo task riêng theo đúng quy ước dự án (`FE-17`, tiếp theo `FE-16`) khi bắt đầu Pass 2,
   tuân `CLAUDE.md` Definition of Done như task bình thường (test/build frontend bắt buộc
   theo rule hiện có).

## 10. KHÔNG làm trong tài liệu này

Không đổi giá trị màu OKLCH gốc. Không đổi font. Không thêm animation/decoration ngoài Mục
5. Không tự ý implement — đây là PROPOSAL, cần người dùng duyệt trước, đúng tinh thần
`CLAUDE.md` §41 ("không tự động implement khi chưa được chỉ định cụ thể mục nào").