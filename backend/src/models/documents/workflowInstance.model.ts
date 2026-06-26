import mongoose from "mongoose";

const workflowInstanceSchema = new mongoose.Schema(
  {
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" },

    templateId: { type: mongoose.Schema.Types.ObjectId, ref: "WorkflowTemplate" },

    currentStep: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
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
          enum: ["pending", "approved", "rejected"],
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