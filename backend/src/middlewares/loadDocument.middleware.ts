import { Request, Response, NextFunction }
from "express";

import { Document }
from "../models/documents/document.model";

export const loadDocument =
  async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const document =
        await Document.findById(
          req.params.id
        );

      if (!document) {
        throw new Error(
          "Document not found"
        );
      }

      req.resource = document;

      next();
    } catch (error) {
      next(error);
    }
  };