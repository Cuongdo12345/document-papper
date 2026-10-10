import { Request, Response } from "express";
import {
  createSoftwareLicenseService,
  getAllSoftwareLicensesService,
  getSoftwareLicenseByIdService,
  updateSoftwareLicenseService,
  deleteSoftwareLicenseService,
  restoreSoftwareLicenseService,
  assignAssetToLicenseService,
  unassignAssetFromLicenseService,
  setLicenseProofFileService,
  getLicenseProofFileService,
} from "../../services/itDevices/softwareLicense.service";
import { runSoftwareLicenseAlertsService } from "../../services/itDevices/softwareLicenseAlerts.service";
import { catchAsync } from "../../shared/utils/catchAsync";

export const createSoftwareLicense = catchAsync(async (req: Request, res: Response) => {
  const data = await createSoftwareLicenseService(req.body, req.user?._id);
  res.status(201).json({ message: "Tạo bản quyền phần mềm thành công", data });
});

export const getAllSoftwareLicenses = catchAsync(async (req: Request, res: Response) => {
  const result = await getAllSoftwareLicensesService(req.query);
  res.json({ message: "Lấy danh sách bản quyền phần mềm thành công", ...result });
});

export const getSoftwareLicenseById = catchAsync(async (req: Request, res: Response) => {
  const data = await getSoftwareLicenseByIdService(req.params.id);
  res.json({ message: "Lấy chi tiết bản quyền phần mềm thành công", data });
});

export const updateSoftwareLicense = catchAsync(async (req: Request, res: Response) => {
  const data = await updateSoftwareLicenseService(req.params.id, req.body, req.user?._id);
  res.json({ message: "Cập nhật bản quyền phần mềm thành công", data });
});

export const deleteSoftwareLicense = catchAsync(async (req: Request, res: Response) => {
  await deleteSoftwareLicenseService(req.params.id, req.user?._id);
  res.json({ message: "Xoá bản quyền phần mềm thành công" });
});

export const restoreSoftwareLicense = catchAsync(async (req: Request, res: Response) => {
  const data = await restoreSoftwareLicenseService(req.params.id, req.user?._id);
  res.json({ message: "Khôi phục bản quyền phần mềm thành công", data });
});

export const assignAssetToLicense = catchAsync(async (req: Request, res: Response) => {
  const data = await assignAssetToLicenseService(req.params.id, req.body.asset, req.user?._id);
  res.json({ message: "Gán bản quyền cho máy thành công", data });
});

export const unassignAssetFromLicense = catchAsync(async (req: Request, res: Response) => {
  const data = await unassignAssetFromLicenseService(req.params.id, req.body.asset, req.user?._id);
  res.json({ message: "Gỡ bản quyền khỏi máy thành công", data });
});

export const setLicenseProofFile = catchAsync(async (req: Request, res: Response) => {
  const data = await setLicenseProofFileService(req.params.id, req.file, req.user?._id);
  res.json({ message: "Cập nhật chứng từ bản quyền thành công", data });
});

export const downloadLicenseProofFile = catchAsync(async (req: Request, res: Response) => {
  const { filePath, fileName } = await getLicenseProofFileService(req.params.id);
  res.download(filePath, fileName);
});

export const runSoftwareLicenseAlerts = catchAsync(async (_req: Request, res: Response) => {
  const data = await runSoftwareLicenseAlertsService();
  res.json({ message: "Chạy kiểm tra cảnh báo bản quyền phần mềm thành công", data });
});
