export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
}

export interface ForgotPasswordPayload {
  username: string
}

export interface ForgotPasswordResponse {
  resetToken: string
}

export interface ResetPasswordPayload {
  token: string
  newPassword: string
}