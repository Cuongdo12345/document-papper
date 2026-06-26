// src/pages/auth/ForgotPasswordPage/ForgotPasswordPage.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Form,
  Input,
  Typography,
  Alert,
  Result,
  Space,
} from 'antd';
import {
  UserOutlined,
  ArrowLeftOutlined,
  CopyOutlined,
} from '@ant-design/icons';
import type { AxiosError } from 'axios';

import {AppButton} from '../../../components/common/AppButton/AppButton';
import { AppModal } from '../../../components/feedback/AppModal';
import { useForgotPassword } from '../../../hooks/queries/useAuth';
import { forgotPasswordSchema } from '../../../schemas/auth.schema';
import type { ForgotPasswordFormValues } from '../../../schemas/auth.schema';
import type { ForgotPasswordResponse, ApiErrorResponse } from '../../../types/auth/auth.types';

import styles from './ForgotPasswordPage.module.css';

const { Title, Text } = Typography;

// ─────────────────────────────────────────────────────────────────────────────

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm<ForgotPasswordFormValues>();

  // resetToken nhận được từ response (workaround — email chưa tích hợp)
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

  // Trạng thái "silent 200" — user không tồn tại
  const [showSilentSuccess, setShowSilentSuccess] = useState(false);

  const mutation = useForgotPassword();

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleFinish = (values: ForgotPasswordFormValues) => {
    mutation.mutate(
      { username: values.username.trim() },
      {
        onSuccess: (data: ForgotPasswordResponse) => {
          if (data.resetToken) {
            // User tồn tại → hiển thị Modal với resetToken
            setResetToken(data.resetToken);
            setTokenModalOpen(true);
          } else {
            // Silent 200 — user không tồn tại → thay thế form bằng Result
            setShowSilentSuccess(true);
          }
        },
        onError: (error: AxiosError<ApiErrorResponse>) => {
          const status = error.response?.status;

          if (status === 429) {
            form.setFields([
              {
                name: 'username',
                errors: [
                  'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút',
                ],
              },
            ]);
          }
          // 500 / network → đã xử lý bởi global interceptor (toast)
        },
      },
    );
  };

  const handleCopyToken = async () => {
    if (!resetToken) return;
    try {
      await navigator.clipboard.writeText(resetToken);
      // Dùng notification.store để nhất quán — hoặc AntD message (nhẹ hơn)
      // Ở đây dùng import trực tiếp notification.store nếu đã có,
      // fallback sang console để tránh coupling với implementation chưa build.
      // TODO: thay bằng notification.store.push({ type: 'success', message: 'Đã sao chép' })
      console.info('Đã sao chép mã đặt lại mật khẩu vào clipboard');
    } catch {
      // clipboard API không available (non-HTTPS / permissions)
    }
  };

  const handleNavigateToReset = () => {
    setTokenModalOpen(false);
    navigate(`/reset-password?token=${resetToken}`);
  };

  // ── Render: Silent success (user không tồn tại) ───────────────────────────

  if (showSilentSuccess) {
    return (
      <Result
        status="success"
        title="Yêu cầu đã được gửi"
        subTitle="Nếu tài khoản tồn tại, hệ thống đã xử lý yêu cầu của bạn."
        extra={[
          <AppButton
            key="back"
            variant="secondary"
            onClick={() => navigate('/login')}
          >
            Quay lại đăng nhập
          </AppButton>,
        ]}
      />
    );
  }

  // ── Render: Form chính ────────────────────────────────────────────────────

  return (
    <>
      {/* ── Page title + description ────────────────────────────────────── */}
      <div className={styles.header}>
        <Title level={4} className={styles.title}>
          Quên mật khẩu
        </Title>
        <Text type="secondary">
          Nhập tên đăng nhập để nhận hướng dẫn đặt lại mật khẩu
        </Text>
      </div>

      {/* ── Form ────────────────────────────────────────────────────────── */}
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        onValuesChange={() => {
          // Clear API error khi user bắt đầu gõ lại
          form.setFields([{ name: 'username', errors: [] }]);
        }}
      >
        <Form.Item
          name="username"
          label="Tên đăng nhập"
          rules={[
            {
              validator: async (_, value) => {
                const result = forgotPasswordSchema.shape.username.safeParse(value);
                if (!result.success) {
                  throw new Error(result.error.errors[0]?.message);
                }
              },
            },
          ]}
        >
          <Input
            prefix={<UserOutlined />}
            placeholder="Nhập tên đăng nhập của bạn"
            size="large"
            autoFocus
            autoComplete="username"
            disabled={mutation.isPending}
          />
        </Form.Item>

        <Form.Item>
          <AppButton
            variant="primary"
            block
            size="large"
            htmlType="submit"
            loading={mutation.isPending}
          >
            {mutation.isPending ? 'Đang xử lý...' : 'Gửi yêu cầu'}
          </AppButton>
        </Form.Item>
      </Form>

      {/* ── Back link ───────────────────────────────────────────────────── */}
      <div className={styles.backLink}>
        <AppButton
          variant="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/login')}
        >
          Quay lại đăng nhập
        </AppButton>
      </div>

      {/* ── Reset Token Modal (workaround email) ────────────────────────── */}
      <AppModal
        open={tokenModalOpen}
        onClose={() => setTokenModalOpen(false)}
        title="Mã đặt lại mật khẩu"
        variant="standard"
        footerMode="ok-only"
        confirmText="Đóng"
        onConfirm={() => setTokenModalOpen(false)}
        maskClosable
        width={480}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* Warning banner */}
          <Alert
            type="warning"
            message="Môi trường thử nghiệm"
            description="Trong phiên bản thực tế, mã này được gửi qua email. Hiện tại, sao chép mã bên dưới để tiếp tục."
            showIcon
            closable={false}
          />

          {/* Token display */}
          <div>
            <Text strong>Mã đặt lại mật khẩu:</Text>
            <div style={{ marginTop: 8 }}>
              <Input.TextArea
                value={resetToken ?? ''}
                rows={3}
                readOnly
                style={{ resize: 'none', fontFamily: 'monospace' }}
              />
            </div>
          </div>

          {/* Copy button */}
          <AppButton
            variant="secondary"
            block
            icon={<CopyOutlined />}
            onClick={handleCopyToken}
            aria-label="Sao chép mã đặt lại mật khẩu"
          >
            Sao chép mã
          </AppButton>

          {/* Expiry note */}
          <Text type="secondary" style={{ fontSize: 12 }}>
            Mã có hiệu lực trong 15 phút. Dùng mã này tại trang Đặt lại mật khẩu.
          </Text>

          {/* Navigate to reset */}
          <AppButton
            variant="primary"
            block
            onClick={handleNavigateToReset}
          >
            Đặt lại mật khẩu ngay
          </AppButton>
        </Space>
      </AppModal>
    </>
  );
};
