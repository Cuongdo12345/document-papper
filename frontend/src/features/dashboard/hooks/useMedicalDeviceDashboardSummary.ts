import { useQuery } from "@tanstack/react-query";
import { getMedicalDeviceDashboardSummary } from "@/api/dashboard.api";
import { unwrapResponse } from "@/utils/unwrapResponse";
import type { MedicalDeviceDashboardSummary } from "@/types/dashboard.types";

export function useMedicalDeviceDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "medical-devices", "summary"] as const,
    queryFn: async () => {
      const response = await getMedicalDeviceDashboardSummary();
      return unwrapResponse<MedicalDeviceDashboardSummary>(response).data;
    },
    staleTime: 20_000,
  });
}
