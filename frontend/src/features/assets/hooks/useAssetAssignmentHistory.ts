import { useQuery } from "@tanstack/react-query";
import { getAssetAssignmentHistory } from "@/api/assets.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { AssetAssignmentHistoryItem, GetAssetAssignmentHistoryParams } from "@/types/asset.types";

export function useAssetAssignmentHistory(id: string | undefined, params: GetAssetAssignmentHistoryParams) {
  return useQuery({
    queryKey: ["assets", "assignment-history", id, params] as const,
    queryFn: async () => {
      const response = await getAssetAssignmentHistory(id!, params);
      return unwrapResponse<AssetAssignmentHistoryItem[]>(response);
    },
    enabled: !!id,
    placeholderData: (prev) => prev,
  });
}
