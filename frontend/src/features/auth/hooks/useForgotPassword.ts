import { useMutation } from "@tanstack/react-query";
import { forgotPassword } from "@/api/auth.api";

/**
 * Mutation Forgot Password — AUTH_RBAC_MAP.md Mục 1.2/1.3: backend LUÔN trả
 * 200 + cùng 1 message trung tính dù username tồn tại hay không (chống user
 * enumeration). Hook KHÔNG chứa logic UI (FE_ARCHITECTURE.md Mục 2) —
 * component tự quyết định hiển thị `data.message` khi thành công.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: async (username: string) => {
      const response = await forgotPassword({ username });
      return response.data; // {message}
    },
  });
}
