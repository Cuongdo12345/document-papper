import { useQuery } from "@tanstack/react-query";
import { getPolicies } from "@/api/rbac.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { Policy, GetPoliciesParams } from "@/types/rbac.types";

/** List phân trang cho `PoliciesListPage` (FE-08). */
export function usePolicyList(params: GetPoliciesParams) {
  return useQuery({
    queryKey: ["rbac", "policies", "list", params] as const,
    queryFn: async () => {
      const response = await getPolicies(params);
      return unwrapResponse<Policy[]>(response);
    },
    placeholderData: (prev) => prev,
  });
}
