// import { ApiPerformanceModel } from "../models/apiPerformance/apiPerformance.model";
// import { Request, Response, NextFunction } from "express";

// // Mở rộng kiểu Request để thêm thông tin hiệu năng
// declare global {
//   namespace Express {
//     interface Request {
//       perf: {
//         start: number;
//         dbTime: number;
//         serviceTime: number;
//         controllerTime: number;
//       };
//     }
//   }
// }

// /**
//  * // Middleware đo hiệu năng API, lưu vào DB và log console
//  * - Đo tổng thời gian xử lý request
//  * - Đo thời gian ở từng layer: DB, service, controller (cần các layer này tự cập nhật thời gian vào req.perf)
//  * - Xác định API chậm nếu tổng thời gian > 800ms
//  * - Lưu thông tin vào MongoDB (không await để tránh ảnh hưởng hiệu năng)
//  * - Log chi tiết ra console để dễ dàng theo dõi
//  * @param req
//  * @param res
//  * @param next
//  */
// export const performanceMiddleware = (
//   req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   req.perf = {
//     start: Date.now(),
//     dbTime: 0,
//     serviceTime: 0,
//     controllerTime: 0,
//   };

//   res.on("finish", async () => {
//     const total = Date.now() - req.perf.start;
//     const isSlow = total > 800;

//     const data = {
//       method: req.method,
//       endpoint: req.route?.path || req.originalUrl,
//       status: res.statusCode,

//       totalTime: total,
//       dbTime: req.perf.dbTime,
//       serviceTime: req.perf.serviceTime,
//       controllerTime: req.perf.controllerTime,

//       user: req.user?._id,
//       isSlow,
//     };

//     // 🔹 log console
//     // console.log("API PERF", data);

//     // 🔹 lưu DB async (không await)
//     ApiPerformanceModel.create(data).catch(() => {});
//   });

//   next();
// };

import { Request, Response, NextFunction } from "express";
import { pushPerformanceLog } from "../shared/performance/performanceLogBuffer";

// Mở rộng kiểu Request để thêm thông tin hiệu năng
declare global {
  namespace Express {
    interface Request {
      perf: {
        start: number;
      };
    }
  }
}

/**
 * PERFORMANCE MIDDLEWARE
 * ======================
 * Đo tổng thời gian xử lý 1 request rồi đẩy vào buffer trong RAM
 * (`pushPerformanceLog`) — KHÔNG ghi thẳng xuống DB ở đây nữa (xem
 * `shared/performance/performanceLogBuffer.ts` để biết lý do và cách flush
 * theo batch).
 *
 * ⚠️ Đã bỏ `dbTime`/`serviceTime`/`controllerTime`: các field này trước đây
 * được khai báo trên `req.perf` nhưng KHÔNG có layer nào (service/
 * controller) thực sự cập nhật giá trị — nghĩa là chúng luôn bằng 0, tạo
 * ảo giác đang đo hiệu năng theo layer trong khi thực tế không đo gì cả.
 * Nếu sau này cần đo chi tiết theo layer, phải chủ động cắm instrumentation
 * (vd wrap từng service call) rồi thêm lại field tương ứng — không nên giữ
 * field rỗng chỉ để "trông đầy đủ".
 *
 * SAMPLING: để giảm tiếp số lượng bản ghi cần lưu (dù đã batch), CHỈ log:
 *   - 100% request chậm (isSlow, > SLOW_THRESHOLD_MS) — đây là dữ liệu quan
 *     trọng nhất, không được bỏ sót.
 *   - 100% request lỗi (status >= 400) — cần để debug.
 *   - 1 tỉ lệ ngẫu nhiên (SAMPLE_RATE) trong số request bình thường còn lại
 *     — đủ để ước lượng xu hướng hiệu năng trung bình mà không cần lưu hết.
 * Tỉ lệ sample cấu hình qua env `PERF_SAMPLE_RATE` (0 → 1), mặc định 0.1
 * (10%) — có thể set 1 ở development để xem đầy đủ, hoặc thấp hơn nữa ở
 * production nếu traffic rất cao.
 */
const SLOW_THRESHOLD_MS = 800;
const SAMPLE_RATE = Number(process.env.PERF_SAMPLE_RATE ?? 0.1);

export const performanceMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  req.perf = { start: Date.now() };

  res.on("finish", () => {
    const totalTime = Date.now() - req.perf.start;
    const isSlow = totalTime > SLOW_THRESHOLD_MS;
    const isError = res.statusCode >= 400;

    // Quyết định có log bản ghi này không: luôn log slow/error, còn lại
    // sample theo SAMPLE_RATE.
    const shouldLog = isSlow || isError || Math.random() < SAMPLE_RATE;
    if (!shouldLog) return;

    pushPerformanceLog({
      method: req.method,
      endpoint: req.route?.path || req.originalUrl,
      status: res.statusCode,
      totalTime,
      user: req.user?._id,
      isSlow,
      createdAt: new Date(),
    });
  });

  next();
};
