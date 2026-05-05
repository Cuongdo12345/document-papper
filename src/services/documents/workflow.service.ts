import WorkflowTemplate from "../../models/documents/workflowTemplate.model";
import WorkflowInstance from "../../models/documents/workflowInstance.model";
import { Document } from "../../models/documents/document.model";

export const createWorkflowTemplate = async (data: any) => {
  return await WorkflowTemplate.create(data);
};

export const submitWorkflow = async (documentId: any, templateId: any) => {
  const template = await WorkflowTemplate.findById(templateId);
  if (!template) throw new Error("Workflow template not found");

  const steps = template.steps.map((step) => ({
    ...step.toObject(),
    status: "pending",
  }));

  const workflow = await WorkflowInstance.create({
    documentId,
    templateId,
    steps,
    currentStep: 0,
  });

  // 🔥 GẮN NGƯỢC VÀO DOCUMENT
  await Document.findByIdAndUpdate(documentId, {
    workflowInstanceId: workflow._id,
    workflowStatus: "pending",
  });

  return workflow;
};

export const approveStep = async (
  workflowId: any,
  userId: any,
  comment?: string,
) => {
  const wf = await WorkflowInstance.findById(workflowId);
  if (!wf) throw new Error("Workflow not found");

  const step = wf.steps[wf.currentStep];
  if (!step) throw new Error("Invalid step");

  step.status = "approved";
  step.approvedBy = userId;
  step.comment = comment;
  step.approvedAt = new Date();

  // next step
  if (wf.currentStep + 1 < wf.steps.length) {
    wf.currentStep += 1;
  } else {
    wf.status = "approved";

    // 🔥 UPDATE DOCUMENT KHI DONE
    await Document.findByIdAndUpdate(
      wf.documentId,
      {
        workflowStatus: "approved",
      },
      { new: true },
    );
  }

  await wf.save();

  return wf;
};

export const rejectStep = async (
  workflowId: any,
  userId: any,
  comment?: string,
) => {
  const wf = await WorkflowInstance.findById(workflowId);
  if (!wf) throw new Error("Workflow not found");

  const step = wf.steps[wf.currentStep];

  step.status = "rejected";
  step.approvedBy = userId;
  step.comment = comment;
  step.approvedAt = new Date();

  wf.status = "rejected";

  await wf.save();

  // 🔥 UPDATE DOCUMENT
  await Document.findByIdAndUpdate(wf.documentId, {
    workflowStatus: "rejected",
  });

  return wf;
};
