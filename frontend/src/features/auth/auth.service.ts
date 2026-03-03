import axiosClient from "../../shared/api/axiosClient"
import type {
  LoginPayload,
  ForgotPasswordPayload,
  ResetPasswordPayload,
} from "../auth/auth.types"

export const authService = {
  login: (data: LoginPayload) =>
    axiosClient.post("/auths/login", data),

  refreshToken: () =>
    axiosClient.post("/auths/refresh-token"),

  logout: () =>
    axiosClient.post("/auths/logout"),

  forgotPassword: (data: ForgotPasswordPayload) =>
    axiosClient.post("/auths/forgot-password", data),

  resetPassword: (data: ResetPasswordPayload) =>
    axiosClient.post("/auths/reset-password", data),
}