import { App, Form, Input } from 'antd';
import { z } from 'zod';

// Shared Components
import AppModal  from '../../../components/feedback/AppModal/AppModal';
import { AppButton } from '../../../components/common/AppButton/AppButton';

// Query Hooks
import { useCreateDepartment } from '../../../hooks/queries/useDepartment';

// Types
import type { DepartmentFormValues } from '../../../types/department/department.dto';

// Constants
import {
  DEPARTMENT_MODAL_WIDTH,
  DEPARTMENT_SUCCESS_MESSAGES,
  DEPARTMENT_ERROR_MESSAGES,
} from '../../../constants/departments/department.constants';

// Utils
import { extractDepartmentError } from '../../../api/services/department.error';

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schema
// ─────────────────────────────────────────────────────────────────────────────

const departmentSchema = z.object({
  code: z.string().trim().min(1, 'Mã phòng ban không được để trống'),
  name: z.string().trim().min(1, 'Tên phòng ban không được để trống'),
});

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface DepartmentCreateModalProps {
  open:    boolean;
  onClose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// DepartmentCreateModal
//
// Trigger: Nút "Tạo phòng ban" tại AppPageHeader.actions (DepartmentListPage)
// API:     POST /api/departments
// ⚠️ Bug: server luôn trả 400 cho mọi lỗi (kể cả 409 duplicate code)
//         → đọc error.response?.data?.message, không dùng status code
// ─────────────────────────────────────────────────────────────────────────────

export function DepartmentCreateModal({
  open,
  onClose,
}: DepartmentCreateModalProps) {
  const { message } = App.useApp();
  const [form]      = Form.useForm<DepartmentFormValues>();

  // ── Mutation ────────────────────────────────────────────────────────────────
  // hook.onSuccess tự invalidate ['departments'] — không cần xử lý cache ở đây
  const createMutation = useCreateDepartment();

  // ── Handlers ────────────────────────────────────────────────────────────────

  // Đóng modal — reset form bất kể lý do đóng (Hủy / X / click overlay)
  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  // Submit success
  const handleSuccess = () => {
    message.success(DEPARTMENT_SUCCESS_MESSAGES.CREATE);
    form.resetFields();
    onClose();
  };

  // Submit error
  // ⚠️ Server 400 cho mọi lỗi (kể cả 409 duplicate code)
  // Không đóng modal — user cần sửa input
  const handleError = (error: unknown) => {
    const msg = extractDepartmentError(error, DEPARTMENT_ERROR_MESSAGES.CREATE_FAILED);
    message.error(msg);
  };

  // AntD Form onFinish — chỉ gọi khi validate pass
  const handleFinish = (values: DepartmentFormValues) => {
    createMutation.mutate(
      {
        code: values.code.trim(),   // safety trim
        name: values.name.trim(),
      },
      {
        onSuccess: handleSuccess,
        onError:   handleError,
      },
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title="Tạo phòng ban"
      variant="standard"
      footerMode="confirm-cancel"
      onConfirm={() => form.submit()}   // Trigger Form validate → onFinish
      confirmText="Tạo mới"
      confirmLoading={createMutation.isPending}
      cancelText="Hủy"
      width={DEPARTMENT_MODAL_WIDTH}    // 480
      // destroyOnClose={true} — default, không cần truyền
      // maskClosable tự false khi confirmLoading=true — AppModal built-in
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        disabled={createMutation.isPending}  // Disable fields khi đang submit
        requiredMark={false}                 // Label tự thêm * nếu cần
      >
        {/* ── Field 1: code ── */}
        <Form.Item
          name="code"
          label="Mã phòng ban"
          rules={[
            {
              validator: async (_, value) => {
                const result = departmentSchema.shape.code.safeParse(value);
                if (!result.success) {
                  throw new Error(result.error.errors[0]?.message);
                }
              },
            },
          ]}
        >
          <Input
            placeholder="Nhập mã phòng ban..."
            maxLength={50}
            allowClear
            onChange={(e) => {
              // ⚠️ toUpperCase() tại onChange — uppercase ngay khi gõ (không phải lúc submit)
              form.setFieldValue('code', e.target.value.toUpperCase());
            }}
          />
        </Form.Item>

        {/* ── Field 2: name ── */}
        <Form.Item
          name="name"
          label="Tên phòng ban"
          rules={[
            {
              validator: async (_, value) => {
                const result = departmentSchema.shape.name.safeParse(value);
                if (!result.success) {
                  throw new Error(result.error.errors[0]?.message);
                }
              },
            },
          ]}
        >
          <Input
            placeholder="Nhập tên phòng ban..."
            maxLength={100}
            allowClear
          />
        </Form.Item>
      </Form>
    </AppModal>
  );
}