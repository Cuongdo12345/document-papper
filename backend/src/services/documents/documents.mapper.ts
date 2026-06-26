import { Types } from "mongoose";

export const buildReferenceArray = (referenceTo: any) => {
  if (!referenceTo) return [];

  if (Array.isArray(referenceTo)) {
    return referenceTo.map((id) => new Types.ObjectId(id));
  }

  return [new Types.ObjectId(referenceTo)];
};