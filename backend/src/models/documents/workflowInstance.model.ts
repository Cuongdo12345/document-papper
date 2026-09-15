import mongoose from "mongoose";

const workflowInstanceSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },

    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkflowTemplate" },

    currentStep: { type: Number, default: 0 },

    status: {
      type: String,
      // "cancelled" bổ sung thêm (additive) — dùng cho `cancelWorkflow` mới,
      // phân biệt rõ với "rejected" (bị 1 approver chủ động từ chối): huỷ là
      // do CHÍNH người tạo document rút lại trước khi ai duyệt bước nào.
      // Không đổi/xoá 3 giá trị cũ — mọi check `status !== "pending"` hiện
      // có vẫn hoạt động đúng y nguyên.
      enum: ["pending", "approved", "rejected", "cancelled", "completed"],
      default: "pending",
    },

    steps: [
      {
        stepOrder: Number,
        name: String,
        role: String,

        approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        status: {
          type: String,
          enum: ["pending", "approved", "rejected", "cancelled"],
          default: "pending",
        },
        comment: String,
        approvedAt: Date,

        // Roadmap B1 (SLA & nhắc việc, 2026-09-15) — copy nguyên từ
        // `WorkflowTemplate.steps[].slaDays` lúc submit (xem `submitWorkflow`,
        // workflow.service.ts — `step.toObject()` copy đủ mọi field kể cả
        // field mới thêm sau này, không cần sửa hàm đó).
        slaDays: Number,
        // Đánh dấu ĐÃ nhắc/escalate — chặn gửi lặp lại mỗi lần cron chạy.
        // Reset về `undefined` KHÔNG cần thiết: 1 bước chỉ "pending" đúng 1
        // lần trong đời workflow (approve/reject xong không quay lại pending
        // nữa), nên các field này không có nhu cầu tái sử dụng.
        slaReminderSentAt: Date,
        slaEscalatedAt: Date,
      },
    ],
  },
  { timestamps: true }
);

/**
 * DEV-018/IMP-024 (ISS-05, RV05-08): trước đây model này KHÔNG có index nào
 * ngoài `_id` — `getPendingApprovalsForRole()` (workflow.service.ts, "hộp
 * thư chờ duyệt", endpoint tần suất cao) filter theo `status: "pending"` +
 * `$expr` (so khớp `steps[currentStep].role`) rồi sort theo `createdAt`
 * tăng dần → COLLSCAN toàn bộ collection mỗi lần gọi, tệ dần theo thời gian
 * khi dữ liệu tăng.
 *
 * `$expr`/mảng lồng nhau (`steps.role` + `currentStep` động) KHÔNG thể
 * index trực tiếp bằng 1 compound index thông thường, nên vẫn cần lọc phần
 * đó trong bộ nhớ sau khi đã dùng index này để loại bỏ phần lớn document
 * KHÔNG "pending" (đa số sau khi hệ thống chạy 1 thời gian) — đây chính là
 * đề xuất REF-007/ISS-05 (Phase 13 §Recommendations: `{status:1}` tối
 * thiểu). Ghép thêm `createdAt` để index cùng lúc phục vụ cả `$match` VÀ
 * `sort` của đúng truy vấn đang chạy (tránh thêm bước `SORT` riêng sau khi
 * đã `IXSCAN`), không phải suy đoán ngoài phạm vi finding gốc.
 *
 * An toàn tuyệt đối (chỉ thêm index, không đổi field/logic nào) — nên chạy
 * `explain("executionStats")` trên `getPendingApprovalsForRole` sau khi
 * deploy để xác nhận `IXSCAN` thay vì `COLLSCAN` như khuyến nghị gốc.
 */
workflowInstanceSchema.index({ status: 1, createdAt: 1 });

/**
 * MỚI (2026-09-10) — phục vụ `getWorkflowHistoryForUser()` ("Lịch sử duyệt"):
 * filter `{"steps.role": role}` (multikey — Mongo tự index từng phần tử
 * trong mảng `steps`) + sort `createdAt: -1`. An toàn ghép multikey
 * (`steps.role`) với field thường (`createdAt`) trong CÙNG compound index —
 * Mongo CHỈ cấm ghép 2 field multikey khác nhau trong 1 index, không cấm
 * ghép 1 multikey + 1 field thường. Không phục vụ trường hợp ADMIN (không
 * filter theo role) — khối lượng ADMIN duyệt toàn bộ lịch sử dự kiến thấp
 * hơn nhiều so với truy vấn theo role của 1 approver, chấp nhận COLLSCAN
 * cho case đó thay vì thêm index thứ 2 chỉ phục vụ 1 role ADMIN.
 */
workflowInstanceSchema.index({ "steps.role": 1, createdAt: -1 });

export default mongoose.model("WorkflowInstance", workflowInstanceSchema);