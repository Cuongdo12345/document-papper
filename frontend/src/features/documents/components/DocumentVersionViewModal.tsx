import { AppModal } from "@/components/shared/AppModal";
import { DocumentMetaView } from "@/features/documents/components/DocumentMetaView";
import type { DocumentSubType, DocumentVersion } from "@/types/document.types";

interface DocumentVersionViewModalProps {
  open: boolean;
  onClose: () => void;
  subType: DocumentSubType;
  version: DocumentVersion;
}

/**
 * Roadmap A4 — xem lại nội dung 1 phiên bản CŨ, CHỈ ĐỌC (không có nút
 * "Khôi phục" — quyết định đã chốt với user: mục đích thuần kiểm toán, xem
 * lại "trước khi sửa nó viết gì", không đổi logic nghiệp vụ nào khác).
 * Tái dùng ĐÚNG `DocumentMetaView` hiển thị nội dung hiện tại — `meta` của 1
 * version cũ có CÙNG shape với `Document.meta` (chỉ khác giá trị, không
 * khác cấu trúc — `subType` không nằm trong field có thể sửa qua PUT nên
 * luôn khớp `subType` hiện tại của document).
 */
export function DocumentVersionViewModal({ open, onClose, subType, version }: DocumentVersionViewModalProps) {
  return (
    <AppModal open={open} onClose={onClose} title={`Phiên bản ${version.versionNumber}`}>
      <div className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Do <span className="font-medium text-foreground">{version.editedBy?.fullName ?? "—"}</span> tạo ra — có hiệu
          lực tới {new Date(version.createdAt).toLocaleString("vi-VN")} (lúc bị thay bằng nội dung mới hơn).
        </p>

        <div>
          <h3 className="text-sm font-medium text-foreground">Tiêu đề</h3>
          <p className="text-sm text-foreground">{version.title}</p>
        </div>

        <div>
          <h3 className="mb-1 text-sm font-medium text-foreground">Nội dung</h3>
          <DocumentMetaView subType={subType} meta={version.meta} />
        </div>
      </div>
    </AppModal>
  );
}
