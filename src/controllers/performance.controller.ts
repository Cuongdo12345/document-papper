import { Request, Response } from "express";
import { ApiPerformanceModel } from "../models/apiPerformance.model";


/**
 *  API dashboard hiệu năng
 * - Cho phép filter theo khoảng thời gian (from, to)
 * - Trả về thống kê theo endpoint:
 *    + tổng số lần gọi
 *   + thời gian trung bình, thời gian max
 *  + thời gian trung bình ở từng layer (DB, service, controller)
 *  + số lần bị slow (tổng thời gian > 800ms)
 * + số lần lỗi (status >= 400)
 * // Cần đảm bảo endpoint này được bảo vệ, chỉ admin mới có quyền truy cập
 * // Có thể thêm tính năng phân trang nếu dữ liệu quá lớn, hoặc cache kết quả để giảm tải cho DB
 * // Cần đảm bảo rằng việc truy vấn thống kê này được tối ưu, có thể sử dụng index trên trường createdAt và endpoint để tăng tốc độ truy vấn
 * // Cần log rõ ràng nếu có lỗi xảy ra trong quá trình truy vấn để dễ dàng debug
 * @param req 
 * @param res 
 */
export const getPerformanceDashboard = async (req: Request, res: Response) => {
  const { from, to } = req.query;
  
  const match: any = {};
  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = new Date(from as string);
    if (to) match.createdAt.$lte = new Date(to as string);
  }
  
  // 🔹 truy vấn thống kê từ MongoDB
  // Sử dụng aggregation để tính toán thống kê theo endpoint, đảm bảo tối ưu với index
  // Có thể thêm cache kết quả nếu cần thiết để giảm tải cho DB khi có nhiều request truy vấn dashboard
  // Cần đảm bảo rằng việc truy vấn này không ảnh hưởng đến hiệu năng của DB, có thể sử dụng read replica nếu cần thiết để phân tải
  // Cần log rõ ràng nếu có lỗi xảy ra trong quá trình truy vấn để dễ dàng debug
  const data = await ApiPerformanceModel.aggregate([
    { $match: match },
    
    // Nhóm theo endpoint để tính toán thống kê
    // Sử dụng $cond để tính toán số lần bị slow và số lần lỗi
    // Sử dụng $round để làm tròn kết quả thời gian trung bình đến 2 chữ số thập phân
    // Cần đảm bảo rằng việc tính toán này được tối ưu, có thể sử dụng index trên trường createdAt và endpoint để tăng tốc độ truy vấn
    // Cần log rõ ràng nếu có lỗi xảy ra trong quá trình truy vấn để dễ dàng debug
    
    {
      $group: {
        _id: "$endpoint",

        totalCalls: { $sum: 1 },

        avgTime: { $avg: "$totalTime" },
        maxTime: { $max: "$totalTime" },

        avgDb: { $avg: "$dbTime" },
        avgService: { $avg: "$serviceTime" },
        avgController: { $avg: "$controllerTime" },

        slowCount: {
          $sum: { $cond: ["$isSlow", 1, 0] },
        },

        errorCount: {
          $sum: {
            $cond: [{ $gte: ["$status", 400] }, 1, 0],
          },
        },
      },
    },

    {
      $project: {
        endpoint: "$_id",
        _id: 0,

        totalCalls: 1,
        avgTime: { $round: ["$avgTime", 2] },
        maxTime: 1,

        avgDb: { $round: ["$avgDb", 2] },
        avgService: { $round: ["$avgService", 2] },
        avgController: { $round: ["$avgController", 2] },

        slowCount: 1,
        errorCount: 1,
      },
    },

    { $sort: { avgTime: -1 } },
  ]);

  res.json({
    success: true,
    data,
  });
};