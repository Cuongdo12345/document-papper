// src/pages/auth/ResetPasswordPage/ResetPasswordPage.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Form, Input, Typography, Result, App } from 'antd';
import { LockOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { AxiosError } from 'axios';

import { AppButton } from '../../../components/common/AppButton/AppButton';
import { useResetPassword } from '../../../hooks/queries/useAuth';
import {
  newPasswordSchema,
  type ResetPasswordFormValues,
} from '../../../schemas/auth.schema';
import type { ApiErrorResponse } from '../../../types/auth/auth.types';

import styles from './ResetPasswordPage.module.css';

const { Title, Text } = Typography;

type PageState = 'form' | 'no-token' | 'token-expired';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { message } = App.useApp();
  const [form] = Form.useForm<ResetPasswordFormValues>();

  const rawToken = searchParams.get('token');
  const mutation = useResetPassword();

  const pageState: PageState = (() => {
    if (!rawToken) return 'no-token';
    if (
      mutation.isError &&
      (mutation.error as AxiosError<ApiErrorResponse>)?.response?.status === 400
    )
      return 'token-expired';
    return 'form';
  })();

  useEffect(() => {
    if (mutation.isSuccess) {
      message.success(
        'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.',
        4,
      );
    }
  }, [mutation.isSuccess, message]);

  const onFinish = (values: ResetPasswordFormValues) => {
    if (!rawToken) return;
    mutation.mutate({ token: rawToken, newPassword: values.newPassword });
  };

  // ── State 1: Không có token ────────────────────────────────────────────────
  if (pageState === 'no-token') {
    return (
      <Result
        status="error"
        title="Đường dẫn không hợp lệ"
        subTitle="Không tìm thấy mã đặt lại mật khẩu. Vui lòng yêu cầu lại từ trang Quên mật khẩu."
        extra={[
          <AppButton
            key="request"
            variant="primary"
            onClick={() => navigate('/forgot-password')}
          >
            Yêu cầu mã mới
          </AppButton>,
        ]}
      />
    );
  }

  // ── State 2: Token hết hạn / đã dùng ──────────────────────────────────────
  if (pageState === 'token-expired') {
    return (
      <Result
        status="warning"
        title="Mã đã hết hạn"
        subTitle="Token không hợp lệ hoặc đã được sử dụng. Mã có hiệu lực trong 15 phút."
        extra={[
          <AppButton
            key="request"
            variant="primary"
            onClick={() => navigate('/forgot-password')}
          >
            Yêu cầu mã mới
          </AppButton>,
        ]}
      />
    );
  }

  // ── State 3: Form chính ────────────────────────────────────────────────────
  return (
    <>
      <div className={styles.header}>
        <Title level={4} className={styles.title}>
          Đặt lại mật khẩu
        </Title>
        <Text type="secondary">Nhập mật khẩu mới cho tài khoản của bạn</Text>
      </div>

      <Form<ResetPasswordFormValues>
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={() => {
          form.setFields([
            { name: 'newPassword', errors: [] },
            { name: 'confirmPassword', errors: [] },
          ]);
        }}
        autoComplete="off"
      >
        {/* Field 1 — Mật khẩu mới */}
        <Form.Item
          name="newPassword"
          label="Mật khẩu mới"
          rules={[
            {
              validator: async (_, value) => {
                const result = newPasswordSchema.safeParse(value);
                if (!result.success) {
                  throw new Error(result.error.issues[0]?.message);
                }
              },
            },
          ]}
        >
          <Input.Password
            size="large"
            prefix={<LockOutlined />}
            placeholder="Nhập mật khẩu mới"
            autoComplete="new-password"
            autoFocus
            disabled={mutation.isPending}
          />
        </Form.Item>

        {/* Field 2 — Xác nhận mật khẩu */}
        <Form.Item
          name="confirmPassword"
          label="Xác nhận mật khẩu"
          rules={[
            {
              validator: async (_, value) => {
                if (!value) throw new Error('Vui lòng xác nhận mật khẩu');
                if (value !== form.getFieldValue('newPassword')) {
                  throw new Error('Mật khẩu xác nhận không khớp');
                }
              },
            },
          ]}
        >
          <Input.Password
            size="large"
            prefix={<LockOutlined />}
            placeholder="Nhập lại mật khẩu mới"
            autoComplete="new-password"
            disabled={mutation.isPending}
          />
        </Form.Item>

        {/* Submit */}
        <Form.Item>
          <AppButton
            variant="primary"
            block
            size="large"
            htmlType="submit"
            loading={mutation.isPending}
          >
            {mutation.isPending ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
          </AppButton>
        </Form.Item>
      </Form>

      {/* Back link */}
      <div className={styles.backLink}>
        <AppButton
          variant="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/login')}
        >
          Quay lại đăng nhập
        </AppButton>
      </div>
    </>
  );
}