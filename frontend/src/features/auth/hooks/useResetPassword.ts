import { useMutation } from "@tanstack/react-query";
import { resetPassword } from "@/api/auth.api";
import type { ResetPasswordRequest } from "@/types/auth.types";

/** Mutation Reset Password — `token` đọc từ query string ở page, không ở hook. */
export function useResetPassword() {
  return useMutation({
    mutationFn: async (body: ResetPasswordRequest) => {
      const response = await resetPassword(body);
      return response.data; // {message}
    },
  });
}
