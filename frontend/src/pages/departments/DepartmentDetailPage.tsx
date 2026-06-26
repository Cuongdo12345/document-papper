// src/pages/departments/DepartmentDetailPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, Descriptions, Skeleton, Empty, Result, Typography, Form, Input, Space, App } from 'antd';
import dayjs from 'dayjs';
import { z } from 'zod';

import AppPageHeader from '../../components/layout/AppPageHeader/AppPageHeader';
import {AppButton} from '../../components/common/AppButton/AppButton';
import { useConfirm } from '../../components/feedback/AppModal/useConfirm';
import { usePermission } from '../../components/feedback/PermissionGate/usePermission';

import {
  useDepartmentDetail,
  useUpdateDepartment,
  useDeleteDepartment,
} from '../../hooks/queries/useDepartment';

import { DEPARTMENT_DELETE_ROLES } from '../../constants/departments/department.permissions';
import {
  DEPARTMENT_SUCCESS_MESSAGES,
  DEPARTMENT_ERROR_MESSAGES,
} from '../../constants/departments/department.constants';
import { extractDepartmentError } from '../../api/services/department.error';

import type { DepartmentFormValues } from '../../types/department/department.dto';

const { Text } = Typography;

// Zod Schema — copy nguyên văn từ DepartmentEditModal (DEPARTMENT_EDIT_MODAL.md §9)
// KHÔNG import trực tiếp từ DepartmentEditModal — tránh dependency ngang List ↔ Detail
const departmentSchema = z.object({
  code: z.string().trim().min(1, 'Mã phòng ban không được để trống'),
  name: z.string().trim().min(1, 'Tên phòng ban không được để trống'),
});

export function DepartmentDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasRole } = usePermission();
  const { confirm, ConfirmElement } = useConfirm();
  const { message } = App.useApp();
  const [form] = Form.useForm<DepartmentFormValues>();

  // ── §1/§2 Inline Edit toggle ──
  const [isEditing, setIsEditing] = useState(false);

  // ── §3 API Integration ──
  const { data: department, isLoading, isError, error, refetch } = useDepartmentDetail(id);
  const updateMutation = useUpdateDepartment();
  const deleteMutation = useDeleteDepartment();

  // ── §4 Permission Rules ──
  const canDelete = hasRole(DEPARTMENT_DELETE_ROLES as unknown as ('ADMIN' | 'IT' | 'USER')[]);

  // Initial Value Mapping — chỉ set khi BẮT ĐẦU edit (không set lại mỗi lần department refetch
  // trong lúc đang gõ, tránh đè giá trị user đang nhập)
  useEffect(() => {
    if (isEditing && department) {
      form.setFieldsValue({ code: department.code, name: department.name });
    }
  }, [isEditing, department, form]);

  const handleStartEdit = () => setIsEditing(true);

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.resetFields();
  };

  const handleFinish = (values: DepartmentFormValues) => {
    if (!department) return; // type guard

    updateMutation.mutate(
      {
        id: department._id,
        payload: { code: values.code.trim(), name: values.name.trim() },
      },
      {
        onSuccess: () => {
          message.success(DEPARTMENT_SUCCESS_MESSAGES.UPDATE);
          setIsEditing(false); // về Trạng thái 1 — không có modal để đóng
        },
        onError: (err) => {
          const msg = extractDepartmentError(err, DEPARTMENT_ERROR_MESSAGES.UPDATE_FAILED);
          message.error(msg);
        },
      },
    );
  };

  const handleDelete = async () => {
    if (!department) return;

    const confirmed = await confirm({
      title: 'Xóa phòng ban',
      description: `Bạn có chắc muốn xóa phòng ban "${department.name}"? Hành động này không thể hoàn tác.`,
      variant: 'critical',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
    });

    if (!confirmed) return;

    deleteMutation.mutate(department._id, {
      onSuccess: () => navigate('/departments'),
    });
  };

  // ── §7 Error State ──
  if (isError) {
    const message_ =
      (error as any)?.response?.data?.message ?? 'Không thể tải thông tin phòng ban';

    return (
      <Result
        status="error"
        title="Không thể tải phòng ban"
        subTitle={message_}
        extra={[
          <AppButton key="retry" onClick={() => refetch()}>
            Thử lại
          </AppButton>,
          <AppButton key="back" variant="secondary" onClick={() => navigate('/departments')}>
            Quay lại danh sách
          </AppButton>,
        ]}
      />
    );
  }

  // ── §6 Empty State (edge case) ──
  if (!isLoading && !department) {
    return <Empty description="Không có dữ liệu phòng ban" />;
  }

  return (
    <>
      <AppPageHeader
        title={department?.name ?? 'Phòng ban'}
        showBack
        breadcrumbs={[
          { label: 'Phòng ban', href: '/departments' },
          { label: department?.name ?? '...' },
        ]}
        // Ẩn toàn bộ actions header khi đang edit — "Lưu thay đổi"/"Hủy" đã nằm trong Form (§2)
        actions={
          isEditing
            ? []
            : [
                {
                  key: 'edit',
                  label: 'Chỉnh sửa',
                  variant: 'primary',
                  onClick: handleStartEdit,
                },
                {
                  key: 'delete',
                  label: 'Xóa',
                  variant: 'danger',
                  hidden: !canDelete,
                  onClick: handleDelete,
                },
              ]
        }
      />

      {/* ── §5 Loading State ── */}
      {isLoading ? (
        <Card>
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
      ) : isEditing ? (
        // ── §2 Information Sections — Trạng thái 2: Inline Edit ──
        <Card>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleFinish}
            disabled={updateMutation.isPending}
            requiredMark={false}
          >
            <Form.Item
              name="code"
              label="Mã phòng ban"
              rules={[
                {
                  validator: async (_, value) => {
                    const result = departmentSchema.shape.code.safeParse(value);
                    if (!result.success) throw new Error(result.error.errors[0]?.message);
                  },
                },
              ]}
            >
              <Input
                placeholder="Nhập mã phòng ban..."
                maxLength={50}
                allowClear
                onChange={(e) => form.setFieldValue('code', e.target.value.toUpperCase())}
              />
            </Form.Item>

            <Form.Item
              name="name"
              label="Tên phòng ban"
              rules={[
                {
                  validator: async (_, value) => {
                    const result = departmentSchema.shape.name.safeParse(value);
                    if (!result.success) throw new Error(result.error.errors[0]?.message);
                  },
                },
              ]}
            >
              <Input placeholder="Nhập tên phòng ban..." maxLength={100} allowClear />
            </Form.Item>

            <Space>
              <AppButton variant="primary" htmlType="submit" loading={updateMutation.isPending}>
                Lưu thay đổi
              </AppButton>
              <AppButton
                variant="secondary"
                onClick={handleCancelEdit}
                disabled={updateMutation.isPending}
              >
                Hủy
              </AppButton>
            </Space>
          </Form>
        </Card>
      ) : (
        // ── §2 Information Sections — Trạng thái 1: Read-only ──
        <Card>
          <Descriptions column={1} labelStyle={{ width: 160 }}>
            <Descriptions.Item label="Mã phòng ban">
              <Text strong>{department!.code}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Tên phòng ban">
              <Text>{department!.name}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">
              {dayjs(department!.createdAt).format('DD/MM/YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* ── §8 Drawer/Modal Integration — chỉ useConfirm, không Modal/Drawer ── */}
      {ConfirmElement}
    </>
  );
}