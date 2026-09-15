// =========================
// 4. department.dto.ts
// =========================
import { z } from "zod";

/**
 * DEV-021/SEC-11: `department.routes.ts` trước đây KHÔNG có `validateBody`
 * ở BẤT KỲ route nào — `createDepartmentService`/`updateDepartmentService`
 * nhận thẳng `req.body` (`any`). 2 DTO này TỪNG TỒN TẠI SẴN nhưng chưa bao
 * giờ được wire vào route — khi đọc lại để wire, phát hiện chúng đã LỆCH so
 * với `department.model.ts` hiện tại (không có field `description`/
 * `isActive`, chỉ có `code`/`name`) — sửa lại khớp schema thật trước khi
 * wire, không wire nguyên trạng DTO cũ (sẽ tạo hợp đồng API sai: client
 * tưởng gửi được `description`/`isActive` nhưng Mongoose âm thầm bỏ qua vì
 * không có trong schema).
 */
export const CreateDepartmentDTO = z.object({
  name: z.string().trim().min(1, "Tên phòng ban không được để trống"),
  code: z.string().trim().min(1, "Mã phòng ban không được để trống"),
});

export const UpdateDepartmentDTO = z
  .object({
    name: z.string().trim().min(1).optional(),
    code: z.string().trim().min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Cần ít nhất 1 field để cập nhật",
  });

export const QueryDepartmentDTO = z.object({
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(10),
  keyword: z.string().optional(),
});