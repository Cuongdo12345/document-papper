import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createAssetCategory } from "@/api/assetCategories.api";
import type { CreateAssetCategoryRequest } from "@/types/asset.types";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

/** Mutation gắn với form (`AssetCategoryFormModal`) — KHÔNG tự toast lỗi, component đọc `mutation.error` qua `parseApiError()` (cùng pattern `useCreateAsset`). */
export function useCreateAssetCategory() {
  const { type } = useAssetModule();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateAssetCategoryRequest) => createAssetCategory(type, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["asset-categories"] });
    },
  });
}
