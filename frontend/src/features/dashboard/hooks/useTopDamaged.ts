import { useQuery } from "@tanstack/react-query";
import { getTopDamagedDevices, getTopDamagedInk } from "@/api/dashboard.api";
import type { GetTopDamagedParams } from "@/types/dashboard.types";

/**
 * 2 hook gộp 1 file — mirror đúng `getDamageReportKpiService()` ở backend
 * (`dashboard.service.ts`: `topDamagedDevicesService`/`topDamagedInkService`
 * dùng CHUNG 1 hàm, chỉ khác `subType`). `data` lồng `{items,pagination}` —
 * xem comment `useProposalConversion.ts`.
 */
export function useTopDamagedDevices(params: GetTopDamagedParams) {
  return useQuery({
    queryKey: ["dashboard", "kpi", "top-damaged-devices", params] as const,
    queryFn: async () => {
      const response = await getTopDamagedDevices(params);
      return response.data.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 20_000,
  });
}

export function useTopDamagedInk(params: GetTopDamagedParams) {
  return useQuery({
    queryKey: ["dashboard", "kpi", "top-damaged-inks", params] as const,
    queryFn: async () => {
      const response = await getTopDamagedInk(params);
      return response.data.data;
    },
    placeholderData: (prev) => prev,
    staleTime: 20_000,
  });
}
