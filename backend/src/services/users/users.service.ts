import bcrypt from "bcrypt";
import { User } from "../../models/users/user.model";
import { Role } from "../../models/rbac/role.model";
import Department from "../../models/departments/department.model";
import UserAudit from "../../models/users/userAudit.model";
import RefreshToken from "../../models/auth/refreshToken.model";
import { Asset } from "../../models/assets/asset.model";
import ApiError from "../../shared/errors/ApiError";
import { clearPermissionCache, getCachedPermissions } from "../rbac/permission.cache";

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

    // 🔒 FIX TASK-002 (Việc 1 — mở rộng ISS-01/SEC-05, docs/tasks/TASK-002.md):
    // trước đây create() KHÔNG chặn tạo thẳng user với role ADMIN — sau khi
    // update() đã được chặn (TASK-001), create() là con đường API DUY NHẤT còn
    // lại có thể tạo ra 1 user ADMIN (register() luôn gán DEFAULT_REGISTER_ROLE_NAME,
    // không thể chọn role). Áp cùng safeguard để nhất quán: không có endpoint
    // API nào còn có thể tạo/gán role ADMIN — việc tạo ADMIN mới (nếu cần)
    // phải thực hiện trực tiếp trong DB, ngoài phạm vi ứng dụng.
    // 🔒 DEV-001A Phase B hoàn tất (DEV-047, 2026-09-12): chỉ còn đọc cờ
    // security identity `isSystemRole`, đã gỡ lưới đỡ literal "ADMIN".
    if (role.isSystemRole === true) {
      throw ApiError.badRequest("Không thể tạo user với role ADMIN qua endpoint này");
    }

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
        // DEV-025/ARCH-31: đổi `totalPage`→`totalPages` — khớp convention đa
        // số domain khác VÀ khớp field đã document sẵn trong OpenAPI.
        totalPages: Math.ceil(total / limit)
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

      // 🔒 FIX ISS-01/SEC-05 (docs/tasks/TASK-001.md): chặn gán role ADMIN qua
      // endpoint cập nhật thông thường này — đây là con đường leo thang đặc
      // quyền nghiêm trọng nhất tìm được trong toàn bộ RBAC (bất kỳ user nào
      // có USER_UPDATE có thể tự thăng cấp bản thân/người khác lên ADMIN).
      // Đồng nhất với safeguard đã có sẵn ở assignRole() cùng file — không có
      // ngoại lệ, kể cả người gọi vốn đã là ADMIN.
      // 🔒 DEV-001A Phase B hoàn tất (DEV-047, 2026-09-12): chỉ còn đọc cờ
      // security identity `isSystemRole`, đã gỡ lưới đỡ literal "ADMIN".
      if (role.isSystemRole === true) {
        throw ApiError.badRequest("Không thể gán role ADMIN qua endpoint này");
      }
    }

    // 5. Validate department nếu role HIỆU LỰC (mới nếu request đổi role,
    // hoặc role HIỆN TẠI của user nếu request không đổi role) là USER.
    //
    // DEV-016/MEDIUM-12 (RV16-02): trước đây chỉ check `role?.name==="USER"`
    // — biến `role` CHỈ được gán khi client gửi kèm `roleId` (xem bước 4).
    // Nếu request CHỈ đổi `department` (không gửi `role`), `role` giữ
    // nguyên `undefined` → điều kiện luôn `false`, BẤT KỂ role hiện tại của
    // user có phải "USER" hay không — Department không được validate,
    // `user.department` có thể bị gán 1 ObjectId không tồn tại. Nay resolve
    // role hiện tại của user (nếu request không đổi role) trước khi quyết
    // định có cần validate Department hay không — đối xứng với việc `Role`
    // luôn được validate bất kể context (bước 4 ở trên).
    const effectiveRole = role ?? (await Role.findById(user.role).select("name"));

    if (effectiveRole?.name === "USER" && department) {
      const dept = await Department.findById(department);
      if (!dept) throw ApiError.notFound("Khoa không tồn tại");
    }

    // 6. Validate username trùng nếu có thay đổi username
    if (username && username !== user.username) {
      const existed = await User.findOne({ username, _id: { $ne: id } });
      if (existed) throw ApiError.conflict("Username đã tồn tại");
    }

    // 🔒 FIX ISS-01/SEC-08: lưu lại role CŨ trước khi ghi đè, để biết chính
    // xác role có thực sự đổi hay không (client có thể gửi lại đúng roleId
    // hiện tại) — dùng để quyết định có cần clear permission cache hay không.
    const oldRoleId = user.role?.toString();

    // 7. Gán dữ liệu mới
    if (fullName !== undefined) user.fullName = fullName;
    if (role !== undefined) user.role = role._id;
    if (department !== undefined) user.department = department;
    if (username !== undefined) user.username = username;

    // 8. Save
    await user.save();

    // 🔒 FIX ISS-01/SEC-08 (docs/tasks/TASK-001.md): trước đây hàm này KHÔNG
    // invalidate permission cache khi role đổi — permission cache (TTL 5 phút,
    // permission.cache.ts) của user vẫn giữ quyền CŨ tối đa 5 phút sau khi role
    // đã đổi trong DB. Chỉ clear khi role THỰC SỰ đổi, tránh clear thừa.
    if (role !== undefined && oldRoleId !== role._id.toString()) {
      clearPermissionCache(user._id.toString());
    }

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
    // 🔒 DEV-001A: thêm "isSystemRole" vào projection — trước đây chỉ select
    // "name" nên field mới sẽ luôn undefined nếu không bổ sung ở đây.
    const role = await Role.findById(user.role).select("name isSystemRole");
    // 🔒 DEV-001A Phase B hoàn tất (DEV-047, 2026-09-12): chỉ còn đọc cờ
    // security identity `isSystemRole`, đã gỡ lưới đỡ literal "ADMIN".
    if (role?.isSystemRole === true) {
      throw ApiError.badRequest("Không thể vô hiệu hóa tài khoản ADMIN");
    }

    // DEV-016/RV16-03: trước đây disable() không kiểm tra Asset đang gán cho
    // user — tài sản vẫn "đang cấp phát" (assignedTo=id) cho 1 tài khoản đã
    // bị khoá, dù `assertUserExists` (assetAssignment.service.ts) đã chặn
    // CẤP PHÁT MỚI cho user isActive:false — chỉ thiếu phòng thủ ở chiều
    // "khoá tài khoản đang có tài sản". Cùng pattern `deleteDepartmentService`
    // đã dùng cho User/Document — chặn, buộc thu hồi tài sản (qua
    // `returnAssetService` có sẵn) trước khi khoá tài khoản.
    const hasAssignedAsset = await Asset.exists({
      assignedTo: id,
      isActive: true,
    });
    if (hasAssignedAsset) {
      throw ApiError.badRequest(
        "Không thể vô hiệu hóa: user vẫn còn tài sản đang được gán — cần thu hồi tài sản trước",
      );
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

    // DEV-021/SEC-01: trước đây `changePassword` KHÔNG thu hồi refresh token
    // nào — khác 3 luồng đổi mật khẩu còn lại (`resetPassword`,
    // `resetPasswordByAdmin`, `disable`) đều `RefreshToken.updateMany(...,
    // {revoked:true})`. Nếu kẻ tấn công đã có refresh token hợp lệ của nạn
    // nhân (đánh cắp trước đó), nạn nhân tự đổi mật khẩu (kịch bản phổ biến
    // khi nghi ngờ lộ mật khẩu) KHÔNG đẩy được kẻ tấn công ra khỏi phiên —
    // token cũ vẫn dùng được tới khi hết hạn tự nhiên (7 ngày). Thu hồi TOÀN
    // BỘ refresh token (kể cả phiên hiện tại của chính user) — cùng mức độ
    // triệt để với 3 luồng kia; `changePassword()` không nhận refresh token
    // hiện tại làm tham số nên không có cách nào loại trừ riêng nó.
    await RefreshToken.updateMany(
      { user: user._id },
      { revoked: true }
    );

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

    // 🔒 SECURITY FIX (DEV-002 / SEC-29 / RV03-01): docstring hàm này mô tả
    // "Nếu role là ADMIN => không cho reset password" nhưng code trước đây
    // KHÔNG có check nào — bất kỳ user nào giữ permission `USER_RESET_PASSWORD`
    // đều reset được mật khẩu của ADMIN (đường account-takeover thứ 3, độc
    // lập với `SEC-05`/ISS-01 và `SEC-28`/RV02-01 đã fix). Cùng pattern OR
    // (DEV-001A) đã áp dụng ở `disable()` cùng file: ưu tiên cờ security
    // identity bất biến, giữ literal "ADMIN" làm lưới đỡ Phase A.
    const targetRole = await Role.findById(user.role).select("name isSystemRole");
    // 🔒 DEV-001A Phase B hoàn tất (DEV-047, 2026-09-12): chỉ còn đọc cờ
    // security identity `isSystemRole`, đã gỡ lưới đỡ literal "ADMIN".
    if (targetRole?.isSystemRole === true) {
      throw ApiError.badRequest("Không thể reset mật khẩu tài khoản ADMIN");
    }

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
   *
   * ⚠️ RBAC MICRO-FIX (FE-00 blocker, xem docs/frontend/tasks/FE-00.md Mục 10.1):
   * trước đây response CHỈ populate `role.name` và KHÔNG trả effective
   * permissions — FE không có cách nào biết quyền thật của user hiện tại
   * ngoài field `role.name`. Bổ sung ADDITIVE (không đổi/xoá field cũ):
   *   - `role.isSystemRole` (field CÓ SẴN ở Role model — chỉ thêm vào select
   *     populate, không tạo field mới).
   *   - `permissions: string[]` — effective permission (role ∪ extraPermissions
   *     − denyPermissions), REUSE `getCachedPermissions()` (permission.cache.ts,
   *     đã có cache 5 phút + tự resolve ObjectId -> permission name qua
   *     `getUserEffectivePermissions()`, permission.service.ts) — KHÔNG tự
   *     viết lại logic tính permission, KHÔNG tạo cache thứ hai.
   * `extraPermissions`/`denyPermissions` GIỮ NGUYÊN dạng ObjectId thô như cũ
   * (backward-compatible, không breaking change) — `permissions[]` là field
   * MỚI chứa kết quả cuối cùng đã resolve tên, không phải thay thế 2 field đó.
   * ADMIN/isSystemRole KHÔNG được special-case ở đây — `getCachedPermissions`
   * trả đúng những gì role đó thực sự có trong DB, khớp semantics thật của
   * `authorizePermission.middleware.ts` (bypass ADMIN nằm ở middleware đó,
   * không phải ở endpoint này).
   * @param userId
   * @returns
   */
  export const getMeService = async(userId: any) => {

    const user = await User.findById(userId)
      .select("-__v").populate("role", "name isSystemRole")
    .populate("department", "code name");

    if (!user || !user.isActive) {
      throw ApiError.badRequest("Không tìm thấy hoặc không hoạt động");
    }

    const permissions = await getCachedPermissions(userId.toString());

    return {
      ...user.toObject(),
      permissions,
    };
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

    // ⚠️ SỬA (2026-09-10, DEV note FE-14 #24): trước đây hàm này KHÔNG check
    // trùng username trước khi update — khác `update()` (PUT /users/:id,
    // dòng ~234) đã có sẵn check này. Hệ quả: đổi sang username đã tồn tại
    // qua `PATCH /users/me` (Profile) ném thẳng lỗi driver MongoDB E11000
    // thô ra khỏi `findOneAndUpdate`, rơi vào nhánh "lỗi không xác định" của
    // `error.middleware.ts` → trả 500 generic thay vì lỗi rõ nghĩa. Thêm
    // đúng pattern `update()` đã dùng (`ApiError.conflict`, loại trừ chính
    // user hiện tại bằng `_id: { $ne: userId } }`).
    if (updates.username) {
      const existed = await User.findOne({ username: updates.username, _id: { $ne: userId } });
      if (existed) throw ApiError.conflict("Username đã tồn tại");
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
  // 🔒 DEV-001A Phase B hoàn tất (DEV-047, 2026-09-12): chỉ còn đọc cờ
  // security identity `isSystemRole`, đã gỡ lưới đỡ literal "ADMIN".
  if (role.isSystemRole === true) {
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