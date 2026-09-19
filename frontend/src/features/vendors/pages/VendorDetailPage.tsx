import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Pencil, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { DataTable, type DataTableColumn } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/auth/PermissionGuard";
import { PERMISSIONS } from "@/constants/permissions";
import { useVendorDetail } from "@/features/vendors/hooks/useVendorDetail";
import { useContracts } from "@/features/vendors/hooks/useContracts";
import { EditVendorModal } from "@/features/vendors/components/EditVendorModal";
import { CreateContractModal } from "@/features/vendors/components/CreateContractModal";
import { parseApiError } from "@/utils/parseApiError";
import type { Contract } from "@/types/contract.types";

function contractStatusBadge(contract: Contract) {
  if (contract.status === "cancelled") return <StatusBadge variant="default">Đã huỷ</StatusBadge>;
  if (contract.isExpired) return <StatusBadge variant="destructive">Đã hết hạn</StatusBadge>;
  return <StatusBadge variant="success">Còn hiệu lực</StatusBadge>;
}

/** Roadmap B4 (2026-09-16) — `/app/vendors/:id`. Thông tin NCC + danh sách hợp đồng đã ký. */
export function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const vendorQuery = useVendorDetail(id);
  const contractsQuery = useContracts({ vendor: id, limit: 50 });

  const [editOpen, setEditOpen] = useState(false);
  const [createContractOpen, setCreateContractOpen] = useState(false);

  if (vendorQuery.isLoading) return <LoadingState label="Đang tải chi tiết nhà cung cấp..." />;
  if (vendorQuery.isError || !vendorQuery.data) {
    return (
      <ErrorState
        message={vendorQuery.error ? parseApiError(vendorQuery.error).message : "Không tìm thấy nhà cung cấp"}
        onRetry={() => vendorQuery.refetch()}
      />
    );
  }

  const vendor = vendorQuery.data;
  const contracts = contractsQuery.data?.data ?? [];

  const columns: DataTableColumn<Contract>[] = [
    {
      key: "title",
      header: "Tên hợp đồng",
      render: (row) => (
        <Link to={`/app/contracts/${row._id}`} className="font-medium text-primary hover:underline">
          {row.title}
        </Link>
      ),
    },
    { key: "contractNumber", header: "Số hợp đồng", render: (row) => row.contractNumber || "—" },
    { key: "assets", header: "Số tài sản", render: (row) => row.assets.length },
    { key: "endDate", header: "Hết hạn", render: (row) => new Date(row.endDate).toLocaleDateString("vi-VN") },
    { key: "status", header: "Trạng thái", render: contractStatusBadge },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={vendor.name}
        description={vendor.contactPerson ? `Liên hệ: ${vendor.contactPerson}` : undefined}
        breadcrumb={[{ label: "Nhà cung cấp", to: "/app/vendors" }, { label: vendor.name }]}
        actions={
          <PermissionGuard permission={PERMISSIONS.VENDOR_UPDATE}>
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Pencil /> Sửa
            </Button>
          </PermissionGuard>
        }
      />

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-4">
        <div>
          <p className="text-xs text-muted-foreground">Điện thoại</p>
          <p className="mt-1 text-sm font-medium text-foreground">{vendor.phone || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Email</p>
          <p className="mt-1 text-sm font-medium text-foreground">{vendor.email || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Địa chỉ</p>
          <p className="mt-1 text-sm font-medium text-foreground">{vendor.address || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Trạng thái</p>
          <p className="mt-1">
            <StatusBadge variant={vendor.isActive ? "success" : "default"}>
              {vendor.isActive ? "Đang hợp tác" : "Ngừng hợp tác"}
            </StatusBadge>
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Hợp đồng đã ký</h2>
          <PermissionGuard permission={PERMISSIONS.CONTRACT_CREATE}>
            <Button variant="secondary" size="sm" onClick={() => setCreateContractOpen(true)}>
              <Plus /> Tạo hợp đồng
            </Button>
          </PermissionGuard>
        </div>
        <DataTable
          columns={columns}
          data={contracts}
          keyExtractor={(row) => row._id}
          isLoading={contractsQuery.isLoading}
          isError={contractsQuery.isError}
          errorMessage={contractsQuery.error ? parseApiError(contractsQuery.error).message : undefined}
          onRetry={() => contractsQuery.refetch()}
          emptyTitle="Chưa có hợp đồng nào"
          emptyMessage="Tạo hợp đồng đầu tiên với nhà cung cấp này."
        />
      </div>

      {editOpen && <EditVendorModal open={editOpen} onClose={() => setEditOpen(false)} vendor={vendor} />}
      {createContractOpen && (
        <CreateContractModal
          open={createContractOpen}
          onClose={() => setCreateContractOpen(false)}
          vendorId={vendor._id}
          vendorLabel={vendor.name}
        />
      )}
    </div>
  );
}
