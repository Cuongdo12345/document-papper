import { useQuery } from "@tanstack/react-query";
import { getVendors } from "@/api/vendor.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Vendor, GetVendorsParams } from "@/types/vendor.types";

/** Roadmap B4 — danh sách nhà cung cấp, phân trang (`VendorsListPage`). */
export function useVendors(params: GetVendorsParams) {
  return useQuery({
    queryKey: ["vendors", "list", params] as const,
    queryFn: async () => {
      const response = await getVendors(params);
      return unwrapResponse<Vendor[]>(response);
    },
    placeholderData: (prev) => prev,
  });
}
