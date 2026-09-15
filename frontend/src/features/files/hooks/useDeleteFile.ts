import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteFile } from "@/api/files.api";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";

/** Quick action (nút + `ConfirmDialog`) — toast trong hook, cùng quy ước các action không-form khác. */
export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteFile(id),
    onSuccess: () => {
      toast.success("Đã xoá file");
      queryClient.invalidateQueries({ queryKey: ["files", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
