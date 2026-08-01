import bcrypt from "bcrypt";
import { User } from "../../models/users/user.model";
import { Role } from "../../models/rbac/role.model";
import Department from "../../models/departments/department.model";
import UserAudit from "../../models/users/userAudit.model";
import RefreshToken from "../../models/auth/refreshToken.model";
import ApiError from "../../shared/errors/ApiError";
import { clearPermissionCache } from "../rbac/permission.cache";

// import { createUserSchema } from "../dtos/users/user.dto";

// export class UserService {

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
  export const create = async (data: any, performedBy: any) => {
    const { username, password, fullName, role: roleId, department } = data;
    // Lưu ý: format input (username regex/length, password length, fullName,
    // role/department ObjectId format) đã được validate ở CreateUserDTO middleware.
    // `roleId` ở đây là string ObjectId do client gửi lên — cần resolve thành
    // Role document thật từ DB trước khi đọc `.name`, KHÔNG được coi roleId
    // như một object đã populate sẵn.

    const exists = await User.findOne({ username });
    if (exists) {
      throw ApiError.conflict("Username đã tồn tại");
    }

    const role = await Role.findById(roleId);
    if (!role) throw ApiError.notFound("Role không tồn tại");

    if (role.name === "USER") {
      if (!department) throw ApiError.badRequest("User khoa phải gắn khoa");

      const dept = await Department.findById(department);
      if (!dept) throw ApiError.notFound("Khoa không tồn tại");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      password: hashedPassword,
      fullName,
      role: role._id,
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
   *
   * LƯU Ý: toàn bộ validate format (page/limit number, max limit 100, sortBy/order
   * enum, isActive enum, fromDate/toDate hợp lệ, keyword độ dài) đã được xử lý ở
   * `validateQuery(GetUsersQueryDTO)` middleware trước khi vào đây. Service không
   * cần parseInt, không cần default value, không cần check format nữa — `query`
   * nhận vào đã đúng type (page/limit là number, isActive là "true"/"false" string
   * literal đã enum-checked, fromDate/toDate đã chắc chắn parse được thành Date hợp lệ).
   */
  export const getList = async(query: any) => {
    const {
      page,
      limit,
      role,
      department,
      isActive,
      keyword,
      sortBy,
      order,
      fromDate,
      toDate,
    } = query;

    const filter: any = {};

    // active filter
    filter.isActive = isActive === "false" ? false : true;

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

    const skip = (page - 1) * limit;

    const sortOption: any = {
      [sortBy]: order === "asc" ? 1 : -1
    };

    const [users, total] = await Promise.all([
      User.find(filter)
        .populate("department", "code name")
        .sort(sortOption)
        .skip(skip)
        .limit(limit),

      User.countDocuments(filter)
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPage: Math.ceil(total / limit)
      }
    };
  }


  /**
   * GET USER BY ID
   */
  export const getById = async (id: any) => {
    const user = await User.findById(id)
      .populate("department", "code name");

    if (!user) throw ApiError.notFound("User không tồn tại");
    return user;
  }

  /**
   * UPDATE USER
   *
   * Thứ tự xử lý (đã sửa bug: trước đây gọi findByIdAndUpdate TRƯỚC khi kiểm tra
   * isActive, khiến user bị disable vẫn bị ghi đè dữ liệu trước khi báo lỗi).
   *
   * 1. Tìm user theo id
   * 2. Không tồn tại => 404 notFound
   * 3. isActive === false => 400 badRequest (KHÔNG update gì cả)
   * 4. Validate department nếu role là USER
   * 5. Validate username trùng (nếu username thay đổi)
   * 6. Gán dữ liệu mới vào document đã tìm được
   * 7. save()
   * 8. Ghi audit log
   */
  export const update = async (id: any, data: any, performedBy: any) => {
    const { fullName, role: roleId, department, username } = data;

    // 1 & 2. Tìm user trước tiên
    const user = await User.findById(id);
    if (!user) throw ApiError.notFound("User không tồn tại");

    // 3. Chặn ngay nếu user đã bị disable — KHÔNG được update bất cứ gì
    if (!user.isActive) {
      throw ApiError.badRequest("User đã bị vô hiệu hóa");
    }

    // 4. Resolve role (string ObjectId từ client) thành Role document thật,
    // rồi mới được đọc role.name — roleId KHÔNG phải object đã populate.
    let role: any;
    if (roleId !== undefined) {
      role = await Role.findById(roleId);
      if (!role) throw ApiError.notFound("Role không tồn tại");
    }

    // 5. Validate department nếu role (mới hoặc giữ nguyên) là USER
    if (role?.name === "USER" && department) {
      const dept = await Department.findById(department);
      if (!dept) throw ApiError.notFound("Khoa không tồn tại");
    }

    // 6. Validate username trùng nếu có thay đổi username
    if (username && username !== user.username) {
      const existed = await User.findOne({ username, _id: { $ne: id } });
      if (existed) throw ApiError.conflict("Username đã tồn tại");
    }

    // 7. Gán dữ liệu mới
    if (fullName !== undefined) user.fullName = fullName;
    if (role !== undefined) user.role = role._id;
    if (department !== undefined) user.department = department;
    if (username !== undefined) user.username = username;

    // 8. Save
    await user.save();

    // 9. Audit log
    await UserAudit.create({
      user: user._id,
      action: "UPDATE",
      performedBy,
      note: "Cập nhật thông tin user"
    });

    const updated = await User.findById(user._id)
      .populate("department", "code name");

    return updated;
  }

  /**
   * DISABLE USER
   *  Kiểm tra user tồn tại và isActive
   * Nếu role là ADMIN => không cho vô hiệu hóa
   * Nếu user đã bị vô hiệu hóa từ trước => 400 (chặn disable nhiều lần)
   * Đặt isActive = false để vô hiệu hóa (không xóa)
   * Thu hồi toàn bộ refresh token hiện có của user => buộc logout toàn bộ thiết bị
   * Ghi log audit
   * Trả về thành công
   * Nếu user không tồn tại => 404
   * Nếu user đã bị vô hiệu hóa => 400
   * Nếu cố gắng vô hiệu hóa ADMIN => 400
   */
  export const disable = async (id: any, performedBy: any) => {
    const user = await User.findById(id);
    if (!user) throw ApiError.notFound("User không tồn tại");

    // ❌ Chặn disable user đã bị disable từ trước
    if (!user.isActive) {
      throw ApiError.badRequest("User đã bị vô hiệu hóa từ trước");
    }

    // const role = user.role as any;
    const role = await Role.findById(user.role).select("name");
    if (role?.name === "ADMIN") {
      throw ApiError.badRequest("Không thể vô hiệu hóa tài khoản ADMIN");
    }

    user.isActive = false;
    await user.save();

    // 🔒 Thu hồi toàn bộ refresh token hiện có — user bị disable phải
    // bị logout ngay trên mọi thiết bị, không chỉ chặn API mới.
    await RefreshToken.updateMany(
      { user: user._id },
      { revoked: true }
    );

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
  export const restore = async(id: any, performedBy: any) => {
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
  export const changePassword = async(
    userId: any,
    oldPassword: string,
    newPassword: string
  ) => {
    const user = await User.findById(userId).select("+password");

    if (!user || !user.isActive) throw ApiError.badRequest("User không hợp lệ");

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
  export const resetPassword = async(
    targetUserId: any,
    newPassword: string,
    performedBy: any
  ) => {
    // Không cần .select("+password") ở đây vì chỉ GHI ĐÈ password mới,
    // không đọc giá trị password cũ. Set tường minh một field luôn hoạt động
    // bình thường dù field đó có select: false trong schema.
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
  export const getMeService = async(userId: any) => {

    const user = await User.findById(userId)
      .select("-__v").populate("role", "name")
    .populate("department", "code name");

    if (!user || !user.isActive) {
      throw ApiError.badRequest("Không tìm thấy hoặc không hoạt động");
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

  export const updateMeService = async(userId: any, payload: any) => {
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
    ).select("-__v");

    if (!updatedUser) {
      throw ApiError.notFound("User không tồn tại hoặc đã bị vô hiệu hóa");
    }

    return updatedUser;
  }

  /**
 * ASSIGN ROLE
 * Gán role cho user
 * Kiểm tra user tồn tại và isActive
 * Kiểm tra role tồn tại
 * Không cho tự đổi role của chính mình
 * Không cho gán role ADMIN bừa (optional nếu muốn)
 * Có thể reset extraPermissions / denyPermissions
 * Ghi log audit
 * Trả về user (không password)
 */
export const assignRole = async (
  userId: any,
  roleId: any,
  performedBy: any,
  resetPermissions = false
) => {
  // ❌ Không cho tự đổi role
  if (userId.toString() === performedBy.toString()) {
    throw ApiError.badRequest("Không thể tự thay đổi role của chính mình");
  }
 
  // ✅ Check user
  const user = await User.findById(userId);
  if (!user) throw ApiError.notFound("User không tồn tại");
  if (!user.isActive) throw ApiError.badRequest("User đã bị vô hiệu hóa");
 
  // ✅ Check role
  const role = await Role.findById(roleId);
  if (!role) throw ApiError.notFound("Role không tồn tại");
 
  // 🔥 Optional: không cho assign ADMIN lung tung
  if (role.name === "ADMIN") {
    throw ApiError.badRequest("Không thể gán role ADMIN");
  }
 
  const oldRole = user.role;
 
  // 🔥 Update
  user.role = roleId;
 
  if (resetPermissions) {
    user.extraPermissions = [];
    user.denyPermissions = [];
  }
 
  await user.save();
 
  // 🔒 Invalidate permission cache — role vừa đổi, permission cũ trong cache
  // (tối đa 5 phút TTL) không còn phản ánh đúng quyền hiện tại của user.
  clearPermissionCache(user._id.toString());
 
  // 🔥 Audit log
  await UserAudit.create({
    user: user._id,
    action: "ASSIGN_ROLE",
    performedBy,
    note: `Gán role từ ${oldRole} -> ${roleId}`
  });
 
  // ✅ return sạch
  const updatedUser = await User.findById(user._id)
    .populate("department", "code name")
    .populate("role");
 
  return updatedUser;
}
// };