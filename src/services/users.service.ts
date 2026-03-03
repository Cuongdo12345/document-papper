import bcrypt from "bcrypt";
import User from "../models/user.model";
import Department from "../models/department.model";
import UserAudit from "../models/userAudit.model";
import RefreshToken from "../models/refreshToken.model";
import { createUserSchema } from "../dtos/user.dto";
import ApiError from "../shared/errors/ApiError";

export class UserService {

  /**
   * CREATE USER
   * Kiểm tra username đã tồn tại chưa
   * Nếu role là DEPARTMENT thì phải có departmentId và kiểm tra department đó tồn tại
   * Hash password trước khi lưu
   * Ghi log audit
   * Trả về user đã tạo (không bao gồm password)
   * Nếu có lỗi validate hoặc username đã tồn tại => 400
   * Nếu department không tồn tại => 404
   * 
   */
  static async create(data: any, performedBy: string) {
    const { username, password, fullName, role, department } =
      createUserSchema.parse(data);

    const exists = await User.findOne({ username });
    if (exists) {
      throw new ApiError(409, "Username đã tồn tại");
    }

    if (role === "DEPARTMENT") {
      if (!department) throw ApiError.badRequest("User khoa phải gắn khoa");

      const dept = await Department.findById(department);
      if (!dept) throw ApiError.notFound("Khoa không tồn tại");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword,
      fullName,
      role,
      department
    });

    await UserAudit.create({
      user: user._id,
      action: "CREATE",
      performedBy,
      note: "Tạo user mới"
    });

    return user;
  }

  /**
   * GET USERS (filter + pagination)
   * Hỗ trợ filter theo role, department, isActive, keyword (tìm kiếm username), createdAt (fromDate, toDate)
   * Hỗ trợ pagination và sorting
   * Trả về list user + thông tin pagination (không bao gồm password)
   * Nếu có filter không hợp lệ => 400
   * Nếu department filter không tồn tại => 404
   *  
   */
  static async getList(query: any) {
    const {
      page = "1",
      limit = "10",
      role,
      department,
      isActive,
      keyword,
      sortBy = "createdAt",
      order = "desc",
      fromDate,
      toDate,
    } = query;

    const filter: any = {};

    // active filter
    if (isActive === "false") filter.isActive = false;
    else filter.isActive = true;

    if (role) filter.role = role;
    if (department) filter.department = department;

    if (fromDate || toDate) {
      filter.createdAt = {};
      if (fromDate) filter.createdAt.$gte = new Date(fromDate);
      if (toDate) filter.createdAt.$lte = new Date(toDate);
    }

    if (keyword) {
      filter.username = { $regex: keyword, $options: "i" };
    }

    const pageNumber = Math.max(parseInt(page, 10), 1);
    const pageSize = Math.max(parseInt(limit, 10), 1);
    const skip = (pageNumber - 1) * pageSize;

    const sortOption: any = {
      [sortBy]: order === "asc" ? 1 : -1
    };

    const [users, total] = await Promise.all([
      User.find(filter)
        .select("-password")
        .populate("department", "code name")
        .sort(sortOption)
        .skip(skip)
        .limit(pageSize),

      User.countDocuments(filter)
    ]);

    return {
      users,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPage: Math.ceil(total / pageSize)
      }
    };
  }


  /**
   * GET USER BY ID
   */
  static async getById(id: any) {
    const user = await User.findById(id)
      .select("-password")
      .populate("department", "code name");

    if (!user) throw ApiError.notFound("User không tồn tại");
    return user;
  }

  /**
   * UPDATE USER
   * Kiểm tra user tồn tại và isActive
   * Nếu role là DEPARTMENT thì phải có departmentId và kiểm tra department đó tồn tại
   * Cập nhật thông tin user (không cập nhật password ở đây)
   * Ghi log audit
   * Trả về user đã cập nhật (không bao gồm password)
   * Nếu user không tồn tại => 404
   */
  static async update(id: any, data: any, performedBy: any) {
    const { fullName, role, department, username } = data;

    if (role === "DEPARTMENT" && department) {
      const dept = await Department.findById(department);
      if (!dept) throw ApiError.notFound("Khoa không tồn tại");
    }

    const updated = await User.findByIdAndUpdate(
      id,
      { fullName, role, department, username },
      { new: true }
    ).select("-password");

    if (!updated) throw ApiError.notFound("User không tồn tại");
    if (!updated.isActive) throw ApiError.badRequest("User đã bị vô hiệu hóa");

    await UserAudit.create({
      user: updated._id,
      action: "UPDATE",
      performedBy,
      note: "Cập nhật thông tin user"
    });

    return updated;
  }

  /**
   * DISABLE USER
   *  Kiểm tra user tồn tại và isActive
   * Nếu role là ADMIN => không cho vô hiệu hóa
   * Đặt isActive = false để vô hiệu hóa (không xóa)  
   * Ghi log audit
   * Trả về thành công
   * Nếu user không tồn tại => 404
   * Nếu user đã bị vô hiệu hóa => 400
   * Nếu cố gắng vô hiệu hóa ADMIN => 400
   */
  static async disable(id: any, performedBy: any) {
    const user = await User.findById(id);
    if (!user) throw ApiError.notFound("User không tồn tại");

    if (user.role === "ADMIN") {
      throw ApiError.badRequest("Không thể vô hiệu hóa tài khoản ADMIN");
    }

    user.isActive = false;
    await user.save();

    await UserAudit.create({
      user: user._id,
      action: "DISABLE",
      performedBy,
      note: "Vô hiệu hóa user"
    });

    return true;
  }

  /**
   * RESTORE USER
   * Kiểm tra user tồn tại và isActive
   * Đặt isActive = true để khôi phục
   * Ghi log audit
   * Trả về thành công
   * Nếu user không tồn tại => 404
   * Nếu user đã được khôi phục => 400
   * Nếu cố gắng khôi phục ADMIN => 400
   */
  static async restore(id: any, performedBy: any) {
    const user = await User.findById(id);
    if (!user) throw ApiError.notFound("User không tồn tại");

    if (user.isActive) throw ApiError.badRequest("User đã được khôi phục");

    user.isActive = true;
    await user.save();

    await UserAudit.create({
      user: user._id,
      action: "RESTORE",
      performedBy,
      note: "Khôi phục user"
    });

    return true;
  }

  /**
   * CHANGE PASSWORD
   * Kiểm tra user tồn tại và isActive
   * Kiểm tra mật khẩu cũ đúng hay không
   * Hash mật khẩu mới trước khi lưu
   * Ghi log audit
   * Trả về thành công
   * Nếu user không tồn tại => 404
   * Nếu user đã bị vô hiệu hóa => 400
   * Nếu mật khẩu cũ không đúng => 400
   */
  static async changePassword(
    userId: any,
    oldPassword: string,
    newPassword: string
  ) {
    const user = await User.findById(userId).select("+password");

    if (!user || !user.isActive) throw new ApiError(400, "User không hợp lệ");

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) throw ApiError.badRequest("Mật khẩu cũ không đúng");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await UserAudit.create({
      user: user._id,
      action: "CHANGE_PASSWORD",
      performedBy: user._id,
      note: "User đổi mật khẩu"
    });

    return true;
  }

  /**
   * RESET PASSWORD (ADMIN)
   * Kiểm tra user tồn tại và isActive
   * Nếu role là ADMIN => không cho reset password
   * Hash mật khẩu mới trước khi lưu
   * Ghi log audit
   * Trả về thành công
   * Nếu user không tồn tại => 404
   * Nếu user đã bị vô hiệu hóa => 400
   * Nếu cố gắng reset password của ADMIN => 400  
   * RESET PASSWORD (USER)
   * Kiểm tra token reset password có hợp lệ không (tồn tại, chưa dùng, chưa hết hạn)
   * Kiểm tra user liên quan đến token có tồn tại và isActive
   * Hash mật khẩu mới trước khi lưu
   * Đánh dấu token là đã sử dụng để tránh dùng lại
   * Thu hồi tất cả refresh token hiện tại của user để buộc đăng nhập lại với mật khẩu mới
   * Ghi log audit
   */
  static async resetPassword(
    targetUserId: any,
    newPassword: string,
    performedBy: any
  ) {
    const user = await User.findById(targetUserId);

    if (!user) throw ApiError.notFound("User không tồn tại");
    if (!user.isActive) throw ApiError.badRequest("User đã bị vô hiệu hóa");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await RefreshToken.updateMany(
      { user: user._id },
      { revoked: true }
    );

    await UserAudit.create({
      user: user._id,
      action: "RESET_PASSWORD",
      performedBy,
      note: "Admin reset mật khẩu user"
    });

    return true;
  }

  /**
   *  GET ME
   * Kiểm tra user tồn tại và isActive
   * Trả về thông tin user (không bao gồm password)
   * Nếu user không tồn tại hoặc bị vô hiệu hóa => 404
   * @param userId 
   * @returns 
   */
  static async getMeService(userId: any) {

    const user = await User.findById(userId)
      .select("-password -__v");

    if (!user || !user.isActive) {
      throw new Error("User not found or inactive");
    }

    return user;
  }

  /**
   *  UPDATE ME
   * Kiểm tra user tồn tại và isActive
   * Không cho update các field nhạy cảm như role, department, password, email, isActive
   * Cập nhật thông tin user
   * Trả về user đã cập nhật (không bao gồm password)
   * Nếu user không tồn tại hoặc bị vô hiệu hóa => 404
   * @param userId 
   * @param payload 
   * @returns 
   */

  static async updateMeService(userId: string, payload: any) {
    const allowedFields = ["fullName", "username"];

    const updates = Object.keys(payload)
      .filter(key => allowedFields.includes(key))
      .reduce((obj: any, key) => {
        obj[key] = payload[key];
        return obj;
      }, {});

    if (!Object.keys(updates).length) {
      throw ApiError.badRequest("Không có trường hợp hợp lệ để cập nhật");
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, isActive: true },
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password -__v");

    if (!updatedUser) {
      throw ApiError.notFound("User không tồn tại hoặc đã bị vô hiệu hóa");
    }

    return updatedUser;
  }
};
