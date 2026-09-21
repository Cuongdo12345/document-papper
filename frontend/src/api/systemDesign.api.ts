import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { SystemDesignData } from "@/types/systemDesign.types";

/** DEV-073 — `GET /api/system-design` (permission `SYSTEM_DESIGN_VIEW`), data = object đơn, không pagination. */
export function getSystemDesign(): Promise<AxiosResponse<{ success: boolean; data: SystemDesignData }>> {
  return axiosInstance.get("/system-design");
}
