import type { AxiosResponse } from "axios";
import { axiosInstance } from "@/api/axios";
import type { ProjectDoc, ProjectDocSummary } from "@/types/projectDocs.types";

/** DEV-075 — `GET /api/project-docs` (permission `SYSTEM_DESIGN_VIEW`), danh sách 12 tài liệu 01-13. */
export function getProjectDocs(): Promise<AxiosResponse<{ success: boolean; data: ProjectDocSummary[] }>> {
  return axiosInstance.get("/project-docs");
}

/** DEV-075 — `GET /api/project-docs/:id`, nội dung 1 tài liệu. */
export function getProjectDoc(id: string): Promise<AxiosResponse<{ success: boolean; data: ProjectDoc }>> {
  return axiosInstance.get(`/project-docs/${id}`);
}
