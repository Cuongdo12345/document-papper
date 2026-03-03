import { Document, DocumentCategory, DocumentSubType } from "../models/document.model";
import Department from "../models/department.model";
import User from "../models/user.model";
import { Types } from "mongoose";
import ApiError from "../shared/errors/ApiError";


// 🏢 ADMIN DASHBOARD SUMMARY
export const adminDashboardSummaryService = async () => {
  const now = new Date();
  // We want to analyze data from the start of the current year to get a clear picture of annual trends
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    totalStats,
    proposalsByMonth,
    reportsByMonth,
    documentsByDepartment,
    recentDocuments,
    totalDepartments,
    totalUsers
  ] = await Promise.all([

    // 📊 TOTAL DOCUMENT STATS
    Document.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalProposals: {
            $sum: {
              $cond: [{ $eq: ["$category", "PROPOSAL"] }, 1, 0]
            }
          },
          totalReports: {
            $sum: {
              $cond: [{ $eq: ["$category", "REPORT"] }, 1, 0]
            }
          }
        }
      }
    ]),

    // 📈 PROPOSALS BY MONTH
    //Lấy số lượng proposal theo tháng trong năm hiện tại để xem xu hướng nộp proposal qua các tháng. Điều này giúp xác định thời điểm cao điểm và thấp điểm trong năm.
    Document.aggregate([
      {
        $match: {
          category: "PROPOSAL",
          isActive: true,
          createdAt: { $gte: startOfYear }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]),

    // 📈 REPORTS BY MONTH
    // Lấy số lượng report theo tháng trong năm hiện tại để phân tích xu hướng báo cáo. Điều này giúp hiểu rõ hơn về các giai đoạn mà người dùng thường xuyên tạo báo cáo, từ đó có thể tối ưu hóa hệ thống để hỗ trợ tốt hơn trong những thời điểm đó.
    Document.aggregate([
      {
        $match: {
          category: "REPORT",
          isActive: true,
          createdAt: { $gte: startOfYear }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]),

    // 🏥 DOCUMENTS BY DEPARTMENT
    //Lấy số lượng document theo phòng ban để xác định những phòng ban nào đang hoạt động tích cực nhất. Điều này giúp ban quản lý có thể tập trung hỗ trợ và phát triển những phòng ban có tiềm năng cao, đồng thời cũng có thể đưa ra các biện pháp khuyến khích cho những phòng ban ít hoạt động hơn.
    Document.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$department",
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "departments",
          localField: "_id",
          foreignField: "_id",
          as: "department"
        }
      },
      { $unwind: "$department" },
      {
        $project: {
          departmentId: "$_id",
          departmentName: "$department.name",
          count: 1
        }
      },
      { $sort: { count: -1 } }
    ]),

    // 📄 RECENT DOCS
    //Lấy 5 document mới nhất để hiển thị trên dashboard. Điều này giúp người quản trị nhanh chóng nắm bắt được những hoạt động gần đây nhất trong hệ thống, từ đó có thể phản ứng kịp thời nếu có vấn đề phát sinh hoặc đơn giản là để theo dõi sự phát triển của hệ thống.
    Document.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("department", "name code")
      .populate("createdBy", "fullName")
      .lean(),

    Department.countDocuments(),

    // 🧑‍⚕️ TOTAL USERS
    User.countDocuments({ isActive: true })
  ]);

  return {
    totalDocuments: totalStats[0]?.totalDocuments || 0,
    totalProposals: totalStats[0]?.totalProposals || 0,
    totalReports: totalStats[0]?.totalReports || 0,
    totalDepartments,
    totalUsers,

    proposalsByMonth,
    reportsByMonth,
    documentsByDepartment,
    recentDocuments
  };
};

// 🏥 DEPARTMENT DASHBOARD SUMMARY
// Lấy thông tin dashboard cho một khoa cụ thể, bao gồm tổng số document, proposal, report, số lượng proposal và report theo tháng, 5 document mới nhất và tổng số người dùng trong khoa đó. Điều này giúp trưởng khoa hoặc quản lý khoa có cái nhìn tổng quan về hoạt động của khoa mình, từ đó có thể đưa ra các quyết định quản lý hiệu quả hơn.
// Trước khi thực hiện các truy vấn, chúng ta sẽ kiểm tra tính hợp lệ của departmentId để đảm bảo rằng nó là một ObjectId hợp lệ. Nếu không, chúng ta sẽ trả về lỗi Bad Request. Sau đó, chúng ta sẽ kiểm tra xem khoa có tồn tại hay không. Nếu không tìm thấy khoa, chúng ta sẽ trả về lỗi Not Found.
// Sau khi xác nhận khoa tồn tại, chúng ta sẽ thực hiện các truy vấn để lấy dữ liệu thống kê và thông tin cần thiết cho dashboard của khoa đó. Cuối cùng, chúng ta sẽ trả về một đối tượng chứa tất cả thông tin đã thu thập được để hiển thị trên dashboard.
// Lưu ý: Các truy vấn sử dụng aggregation để tính toán tổng số document, proposal, report và phân tích theo tháng. Chúng ta cũng sử dụng populate để lấy thông tin chi tiết về người tạo document và khoa liên quan.
export const departmentDashboardService = async (departmentId: any) => {

  if (!Types.ObjectId.isValid(departmentId)) {
    throw ApiError.badRequest("Department ID không hợp lệ");
  }

  const department = await Department.findById(departmentId);
  if (!department) {
    throw ApiError.notFound("Không tìm thấy khoa");
  }

  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [
    stats,
    proposalsByMonth,
    reportsByMonth,
    recentDocuments,
    totalUsers
  ] = await Promise.all([

    // 📊 TOTAL STATS
    Document.aggregate([
      {
        $match: {
          department: new Types.ObjectId(departmentId),
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          totalProposals: {
            $sum: {
              $cond: [{ $eq: ["$category", "PROPOSAL"] }, 1, 0]
            }
          },
          totalReports: {
            $sum: {
              $cond: [{ $eq: ["$category", "REPORT"] }, 1, 0]
            }
          }
        }
      }
    ]),

    // 📈 PROPOSAL BY MONTH
    Document.aggregate([
      {
        $match: {
          department: new Types.ObjectId(departmentId),
          category: "PROPOSAL",
          isActive: true,
          createdAt: { $gte: startOfYear }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]),

    // 📈 REPORT BY MONTH
    Document.aggregate([
      {
        $match: {
          department: new Types.ObjectId(departmentId),
          category: "REPORT",
          isActive: true,
          createdAt: { $gte: startOfYear }
        }
      },
      {
        $group: {
          _id: { $month: "$createdAt" },
          count: { $sum: 1 }
        }
      },
      { $sort: { "_id": 1 } }
    ]),

    // 📄 RECENT DOCS
    Document.find({
      department: departmentId,
      isActive: true
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("createdBy", "fullName")
      .lean(),

    // 🧑 USERS IN DEPARTMENT
    User.countDocuments({
      department: departmentId,
      isActive: true
    })
  ]);

  return {
    department,
    totalDocuments: stats[0]?.totalDocuments || 0,
    totalProposals: stats[0]?.totalProposals || 0,
    totalReports: stats[0]?.totalReports || 0,
    totalUsers,

    proposalsByMonth,
    reportsByMonth,
    recentDocuments
  };
};


/**
 * 1️⃣ 📊 KPI Proposal → Report Conversion Rate theo khoa
🎯 Ý nghĩa nghiệp vụ
Đo hiệu quả xử lý đề xuất:
Conversion Rate = số proposal có report / tổng proposal

👉 giúp admin biết:
khoa nào xử lý nhanh
khoa nào đề xuất xong bỏ đó
khoa nào phát sinh nhiều hỏng hóc

⚠️ Lưu ý DB bạn đang dùng
Bạn đã đổi:
PROPOSAL.referenceTo = [reportId]

👉 nên:
proposal có referenceTo.length > 0 = đã phát sinh report
proposal có referenceTo.length = 0 = chưa xử lý
 */

/**
 *  // 🏥 KPI PROPOSAL → REPORT CONVERSION RATE THEO KHOA
 * Lấy tỷ lệ chuyển đổi từ proposal sang report theo từng khoa để đánh giá hiệu quả xử lý đề xuất của các khoa. Tỷ lệ này được tính bằng cách đếm số lượng proposal đã phát sinh report (có referenceTo) chia cho tổng số proposal của khoa đó, sau đó nhân với 100 để ra phần trăm. Kết quả sẽ giúp admin xác định được khoa nào đang xử lý đề xuất hiệu quả nhất và khoa nào cần cải thiện.
 * // Lưu ý: Đảm bảo rằng bạn đã cập nhật schema của Document để có trường referenceTo là một mảng chứa reportId, và các proposal có referenceTo.length > 0 được coi là đã phát sinh report.
 * // Trước khi thực hiện các truy vấn, chúng ta sẽ kiểm tra tính hợp lệ của departmentId để đảm bảo rằng nó là một ObjectId hợp lệ. Nếu không, chúng ta sẽ trả về lỗi Bad Request. Sau đó, chúng ta sẽ kiểm tra xem khoa có tồn tại hay không. Nếu không tìm thấy khoa, chúng ta sẽ trả về lỗi Not Found.
 * // Sau khi xác nhận khoa tồn tại, chúng ta sẽ thực hiện các truy vấn để lấy dữ liệu thống kê và thông tin cần thiết cho dashboard của khoa đó. Cuối cùng, chúng ta sẽ trả về một đối tượng chứa tất cả thông tin đã thu thập được để hiển thị trên dashboard.
 * // Lưu ý: Các truy vấn sử dụng aggregation để tính toán tổng số proposal và số proposal đã chuyển đổi thành report, sau đó tính toán tỷ lệ chuyển đổi và sắp xếp kết quả theo tỷ lệ này.
 * // Đảm bảo rằng bạn đã cập nhật schema của Document để có trường referenceTo là một mảng chứa reportId, và các proposal có referenceTo.length > 0 được coi là đã phát sinh report.
 * @returns 
 */
export const proposalConversionByDepartmentService = async () => {
  const result = await Document.aggregate([
    {
      $match: {
        category: "PROPOSAL",
        isActive: true
      }
    },

    // 👇 đánh dấu proposal có report hay chưa
    {
      $addFields: {
        hasReport: {
          $cond: [
            { $gt: [{ $size: { $ifNull: ["$referenceTo", []] } }, 0] },
            1,
            0
          ]
        }
      }
    },

    // 👇 group theo khoa
    {
      $group: {
        _id: "$department",
        totalProposals: { $sum: 1 },
        converted: { $sum: "$hasReport" }
      }
    },

    // 👇 lookup khoa
    {
      $lookup: {
        from: "departments",
        localField: "_id",
        foreignField: "_id",
        as: "department"
      }
    },
    { $unwind: "$department" },

    // 👇 tính conversion rate %
    {
      $addFields: {
        conversionRate: {
          $cond: [
            { $eq: ["$totalProposals", 0] },
            0,
            {
              $multiply: [
                { $divide: ["$converted", "$totalProposals"] },
                100
              ]
            }
          ]
        }
      }
    },

    {
      $project: {
        departmentId: "$_id",
        departmentName: "$department.name",
        totalProposals: 1,
        converted: 1,
        conversionRate: { $round: ["$conversionRate", 1] }
      }
    },

    { $sort: { conversionRate: -1 } }
  ]);

  return result;
};

/**
 * 2️⃣ 📉 KPI Xu hướng hỏng thiết bị theo tháng
🎯 Ý nghĩa
Đây là KPI rất quan trọng cho bệnh viện:
tháng nào thiết bị hỏng nhiều
dự báongân sách bảo trì
dự báo mua sắm thiết bị

🔎 Định nghĩa “thiết bị hỏng”

👉 thiết bị hỏng được ghi trong:
CHECK_DAMAGE report
nên ta thống kê từ:
category: REPORT
subType: CHECK_DAMAGE
 */

/**
 *  // 🏥 KPI XU HƯỚNG HỎNG THIẾT BỊ THEO THÁNG
 * Lấy xu hướng hỏng thiết bị theo tháng để giúp bệnh viện dự báo ngân sách bảo trì và mua sắm thiết bị. Chúng ta sẽ thống kê số lượng report có subType là CHECK_DAMAGE theo tháng, sau đó sắp xếp kết quả theo năm và tháng để dễ dàng nhận biết các giai đoạn có nhiều thiết bị hỏng hóc nhất trong năm.
 * Lưu ý: Đảm bảo rằng trong hệ thống của bạn, các report về hỏng thiết bị được phân loại đúng với category là "REPORT" và subType là "CHECK_DAMAGE" để có thể lọc và thống kê chính xác.
 * Trước khi thực hiện các truy vấn, chúng ta sẽ kiểm tra tính hợp lệ của departmentId để đảm bảo rằng nó là một ObjectId hợp lệ. Nếu không, chúng ta sẽ trả về lỗi Bad Request. Sau đó, chúng ta sẽ kiểm tra xem khoa có tồn tại hay không. Nếu không tìm thấy khoa, chúng ta sẽ trả về lỗi Not Found.
 * Sau khi xác nhận khoa tồn tại, chúng ta sẽ thực hiện các truy vấn để lấy dữ liệu thống kê và thông tin cần thiết cho dashboard của khoa đó. Cuối cùng, chúng ta sẽ trả về một đối tượng chứa tất cả thông tin đã thu thập được để hiển thị trên dashboard.
 * Lưu ý: Các truy vấn sử dụng aggregation để tính toán số lượng report có subType là CHECK_DAMAGE theo tháng, sau đó sắp xếp kết quả theo năm và tháng để dễ dàng nhận biết các giai đoạn có nhiều thiết bị hỏng hóc nhất trong năm. 
 * Đảm bảo rằng trong hệ thống của bạn, các report về hỏng thiết bị được phân loại đúng với category là "REPORT" và subType là "CHECK_DAMAGE" để có thể lọc và thống kê chính xác.
 * 
 * @returns 
 */
export const deviceDamageTrendByMonthService = async () => {
  const result = await Document.aggregate([

    {
      $match: {
        category: "REPORT",
        subType: "CHECK_DAMAGE",
        isActive: true
      }
    },

    // 👇 tách năm + tháng
    {
      $group: {
        _id: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        },
        totalReports: { $sum: 1 }
      }
    },

    {
      $addFields: {
        monthLabel: {
          $concat: [
            { $toString: "$_id.year" },
            "-",
            {
              $cond: [
                { $lt: ["$_id.month", 10] },
                { $concat: ["0", { $toString: "$_id.month" }] },
                { $toString: "$_id.month" }
              ]
            }
          ]
        }
      }
    },

    {
      $project: {
        _id: 0,
        year: "$_id.year",
        month: "$_id.month",
        monthLabel: 1,
        totalReports: 1
      }
    },

    { $sort: { year: 1, month: 1 } }
  ]);

  return result;
};

/**
 * Thiết bị nào hỏng nhiều nhất → cần thay thế / bảo trì định kỳ
Mình build chuẩn theo DB bạn đang dùng:
Thiết bị hỏng nằm trong
CHECK_DAMAGE.meta.items[]
mỗi item có:
deviceName
quantity
note
🚨 KPI: Top thiết bị hỏng nhiều nhất
🎯 Ý nghĩa nghiệp vụ

Admin biết:
thiết bị nào hỏng lặp lại
khoa nào dùng thiết bị quá tải
nên thay thế hay bảo trì
 */

// 🏥 KPI TOP THIẾT BỊ HỎNG NHIỀU NHẤT
/**
 * Lấy top thiết bị hỏng nhiều nhất để giúp bệnh viện xác định những thiết bị nào đang gặp vấn đề thường xuyên nhất, từ đó có thể đưa ra quyết định về việc thay thế hoặc bảo trì định kỳ. Chúng ta sẽ thống kê số lượng thiết bị hỏng dựa trên các report có subType là CHECK_DAMAGE, sau đó nhóm theo tên thiết bị và tính tổng số lượng hỏng hóc của từng thiết bị. Kết quả sẽ được sắp xếp theo số lượng hỏng hóc giảm dần để dễ dàng nhận biết những thiết bị nào đang gặp vấn đề nhiều nhất.
 * Lưu ý: Đảm bảo rằng trong hệ thống của bạn, các report về hỏng thiết bị được phân loại đúng với category là "REPORT" và subType là "CHECK_DAMAGE", và thông tin về thiết bị hỏng được lưu trữ chính xác trong meta.items để có thể lọc và thống kê chính xác.
 * Trước khi thực hiện các truy vấn, chúng ta sẽ kiểm tra tính hợp lệ của departmentId để đảm bảo rằng nó là một ObjectId hợp lệ. Nếu không, chúng ta sẽ trả về lỗi Bad Request. Sau đó, chúng ta sẽ kiểm tra xem khoa có tồn tại hay không. Nếu không tìm thấy khoa, chúng ta sẽ trả về lỗi Not Found.
 * Sau khi xác nhận khoa tồn tại, chúng ta sẽ thực hiện các truy vấn để lấy dữ liệu thống kê và thông tin cần thiết cho dashboard của khoa đó. Cuối cùng, chúng ta sẽ trả về một đối tượng chứa tất cả thông tin đã thu thập được để hiển thị trên dashboard.
 * Lưu ý: Các truy vấn sử dụng aggregation để tính toán số lượng thiết bị hỏng dựa trên các report có subType là CHECK_DAMAGE, sau đó nhóm theo tên thiết bị và tính tổng số lượng hỏng hóc của từng thiết bị. Kết quả sẽ được sắp xếp theo số lượng hỏng hóc giảm dần để dễ dàng nhận biết những thiết bị nào đang gặp vấn đề nhiều nhất. Đảm bảo rằng trong hệ thống của bạn, các report về hỏng thiết bị được phân loại đúng với category là "REPORT" và subType là "CHECK_DAMAGE", và thông tin về thiết bị hỏng được lưu trữ chính xác trong meta.items để có thể lọc và thống kê chính xác.
 * 
 * @param param0 
 * @returns 
 */
export const topDamagedDevicesService = async ({
  department,
  fromDate,
  toDate,
  limit = 10
}: {
  department?: any;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
}) => {

  const match: any = {
    category: "REPORT",
    subType: "CHECK_DAMAGE",
    isActive: true
  };

  if (department) match.department = department;

  if (fromDate || toDate) {
    match.createdAt = {};
    if (fromDate) match.createdAt.$gte = new Date(fromDate);
    if (toDate) match.createdAt.$lte = new Date(toDate);
  }

  const result = await Document.aggregate([

    { $match: match },

    { $unwind: "$meta.items" },

    {
      $addFields: {
        qty: {
          $cond: [
            { $gt: ["$meta.items.quantity", 0] },
            "$meta.items.quantity",
            1
          ]
        }
      }
    },

    {
      $group: {
        _id: "$meta.items.deviceName",
        totalBroken: { $sum: "$qty" },
        totalReports: { $sum: 1 }
      }
    },

    {
      $project: {
        _id: 0,
        deviceName: "$_id",
        totalBroken: 1,
        totalReports: 1
      }
    },

    { $sort: { totalBroken: -1 } },

    { $limit: limit }
  ]);

  return result;
};

// /**
//  *  Xuất Excel danh sách document
//  *  Cho phép người dùng xuất danh sách document ra file Excel, có thể lọc theo tháng và năm tạo document. File Excel sẽ bao gồm các thông tin chi tiết như mã document, loại, phòng ban, tiêu đề, ngày tạo, thiết bị liên quan (nếu có), số lượng, ghi chú, ngày bảo trì và chi phí thực tế (nếu có). Điều này giúp người dùng dễ dàng lưu trữ và phân tích dữ liệu ngoài hệ thống.
//  * // Lưu ý: Đảm bảo rằng bạn đã cài đặt thư viện ExcelJS và có thư mục Export/document để lưu trữ file Excel được tạo ra. Trước khi thực hiện các truy vấn, chúng ta sẽ kiểm tra tính hợp lệ của departmentId để đảm bảo rằng nó là một ObjectId hợp lệ. Nếu không, chúng ta sẽ trả về lỗi Bad Request. Sau đó, chúng ta sẽ kiểm tra xem khoa có tồn tại hay không. Nếu không tìm thấy khoa, chúng ta sẽ trả về lỗi Not Found.

//  * @param query 
//  * @param res 
//  */
// export const exportDocumentsExcelPRO = async (
//   query: any,
//   res?: any
// ) => {
//   try {
//     console.log("🚀 EXPORT START");

//     const { month, year } = query;

//     const filter: any = {
//       isActive: true,
//       $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
//     };

//     // ===== SAFE DATE FILTER =====
//     if (
//       month &&
//       year &&
//       !isNaN(Number(month)) &&
//       !isNaN(Number(year))
//     ) {
//       const start = new Date(Number(year), Number(month) - 1, 1);
//       const end = new Date(Number(year), Number(month), 0, 23, 59, 59);

//       filter.createdAt = { $gte: start, $lte: end };
//     }
    
//     const fileName = `Danh-sach-vat-tu_${Date.now()}.xlsx`;
//     const filePath = path.join(__dirname, `../Export/document/${fileName}`);

//     // ===== SET HEADER =====
//     res.setHeader(
//       "Content-Type",
//       "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
//     );

//     res.setHeader(
//       "Content-Disposition",
//       `attachment; filename=${fileName}`
//     );

//     const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
//       // stream: res,
//       filename: filePath,
//       useStyles: true,
//       useSharedStrings: true,
//     });

//      const worksheet = workbook.addWorksheet("Document Export", {
//             views: [{ state: "frozen", ySplit: 1 }],
//   });
     
//       worksheet.autoFilter = {
//       from: "A1",
//       to: "K1",
//     };

//     worksheet.columns = [
//       { header: "Document Code", key: "documentCode", width: 25 },
//       { header: "Category", key: "category", width: 15 },
//       { header: "SubType", key: "subType", width: 20 },
//       { header: "Department", key: "department", width: 25 },
//       { header: "Title", key: "title", width: 35 },
//       { header: "Created Date", key: "createdAt", width: 15 },
//       { header: "Device Name", key: "deviceName", width: 30 },
//       { header: "Quantity", key: "quantity", width: 10 },
//       { header: "Note", key: "note", width: 40 },
//       { header: "Service Date", key: "serviceDate", width: 18 },
//       { header: "Actual Cost", key: "actualCost", width: 18 },
//     ];

//     const cursor = Document.find(filter)
//       .populate("department", "name")
//       .lean()
//       .cursor();

//     for await (const doc of cursor as any) {
//       const baseData = {
//         documentCode: doc.documentCode || "",
//         category: doc.category || "",
//         subType: doc.subType || "",
//         department: doc.department?.name || "",
//         title: doc.title || "",
//         createdAt: doc.createdAt
//           ? new Date(doc.createdAt).toLocaleDateString("vi-VN")
//           : "",
//       };

//       if (
//         doc.subType === "PROPOSE_REPAIR" &&
//         doc.meta?.items?.length
//       ) {
//         for (const item of doc.meta.items) {
//           const row = worksheet.addRow({
//             ...baseData,
//             deviceName: item.deviceName || "",
//             quantity: item.quantity || "",
//             note: item.note || "",
//             serviceDate: "",
//             actualCost: "",
//           });

//           row.eachCell((cell: any) => {
//             cell.alignment = { wrapText: true };
//           });

//           row.commit();
//         }
//       } else {
//         worksheet.addRow({
//           ...baseData,
//         }).commit();
//       }
//     }

//     await workbook.commit();
//     console.log("✅ EXPORT DONE");
    
//     return res.status(200).json({
//       success: true,
//       message: "Export thành công",
//       downloadUrl: `../Export/document/${fileName}`,
//     });

//   } catch (error) {
//     console.error("❌ EXPORT SERVICE ERROR:", error);
//     throw error;
//   }
// };