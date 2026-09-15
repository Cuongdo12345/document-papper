import { useQuery } from "@tanstack/react-query";
import { getAssetQRCode } from "@/api/assets.api";

/**
 * Giai đoạn 5 (roadmap A1) — ảnh QR (Blob PNG) cho 1 asset, dùng hiển thị/in
 * tem (`AssetQRCodeSection`, `AssetDetailPage`). KHÔNG qua `unwrapResponse`
 * (response ảnh thô, không bọc JSON — xem comment ở đó).
 */
export function useAssetQRCode(id: string | undefined) {
  return useQuery({
    queryKey: ["assets", "qrcode", id] as const,
    queryFn: async () => {
      const response = await getAssetQRCode(id!);
      return response.data;
    },
    enabled: !!id,
    // QR encode `assetCode` — bất biến sau khi tạo asset (không có endpoint đổi
    // `assetCode`), nên ảnh không bao giờ đổi trong đời asset này → không cần refetch.
    staleTime: Infinity,
  });
}
