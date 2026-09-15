import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAsset } from "@/api/assets.api";
import type { UpdateAssetRequest } from "@/types/asset.types";

/** Mutation gắn với form (`AssetEditModal`) — KHÔNG tự toast lỗi (cùng pattern `useUpdateDocument`). */
export function useUpdateAsset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAssetRequest }) => updateAsset(id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["assets", "list"] });
      queryClient.invalidateQueries({ queryKey: ["assets", "detail", variables.id] });
    },
  });
}
