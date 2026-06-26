import { useEffect } from 'react';
import { App, Form, Input } from 'antd';
import { z } from 'zod';

import AppModal from '../../../components/feedback/AppModal/AppModal';
import { useUpdateDepartment } from '../../../hooks/queries/useDepartment';

import type { Department } from '../../../types/department/department.types';
import type { DepartmentFormValues } from '../../../types/department/department.dto';

import {
  DEPARTMENT_MODAL_WIDTH,
  DEPARTMENT_SUCCESS_MESSAGES,
  DEPARTMENT_ERROR_MESSAGES,
} from '../../../constants/departments/department.constants';

import { extractDepartmentError } from '../../../api/services/department.error';

// Zod Schema — copy nguyên văn từ DepartmentCreateModal
const departmentSchema = z.object({
  code: z.string().trim().min(1, 'Mã phòng ban không được để trống'),
  name: z.string().trim().min(1, 'Tên phòng ban không được để trống'),
});

export interface DepartmentEditModalProps {
  /**
   * Department đang sửa — null nghĩa là modal đóng.
   * KHÁC Create Modal: không có `open` boolean riêng — suy ra trực tiếp từ
   * giá trị này (ưu tiên state thật đã build tại DepartmentListPage).
   */
  department: Department | null;
  /** Close handler — DepartmentListPage gọi setEditingDept(null) */
  onClose: () => void;
}

// Trigger: Action "Sửa" trong DataTable.actions (DepartmentListPage)
// API:     PUT /api/departments/:id
// ⚠️ Bug: server luôn trả 400 cho mọi lỗi (kể cả 404 not-found)
export function DepartmentEditModal({
  department,
  onClose,
}: DepartmentEditModalProps) {
  const { message } = App.useApp();
  const [form] = Form.useForm<DepartmentFormValues>();

  const updateMutation = useUpdateDepartment();

  // Initial Value Mapping — không dùng form.setFieldsValue(department) trực
  // tiếp vì entity có field thừa (_id, createdAt, updatedAt) ngoài form cần.
  useEffect(() => {
    if (department) {
      form.setFieldsValue({
        code: department.code,
        name: department.name,
      });
    }
  }, [department, form]);

  const handleClose = () => {
    onClose();
  };

  const handleSuccess = () => {
    message.success(DEPARTMENT_SUCCESS_MESSAGES.UPDATE);
    onClose();
  };

  const handleError = (error: unknown) => {
    const msg = extractDepartmentError(error, DEPARTMENT_ERROR_MESSAGES.UPDATE_FAILED);
    message.error(msg);
  };

  const handleFinish = (values: DepartmentFormValues) => {
    if (!department) return; // type guard

    updateMutation.mutate(
      {
        id: department._id,
        payload: {
          code: values.code.trim(),
          name: values.name.trim(),
        },
      },
      {
        onSuccess: handleSuccess,
        onError: handleError,
      },
    );
  };

  return (
    <AppModal
      open={department !== null}
      onClose={handleClose}
      title="Sửa phòng ban"
      variant="standard"
      footerMode="confirm-cancel"
      onConfirm={() => form.submit()}
      confirmText="Lưu thay đổi"
      confirmLoading={updateMutation.isPending}
      cancelText="Hủy"
      width={DEPARTMENT_MODAL_WIDTH}
    >
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
          rules={[{
            validator: async (_, value) => {
              const result = departmentSchema.shape.code.safeParse(value);
              if (!result.success) throw new Error(result.error.errors[0]?.message);
            },
          }]}
        >
          <Input
            placeholder="Nhập mã phòng ban..."
            maxLength={50}
            allowClear
            onChange={(e) => {
              form.setFieldValue('code', e.target.value.toUpperCase());
            }}
          />
        </Form.Item>

        <Form.Item
          name="name"
          label="Tên phòng ban"
          rules={[{
            validator: async (_, value) => {
              const result = departmentSchema.shape.name.safeParse(value);
              if (!result.success) throw new Error(result.error.errors[0]?.message);
            },
          }]}
        >
          <Input placeholder="Nhập tên phòng ban..." maxLength={100} allowClear />
        </Form.Item>
      </Form>
    </AppModal>
  );
}