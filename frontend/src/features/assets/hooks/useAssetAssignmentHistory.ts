import { useQuery } from "@tanstack/react-query";
import { getAssetAssignmentHistory } from "@/api/assets.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { AssetAssignmentHistoryItem, GetAssetAssignmentHistoryParams } from "@/types/asset.types";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

export function useAssetAssignmentHistory(id: string | undefined, params: GetAssetAssignmentHistoryParams) {
  const { type } = useAssetModule();
  return useQuery({
    queryKey: ["assets", "assignment-history", id, params] as const,
    queryFn: async () => {
      const response = await getAssetAssignmentHistory(type, id!, params);
      return unwrapResponse<AssetAssignmentHistoryItem[]>(response);
    },
    enabled: !!id,
    placeholderData: (prev) => prev,
  });
}
