import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateAssetCategory } from "@/api/assetCategories.api";
import type { UpdateAssetCategoryRequest } from "@/types/asset.types";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

/** Mutation gắn với form (`AssetCategoryFormModal`) — KHÔNG tự toast lỗi (cùng pattern `useUpdateAsset`). */
export function useUpdateAssetCategory() {
  const { type } = useAssetModule();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateAssetCategoryRequest }) => updateAssetCategory(type, id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-categories"] });
    },
  });
}
