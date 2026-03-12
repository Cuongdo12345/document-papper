import { Request, Response } from "express";
import { getAuditLogsService, getAuditDashboardService } from "../services/userAudits.service";

// GET USER AUDIT LOGS (ADMIN)
// I️⃣ AUDIT LÀ GÌ TRONG BÀI TOÁN NÀY?
// 👉 Audit = ghi lại lịch sử thao tác trên giấy
// Ví dụ:
// Ai tạo giấy
// Ai cập nhật
// Ai duyệt
// Ai từ chối
// Thời điểm
// Trạng thái trước & sau


/**
 * 📌 GET ALL AUDIT LOGS (ADMIN)
 */
export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const result = await getAuditLogsService(req.query as any);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi lấy audit log",
      error,
    });
  }
};


/**
 * 📊 GET AUDIT DASHBOARD
 */
export const getAuditDashboard = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await getAuditDashboardService(req.query as any);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      message: "Lỗi lấy dashboard audit",
      error,
    });
  }
};


// export const getUserAudit = async (req: Request, res: Response) => {
//   const audits = await UserAudit.find({
//     user: req.params.userId
//   })
//     .populate("performedBy", "username fullName role")
//     .sort({ createdAt: -1 });

//   res.json(audits);
// };


// //Get all audit log admin
// export const getAuditLogs = async (req: Request, res: Response) => {
//   try {
//     const {
//       action,
//       performedBy,
//       user,
//       fromDate,
//       toDate,
//       page = 1,
//       limit = 10,
//     } = req.query as any;

//     const filter: any = {};

//     if (action) filter.action = action;
//     if (performedBy) filter.performedBy = performedBy;
//     if (user) filter.user = user;

//     if (fromDate || toDate) {
//       filter.createdAt = {};
//       if (fromDate) filter.createdAt.$gte = new Date(fromDate);
//       if (toDate) filter.createdAt.$lte = new Date(toDate);
//     }

//     const skip = (page - 1) * limit;

//     const [logs, total] = await Promise.all([
//       UserAudit.find(filter)
//         .populate("performedBy", "username email role")
//         .populate("user", "username email")
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit),
//       UserAudit.countDocuments(filter),
//     ]);

//     res.json({
//       data: logs,
//       pagination: {
//         total,
//         page,
//         limit,
//         totalPages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Lỗi lấy audit log",
//       error,
//     });
//   }
// };

// //Dashboard
// export const getAuditDashboard = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const { fromDate, toDate } = req.query as any;

//     const match: any = {};

//     if (fromDate || toDate) {
//       match.createdAt = {};
//       if (fromDate) match.createdAt.$gte = new Date(fromDate);
//       if (toDate) match.createdAt.$lte = new Date(toDate);
//     }

//     const [byAction, byDay, total] = await Promise.all([
//       // 📌 Thống kê theo action
//       UserAudit.aggregate([
//         { $match: match },
//         {
//           $group: {
//             _id: "$action",
//             count: { $sum: 1 },
//           },
//         },
//         { $sort: { count: -1 } },
//       ]),

//       // 📅 Thống kê theo ngày
//       UserAudit.aggregate([
//         { $match: match },
//         {
//           $group: {
//             _id: {
//               $dateToString: {
//                 format: "%Y-%m-%d",
//                 date: "$createdAt",
//               },
//             },
//             count: { $sum: 1 },
//           },
//         },
//         { $sort: { _id: 1 } },
//       ]),

//       UserAudit.countDocuments(match),
//     ]);
  
//     //5️⃣ Gắn Audit khi xem Dashboard
// //         await UserAudit.create({
// //         // user: requser._id,
// //         action: "AUDIT_DASHBOARD_VIEW",
// //         performedBy: req.user!.id,
// //         note: "Xem dashboard audit",
// // });

//     res.json({
//       total,
//       byAction,
//       byDay,
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Lỗi lấy dashboard audit",
//       error,
//     });
//   }
// };


