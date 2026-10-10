import { useMutation } from "@tanstack/react-query";
import { lookupAssetByCode } from "@/api/assets.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Asset } from "@/types/asset.types";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

/**
 * Giai đoạn 5 (roadmap A1) — bước 1 luồng kiểm kê (`AssetScanPage`): tra cứu
 * asset theo `assetCode` vừa quét/gõ. Dùng mutation (không phải query) vì
 * chỉ chạy khi user chủ động submit, không tự động theo 1 key cố định.
 */
export function useLookupAssetByCode() {
  const { type } = useAssetModule();
  return useMutation({
    mutationFn: async (assetCode: string) => {
      const response = await lookupAssetByCode(type, assetCode);
      return unwrapResponse<Asset>(response).data;
    },
  });
}
