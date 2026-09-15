import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { AxiosProgressEvent } from "axios";
import { uploadFiles } from "@/api/files.api";
import { parseApiError } from "@/utils/parseApiError";
import { toast } from "@/stores/toastStore";

/** Quick action (`FilesListPage` modal) — toast trong hook, cùng quy ước action không-form (giống `useDeleteFile`). */
export function useUploadFiles() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ files, onUploadProgress }: { files: File[]; onUploadProgress?: (e: AxiosProgressEvent) => void }) =>
      uploadFiles(files, onUploadProgress),
    onSuccess: () => {
      toast.success("Tải file lên thành công");
      queryClient.invalidateQueries({ queryKey: ["files", "list"] });
    },
    onError: (error) => {
      toast.error(parseApiError(error).message);
    },
  });
}
