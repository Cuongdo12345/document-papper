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
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("WorkflowInstance", workflowInstanceSchema);