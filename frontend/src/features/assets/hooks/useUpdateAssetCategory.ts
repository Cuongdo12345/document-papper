import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAssetCategory } from "@/api/assetCategories.api";
import type { UpdateAssetCategoryRequest } from "@/types/asset.types";

/** Mutation gắn với form (`AssetCategoryFormModal`) — KHÔNG tự toast lỗi (cùng pattern `useUpdateAsset`). */
export function useUpdateAssetCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAssetCategoryRequest }) => updateAssetCategory(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-categories"] });
    },
  });
}
