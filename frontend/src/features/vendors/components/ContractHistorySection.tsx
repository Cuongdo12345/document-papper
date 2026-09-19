import { Link } from "react-router-dom";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ErrorState } from "@/components/shared/ErrorState";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { useContractsForAsset } from "@/features/vendors/hooks/useContractsForAsset";
import { parseApiError } from "@/utils/parseApiError";
import type { Contract } from "@/types/contract.types";

function vendorName(contract: Contract) {
  return typeof contract.vendor === "string" ? "—" : contract.vendor.name;
}

function statusBadge(contract: Contract) {
  if (contract.status === "cancelled") return <StatusBadge variant="default">Đã huỷ</StatusBadge>;
  if (contract.isExpired) return <StatusBadge variant="destructive">Đã hết hạn</StatusBadge>;
  return <StatusBadge variant="success">Còn hiệu lực</StatusBadge>;
}

/**
 * Roadmap B4 (2026-09-16) — "Hợp đồng bảo trì" trong `AssetDetailPage`.
 * CHỈ ĐỌC (xem hợp đồng nào đang áp dụng cho asset này) — tạo/sửa hợp đồng
 * thực hiện ở trang Nhà cung cấp/Hợp đồng riêng (1 hợp đồng có thể áp dụng
 * NHIỀU asset, không hợp lý để "tạo hợp đồng" ngay tại 1 trang asset).
 */
export function ContractHistorySection({ assetId }: { assetId: string }) {
  const { hasPermission } = usePermission();
  const canView = hasPermission(PERMISSIONS.CONTRACT_VIEW);

  const query = useContractsForAsset(canView ? assetId : undefined);

  if (!canView) return null;

  const contracts = query.data ?? [];

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <h2 className="text-sm font-semibold text-foreground">Hợp đồng bảo trì</h2>

      {query.isLoading && <p className="text-sm text-muted-foreground">Đang tải...</p>}
      {query.isError && <ErrorState message={parseApiError(query.error).message} onRetry={() => query.refetch()} />}
      {query.data && contracts.length === 0 && (
        <p className="text-sm text-muted-foreground">Chưa có hợp đồng bảo trì/bảo hành nào áp dụng cho tài sản này.</p>
      )}

      {contracts.length > 0 && (
        <ul className="space-y-2">
          {contracts.map((c) => (
            <li key={c._id} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link to={`/app/contracts/${c._id}`} className="font-medium text-primary hover:underline">
                  {c.title}
                </Link>
                {statusBadge(c)}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                NCC: {vendorName(c)} · Hết hạn: {new Date(c.endDate).toLocaleDateString("vi-VN")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
