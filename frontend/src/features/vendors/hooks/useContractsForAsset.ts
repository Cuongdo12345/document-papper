import { useQuery } from "@tanstack/react-query";
import { getContractsForAsset } from "@/api/contract.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Contract } from "@/types/contract.types";

/** Roadmap B4 — mọi hợp đồng áp dụng cho 1 asset (section trong `AssetDetailPage`). */
export function useContractsForAsset(assetId: string | undefined) {
  return useQuery({
    queryKey: ["contracts", "asset", assetId] as const,
    queryFn: async () => {
      const response = await getContractsForAsset(assetId!);
      return unwrapResponse<Contract[]>(response).data;
    },
    enabled: !!assetId,
  });
}
