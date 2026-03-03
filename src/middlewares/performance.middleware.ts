import { ApiPerformanceModel } from "../models/apiPerformance.model";
import { Request, Response, NextFunction } from "express";

// Mở rộng kiểu Request để thêm thông tin hiệu năng
declare global {
  namespace Express {
    interface Request {
      perf: {
        start: number;
        dbTime: number;
        serviceTime: number;
        controllerTime: number;
      };
    }
  }
}

/**
 * // Middleware đo hiệu năng API, lưu vào DB và log console
 * - Đo tổng thời gian xử lý request
 * - Đo thời gian ở từng layer: DB, service, controller (cần các layer này tự cập nhật thời gian vào req.perf)
 * - Xác định API chậm nếu tổng thời gian > 800ms
 * - Lưu thông tin vào MongoDB (không await để tránh ảnh hưởng hiệu năng)
 * - Log chi tiết ra console để dễ dàng theo dõi
 * @param req 
 * @param res 
 * @param next 
 */
export const performanceMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.perf = {
    start: Date.now(),
    dbTime: 0,
    serviceTime: 0,
    controllerTime: 0,
  };

  res.on("finish", async () => {
    const total = Date.now() - req.perf.start;
    const isSlow = total > 800;

    const data = {
      method: req.method,
      endpoint: req.route?.path || req.originalUrl,
      status: res.statusCode,

      totalTime: total,
      dbTime: req.perf.dbTime,
      serviceTime: req.perf.serviceTime,
      controllerTime: req.perf.controllerTime,

      user: req.user?.id,
      isSlow,
    };

    // 🔹 log console
    // console.log("API PERF", data);

    // 🔹 lưu DB async (không await)
    ApiPerformanceModel.create(data).catch(() => {});
  });

  next();
};