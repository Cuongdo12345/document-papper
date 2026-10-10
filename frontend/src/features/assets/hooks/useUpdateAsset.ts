import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAsset } from "@/api/assets.api";
import type { UpdateAssetRequest } from "@/types/asset.types";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

/** Mutation gắn với form (`AssetEditModal`) — KHÔNG tự toast lỗi (cùng pattern `useUpdateDocument`). */
export function useUpdateAsset() {
  const { type } = useAssetModule();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAssetRequest }) => updateAsset(type, id, body),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["assets", "list"] });
      queryClient.invalidateQueries({ queryKey: ["assets", "detail", variables.id] });
    },
  });
}
