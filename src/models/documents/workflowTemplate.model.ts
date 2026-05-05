import mongoose from "mongoose";

const stepSchema = new mongoose.Schema({
  stepOrder: Number,
  name: String,
  role: String, // hoặc departmentId
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