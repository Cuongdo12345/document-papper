import { useQuery } from "@tanstack/react-query";
import { getSoftwareLicenseById, getSoftwareLicenses } from "@/api/softwareLicense.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { GetSoftwareLicensesParams, SoftwareLicense, SoftwareLicenseListItem } from "@/types/softwareLicense.types";

export function useSoftwareLicenses(params: GetSoftwareLicensesParams, enabled = true) {
  return useQuery({
    queryKey: ["software-licenses", "list", params] as const,
    queryFn: async () => {
      const response = await getSoftwareLicenses(params);
      return unwrapResponse<SoftwareLicenseListItem[]>(response);
    },
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useSoftwareLicense(id: string | undefined) {
  return useQuery({
    queryKey: ["software-licenses", "detail", id] as const,
    queryFn: async () => {
      const response = await getSoftwareLicenseById(id!);
      return unwrapResponse<SoftwareLicense>(response).data;
    },
    enabled: !!id,
  });
}
