import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logout as logoutApi } from "@/api/auth.api";
import { useAuthStore } from "@/stores/authStore";
import { tokenStorage } from "@/utils/tokenStorage";
import { toast } from "@/stores/toastStore";

/**
 * Logout — DATA_FLOW.md Mục 3: xoá local state NGAY CẢ KHI API logout lỗi
 * (không để user kẹt — Mục 29 FE-01: không nuốt error, nhưng cũng không để
 * lỗi mạng chặn logout cục bộ).
 */
export function useLogout() {
  const storeLogout = useAuthStore((s) => s.logout);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutApi,
    onError: () => {
      toast.warning("Không thể kết nối máy chủ để đăng xuất — đã đăng xuất cục bộ trên thiết bị này.");
    },
    onSettled: () => {
      storeLogout();
      tokenStorage.clearRefreshToken();
      queryClient.clear();
    },
  });
}
