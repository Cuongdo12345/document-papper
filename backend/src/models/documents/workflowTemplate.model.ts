import mongoose from "mongoose";

const stepSchema = new mongoose.Schema({
  stepOrder: Number,
  name: String,
  role: String, // hoặc departmentId
  // Roadmap B1 (SLA & nhắc việc, 2026-09-15) — số ngày tối đa bước này được
  // phép "nằm" ở trạng thái pending trước khi hệ thống nhắc người duyệt.
  // OPTIONAL: không set thì `workflowSlaAlerts.service.ts` dùng
  // `DEFAULT_STEP_SLA_DAYS` — cho phép bật tính năng ngay cho các template
  // ĐÃ TỒN TẠI (seed sẵn) mà không cần sửa dữ liệu, đồng thời vẫn cho phép
  // đặt SLA riêng cho từng bước qua `POST /workflow/templates` khi cần.
  // `submitWorkflow()` copy NGUYÊN `step.toObject()` khi tạo WorkflowInstance
  // (workflow.service.ts) nên field này tự động có mặt ở
  // `WorkflowInstance.steps[]` — KHÔNG cần sửa gì thêm ở đó.
  slaDays: Number,
});

const workflowTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    steps: [stepSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("WorkflowTemplate", workflowTemplateSchema);