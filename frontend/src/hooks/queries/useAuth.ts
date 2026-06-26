// src/hooks/queries/useAuth.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation } from "react-router-dom";
import type { AxiosError } from "axios";
import { authService } from "../../api/services/auth.service";
import { useAuthStore } from "../../store/auth.store";
import type {
  LoginPayload,
  LoginResponse,
  ForgotPasswordPayload,
  ForgotPasswordResponse,
  ResetPasswordPayload,
  ApiErrorResponse,
} from "../../types/auth/auth.types";

// ─── useLogin ─────────────────────────────────────────────────────────────────

export const useLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  return useMutation<
    LoginResponse, // TData   — kiểu trả về khi success
    AxiosError<ApiErrorResponse>, // TError  — có .response?.status
    LoginPayload // TVariables — kiểu tham số mutate()
  >({
    mutationKey: ["auth", "login"],
    mutationFn: (payload) => authService.login(payload).then((res) => res.data),
    retry: 0,
    onSuccess: (data) => {
      setAuth(data.user, data.accessToken, data.refreshToken);
      queryClient.clear();

      const from = (location.state as { from?: { pathname?: string } })?.from
        ?.pathname;

      if (from) {
        navigate(from, { replace: true });
        return;
      }

      navigate(
        data.user.role.name === "ADMIN" ? "/dashboard" : "/documents/proposals",
        { replace: true },
      );
    },
    // onError: xử lý tại LoginPage (400/401/429 → form.setFields)
    // 500 / network → global interceptor toast
  });
};

// ─── useForgotPassword ────────────────────────────────────────────────────────

export const useForgotPassword = () => {
  return useMutation<
    ForgotPasswordResponse,
    AxiosError<ApiErrorResponse>,
    ForgotPasswordPayload
  >({
    mutationKey: ["auth", "forgot-password"],
    mutationFn: (payload) =>
      authService.forgotPassword(payload).then((res) => res.data),
    retry: 0,
  });
};

// ─── useResetPassword ─────────────────────────────────────────────────────────

export const useResetPassword = () => {
  const navigate = useNavigate();

  return useMutation<
    { message: string },
    AxiosError<ApiErrorResponse>,
    ResetPasswordPayload
  >({
    mutationKey: ["auth", "reset-password"],
    mutationFn: (payload) =>
      authService.resetPassword(payload).then((res) => res.data),
    retry: 0,
    onSuccess: () => {
      navigate("/login", { replace: true });
    },
  });
};
