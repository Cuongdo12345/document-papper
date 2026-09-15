import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAsset } from "@/api/assets.api";
import type { CreateAssetRequest } from "@/types/asset.types";

/** Mutation gắn với form (`AssetCreatePage`) — KHÔNG tự toast lỗi, component đọc `mutation.error` qua `parseApiError()` (cùng pattern `useCreateDocument`). */
export function useCreateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateAssetRequest) => createAsset(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assets", "list"] });
    },
  });
}
