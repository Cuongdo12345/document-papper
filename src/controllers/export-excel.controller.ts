import { exportDocumentsExcelPRO, importDocumentsExcel, syncDepartmentFromExcel } from "../services/export.service";
import { Request, Response, NextFunction } from "express";

/**
 *
 *  EXPORT DOCUMENTS TO EXCEL
 *  // Endpoint này cho phép người dùng xuất danh sách tài liệu ra file Excel, có thể áp dụng các bộ lọc như phòng ban, trạng thái tài liệu, khoảng thời gian tạo tài liệu, v.v. Kết quả trả về sẽ là một file Excel được tải xuống hoặc một URL để tải file.
 * // Lưu ý: Do việc xuất file Excel có thể mất thời gian, nên endpoint này có thể được thiết kế để trả về một job ID và người dùng sẽ sử dụng job ID đó để kiểm tra trạng thái và tải file khi đã sẵn sàng, thay vì giữ kết nối HTTP mở trong suốt quá trình tạo file.
 * @param req 
 * @param res 
 * @returns 
 * 
 */
export const exportDocumentsExcel = async (
  req: Request,
  res: Response
) => {
  try {
    const fileName = await exportDocumentsExcelPRO(req.query, res);

    return res.status(200).json({
      success: true,
      message: "Export file thành công",
      downloadUrl: `../Export/document/${fileName}`,
    });

  } catch (error: any) {
    console.error("❌ EXPORT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Export thất bại",
    });
  }
};

/**
 * API importExcel data
 * @param req 
 * @param res 
 * @param next 
 * @returns 
 */
export const importDocumentsExcelData = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn file Excel",
      });
    }

    const result = await importDocumentsExcel(req.file.buffer, req.user?.id);

    return res.status(200).json({
      success: true,
      message: "Import thành công",
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Import thất bại",
    });
  }
};

/**
 * API đồng bộ name departmant
 * @param req 
 * @param res 
 * @returns 
 */
export const syncDepartmentData = async (
  req: Request,
  res: Response
) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn file Excel",
      });
    }

    const result = await syncDepartmentFromExcel(req.file.buffer);

    return res.status(200).json({
      success: true,
      message: "Sync department thành công",
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Sync thất bại",
    });
  }
};