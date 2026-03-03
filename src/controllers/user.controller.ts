import { Request, Response } from "express";
import { UserService } from "../services/users.service";

// CONTROLLER LÀ NƠI XỬ LÝ LOGIC LIÊN QUAN ĐẾN REQUEST/RESPONSE
// Ví dụ: validate dữ liệu đầu vào, gọi service để xử lý nghiệp vụ, trả response về client
// Controller nên gọn nhẹ, không nên chứa quá nhiều logic phức tạp
// Logic phức tạp nên được chuyển vào service để dễ bảo trì, test và tái sử dụng  
// ==============================================================================================================
export const createUser = async (req: Request, res: Response) => {
  try {
    const user = await UserService.create(req.body, req.user!.id);

    res.json({
      message: "Tạo user thành công",
      data: {
        id: user._id,
        username: user.username,
        role: user.role,
        department: user.department
      }
    });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// GET USERS (ADMIN)
export const getUsers = async (req: Request, res: Response) => {
  try {
    const result = await UserService.getList(req.query);
    res.json({ data: result.users, pagination: result.pagination });
  } catch (error) {
    res.status(500).json({ message: "Lỗi lấy user" });
  }
};

// GET USER BY ID
export const getUserById = async (req: Request, res: Response) => {
  try {
    const user = await UserService.getById(req.params.id);
    res.json(user);
  } catch (error: any) {
    res.status(404).json({ message: error.message });
  }
};

// UPDATE USER
export const updateUser = async (req: Request, res: Response) => {
  try {
    const updated = await UserService.update(
      req.params.id,
      req.body,
      req.user!.id
    );

    res.json({ message: "Cập nhật user thành công", data: updated });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE USER
export const deleteUser = async (req: Request, res: Response) => {
  try {
    await UserService.disable(req.params.id, req.user!.id);
    res.json({ message: "User đã bị vô hiệu hóa" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

export const restoreUser = async (req: Request, res: Response) => {
  try {
    await UserService.restore(req.params.id, req.user!.id);
    res.json({ message: "Khôi phục user thành công" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// CHANGE PASSWORD
export const changePassword = async (req: Request, res: Response) => {
  try {
    await UserService.changePassword(
      req.user!.id,
      req.body.oldPassword,
      req.body.newPassword
    );

    res.json({ message: "Đổi mật khẩu thành công" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// ADMIN RESET PASSWORD
export const resetPasswordByAdmin = async (req: Request, res: Response) => {
  try {
    await UserService.resetPassword(
      req.params.id,
      req.body.newPassword,
      req.user!.id
    );

    res.json({ message: "Reset mật khẩu thành công" });
  } catch (error: any) {
    res.status(400).json({ message: error.message });
  }
};

// GET ME
export const getMe = async (req: Request, res: Response, next: any) => {
  try {

    const userId = req.user!.id;

    const user = await UserService.getMeService(userId);

    res.json({
      success: true,
      data: user
    });

  } catch (error) {
    next(error);
  }
};

// UPDATE ME
export const updateMe = async (req: Request, res: Response, next: any) => {
  try {

    const userId = req.user!.id;

    const updatedUser = await UserService.updateMeService(
      userId,
      req.body
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser
    });

  } catch (error) {
    next(error);
  }
};


// ==============================================================================================================
// // 1️⃣ CREATE USER (ADMIN)
// /**
//  * 
//  * @param req 
//  * @param res 
//  * @returns 
//  */
// export const createUser = async (req: Request, res: Response) => {
//   try {
//     const { username, password, fullName, role, department } = createUserSchema.parse(req.body);

//     const exists = await User.findOne({ username });
//     if (exists) {
//       return res.status(400).json({ message: "Username đã tồn tại" });
//     }

//     if (role === "DEPARTMENT") {
//       if (!department) {
//         return res.status(400).json({ message: "User khoa phải gắn khoa" });
//       }

//       const dept = await Department.findById(department);
//       if (!dept) {
//         return res.status(400).json({ message: "Khoa không tồn tại" });
//       }
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const user = await User.create({
//       username,
//       password: hashedPassword,
//       fullName,
//       role,
//       department
//     });

//     await UserAudit.create({
//       user: user._id,
//       action: "CREATE",
//       performedBy: req.user!.id,
//       note: "Tạo user mới"
//     });

//     res.json({
//       message: "Tạo user thành công",
//       data: {
//         id: user._id,
//         username: user.username,
//         role: user.role,
//         department: user.department
//       }
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Lỗi tạo user", error });
//   }
// };

// /**
//  * GET USERS (ADMIN)
//  * - Filter
//  * - Pagination
//  * - Sort
//  */
// export const getUsers = async (req: Request, res: Response) => {
//   try {
//     const {page = "1",limit = "10",role,department,isActive,
//       keyword,
//       sortBy = "createdAt",order = "desc",
//       fromDate,
//       toDate,
//     } = req.query;
//     const filter: any = {};

//     // Soft delete mặc định chỉ lấy user active
//     if (isActive === "false") {
//       filter.isActive = false;
//     } else if (isActive === "true") {
//       filter.isActive = true;
//     } else {
//       filter.isActive = true;
//     }

//     if (role) {
//       filter.role = role;
//     }

//     if (department) {
//       filter.department = department;
//     }

//     // 👉 Lọc theo ngày tạo
//     if (fromDate || toDate) {
//       filter.createdAt = {};
//       if (fromDate) filter.createdAt.$gte = new Date(fromDate as string);
//       if (toDate) filter.createdAt.$lte = new Date(toDate as string);
//     }

//     if (keyword) {
//       filter.username = {
//         $regex: keyword,
//         $options: "i"
//       };
//     }

//     const pageNumber = Math.max(parseInt(page as string, 10), 1);
//     const pageSize = Math.max(parseInt(limit as string, 10), 1);
//     const skip = (pageNumber - 1) * pageSize;

//     const sortOption: any = {
//       [sortBy as string]: order === "asc" ? 1 : -1
//     };

//     const [users, total] = await Promise.all([
//       User.find(filter)
//         .select("-password")
//         .populate("department", "code name")
//         .sort(sortOption)
//         .skip(skip)
//         .limit(pageSize),
//       User.countDocuments(filter)
//     ]);

//     res.json({
//       data: users,
//       pagination: {
//         page: pageNumber,
//         limit: pageSize,
//         total,
//         totalPage: Math.ceil(total / pageSize)
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Lỗi lấy danh sách user",
//       error
//     });
//   }
// };


// // 2️⃣ GET USER BY ID
// export const getUserById = async (req: Request, res: Response) => {
//   try {
//     const user = await User.findById(req.params.id)
//       .select("-password")
//       .populate("department", "code name");

//     if (!user) {
//       return res.status(404).json({ message: "Không tìm thấy user" });
//     }

//     res.json(user);
//   } catch (error) {
//     res.status(500).json({ message: "Lỗi lấy user", error });
//   }
// };


// // 3️⃣ UPDATE USER
// export const updateUser = async (req: Request, res: Response) => {
//   try {
//     const { fullName, role, department,username } = req.body;

//     if (role === "DEPARTMENT" && department) {
//       const dept = await Department.findById(department);
//       if (!dept) {
//         return res.status(400).json({ message: "Khoa không tồn tại" });
//       }
//     }

//     const updated = await User.findByIdAndUpdate(
//       req.params.id,
//       { fullName, role, department, username },
//       { new: true }
//     ).select("-password");

//     if (!updated) {
//       return res.status(404).json({ message: "Không tìm thấy user" });
//     }
//     if(updated.isActive === false){
//       return  res.status(400).json({ message: "Không thể cập nhật user đã bị vô hiệu hóa" });
//     }

//     await UserAudit.create({
//       user: updated._id,
//       action: "UPDATE",
//       performedBy: req.user!.id,
//       note: "Cập nhật thông tin user"
//     });

//     res.json({
//       message: "Cập nhật user thành công",
//       data: updated
//     });
//   } catch (error) {
//     res.status(500).json({ message: "Lỗi cập nhật user", error });
//   }
// };


// // 4️⃣ DELETE USER
// export const deleteUser = async (req: Request, res: Response) => {
//   try {
//     const user = await User.findById(req.params.id);
//     if (!user) {
//       return res.status(404).json({ message: "Không tìm thấy user" });
//     }

//     if (user.role === "ADMIN") {
//       return res.status(400).json({
//         message: "Không được vô hiệu hóa ADMIN"
//       });
//     }

//     user.isActive = false;
//     await user.save();

//     await UserAudit.create({
//       user: user._id,
//       action: "DISABLE",
//       performedBy: req.user!.id,
//       note: "Vô hiệu hóa user"
//     });

//     res.json({ message: "User đã bị vô hiệu hóa" });
//   } catch (error) {
//     res.status(500).json({ message: "Lỗi disable user", error });
//   }
// };

// // 4️⃣ RESTORE USER
// export const restoreUser = async (req: Request, res: Response) => {
//   try {
//     const user = await User.findById(req.params.id);
//     if (!user) {
//       return res.status(404).json({ message: "Không tìm thấy user" });
//     }

//     if (user.isActive) {
//       return res.status(400).json({ message: "User đang hoạt động" });
//     }

//     user.isActive = true;
//     await user.save();

//     await UserAudit.create({
//       user: user._id,
//       action: "RESTORE",
//       performedBy: req.user!.id,
//       note: "Khôi phục user"
//     });

//     res.json({ message: "Khôi phục user thành công" });
//   } catch (error) {
//     res.status(500).json({ message: "Lỗi restore user", error });
//   }
// };


// //CHANGED PASSWORD
// export const changePassword = async (req: Request, res: Response) => {
//   try {
//     const userId = req.user!.id;
//     const { oldPassword, newPassword } = req.body;

//     if (!oldPassword || !newPassword) {
//       return res.status(400).json({
//         message: "Vui lòng nhập đầy đủ mật khẩu cũ và mới"
//       });
//     }

//     const user = await User.findById(userId).select("+password");

//     if (!user || !user.isActive) {
//       return res.status(403).json({
//         message: "Tài khoản không hợp lệ"
//       });
//     }

//     const isMatch = await bcrypt.compare(oldPassword, user.password);
//     if (!isMatch) {
//       return res.status(400).json({
//         message: "Mật khẩu cũ không đúng"
//       });
//     }

//     const hashed = await bcrypt.hash(newPassword, 10);
//     user.password = hashed;
//     await user.save();

//     await UserAudit.create({
//       user: user._id,
//       action: "CHANGE_PASSWORD",
//       performedBy: user._id,
//       note: "User đổi mật khẩu"
//     });

//     res.json({
//       message: "Đổi mật khẩu thành công"
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Lỗi đổi mật khẩu",
//       error
//     });
//   }
// };


// // MỤC TIÊU API RESET PASSWORD (ADMIN)

// // Chỉ ADMIN được reset

// // Reset password cho user bất kỳ

// // User không cần biết mật khẩu cũ

// // Sau khi reset:

// // ✅ Mật khẩu mới được hash

// // ✅ Ghi AUDIT

// // ✅ Thu hồi toàn bộ refresh token của user (force logout)

// // Không reset user isActive = false (tuỳ policy – mình để check)

// /**
//  * ADMIN RESET PASSWORD
//  */
// export const resetPasswordByAdmin = async (req: Request, res: Response) => {
//   try {
//     const targetUserId = req.params.id;
//     const { newPassword } = req.body;

//     if (!newPassword) {
//       return res.status(400).json({
//         message: "Vui lòng nhập mật khẩu mới"
//       });
//     }

//     const user = await User.findById(targetUserId);

//     if (!user) {
//       return res.status(404).json({
//         message: "User không tồn tại"
//       });
//     }

//     if (!user.isActive) {
//       return res.status(403).json({
//         message: "User đã bị vô hiệu hóa"
//       });
//     }

//     // Hash password mới
//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     user.password = hashedPassword;
//     await user.save();

//     // Thu hồi toàn bộ refresh token (force logout)
//     await RefreshToken.updateMany(
//       { user: user._id },
//       { revoked: true }
//     );

//     // Audit
//     await UserAudit.create({
//       user: user._id,
//       action: "RESET_PASSWORD",
//       performedBy: req.user!.id,
//       note: "Admin reset mật khẩu user"
//     });

//     res.json({
//       message: "Reset mật khẩu thành công"
//     });
//   } catch (error) {
//     res.status(500).json({
//       message: "Lỗi reset mật khẩu",
//       error
//     });
//   }
// };