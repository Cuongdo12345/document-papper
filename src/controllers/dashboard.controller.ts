import { adminDashboardSummaryService, 
        departmentDashboardService, 
        proposalConversionByDepartmentService, 
        deviceDamageTrendByMonthService,
        topDamagedDevicesService } from "../services/dashboard.service";
import { Request, Response, NextFunction } from "express";



// 🏥 ADMIN DASHBOARD SUMMARY'
export const adminDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {

    if (req.user!.role !== "ADMIN") {
      return res.status(403).json({
        message: "Chỉ ADMIN được truy cập dashboard"
      });
    }

    const data = await adminDashboardSummaryService();

    res.json({
      success: true,
      data
    });

  } catch (error) {
    next(error);
  }
};

// 🏢 DEPARTMENT DASHBOARD
// Endpoint này cho phép người dùng có vai trò DEPARTMENT_HEAD hoặc ADMIN truy cập dashboard của một phòng ban cụ thể để xem các số liệu liên quan đến tài liệu, đề xuất và báo cáo trong phòng ban đó.
export const getDepartmentDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { departmentId } = req.params;

    const data = await departmentDashboardService(departmentId);

    res.json({
      success: true,
      data
    });

  } catch (error) {
    next(error);
  }
};

// 📊 PROPOSAL CONVERSION BY DEPARTMENT
export const getProposalConversionByDepartment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await proposalConversionByDepartmentService();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// 📉 DEVICE DAMAGE TREND BY MONTH
export const getDeviceDamageTrend = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = await deviceDamageTrendByMonthService();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// 🔝 TOP DAMAGED DEVICES
// Endpoint này cho phép người dùng truy vấn danh sách các thiết bị bị hư hỏng nhiều nhất trong một khoảng thời gian cụ thể, có thể lọc theo phòng ban và giới hạn số lượng kết quả trả về.
  
export const getTopDamagedDevices = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const { department, fromDate, toDate, limit } = req.query;

    const data = await topDamagedDevicesService({
      department,
      fromDate: fromDate ? new Date(String(fromDate)) : undefined,
      toDate: toDate ? new Date(String(toDate)) : undefined,
      limit: limit ? Number(limit) : 10
    });

    res.json({
      success: true,
      data
    });

  } catch (error) {
    next(error);
  }
};

// /**
//  *  EXPORT DOCUMENTS TO EXCEL
//  *  // Endpoint này cho phép người dùng xuất danh sách tài liệu ra file Excel, có thể áp dụng các bộ lọc như phòng ban, trạng thái tài liệu, khoảng thời gian tạo tài liệu, v.v. Kết quả trả về sẽ là một file Excel được tải xuống hoặc một URL để tải file.
//  * // Lưu ý: Do việc xuất file Excel có thể mất thời gian, nên endpoint này có thể được thiết kế để trả về một job ID và người dùng sẽ sử dụng job ID đó để kiểm tra trạng thái và tải file khi đã sẵn sàng, thay vì giữ kết nối HTTP mở trong suốt quá trình tạo file.
//  * @param req 
//  * @param res 
//  * @returns 
//  */
// export const exportDocumentsExcel = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const fileName = await exportDocumentsExcelPRO(req.query, res);

//     return res.status(200).json({
//       success: true,
//       message: "Export file thành công",
//       downloadUrl: `../Export/document/${fileName}`,
//     });

//   } catch (error: any) {
//     console.error("❌ EXPORT ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message || "Export thất bại",
//     });
//   }
// };


