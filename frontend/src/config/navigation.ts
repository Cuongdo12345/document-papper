import type { ComponentType } from "react";
import { LayoutDashboard, FileText, ClipboardCheck, Boxes, Users, Building2, ShieldCheck, ScrollText, Bell, Paperclip, Package, Handshake, FileSignature, Laptop, Network } from "lucide-react";
import { PERMISSIONS, type Permission } from "@/constants/permissions";

export interface NavItem {
  label: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  /** Permission cần có để HIỂN THỊ mục này — dùng `usePermission().hasPermission()`, KHÔNG tự tính. */
  permission?: Permission;
  /**
   * FE-20 — nhãn nhóm hiển thị ở Sidebar (phân cấp thị giác). Để trống với
   * mục đứng riêng không thuộc domain nào (chỉ còn "Tổng quan" — xem comment
   * gốc). [SỬA FE-22, 2026-09-20] "Thông báo"/"Tệp tin" TỪNG đứng riêng, nay
   * user chỉ định gộp vào nhóm "Quản trị hệ thống" — Sidebar nhóm theo DÃY
   * LIỀN KỀ trong mảng này (không tự sắp xếp lại lúc render), nên 2 mục này
   * đã ĐƯỢC DỜI VỊ TRÍ xuống cạnh cụm "Quản trị hệ thống" bên dưới để nhóm
   * đúng — không còn giữ nguyên thứ tự gốc như FE-20/21 từng yêu cầu (task
   * này ghi đè ràng buộc đó, đúng chỉ định mới của user).
   */
  group?: string;
}

/**
 * ROUTE_PERMISSION_MAP.md — sidebar chỉ hiển thị mục navigation user CÓ
 * quyền xem (Mục 19 FE-01: "KHÔNG hard-code tất cả menu cho mọi role").
 * Domain nào chưa có trang thật (FE-02+) vẫn khai báo ở đây để Sidebar có
 * placeholder route + FE task sau chỉ cần thêm page thật, không sửa Sidebar.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Tổng quan", path: "/app", icon: LayoutDashboard, permission: PERMISSIONS.DASHBOARD_READ },
  { label: "Tài liệu", path: "/app/documents", icon: FileText, permission: PERMISSIONS.DOCUMENT_VIEW, group: "Tài liệu" },
  // FE-05 (roadmap Mục 11) — hộp thư chờ duyệt. Đổi nhãn "Chờ duyệt" →
  // "Duyệt tài liệu" (2026-09-10) — trang đích giờ có thêm tab "Lịch sử"
  // (xem `PendingApprovalsPage.tsx`), nhãn cũ không còn phản ánh đủ phạm vi.
  {
    label: "Duyệt tài liệu",
    path: "/app/workflows/pending",
    icon: ClipboardCheck,
    permission: PERMISSIONS.WORKFLOW_VIEW,
    group: "Tài liệu",
  },
  // FE-06 (roadmap Mục 12) — Assets Core UI.
  { label: "Tài sản", path: "/app/assets", icon: Boxes, permission: PERMISSIONS.ASSET_VIEW, group: "Tài sản & Vật tư" },
  // Roadmap B3 (Quản lý vật tư tiêu hao, 2026-09-15) — module MỚI, tách biệt
  // hoàn toàn với "Tài sản" (Asset) nên có mục sidebar riêng, không lồng con.
  {
    label: "Vật tư tiêu hao",
    path: "/app/inventory",
    icon: Package,
    permission: PERMISSIONS.CONSUMABLE_VIEW,
    group: "Tài sản & Vật tư",
  },
  // Roadmap B4 (Quản lý nhà cung cấp & hợp đồng bảo trì, 2026-09-16) — 2 mục
  // riêng (khác gate permission: VENDOR_VIEW vs CONTRACT_VIEW), dù liên quan
  // chặt (1 Contract luôn thuộc 1 Vendor) — cùng cách "Tài sản"/"Vật tư tiêu
  // hao" tách riêng dù cùng nhóm quản lý tài sản-vật tư.
  { label: "Nhà cung cấp", path: "/app/vendors", icon: Handshake, permission: PERMISSIONS.VENDOR_VIEW, group: "Nhà cung cấp" },
  {
    label: "Hợp đồng bảo trì",
    path: "/app/contracts",
    icon: FileSignature,
    permission: PERMISSIONS.CONTRACT_VIEW,
    group: "Nhà cung cấp",
  },
  { label: "Người dùng", path: "/app/users", icon: Users, permission: PERMISSIONS.USER_VIEW, group: "Quản trị hệ thống" },
  // Roadmap C3 (Giám sát phiên đăng nhập toàn hệ thống, DEV-070, 2026-09-19)
  // — trang RIÊNG, dùng LẠI permission SESSION_VIEW_ALL (đã có từ C2).
  {
    label: "Phiên đăng nhập",
    path: "/app/sessions",
    icon: Laptop,
    permission: PERMISSIONS.SESSION_VIEW_ALL,
    group: "Quản trị hệ thống",
  },
  {
    label: "Khoa/Phòng",
    path: "/app/departments",
    icon: Building2,
    permission: PERMISSIONS.DEPARTMENT_VIEW,
    group: "Quản trị hệ thống",
  },
  // FE-08 (roadmap Mục 16) — RBAC Admin UI. `path:"/app/rbac"` (KHÔNG phải
  // "/app/rbac/roles") để Sidebar NavLink (`end=false` mặc định) vẫn giữ
  // trạng thái active khi user đang ở tab Permissions/Policies, không chỉ
  // Roles — router tự `Navigate` "/app/rbac" -> "/app/rbac/roles" (index
  // route). Gate bằng `ROLE_VIEW` — thực tế chỉ ADMIN giữ permission này
  // (xem `ROUTE_PERMISSION_MAP.md`), nav item tự ẩn với mọi role khác.
  { label: "Phân quyền", path: "/app/rbac", icon: ShieldCheck, permission: PERMISSIONS.ROLE_VIEW, group: "Quản trị hệ thống" },
  {
    label: "Nhật ký audit",
    path: "/app/audit-logs",
    icon: ScrollText,
    permission: PERMISSIONS.AUDIT_VIEW,
    group: "Quản trị hệ thống",
  },
  // FE-12/FE-13 — Notifications. KHÔNG gán `permission` (self-scoped, route
  // backend chỉ `authenticate` — mọi user đăng nhập đều có hộp thư riêng,
  // KHÔNG phải tính năng chỉ ADMIN mới thấy — gộp vào nhóm "Quản trị hệ
  // thống" ở đây CHỈ là vị trí hiển thị theo yêu cầu user (FE-22), KHÔNG
  // đổi ai xem được mục này). ⚠️ SỬA (2026-09-10, user báo thiếu): trước đây
  // CHỦ Ý không thêm mục này (lý do gốc: "personal inbox kiểu Gmail/Slack,
  // chỉ cần chuông") — nhưng từ khi có tab "Quản trị" (FE-13, gửi/xem thông
  // báo cho ADMIN), việc CHỈ reach được qua dropdown chuông → "Xem tất cả"
  // → tab "Quản trị" là đường đi quá sâu cho 1 tính năng quản trị thật.
  // Thêm lại vào sidebar cho cả 2 nhóm user (hộp thư cá nhân CHO MỌI NGƯỜI +
  // lối vào rõ ràng hơn tới tab "Quản trị" cho ai có quyền) — tab đó vẫn tự
  // ẩn đúng permission khi vào trang, không đổi gì ở `NotificationsPage.tsx`.
  // [SỬA FE-22, 2026-09-20] Dời từ vị trí đứng riêng (sau "Duyệt tài liệu")
  // xuống đây, gán `group: "Quản trị hệ thống"` theo chỉ định trực tiếp của
  // user — KHÔNG đổi path/permission.
  { label: "Thông báo", path: "/app/notifications", icon: Bell, group: "Quản trị hệ thống" },
  // FE-15 (roadmap Mục 20) — thư viện file độc lập (KHÔNG gắn với
  // Document/Asset nào, xem `types/file.types.ts` comment gốc). [SỬA FE-22,
  // 2026-09-20] Dời từ vị trí đứng riêng cuối danh sách lên đây, gán
  // `group: "Quản trị hệ thống"` theo chỉ định trực tiếp của user — KHÔNG
  // đổi path/permission.
  { label: "Tệp tin", path: "/app/files", icon: Paperclip, permission: PERMISSIONS.VIEW_FILES, group: "Quản trị hệ thống" },
  // DEV-072/FE-23 (2026-09-21) — "System Design": bản đồ module + quan hệ dữ
  // liệu nội bộ, CHỈ dev/admin (permission mới `SYSTEM_DESIGN_VIEW`, gán cho
  // IT — role kỹ thuật gần nghĩa "dev" nhất trong 6 role hiện có; ADMIN có
  // qua wildcard). Đặt CUỐI dãy liền kề "Quản trị hệ thống" (yêu cầu user:
  // xếp vào nhóm này) — không chèn giữa để tránh xáo trộn thứ tự FE-22 vừa
  // chỉnh.
  { label: "System Design", path: "/app/system-design", icon: Network, permission: PERMISSIONS.SYSTEM_DESIGN_VIEW, group: "Quản trị hệ thống" },
];
