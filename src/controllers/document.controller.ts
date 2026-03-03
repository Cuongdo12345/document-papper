import { createDocumentService,
        getDocumentDetailService,
        getAllDocumentsService,
        updateDocumentService,
        deleteDocumentService,
        getReportsByProposalService, 
        restoreDocumentService
        } 
        from "../services/documents.service";
import { Request, Response } from "express";



/**
 * API TẠO MỚI GIẤY ĐỀ XUẤT / BIÊN BẢN
 * Controller sẽ nhận request, gọi service để xử lý nghiệp vụ, và trả về response cho client
 * Logic chính sẽ nằm ở service, controller chỉ tập trung vào việc nhận request, gọi service, và trả về response
 * Ví dụ: nếu có logic phức tạp liên quan đến việc tạo document, ví dụ: kiểm tra điều kiện đặc biệt khi tạo document, hoặc có liên quan đến nhiều model khác nhau, thì nên chuyển vào service để dễ bảo trì và tái sử dụng
 * Ví dụ: nếu có logic liên quan đến audit khi tạo document, thì cũng nên đặt ở service để đảm bảo tính nhất quán và dễ quản lý
 * @param req 
 * @param res 
 * @returns 
 */
export const createDocuments = async (req: Request, res: Response) => {
  try {

    const doc = await createDocumentService({
      userId: req.user!.id,
      ...req.body
    });

    return res.status(201).json(doc);

  } catch (error: any) {

    // const map: any = {
    //   INVALID_SUBTYPE: "Loại giấy không hợp lệ",
    //   CATEGORY_MISMATCH: "Category không khớp subType",
    //   REFERENCE_REQUIRED: "Loại giấy này bắt buộc phải có biên bản kèm theo",
    //   REFERENCE_NOT_FOUND: "Biên bản tham chiếu không tồn tại",
    //   INVALID_REFERENCE_TYPE: "Biên bản tham chiếu không đúng loại",
    //   CROSS_DEPARTMENT_REFERENCE: "Biên bản khác khoa",
    //   REFERENCE_NOT_ALLOWED: "Loại giấy này không cần biên bản tham chiếu",
    // };

    return res.status(400).json({
      message: error.message || "Lỗi tạo document"
    });
  }
};



/**
 *API LẤY CHI TIẾT GIẤY ĐỀ XUẤT / BIÊN BẢN
 * 
 * @param req 
 * @param res 
 * @returns 
 */
export const getDocumentById = async (req: Request, res: Response) => {
  try {

    const doc = await getDocumentDetailService(req.params.id);

    return res.json({
      message: "Get document detail successfully",
      data: doc,
    });

  } catch (error: any) {

    if (error.message === "DOCUMENT_NOT_FOUND")
      return res.status(404).json({ message: "Document not found" });

    return res.status(500).json({ message: "Internal server error" });
  }
};


/**
 // API LẤY DANH SÁCH GIẤY ĐỀ XUẤT / BIÊN BẢN VỚI FILTER, PAGINATION VÀ SORTING
  * Controller sẽ nhận request, gọi service để xử lý nghiệp vụ, và trả về response cho client
  * Logic chính sẽ nằm ở service, controller chỉ tập trung vào việc nhận request, gọi service, và trả về response
  * Ví dụ: nếu có logic phức tạp liên quan đến việc lấy danh sách document, ví dụ: kiểm tra điều kiện đặc biệt khi lọc document, hoặc có liên quan đến nhiều model khác nhau, thì nên chuyển vào service để dễ bảo trì và tái sử dụng
  * Ví dụ: nếu có logic liên quan đến audit khi lấy danh sách document, thì cũng nên đặt ở service để đảm bảo tính nhất quán và dễ quản lý
 * @param req 
 * @param res 
 * @returns 
 */
export const getAllDocuments = async (req: Request, res: Response) => {
  try {

    const result = await getAllDocumentsService(req.query);

    return res.json(result);

  } catch (error) {
    return res.status(500).json({
      message: "Lỗi lấy danh sách document"
    });
  }
};

/**
 * Update document
 * Controller sẽ nhận request, gọi service để xử lý nghiệp vụ, và trả về response cho client
 * Logic chính sẽ nằm ở service, controller chỉ tập trung vào việc nhận request, gọi service, và trả về response
 */

export const updateDocuments = async (req: Request, res: Response) => {
  try {

    // if (!parsed.success) {
    //   return res.status(422).json({
    //     message: "Invalid update data",
    //     errors: parsed.error.format(),
    //   });
    // }

    const document = await updateDocumentService({
      id: req.params.id,
      userId: req.user!.id,
      updateData: req.body
    });

    return res.status(200).json({
      message: "Update document successfully",
      data: document,
    });

  } catch (error: any) {

    // const map: any = {
    //   INVALID_ID: "ID giấy không hợp lệ",
    //   DOCUMENT_NOT_FOUND: "Không tìm thấy giấy đề xuất / biên bản",
    //   DOCUMENT_LOCKED: "Giấy đề xuất đã trình ký, không thể chỉnh sửa",
    //   FORBIDDEN_FIELDS: "Bạn đang cố sửa field không được phép",
    // };

    return res.status(400).json({
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Delete document (soft delete)
 * Controller sẽ nhận request, gọi service để xử lý nghiệp vụ, và trả về response cho client
 * Logic chính sẽ nằm ở service, controller chỉ tập trung vào việc nhận request, gọi service, và trả về response
 * Ví dụ: nếu có logic phức tạp liên quan đến việc xoá document, ví dụ: kiểm tra điều kiện đặc biệt khi xoá document, hoặc có liên quan đến nhiều model khác nhau, thì nên chuyển vào service để dễ bảo trì và tái sử dụng
 */

export const deleteDocuments = async (req: Request, res: Response) => {
  try {
    const user = req.user!;

    const doc = await deleteDocumentService({
      id: req.params.id,
      userId: user.id,
      role: user.role,
    });

    return res.status(200).json({
      message: "Tài liệu đã được xóa (soft delete)",
      data: doc._id,
    });
  } catch (error: any) {

    // const map: any = {
    //   INVALID_ID: "ID giấy không hợp lệ",
    //   DOCUMENT_NOT_FOUND: "Không tìm thấy giấy đề xuất / biên bản",
    //   NO_PERMISSION: "Bạn không có quyền xoá tài liệu này",
    //   PROPOSAL_HAS_REPORT: "Không thể xóa đề xuất có biên bản liên quan",
    //   DOCUMENT_LOCKED: "Tài liệu đã trình ký, không thể xoá",
    // };

    return res.status(400).json({
      message: error.message || "Xóa tài liệu thất bại",
    });
  }
};

// API LẤY TOÀN BỘ BIÊN BẢN THUỘC 1 GIẤY ĐỀ XUẤT
export const getReportsByProposals = async (req:Request, res:Response) => {
  try {
    const data = await getReportsByProposalService(req.params.proposalId);

    return res.status(200).json({
      message: "Lấy danh sách biên bản theo đề xuất thành công",
      data,
    });
  } catch (error:any) {
    return res.status(500).json({
      message: error.message || "Internal server error",
    });
  }
};

// PATCH /api/documents/:id/restore
export const restoreDocuments = async (req: Request, res: Response, next: any) => {
  try {
    const result = await restoreDocumentService({
      documentId: req.params.id,
      userId: req.user!.id,
      isAdmin: req.user!.role === "ADMIN",
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};


// /**
//  *  EXPORT DOCUMENTS TO EXCEL
//  *  // Endpoint này cho phép người dùng xuất danh sách tài liệu ra file Excel, có thể áp dụng các bộ lọc như phòng ban, trạng thái tài liệu, khoảng thời gian tạo tài liệu, v.v. Kết quả trả về sẽ là một file Excel được tải xuống hoặc một URL để tải file.
//  * // Lưu ý: Do việc xuất file Excel có thể mất thời gian, nên endpoint này có thể được thiết kế để trả về một job ID và người dùng sẽ sử dụng job ID đó để kiểm tra trạng thái và tải file khi đã sẵn sàng, thay vì giữ kết nối HTTP mở trong suốt quá trình tạo file.
//  * @param req 
//  * @param res 
//  * @returns 
//  */
// export const exportDocumentsExcel = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const fileName = await exportDocumentsExcelPRO(req.query, res);

//     return res.status(200).json({
//       success: true,
//       message: "Export file thành công",
//       downloadUrl: `../Export/document/${fileName}`,
//     });

//   } catch (error: any) {
//     console.error("❌ EXPORT ERROR:", error);

//     return res.status(500).json({
//       success: false,
//       message: error.message || "Export thất bại",
//     });
//   }
// };











// import { Request, Response } from "express";
// import {
//   Document,
//   DocumentCategory,
//   DocumentSubType,
// } from "../models/document.model";
// import UserAudit from "../models/userAudit.model";
// import {generateDocumentCode} from "../shared/utils/generateDocumentCode.ts";
// import { DOCUMENT_RULES } from "../shared/constants/documentRules";
// // import { generateDocumentPDF } from "../services/pdf.service";
// import { Types } from "mongoose";
// import { UpdateDocumentSchema } from "../dtos/update-document.dto";

// /**
//  * 
//  * @param req 
//  * @param res 
//  * @returns 
//  */
// // API TẠO MỚI GIẤY ĐỀ XUẤT / BIÊN BẢN
// export const createDocuments = async (req: Request, res: Response) => {
//   try {
//     const user = req.user!;
//     const {
//       category,
//       subType,
//       title,
//       department,
//       referenceTo,
//       meta,
//     } = req.body;

//     // 1️⃣ Check rule tồn tại
//     const rule = DOCUMENT_RULES[subType as DocumentSubType];
//     if (!rule) {
//       return res.status(400).json({ message: "Loại giấy không hợp lệ" });
//     }

//     // 2️⃣ Check category đúng
//     if (rule.category !== category) {
//       return res.status(400).json({ message: "Category không khớp subType" });
//     }

//     // 3️⃣ Nếu cần reference → kiểm tra
//     if (rule.requireReference) {
//       if (!referenceTo) {
//         return res.status(400).json({
//           message: "Loại giấy này bắt buộc phải có biên bản kèm theo",
//         });
//       }

//       // 🔍 Lấy document tham chiếu
//       const refDoc = await Document.findById(referenceTo);

//       if (!refDoc) {
//         return res.status(404).json({
//           message: "Biên bản tham chiếu không tồn tại",
//         });
//       }

//       if (rule.referenceSubType && refDoc.subType !== rule.referenceSubType) {
//         return res.status(400).json({
//           message: "Biên bản tham chiếu không đúng loại",
//         });
//       }

//   // 🔐 Check cùng khoa
//       if (department.toString() !== refDoc.department.toString()) {
//         return res
//           .status(403)
//           .json({ message: "Biên bản khác khoa" });
//       }
// }

//     // (Optional nhưng rất hay) Nếu KHÔNG cho phép reference dư thừa
//       if (!rule.requireReference && referenceTo) {
//       return res.status(400).json({
//       message: "Loại giấy này không cần biên bản tham chiếu",
//     });
// }
//     // 4️⃣ Generate documentCode
//      // TỰ ĐỘNG SINH documentCode
//         const documentCode = await generateDocumentCode(
//           category,
//           department
//         );
      
//     // 5️⃣ Create document
//     const doc = await Document.create({
//       documentCode,
//       category,
//       subType,
//       title,
//       department,
//       createdBy: user.id,
//       referenceTo: referenceTo || null,
//       meta,
//     });
    
//     // 6️⃣ Audit
//     await UserAudit.create({
//       user: user.id,
//       action: "CREATE", 
//       performedBy: req.user!.id,
//       note: `User tạo mới ${category === DocumentCategory.PROPOSAL ? "giấy đề xuất" : "biên bản"
//         }`,
//     });

//     res.status(201).json(doc);
//   } catch (error) {
//     res.status(500).json({
//       message: "Lỗi tạo document",
//       error,
//     });
//   }
// };

// /**
//  * 
//  * @param req 
//  * @param res 
//  * @returns 
//  */
// // API LẤY DANH SÁCH GIẤY ĐỀ XUẤT / BIÊN BẢN VỚI FILTER, PAGINATION VÀ SORTING
// export const getAllDocuments = async (req: Request, res: Response) => {
//   try {
//     const {
//       category,
//       subType,
//       department,
//       status,
//       createdBy,
//       fromDate,
//       toDate,
//       isActive,
//       keyword,
//       page = "1",
//       limit = "10",
//       sortBy = "createdAt",
//       order = "desc",
//     } = req.query;

//     /**
//      * =========================
//      * 1. Build filter
//      * =========================
//      */
//     const filter: any = {};

//     // Soft delete mặc định chỉ lấy doc active true
//     if (isActive === "false") {
//       filter.isActive = false;
//     } else if (isActive === "true") {
//       filter.isActive = true;
//     } else {
//       filter.isActive = true;
//     }

//     if (category) filter.category = category;
//     if (subType) filter.subType = subType;
//     if (department) filter.department = department;
//     if (status) filter.status = status;
//     if (createdBy) filter.createdBy = createdBy;

//     /**
//      * Filter theo ngày tạo
//      */
//     if (fromDate || toDate) {
//       filter.createdAt = {};
//       if (fromDate) {
//         filter.createdAt.$gte = new Date(fromDate as string);
//       }
//       if (toDate) {
//         filter.createdAt.$lte = new Date(toDate as string);
//       }
//     }

//     /**
//      * Search keyword
//      */
//     if (keyword) {
//       filter.$or = [
//         { title: { $regex: keyword, $options: "i" } },
//         { documentCode: { $regex: keyword, $options: "i" } },
//       ];
//     }

//     /**
//      * =========================
//      * 2. Pagination
//      * =========================
//      */
//     const pageNum = Math.max(parseInt(page as string, 10), 1);
//     const limitNum = Math.min(
//       Math.max(parseInt(limit as string, 10), 1),
//       100
//     );
//     const skip = (pageNum - 1) * limitNum;

//     /**
//      * =========================
//      * 3. Sort
//      * =========================
//      */
//     const sort: any = {};
//     sort[sortBy as string] = order === "asc" ? 1 : -1;

//     /**
//      * =========================
//      * 4. Query DB
//      * =========================
//      */
//     const [documents, total] = await Promise.all([
//       Document.find(filter)
//         .populate("department", "code name")
//         .populate("createdBy", "username fullName")
//         .populate("referenceTo", "documentCode subType")
//         .sort(sort)
//         .skip(skip)
//         .limit(limitNum)
//         .lean(),

//       Document.countDocuments(filter),
//     ]);

//     /**
//      * =========================
//      * 5. Response
//      * =========================
//      */
//     return res.json({
//       data: documents,
//       pagination: {
//         page: pageNum,
//         limit: limitNum,
//         total,
//         totalPages: Math.ceil(total / limitNum),
//       },
//     });
//   } catch (error) {
//     return res.status(500).json({
//       message: "Lỗi lấy danh sách document",
//       error,
//     });
//   }
// };


// /**
//  * GET /api/documents/:id
//  * Lấy chi tiết 1 document (đề xuất / biên bản)
//  */
// export const getDocumentById = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const { id } = req.params;

//     /* ===============================
//      * 1. Validate ID
//      * =============================== */
//     if (!Types.ObjectId.isValid(id as any)) {
//       return res.status(400).json({
//         message: "Document không tồn tại",
//       });
//     }

//     /* ===============================
//      * 2. Query document
//      * =============================== */
//     const document = await Document.findOne({
//       _id: id,
//       isActive: true,
//     })
//       .populate("department", "name code")
//       .populate("createdBy", "fullName username")
//       .populate("referenceTo", "documentCode subType createdBy meta title");

//     if (!document) {
//       return res.status(404).json({
//         message: "Document not found",
//       });
//     }

//     /* ===============================
//      * 3. Response
//      * =============================== */
//     return res.status(200).json({
//       message: "Get document detail successfully",
//       data: document,
//     });
//   } catch (error: any) {
//     console.error("[GET_DOCUMENT_DETAIL_ERROR]", error);

//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };


// /**
//  * GET /api/documents/:proposalId/reports
//  * Lấy toàn bộ BIÊN BẢN thuộc 1 GIẤY ĐỀ XUẤT
//  */
// export const getReportsByProposals = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const { proposalId } = req.params;

//     /* ===============================
//      * 1. Validate proposalId
//      * =============================== */
//     if (!Types.ObjectId.isValid(proposalId as any)) {
//       return res.status(400).json({
//         message: "Document không tồn tại",
//       });
//     }

//     /* ===============================
//      * 2. Kiểm tra đề xuất tồn tại
//      * =============================== */
//     const proposal = await Document.findOne({
//       _id: proposalId,
//       category: DocumentCategory.PROPOSAL,
//       isActive: true,
//     });

//     if (!proposal) {
//       return res.status(404).json({
//         message: "Proposal document not found",
//       });
//     }

//     /* ===============================
//      * 3. Lấy danh sách biên bản
//      * =============================== */
//     const reports = await Document.find({
//       category: DocumentCategory.REPORT,
//       subType: DocumentSubType.CHECK_DAMAGE,
//       referenceTo: proposalId,
//       isActive: true,
//     })
//       .populate("department", "name code")
//       .populate("createdBy", "fullName username")
//       // .populate("referenceTo", "documentCode subType createdBy meta title")
//       .sort({ createdAt: 1 }); // theo timeline xử lý

//     /* ===============================
//      * 4. Response
//      * =============================== */
//     return res.status(200).json({
//       message: "Get reports by proposal successfully",
//       data: {
//         proposal: {
//           id: proposal._id,
//           title: proposal.title,
//           subType: proposal.subType,
//           // status: proposal.status,
//         },
//         totalReports: reports.length,
//         reports,
//       },
//     });
//   } catch (error: any) {
//     console.error("[GET_REPORTS_BY_PROPOSAL_ERROR]", error);

//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// // API CẬP NHẬT GIẤY ĐỀ XUẤT / BIÊN BẢN
// /**
//  * 
//  * @param req 
//  * @param res 
//  * @returns 
//  */
// export const updateDocuments = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const { id } = req.params;
//     const user = req.user!; // từ auth middleware

//     /* ===============================
//      * 1. Validate ObjectId
//      * =============================== */
//     if (!Types.ObjectId.isValid(id as any)) {
//       return res.status(400).json({
//         message: "Invalid document id",
//       });
//     }

//     /* ===============================
//      * 2. Validate body
//      * =============================== */
//     const parsed = UpdateDocumentSchema.safeParse(
//       req.body
//     );

//     if (!parsed.success) {
//       return res.status(422).json({
//         message: "Invalid update data",
//         errors: parsed.error.format(),
//       });
//     }

//     /* ===============================
//      * 3. Lấy document
//      * =============================== */
//     const document = await Document.findById(id);

//     if (!document || !document.isActive) {
//       return res.status(404).json({
//         message: "Document not found",
//       });
//     }

//     /* ===============================
//      * 4. Check quyền sửa
//      * =============================== */
//     // const isAdmin = user.role === "ADMIN";
//     // const isOwner =
//     //   document.createdBy.toString() === user._id.toString();

//     // if (!isAdmin) {
//     //   return res.status(403).json({
//     //     message:
//     //       "Bạn không có quyền cập nhật tài liệu này",
//     //   });
//     // }

//     // if (
//     //   !isAdmin &&
//     //   document.status !== "DRAFT"
//     // ) {
//     //   return res.status(400).json({
//     //     message:
//     //       "Only draft document can be edited",
//     //   });
//     // }

//     /* ===============================
//      * 5. Update an toàn
//      * =============================== */
//     Object.assign(document, parsed.data);

//     document.updatedBy = new Types.ObjectId(user.id);
//     document.updatedAt = new Date();

//     await document.save();

//     /* ===============================
//      * 6. Response
//      * =============================== */
//     return res.status(200).json({
//       message: "Update document successfully",
//       data: document,
//     });
//   } catch (error: any) {
//     console.error("[UPDATE_DOCUMENT_ERROR]", error);

//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };

// /**
//  * DELETE /api/documents/:id
//  * Soft delete document
//  */
// export const deleteDocuments = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const { id } = req.params;
//     const user = req.user!;

//     /* ===============================
//      * 1. Validate ObjectId
//      * =============================== */
//     if (!Types.ObjectId.isValid(id as any)) {
//       return res.status(400).json({
//         message: "Invalid document id",
//       });
//     }

//     /* ===============================
//      * 2. Lấy document
//      * =============================== */
//     const document = await Document.findById(id);

//     if (!document || !document.isActive) {
//       return res.status(404).json({
//         message: "Document not found",
//       });
//     }

//     /* ===============================
//      * 5. Chặn xoá proposal đã có report
//      * =============================== */
//     if (
//       document.category === DocumentCategory.PROPOSAL
//     ) {
//       const proID = document._id;
//       const hasReport = await Document.exists({
//         referenceTo: proID,
//         isActive: true,
//       });

//       if (hasReport) {
//         return res.status(400).json({
//           message:
//             "Không thể xóa đề xuất có biên bản liên quan",
//         });
//       }
//     }

//     /* ===============================
//      * 3. Check quyền
//      * =============================== */
//     const isAdmin = user.role === "ADMIN";
//     // const isOwner =
//     //   document.createdBy.toString() === user._id;

//     if (!isAdmin) {
//       return res.status(403).json({
//         message:
//           "Bạn không có quyền xoá tài liệu này",
//       });
//     }

//     /* ===============================
//      * 4. Chặn xoá document đã trình ký
//      * =============================== */
//     // if (
//     //   !isAdmin &&
//     //   document.status !== DocumentStatus.DRAFT
//     // ) {
//     //   return res.status(400).json({
//     //     message:
//     //       "Only draft document can be deleted",
//     //   });
//     // }


//     /* ===============================
//      * 6. Soft delete
//      * =============================== */
//     document.isActive = false;
//     document.deletedAt = new Date();
//     document.deletedBy = new Types.ObjectId(user.id);

//     await document.save();

//     /* ===============================
//      * 7. Response
//      * =============================== */
//     return res.status(200).json({
//       message: "Tai liệu đã được xóa (soft delete)",
//     });
//   } catch (error: any) {
//     console.error("[DELETE_DOCUMENT_ERROR]", error);

//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };


// /**
//  * PATCH /api/documents/:id/restore
//  * Restore soft deleted document
//  */
// export const restoreDocuments = async (
//   req: Request,
//   res: Response
// ) => {
//   try {
//     const { id } = req.params;
//     const user = req.user!;

//     /* ===============================
//      * 1. Validate ObjectId
//      * =============================== */
//     if (!Types.ObjectId.isValid(id as any)) {
//       return res.status(400).json({
//         message: "Invalid document id",
//       });
//     }

//     /* ===============================
//      * 2. Check quyền (ADMIN ONLY)
//      * =============================== */
//     if (user.role !== "ADMIN") {
//       return res.status(403).json({
//         message: "Chỉ ADMIN có thể khôi phục document",
//       });
//     }

//     /* ===============================
//      * 3. Lấy document (kể cả đã xoá)
//      * =============================== */
//     const document = await Document.findById(id);

//     if (!document) {
//       return res.status(404).json({
//         message: "Không tìm thấy document",
//       });
//     }

//     /* ===============================
//      * 4. Check trạng thái
//      * =============================== */
//     if (document.isActive) {
//       return res.status(400).json({
//         message: "Tài liệu đang ở trạng thái hoạt động",
//       });
//     }

//     /* ===============================
//      * 5. Validate nghiệp vụ proposal
//      * =============================== */
//     if (
//       document.category === DocumentCategory.PROPOSAL
//     ) {
//       const hasActiveReport =
//         await Document.exists({
//           referenceTo: document._id
//         });

//       if (hasActiveReport) {
//         return res.status(400).json({
//           message:
//             "Không thể khôi phục đề xuất khi có biên bản liên quan đang hoạt động",
//         });
//       }
//     }

//     /* ===============================
//      * 6. Restore
//      * =============================== */
//     document.isActive = true;
//     document.deletedAt = undefined;
//     document.deletedBy = undefined;

//     await document.save();

//     /* ===============================
//      * 7. Response
//      * =============================== */
//     return res.status(200).json({
//       message: "Restore document successfully",
//       data: document,
//     });
//   } catch (error: any) {
//     console.error("[RESTORE_DOCUMENT_ERROR]", error);

//     return res.status(500).json({
//       message: "Internal server error",
//       error: error.message,
//     });
//   }
// };


// // 3️⃣ EXPORT DOCUMENTS TO EXCEL
// // export const exportDocumentPDF = async (req: Request, res: Request) => {
// //   const document = await Document.findById(req.params.id)
// //     .populate("department", "name")
// //     .populate("createdBy", "fullName")
// //     .populate({
// //      path: "referenceTo",
// //      populate: { path: "createdBy", select: "fullName" },
// //   })
// //   .lean();

// //     // Check if document exists
// //   if (!document) {
// //     return res.status(404).json({ message: "Không tìm thấy văn bản" });
// //   }
  
// //   // Generate PDF buffer
// //   const pdfBuffer = await generateDocumentPDF(document);

// //   res.setHeader("Content-Type", "application/pdf");
// //   res.setHeader(
// //     "Content-Disposition",
// //     `attachment; filename=${document.documentCode}.pdf`
// //   );

// //   res.end(pdfBuffer);
// // };