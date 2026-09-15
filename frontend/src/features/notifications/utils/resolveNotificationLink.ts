import type { NotificationItem } from "@/types/notification.types";

/**
 * CHỈ trả link cho `resourceType` có trang chi tiết THẬT SỰ tồn tại ở FE
 * hiện tại — xác nhận qua `routes/index.tsx`:
 *   - `Document` → `/app/documents/:id` (có).
 *   - `Asset` → `/app/assets/:id` (có).
 *   - `WorkflowInstance` → resourceId là ID của WorkflowInstance (xem
 *     `workflow.service.ts`), KHÔNG PHẢI Document — FE chưa có route
 *     `/app/workflows/:id` (chỉ có `/app/workflows/pending`, 1 danh sách).
 *   - `ImportHistory` → chưa có trang nào (Upload/Excel UI chưa làm).
 * 2 loại sau trả `null` — UI hiện thông báo KHÔNG bấm được thay vì dẫn tới
 * route 404 (evidence-based, CLAUDE.md Mục 19 — không tự bịa link khi chưa
 * chắc có trang đích thật).
 */
export function resolveNotificationLink(n: Pick<NotificationItem, "resourceType" | "resourceId">): string | null {
  if (!n.resourceType || !n.resourceId) return null;

  switch (n.resourceType) {
    case "Document":
      return `/app/documents/${n.resourceId}`;
    case "Asset":
      return `/app/assets/${n.resourceId}`;
    default:
      return null;
  }
}
