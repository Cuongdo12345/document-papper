// src/pages/departments/DepartmentListPage.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { Typography, Alert, App } from "antd";
import dayjs from "dayjs";

import AppPageHeader from "../../components/layout/AppPageHeader/AppPageHeader";
// ⚠️ Đã sửa: 'from' → 'form' (kiểm tra lại đúng tên thư mục thật trong project)
import { FilterBar } from "../../components/from/FilterBar/FilterBar";
import { DataTable } from "../../components/data-display/DataTable/DataTable";
import type {
  DataTableColumn,
} from "../../components/data-display/DataTable/DataTable.types";
import { AppButton } from "../../components/common/AppButton/AppButton";
import { useConfirm } from "../../components/feedback/AppModal/useConfirm";
import { usePermission } from "../../components/feedback/PermissionGate/usePermission";

import { useTableFilter } from "../../hooks/app/useTableFilter";
import {
  useDepartments,
  useDeleteDepartment,
} from "../../hooks/queries/useDepartment";

import { DepartmentCreateModal } from "./components/DepartmentCreateModal";
import { DepartmentEditModal } from "./components/DepartmentEditModal";

import {
  DEPARTMENT_ROUTES,
  DEPARTMENT_FILTER_FIELDS,
  DEPARTMENT_LIST_DEFAULTS,
  DEPARTMENT_EMPTY_TEXT,
  DEPARTMENT_DELETE_CONFIRM,
  DEPARTMENT_SUCCESS_MESSAGES,
  DEPARTMENT_ERROR_MESSAGES,
  DEPARTMENT_QUERY_KEYS,
} from "../../constants/departments/department.constants";
import { DEPARTMENT_DELETE_ROLES } from "../../constants/departments/department.permissions";
import { extractDepartmentError } from "../../api/services/department.error";

import type { Department } from "../../types/department/department.types";
import type { GetDepartmentsParams } from "../../types/department/department.dto";

const { Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────
// DepartmentListPage — SCR-14
// Route:  /departments
// Guard:  PrivateRoute allowedRoles={['ADMIN', 'IT']}
// Layout: MainLayout
// ─────────────────────────────────────────────────────────────────────────────
export function DepartmentListPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  // ⚠️ Đã bỏ `isAdmin` — không dùng ở đâu trong file (chỉ `hasRole` được dùng)
  const { hasRole } = usePermission();
  const { confirm, ConfirmElement } = useConfirm();

  // ── Local state — Create/Edit Modal đã build (FE-09C P2) ──
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  // ── Filter/pagination/sort sync URL SearchParams qua useTableFilter ──
  // params đã ghép sẵn { keyword, code, name, page, limit, sortBy, order }
  const {
    filters,
    page,
    limit,
    sortBy,
    order,
    params,
    setFilters,
    resetFilters,
    setTableChange,
  } = useTableFilter<GetDepartmentsParams>({
    filterKeys: ["keyword", "code", "name"],
    defaultSortBy: DEPARTMENT_LIST_DEFAULTS.sortBy,
    defaultOrder: DEPARTMENT_LIST_DEFAULTS.order,
  });

  // ── Server state ──
  // ⚠️ useDepartments KHÔNG trả `refetch` — hook trả object tự định nghĩa
  //   { data, pagination, departmentOptions, isLoading, isFetching, isError, error }
  //   không phải raw UseQueryResult (DEPARTMENT_QUERY_HOOKS.md §5)
  const { data, pagination, isLoading, isFetching, isError, error } =
    useDepartments(params);
  const queryClient = useQueryClient();

  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: DEPARTMENT_QUERY_KEYS.list(params) });
  };

  // ── Mutations ──
  const deleteMutation = useDeleteDepartment();

  // ── Permission — Action "Xóa": ADMIN luôn được, IT theo NEED MORE ANALYSIS ──
  const canDelete = hasRole(
    DEPARTMENT_DELETE_ROLES as unknown as ("ADMIN" | "IT" | "USER")[],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────

  // Delete — dùng useConfirm() vì không có field nhập liệu
  // ⚠️ Bug: server luôn trả 400 cho mọi lỗi (kể cả còn ràng buộc user/document)
  //   → đọc error.response?.data?.message qua extractDepartmentError, không dùng status
  const handleDelete = async (record: Department) => {
    const confirmed = await confirm({
      title: DEPARTMENT_DELETE_CONFIRM.title,
      description: `Bạn có chắc muốn xóa phòng ban "${record.name}"? Hành động này không thể hoàn tác.`,
      variant: DEPARTMENT_DELETE_CONFIRM.variant,
      confirmText: DEPARTMENT_DELETE_CONFIRM.confirmText,
      cancelText: DEPARTMENT_DELETE_CONFIRM.cancelText,
    });

    if (!confirmed) return;

    deleteMutation.mutate(record._id, {
      onSuccess: () => {
        message.success(DEPARTMENT_SUCCESS_MESSAGES.DELETE);
      },
      onError: (err) => {
        const msg = extractDepartmentError(err, DEPARTMENT_ERROR_MESSAGES.DELETE_FAILED);
        message.error(msg);
      },
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Table columns
  // ─────────────────────────────────────────────────────────────────────────

  const columns: DataTableColumn<Department>[] = [
    {
      key: "code",
      title: "Mã phòng ban",
      dataIndex: "code",
      sorter: true,
      render: (value: unknown) => <Text strong>{value as string}</Text>,
    },
    {
      key: "name",
      title: "Tên phòng ban",
      dataIndex: "name",
      sorter: true, // NEED MORE ANALYSIS — whitelist sortable fields chưa xác nhận đầy đủ
    },
    {
      key: "createdAt",
      title: "Ngày tạo",
      dataIndex: "createdAt",
      sorter: true, // NEED MORE ANALYSIS
      render: (value: unknown) => dayjs(value as string).format("DD/MM/YYYY HH:mm"),
    },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── 1. Page Header ── */}
      <AppPageHeader
        title="Phòng ban"
        showBack={false}
        actions={[
          {
            key: "create",
            label: "Tạo phòng ban",
            variant: "primary",
            icon: <PlusOutlined />,
            onClick: () => setIsCreateModalOpen(true),
            // ADMIN + IT đều được tạo — không cần hidden/PermissionGate (DEPARTMENT_UI_SPEC §11)
          },
        ]}
      />

      {/* ── 2. Filter Bar ── */}
      {/* Search (keyword) nằm trong FilterBar — không tách riêng, không dùng DataTable.search */}
      <FilterBar
        fields={DEPARTMENT_FILTER_FIELDS}
        values={filters}
        onFilter={setFilters}
        onReset={resetFilters}
        loading={isLoading || isFetching}
        collapsible={false}
      />

      {/* ── 3. Error State — render thay DataTable khi query lỗi ── */}
      {isError ? (
        <Alert
          type="error"
          message="Không thể tải danh sách phòng ban"
          description={extractDepartmentError(error, "Vui lòng thử lại sau")}
          action={
            <AppButton variant="secondary" size="small" onClick={handleRetry}>
              Thử lại
            </AppButton>
          }
          style={{ marginBottom: 16 }}
        />
      ) : (
        /* ── 4. Data Table ── */
        <DataTable<Department>
          dataSource={data}
          columns={columns}
          rowKey="_id"
          actions={[
            {
              key: "view",
              label: "Xem",
              icon: <EyeOutlined />,
              onClick: (record) => navigate(DEPARTMENT_ROUTES.DETAIL(record._id)),
            },
            {
              key: "edit",
              label: "Sửa",
              icon: <EditOutlined />,
              onClick: (record) => setEditingDept(record),
            },
            {
              key: "delete",
              label: "Xóa",
              icon: <DeleteOutlined />,
              danger: true,
              // Phương án B (DEPARTMENT_UI_SPEC §11): hidden function tại action-level,
              // KHÔNG dùng PermissionGate bao quanh DataTable.actions (Reuse Rule DataTable #5)
              hidden: () => !canDelete,
              onClick: handleDelete,
            },
          ]}
          pagination={pagination ?? { page, limit, total: 0, totalPages: 0 }}
          onTableChange={setTableChange}
          currentSort={{ field: sortBy, order }}
          loading={isLoading || isFetching}
          emptyText={DEPARTMENT_EMPTY_TEXT}
        />
      )}

      {/* ── 5. useConfirm mount point — PHẢI mount trong JSX, invisible khi không active ── */}
      {ConfirmElement}

      {/* ── 6. Create / Edit Modal — đã build, mount thật (không còn comment) ── */}
      <DepartmentCreateModal
        open={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
      <DepartmentEditModal
        department={editingDept} // null → modal closed; Department → modal open
        onClose={() => setEditingDept(null)}
      />
    </>
  );
}