import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Pencil, Ban } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { useContractDetail } from "@/features/vendors/hooks/useContractDetail";
import { useCancelContract } from "@/features/vendors/hooks/useContractActions";
import { EditContractModal } from "@/features/vendors/components/EditContractModal";
import { WorkflowActionModal } from "@/features/documents/components/WorkflowActionModal";
import { parseApiError } from "@/utils/parseApiError";

/** Roadmap B4 (2026-09-16) — `/app/contracts/:id`. Chi tiết hợp đồng + danh sách tài sản áp dụng. */
export function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const query = useContractDetail(id);
  const cancelMutation = useCancelContract();

  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (query.isLoading) return <LoadingState label="Đang tải chi tiết hợp đồng..." />;
  if (query.isError || !query.data) {
    return <ErrorState message={query.error ? parseApiError(query.error).message : "Không tìm thấy hợp đồng"} onRetry={() => query.refetch()} />;
  }

  const contract = query.data;
  const vendorName = typeof contract.vendor === "string" ? "—" : contract.vendor.name;
  const statusBadge =
    contract.status === "cancelled" ? (
      <StatusBadge variant="default">Đã huỷ</StatusBadge>
    ) : contract.isExpired ? (
      <StatusBadge variant="destructive">Đã hết hạn</StatusBadge>
    ) : (
      <StatusBadge variant="success">Còn hiệu lực</StatusBadge>
    );

  return (
    <div className="space-y-4">
      <PageHeader
        title={contract.title}
        description={`NCC: ${vendorName}${contract.contractNumber ? ` · Số HĐ: ${contract.contractNumber}` : ""}`}
        breadcrumb={[{ label: "Hợp đồng bảo trì", to: "/app/contracts" }, { label: contract.title }]}
        actions={
          contract.status === "active" ? (
            <div className="flex gap-2">
              <PermissionGuard permission={PERMISSIONS.CONTRACT_UPDATE}>
                <Button variant="secondary" size="sm" onClick={() => setCancelOpen(true)}>
                  <Ban /> Huỷ hợp đồng
                </Button>
                <Button size="sm" onClick={() => setEditOpen(true)}>
                  <Pencil /> Sửa
                </Button>
              </PermissionGuard>
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Ngày bắt đầu</p>
          <p className="mt-1 text-sm font-medium text-foreground">{new Date(contract.startDate).toLocaleDateString("vi-VN")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Ngày kết thúc</p>
          <p className="mt-1 text-sm font-medium text-foreground">{new Date(contract.endDate).toLocaleDateString("vi-VN")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Trạng thái</p>
          <p className="mt-1">{statusBadge}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Số tài sản áp dụng</p>
          <p className="mt-1 text-sm font-medium text-foreground">{contract.assets.length}</p>
        </div>
      </div>

      {contract.description && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Điều khoản/ghi chú</h2>
          <p className="mt-1 text-sm text-muted-foreground">{contract.description}</p>
        </div>
      )}

      {contract.cancelReason && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Lý do huỷ</h2>
          <p className="mt-1 text-sm text-muted-foreground">{contract.cancelReason}</p>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-foreground">Tài sản áp dụng</h2>
        <ul className="space-y-1 rounded-lg border border-border bg-card p-4">
          {contract.assets.map((a) =>
            typeof a === "string" ? (
              <li key={a} className="text-sm text-muted-foreground">
                {a}
              </li>
            ) : (
              <li key={a._id} className="text-sm">
                <Link to={`/app/assets/${a._id}`} className="font-medium text-primary hover:underline">
                  {a.assetCode} — {a.name}
                </Link>
                {a.department && <span className="text-muted-foreground"> ({a.department.name})</span>}
              </li>
            ),
          )}
        </ul>
      </div>

      {editOpen && <EditContractModal open={editOpen} onClose={() => setEditOpen(false)} contract={contract} />}

      {cancelOpen && (
        <WorkflowActionModal
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
          title="Huỷ hợp đồng"
          message={`Huỷ hợp đồng "${contract.title}"?`}
          confirmLabel="Huỷ hợp đồng"
          danger
          isLoading={cancelMutation.isPending}
          onConfirm={(note) =>
            cancelMutation.mutate(
              { id: contract._id, body: { cancelReason: note } },
              { onSuccess: () => setCancelOpen(false) },
            )
          }
        />
      )}
    </div>
  );
}
