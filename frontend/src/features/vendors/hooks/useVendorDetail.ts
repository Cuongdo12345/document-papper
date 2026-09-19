import { useQuery } from "@tanstack/react-query";
import { getVendorById } from "@/api/vendor.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Vendor } from "@/types/vendor.types";

/** Roadmap B4 — chi tiết 1 nhà cung cấp. */
export function useVendorDetail(vendorId: string | undefined) {
  return useQuery({
    queryKey: ["vendors", "detail", vendorId] as const,
    queryFn: async () => {
      const response = await getVendorById(vendorId!);
      return unwrapResponse<Vendor>(response).data;
    },
    enabled: !!vendorId,
  });
}
