import { Document } from "../../models/documents/document.model";

export const createDocument = (data: any) => {
  return Document.create(data);
};

export const findDocumentById = (id: any) => {
  return Document.findById(id);
};

export const findActiveDocument = (id: any) => {
  return Document.findOne({ _id: id, isActive: true });
};

export const countDocuments = (filter: any) => {
  return Document.countDocuments(filter);
};

export const findDocuments = (filter: any, options: any) => {
  return Document.find(filter)
    .populate("department", "code name")
    .populate("createdBy", "username fullName")
    .populate("referenceTo", "subType")
    .sort(options.sort)
    .skip(options.skip)
    .limit(options.limit)
    .lean();
};

/* ===============================
   DELETE MANY BY FILTER
=============================== */
export const deleteDocumentsByFilter = (query: any) => {
  return Document.deleteMany(query);
};

/* ===============================
   FIND PROPOSAL
=============================== */
export const findProposalById = (id: any) => {
  return Document.findOne({
    _id: id,
    category: "PROPOSAL",
    isActive: true,
  })
    .populate("department", "name code")
    .populate("createdBy", "fullName username")
    .lean();
};

/* ===============================
   FIND REPORTS BY PROPOSAL
=============================== */
export const findReportsByProposal = (proposalId: any) => {
  return Document.find({
    referenceTo: proposalId,
    category: "REPORT",
    subType: "CHECK_DAMAGE",
    isActive: true,
  })
    .populate("department", "name code")
    .populate("createdBy", "fullName username")
    .sort({ createdAt: 1 })
    .lean();
};

/* ===============================
   FIND DOCUMENT (INCLUDING DELETED)
=============================== */
export const findDocumentIncludeDeleted = (id: any) => {
  return Document.findOne({ _id: id }).select("+deletedAt +deletedBy");
};
