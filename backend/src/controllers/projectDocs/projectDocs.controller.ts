import { Request, Response } from "express";
import { catchAsync } from "../../shared/utils/catchAsync";
import { listProjectDocsService, getProjectDocService } from "../../services/projectDocs/projectDocs.service";

/**
 * DEV-075 (2026-09-21) — `GET /api/project-docs` (danh sách) +
 * `GET /api/project-docs/:id` (nội dung 1 file), gate `SYSTEM_DESIGN_VIEW`
 * (route). Không có side-effect, không ghi DB — chỉ đọc file `.md` thật.
 */
export const listProjectDocs = catchAsync(async (_req: Request, res: Response) => {
  const data = listProjectDocsService();
  res.json({ success: true, data });
});

export const getProjectDoc = catchAsync(async (req: Request, res: Response) => {
  const doc = getProjectDocService(req.params.id as string);
  if (!doc) {
    return res.status(404).json({ message: "Không tìm thấy tài liệu" });
  }
  res.json({ success: true, data: doc });
});
