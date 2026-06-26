import * as service from "../services/documents/workflow.service";
import { Request, Response } from "express";

export const createTemplate = async (req:Request, res:Response) => {
  const data = await service.createWorkflowTemplate(req.body);
  res.json(data);
};

export const submit = async (req:Request, res:Response) => {
  const { documentId, templateId } = req.body;

  const wf = await service.submitWorkflow(documentId, templateId);

  res.json(wf);
};

export const approve = async (req:Request, res:Response) => {
  const wf = await service.approveStep(
    req.params.id,
    req.user!.id,
    req.body.comment
  );

  res.json(wf);
};

export const reject = async (req:Request, res:Response) => {
  const wf = await service.rejectStep(
    req.params.id,
    req.user!.id,
    req.body.comment
  );

  res.json(wf);
};