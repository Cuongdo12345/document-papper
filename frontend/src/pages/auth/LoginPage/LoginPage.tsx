// import { useEffect, useCallback } from 'react';
// import { Form, Input, Typography } from 'antd';
// import { UserOutlined, LockOutlined } from '@ant-design/icons';
// import { useNavigate } from 'react-router-dom';
// import { AppButton } from '../../../components/common/AppButton/AppButton';
// import { useLogin } from '../../../hooks/queries/useAuth';
// import { loginSchema, type LoginFormValues } from '../../../schemas/auth.schema';
// import styles from './LoginPage.module.css';
// import type { AxiosError } from 'axios';

// // Theo AUTH_UI_SPEC.md §1 (Login Page)
// // AuthLayout đã render Logo block — LoginPage chỉ render phần dưới card

// const { Title } = Typography;

// // ← Đổi từ export default → export named để lazy import dùng .then() hoạt động
// export function LoginPage() {
//   const [form] = Form.useForm<LoginFormValues>();
//   const navigate = useNavigate();
//   const mutation = useLogin();

//   // §1.5 — Error message tự động xóa khi user bắt đầu gõ lại
//   // const handleValuesChange = () => {
//   //   if (mutation.isError) {
//   //     form.setFields([
//   //       { name: 'username', errors: [] },
//   //       { name: 'password', errors: [] },
//   //     ]);
//   //   }
//   // };

//   const mutationIsError = mutation.isError; // reactive value

// const handleValuesChange = useCallback(() => {
//   if (mutationIsError) {
//     form.setFields([
//       { name: 'username', errors: [] },
//       { name: 'password', errors: [] },
//     ]);
//     mutation.reset(); // ← reset luôn mutation state
//   }
// }, [mutationIsError, form, mutation]);

//   const onFinish = (values: LoginFormValues) => {
//     mutation.mutate({
//       username: values.username.trim(),
//       password: values.password,
//     });
//   };

//   // §1.5 — Map lỗi API vào Form.Item dưới password field
//   useEffect(() => {
//   if (!mutation.isError) return;

//   // Cast sang AxiosError để truy cập .response
//   const axiosError = mutation.error as AxiosError;
//   const status = axiosError?.response?.status;

//   if (status === 400 || status === 401) {
//     form.setFields([{ name: 'password', errors: ['Tên đăng nhập hoặc mật khẩu không đúng'] }]);
//   } else if (status === 429) {
//     form.setFields([{ name: 'password', errors: ['Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút'] }]);
//   }
// }, [mutation.isError, mutation.error, form]);

//   // useEffect(() => {
//   //   if (!mutation.isError) return;

//   //   const status = mutation.error?.response?.status;

//   //   if (status === 400 || status === 401) {
//   //     form.setFields([
//   //       {
//   //         name: 'password',
//   //         errors: ['Tên đăng nhập hoặc mật khẩu không đúng'],
//   //       },
//   //     ]);
//   //   } else if (status === 429) {
//   //     form.setFields([
//   //       {
//   //         name: 'password',
//   //         errors: ['Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút'],
//   //       },
//   //     ]);
//   //   }
//   //   // 500 / Network error → đã xử lý bởi global axios interceptor (toast)
//   // }, [mutation.isError, mutation.error, form]);

//   return (
//     <div className={styles.container}>
//       <Title level={4} className={styles.title}>
//         Đăng nhập
//       </Title>

//       <Form<LoginFormValues>
//         form={form}
//         layout="vertical"
//         onFinish={onFinish}
//         onValuesChange={handleValuesChange}
//         autoComplete="off"
//       >
//         <Form.Item
//           name="username"
//           label="Tên đăng nhập"
//           rules={[
//             {
//               validator: async (_, value) => {
//                 const result = loginSchema.shape.username.safeParse(value);
//                 if (!result.success) {
//                   throw new Error(result.error.issues[0]?.message);
//                 }
//               },
//             },
//           ]}
//         >
//           <Input
//             size="large"
//             prefix={<UserOutlined />}
//             placeholder="Nhập tên đăng nhập"
//             autoComplete="username"
//             autoFocus
//             disabled={mutation.isPending}
//           />
//         </Form.Item>

//         <Form.Item
//           name="password"
//           label="Mật khẩu"
//           rules={[
//             {
//               validator: async (_, value) => {
//                 const result = loginSchema.shape.password.safeParse(value);
//                 if (!result.success) {
//                   throw new Error(result.error.issues[0]?.message);
//                 }
//               },
//             },
//           ]}
//         >
//           <Input.Password
//             size="large"
//             prefix={<LockOutlined />}
//             placeholder="Nhập mật khẩu"
//             autoComplete="current-password"
//             disabled={mutation.isPending}
//           />
//         </Form.Item>

//         <Form.Item>
//           <AppButton
//             variant="primary"
//             block
//             size="large"
//             htmlType="submit"
//             loading={mutation.isPending}
//           >
//             {mutation.isPending ? 'Đang xử lý...' : 'Đăng nhập'}
//           </AppButton>
//         </Form.Item>

//         <Form.Item className={styles.forgotLink}>
//           <AppButton
//             variant="link"
//             size="small"
//             onClick={() => navigate('/forgot-password')}
//           >
//             Quên mật khẩu?
//           </AppButton>
//         </Form.Item>
//       </Form>
//     </div>
//   );
// }

import { useEffect, useCallback } from "react";
import { Form, Input, Typography } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { AppButton } from "../../../components/common/AppButton/AppButton";
import { useLogin } from "../../../hooks/queries/useAuth";
import {
  loginSchema,
  type LoginFormValues,
} from "../../../schemas/auth.schema";
import styles from "./LoginPage.module.css";
import type { AxiosError } from "axios";

// Theo AUTH_UI_SPEC.md §1 (Login Page)
// AuthLayout đã render Logo block — LoginPage chỉ render phần dưới card

const { Title } = Typography;

// ← Đổi từ export default → export named để lazy import dùng .then() hoạt động
export function LoginPage() {
  const [form] = Form.useForm<LoginFormValues>();
  const navigate = useNavigate();
  const mutation = useLogin();

  // §1.5 — Error message tự động xóa khi user bắt đầu gõ lại
  // const handleValuesChange = () => {
  //   if (mutation.isError) {
  //     form.setFields([
  //       { name: 'username', errors: [] },
  //       { name: 'password', errors: [] },
  //     ]);
  //   }
  // };

  const mutationIsError = mutation.isError; // reactive value

  const handleValuesChange = useCallback(() => {
    if (mutationIsError) {
      form.setFields([
        { name: "username", errors: [] },
        { name: "password", errors: [] },
      ]);
      mutation.reset(); // ← reset luôn mutation state
    }
  }, [mutationIsError, form, mutation]);

  const onFinish = (values: LoginFormValues) => {
    mutation.mutate({
      username: values.username.trim(),
      password: values.password,
    });
  };

  // §1.5 — Map lỗi API vào Form.Item dưới password field
  useEffect(() => {
    if (!mutation.isError) return;

    const axiosError = mutation.error as AxiosError<{ message?: string }>;
    const status = axiosError?.response?.status;
    const message = axiosError?.response?.data?.message ?? "";

    if (status === 403) {
      // Tài khoản bị khóa (isActive = false) — backend trả 403
      form.setFields([
        {
          name: "password",
          errors: ["Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên"],
        },
      ]);
    } else if (status === 401 || status === 400) {
      // Phân biệt sai mật khẩu vs tài khoản bị khóa qua message body
      const isLocked =
        message.toLowerCase().includes("khóa") ||
        message.toLowerCase().includes("locked") ||
        message.toLowerCase().includes("disabled") ||
        message.toLowerCase().includes("inactive");

      if (isLocked) {
        form.setFields([
          {
            name: "password",
            errors: ["Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên"],
          },
        ]);
      } else {
        form.setFields([
          {
            name: "password",
            errors: ["Tên đăng nhập hoặc mật khẩu không đúng"],
          },
        ]);
      }
    } else if (status === 429) {
      form.setFields([
        {
          name: "password",
          errors: ["Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút"],
        },
      ]);
    }
  }, [mutation.isError, mutation.error, form]);

  // useEffect(() => {
  //   if (!mutation.isError) return;

  //   const status = mutation.error?.response?.status;

  //   if (status === 400 || status === 401) {
  //     form.setFields([
  //       {
  //         name: 'password',
  //         errors: ['Tên đăng nhập hoặc mật khẩu không đúng'],
  //       },
  //     ]);
  //   } else if (status === 429) {
  //     form.setFields([
  //       {
  //         name: 'password',
  //         errors: ['Quá nhiều lần đăng nhập. Vui lòng thử lại sau 15 phút'],
  //       },
  //     ]);
  //   }
  //   // 500 / Network error → đã xử lý bởi global axios interceptor (toast)
  // }, [mutation.isError, mutation.error, form]);

  return (
    <div className={styles.container}>
      <Title level={4} className={styles.title}>
        Đăng nhập
      </Title>

      <Form<LoginFormValues>
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={handleValuesChange}
        autoComplete="off"
      >
        <Form.Item
          name="username"
          label="Tên đăng nhập"
          rules={[
            {
              validator: async (_, value) => {
                const result = loginSchema.shape.username.safeParse(value);
                if (!result.success) {
                  throw new Error(result.error.issues[0]?.message);
                }
              },
            },
          ]}
        >
          <Input
            size="large"
            prefix={<UserOutlined />}
            placeholder="Nhập tên đăng nhập"
            autoComplete="username"
            autoFocus
            disabled={mutation.isPending}
          />
        </Form.Item>

        <Form.Item
          name="password"
          label="Mật khẩu"
          rules={[
            {
              validator: async (_, value) => {
                const result = loginSchema.shape.password.safeParse(value);
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
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
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
            {mutation.isPending ? "Đang xử lý..." : "Đăng nhập"}
          </AppButton>
        </Form.Item>

        <Form.Item className={styles.forgotLink}>
          <AppButton
            variant="link"
            size="small"
            onClick={() => navigate("/forgot-password")}
          >
            Quên mật khẩu?
          </AppButton>
        </Form.Item>
      </Form>
    </div>
  );
}
