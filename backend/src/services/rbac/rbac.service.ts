/**
 * Role refactor
 * Policy refactor
 * Permission refactor
 */

import {Permission} from "../../models/rbac/permission.model";
import {Role} from "../../models/rbac/role.model";
import {Policy} from "../../models/rbac/policy.model";
import {User} from "../../models/users/user.model";
import ApiError from "../../shared/errors/ApiError";
import { clearPermissionCache, clearAllPermissionCache } from "./permission.cache";
import { assertPolicyConditionSyntaxValid } from "../../shared/utils/Policycondition.evaluator";
import {
  NotificationType,
} from "../../models/notifications/notification.model";
import { notifyUserIds, notifyUsersByRoleName } from "../notifications/notification.service";
import {
  ROLE_UPDATE_WHITELIST,
  ROLE_CREATE_WHITELIST,
  PERMISSION_UPDATE_WHITELIST,
  PERMISSION_CREATE_WHITELIST,
  POLICY_UPDATE_WHITELIST,
  POLICY_CREATE_WHITELIST,
  pickWhitelisted,
} from "./rbac.constants";

/**
 * Helper: clear permission cache cho TẤT CẢ user đang thuộc một role.
 * Dùng khi role bị update/delete hoặc permissions của role bị gán lại —
 * những thay đổi này ảnh hưởng tới mọi user có role đó, không chỉ 1 user.
 *
 * Đã mở rộng: ngoài clear cache, tận dụng luôn danh sách `affectedUsers` vừa
 * query được để gửi notification "RBAC_CHANGED" cho từng user — tránh phải
 * query lại `User.find({ role: roleId })` lần thứ 2 ở tầng gọi. Việc gửi
 * notification là best-effort (đã tự nuốt lỗi trong `notifyUserIds`), không
 * ảnh hưởng tới phần clear cache dù notification có lỗi.
 */
const clearPermissionCacheForRole = async (
  roleId: any,
  options: { notify?: boolean; changeReason?: string } = {},
) => {
  const { notify = true, changeReason = "Quyền của bạn vừa được cập nhật" } = options;

  const affectedUsers = await User.find({ role: roleId }).select("_id");
  affectedUsers.forEach((u) => clearPermissionCache(u._id.toString()));

  if (notify && affectedUsers.length) {
    notifyUserIds(
      affectedUsers.map((u) => u._id),
      {
        type: NotificationType.RBAC_CHANGED,
        title: "Phân quyền đã thay đổi",
        message: `${changeReason}. Vui lòng đăng nhập lại nếu thấy quyền chưa cập nhật.`,
      },
    );
  }
};

// ================= PERMISSION =================

/**
 * ⚠️ SỬA (review RBAC module — mass assignment B13, defense-in-depth tầng
 * service): áp `pickWhitelisted` trước khi `Permission.create` — dù DTO ở
 * tầng route (`CreatePermissionDTO`) đã strip field lạ, service vẫn tự lọc
 * lại 1 lần nữa để không phụ thuộc 100% vào đúng 1 lớp validate duy nhất.
 */
export const createPermissionService = async (payload: any) => {
  const exist = await Permission.findOne({ name: payload.name });
  if (exist) {
    throw ApiError.conflict("Permission already exists");
  }

  const safePayload = pickWhitelisted(payload, PERMISSION_CREATE_WHITELIST);

  return Permission.create(safePayload);
};

/**
 * GET PERMISSIONS — search + filter + pagination
 *
 * Format input (page/limit number, max limit 100, sortBy enum, order enum)
 * đã được validate ở validateQuery(GetPermissionsQueryDTO) middleware trước
 * khi vào đây — service chỉ còn lo build query và trả kết quả + pagination.
 */
export const getPermissionService = async (query: any) => {
  const { page, limit, sortBy, order, keyword, resource, action } = query;
 
  const filter: any = {};
 
  if (resource) filter.resource = resource;
  if (action) filter.action = action;
 
  if (keyword) {
    filter.$or = [
      { name: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
    ];
  }
 
  const skip = (page - 1) * limit;
  const sortOption: any = { [sortBy]: order === "asc" ? 1 : -1 };
 
  const [items, total] = await Promise.all([
    Permission.find(filter).sort(sortOption).skip(skip).limit(limit),
    Permission.countDocuments(filter),
  ]);
 
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

/**
 * ⚠️ MỚI: GET PERMISSION BY ID — trước đây chưa có, chỉ có list
 * (`getPermissionService`) và update/delete (nhận `id` nhưng không có
 * endpoint GET riêng để xem chi tiết 1 permission).
 */
export const getPermissionByIdService = async (id: any) => {
  const permission = await Permission.findById(id);
  if (!permission) {
    throw ApiError.notFound("Permission not found");
  }
  return permission;
};

/**
 * ⚠️ SỬA (review RBAC module):
 *  1. Whitelist field trước khi `Object.assign` — cùng lý do mass assignment
 *     ở Role (xem `updateRoleService`), tuy Permission ít rủi ro leo thang
 *     quyền hơn (không có field kiểu "permissions" lồng), nhưng vẫn nên
 *     nhất quán và tránh field lạ (vd `_id`) lọt vào `Object.assign`.
 *  2. `clearAllPermissionCache()` sau khi sửa — trước đây KHÔNG invalidate
 *     cache khi Permission bị đổi tên/đổi resource/action. Vì 1 Permission
 *     có thể nằm trong NHIỀU Role khác nhau, không biết trước Role nào (phải
 *     query ngược `Role.find({permissions: id})` rồi mới ra user — tốn kém
 *     hơn lợi ích), nên chọn cách đơn giản và an toàn hơn: xoá SẠCH cache,
 *     chấp nhận vài request kế tiếp phải tính lại permission (cache vốn chỉ
 *     là tối ưu hiệu năng, TTL gốc đã là 5 phút).
 */
export const updatePermissionService = async (id: any, payload: any) => {
  const permission = await Permission.findById(id);
  if (!permission) {
    throw ApiError.notFound("Permission not found");
  }

  const safePayload = pickWhitelisted(payload, PERMISSION_UPDATE_WHITELIST);
  Object.assign(permission, safePayload);

  const saved = await permission.save();

  clearAllPermissionCache();

  // 🔒 MỚI: notify RBAC_CHANGED cho user bị ảnh hưởng.
  // Permission có thể nằm trong NHIỀU role — phải query ngược
  // `Role.find({ permissions: id })` rồi mới ra danh sách user thuộc các
  // role đó. Đây CHÍNH XÁC là truy vấn mà comment phía trên (2 lần) từng nói
  // là "tốn kém hơn lợi ích" khi bàn về việc clear cache theo user — nhưng
  // với NOTIFICATION thì khác: đây là hành động hiếm khi xảy ra (admin sửa
  // permission, không phải request thường xuyên của user cuối), nên chấp
  // nhận trả giá 2 query thêm để user biết chính xác quyền của mình vừa đổi,
  // thay vì im lặng như phần cache (cache im lặng là chấp nhận được vì TTL
  // chỉ 5 phút; notification im lặng thì user không bao giờ biết).
  Role.find({ permissions: id })
    .select("_id")
    .then(async (roles) => {
      if (!roles.length) return;

      const affectedUsers = await User.find({
        role: { $in: roles.map((r) => r._id) },
      }).select("_id");

      if (!affectedUsers.length) return;

      notifyUserIds(
        affectedUsers.map((u) => u._id),
        {
          type: NotificationType.RBAC_CHANGED,
          title: "Phân quyền đã thay đổi",
          message: `Permission "${saved.name}" vừa được cập nhật, có thể ảnh hưởng tới quyền của bạn. Vui lòng đăng nhập lại nếu thấy quyền chưa cập nhật.`,
        },
      );
    })
    .catch((err) => {
      console.error(
        "[rbac.service] Notify RBAC_CHANGED sau updatePermissionService thất bại:",
        err,
      );
    });

  return saved;
};

/**
 * ⚠️ SỬA (review RBAC module — bug xác nhận thật, không phải lý thuyết):
 * trước đây xoá Permission KHÔNG kiểm tra còn Role nào đang tham chiếu tới
 * nó hay không. Nếu 1 Permission đang nằm trong `Role.permissions` của 1
 * role đang được dùng bị xoá, lần populate kế tiếp
 * (`getUserEffectivePermissions`) có thể gặp phần tử `null` trong mảng đã
 * populate → `.name` ném `TypeError`, crash luồng check quyền của MỌI user
 * thuộc role đó ở request tiếp theo. Thêm guard chặn xoá khi đang được dùng,
 * trả `409 Conflict` rõ ràng thay vì để lỗi 500 xuất hiện ở nơi khác (users
 * khác, request khác) khó truy vết.
 */
export const deletePermissionService = async (id: any) => {
  const permission = await Permission.findById(id);
  if (!permission) {
    throw ApiError.notFound("Permission not found");
  }

  const inUseByRole = await Role.exists({ permissions: id });
  if (inUseByRole) {
    throw ApiError.conflict(
      "Permission đang được gán cho ít nhất 1 role, không thể xoá — hãy gỡ khỏi role trước."
    );
  }

  const inUseByUser = await User.exists({
    $or: [{ extraPermissions: id }, { denyPermissions: id }],
  });
  if (inUseByUser) {
    throw ApiError.conflict(
      "Permission đang được gán trực tiếp cho ít nhất 1 user (extra/deny), không thể xoá."
    );
  }

  await permission.deleteOne();

  clearAllPermissionCache();

  // Không cần notify RBAC_CHANGED ở đây: 2 guard phía trên (`inUseByRole`,
  // `inUseByUser`) đã đảm bảo permission này KHÔNG còn được role/user nào
  // tham chiếu tại thời điểm xoá — nghĩa là không có user nào thực sự bị
  // ảnh hưởng bởi việc xoá này (khác `updatePermissionService`, nơi
  // permission vẫn đang được dùng nên mới cần báo).
  return true;
};

// ================= ROLE =================

/**
 * ⚠️ SỬA (review RBAC module — B13, mass assignment): whitelist chỉ cho
 * phép `name` — CỐ TÌNH KHÔNG cho `permissions` lọt qua `Role.create`.
 * Trước đây `Role.create(payload)` nhận thẳng `req.body`, cho phép ai có
 * permission `ROLE_CREATE` (không cần `ROLE_ASSIGN_PERMISSIONS`) tạo role
 * MỚI kèm sẵn `permissions` tuỳ ý ngay lúc tạo — bypass đúng permission
 * riêng mà hệ thống cố tình tách ra cho hành động gán quyền.
 */
export const createRoleService = async (payload: any) => {
  const exist = await Role.findOne({ name: payload.name });
  if (exist) {
    throw ApiError.conflict("Role already exists");
  }

  const safePayload = pickWhitelisted(payload, ROLE_CREATE_WHITELIST);

  return Role.create(safePayload);
};

/**
 * GET ROLES — search + pagination (Role chỉ có field `name` để search,
 * không có resource/action như Permission/Policy)
 */
export const getRoleService = async (query: any) => {
  const { page, limit, sortBy, order, keyword } = query;
 
  const filter: any = {};
 
  if (keyword) {
    filter.name = { $regex: keyword, $options: "i" };
  }
 
  const skip = (page - 1) * limit;
  const sortOption: any = { [sortBy]: order === "asc" ? 1 : -1 };
 
  const [items, total] = await Promise.all([
    Role.find(filter)
      .populate("permissions")
      .sort(sortOption)
      .skip(skip)
      .limit(limit),
    Role.countDocuments(filter),
  ]);
 
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

/**
 * ⚠️ MỚI: GET ROLE BY ID — populate `permissions` giống `getRoleService` (list)
 * để FE xem chi tiết 1 role kèm đầy đủ danh sách permission đang gán.
 */
export const getRoleByIdService = async (id: any) => {
  const role = await Role.findById(id).populate("permissions");
  if (!role) {
    throw ApiError.notFound("Role not found");
  }
  return role;
};

/**
 * ⚠️ SỬA (review RBAC module — B13, ĐÂY LÀ CHỖ VÁ QUAN TRỌNG NHẤT): whitelist
 * chỉ cho phép sửa `name`. Trước đây `Object.assign(role, payload)` nhận
 * thẳng `req.body` — ai có permission `ROLE_UPDATE` (route `PUT /roles/:id`)
 * gửi kèm `{ permissions: [...] }` trong body vẫn gán được, bypass hoàn toàn
 * permission riêng `ROLE_ASSIGN_PERMISSIONS` mà route
 * `/roles/:id/assign-permissions` cố tình tách ra. Đây chính là phát hiện
 * B13 (đã ghi nhận ở `MODULE_REFACTOR_PLAN.md` P1.13) — xác nhận qua code
 * thật vẫn CHƯA được vá cho tới bản này. Muốn đổi `permissions`, giờ BẮT
 * BUỘC phải qua `assignPermissionsToRoleService`.
 */
export const updateRoleService = async (id: any, payload: any) => {
  const role = await Role.findById(id);
  if (!role) {
    throw ApiError.notFound("Role not found");
  }

  const safePayload = pickWhitelisted(payload, ROLE_UPDATE_WHITELIST);
  Object.assign(role, safePayload);
  const saved = await role.save();

  // 🔒 Role vừa đổi (tên) — invalidate cache cho tất cả user đang thuộc role
  // này (tên role không ảnh hưởng permission thật, nhưng giữ nguyên lời gọi
  // này để an toàn / nhất quán với hành vi trước đó).
  // `notify: false` — CHỈ đổi tên hiển thị, không đổi quyền thật, nên KHÔNG
  // gửi "RBAC_CHANGED" (tránh làm user hoang mang tưởng quyền của mình vừa
  // bị thay đổi trong khi thực chất chỉ là đổi tên role).
  await clearPermissionCacheForRole(id, { notify: false });

  return saved;
};

/**
 * ⚠️ SỬA (review RBAC module — bug xác nhận thật): thêm guard chặn xoá role
 * đang được ít nhất 1 user sử dụng. Trước đây xoá role vô điều kiện, khiến
 * `user.role` của các user đó trở thành dangling reference — populate ra
 * `null` → `getUserEffectivePermissions` ném `TypeError` ở request tiếp theo
 * của CHÍNH NHỮNG USER ĐÓ (không phải người xoá role, nên rất khó liên hệ
 * nguyên nhân khi debug). Trả `409 Conflict` rõ ràng, buộc phải chuyển hết
 * user sang role khác trước khi xoá.
 */
export const deleteRoleService = async (id: any) => {
  const role = await Role.findById(id);
  if (!role) {
    throw ApiError.notFound("Role not found");
  }

  const inUseCount = await User.countDocuments({ role: id });
  if (inUseCount > 0) {
    throw ApiError.conflict(
      `Role đang được gán cho ${inUseCount} user, không thể xoá — hãy chuyển user sang role khác trước.`
    );
  }

  // 🔒 Clear cache TRƯỚC khi xóa role (không còn user nào thuộc role này
  // theo check ở trên, nhưng giữ lại lời gọi cho chắc — vô hại nếu rỗng).
  // Không cần truyền `changeReason` riêng vì `affectedUsers` chắc chắn rỗng
  // (đã chặn ở guard `inUseCount > 0` phía trên) — không có ai để notify.
  await clearPermissionCacheForRole(id);

  await role.deleteOne();
  return true;
};

/**
 * ⚠️ SỬA (review RBAC module): validate `permissionIds` — trước đây nhận
 * thẳng `permissionIds` từ body không kiểm tra gì, gán thẳng vào
 * `role.permissions` dù ID không tồn tại trong collection `Permission`.
 * Giờ kiểm tra tất cả ID phải trỏ tới Permission có thật trước khi gán —
 * tránh Role mang theo permission "ma" (ObjectId không trỏ tới đâu cả),
 * gây khó hiểu khi audit sau này.
 */
export const assignPermissionsToRoleService = async (
  roleId: any,
  permissionIds: string[]
) => {
  const role = await Role.findById(roleId);
  if (!role) {
    throw ApiError.notFound("Role not found");
  }

  const uniqueIds = [...new Set(permissionIds)];

  const foundCount = await Permission.countDocuments({ _id: { $in: uniqueIds } });
  if (foundCount !== uniqueIds.length) {
    throw ApiError.badRequest("Một hoặc nhiều permission ID không tồn tại");
  }

  role.permissions = uniqueIds as any;
  const saved = await role.save();

  // 🔒 Permissions của role vừa đổi — ảnh hưởng tới TẤT CẢ user thuộc role
  // này, không chỉ 1 user. Phải clear cache cho từng user liên quan.
  // Đây MỚI là điểm thực sự đổi quyền (khác `updateRoleService` chỉ đổi
  // tên) — nên `notify` giữ mặc định `true`, kèm tên role trong message để
  // user biết chính xác role nào vừa bị đổi permission.
  await clearPermissionCacheForRole(roleId, {
    changeReason: `Danh sách quyền của role "${role.name}" vừa được cập nhật`,
  });

  return saved;
};


/**
 * | RBAC thường           | Policy RBAC                |
| --------------------- | -------------------------- |
| chỉ role → permission | role → policy → permission |
| khó mở rộng           | scale lớn                  |
| hard-code             | dynamic                    |
| khó audit             | audit cực mạnh             |

 * @param payload 
 * @returns 
 */
// ================= POLICY =================

/**
 * ⚠️ SỬA (review RBAC module):
 *  1. Whitelist field trước khi `Policy.create`.
 *  2. `assertPolicyConditionSyntaxValid(payload.condition)` — validate cú
 *     pháp NGAY LÚC TẠO thay vì để policy sai cú pháp lưu vào DB (trước đây
 *     lỗi chỉ lộ ra khi có request thật chạm nhánh ABAC ở
 *     `authorizePermission.middleware.ts`, và bị NUỐT LỖI ở đó — policy hỏng
 *     nằm im trong DB, chỉ luôn "âm thầm không match" mà không ai biết tại
 *     sao). Ném `400 Bad Request` sớm, rõ ràng cho người tạo policy.
 */
export const createPolicyService = async (payload: any) => {
  const safePayload = pickWhitelisted(payload, POLICY_CREATE_WHITELIST);

  assertPolicyConditionSyntaxValid(safePayload.condition);

  const saved = await Policy.create(safePayload);

  // 🔒 Policy KHÔNG gắn với 1 role/user cụ thể nào (xem `policy.model.ts` —
  // chỉ có `resource`/`action`/`condition`, không có ref tới Role/User) —
  // không thể tính trước "ai bị ảnh hưởng" như Role/Permission. Thay vào đó,
  // broadcast cho nhóm ADMIN (cùng vai trò giám sát bảo mật như audit log ở
  // `authorizePermission.middleware.ts`) để admin biết có Policy mới, review
  // lại nếu cần — đặc biệt vì `condition` là chuỗi tự viết, sai logic ở đây
  // có thể vô tình mở/khoá quyền ngoài ý muốn.
  notifyUsersByRoleName("ADMIN", {
    type: NotificationType.RBAC_CHANGED,
    title: "Policy RBAC vừa được tạo",
    message: `Policy "${saved.name}" (resource: ${saved.resource}, action: ${saved.action}) vừa được tạo mới.`,
  });

  return saved;
};

/**
 * GET POLICIES — search + filter + pagination
 */
export const getPolicieService = async (query: any) => {
  const { page, limit, sortBy, order, keyword, resource, action } = query;
 
  const filter: any = {};
 
  if (resource) filter.resource = resource;
  if (action) filter.action = action;
 
  if (keyword) {
    filter.name = { $regex: keyword, $options: "i" };
  }
 
  const skip = (page - 1) * limit;
  const sortOption: any = { [sortBy]: order === "asc" ? 1 : -1 };
 
  const [items, total] = await Promise.all([
    Policy.find(filter).sort(sortOption).skip(skip).limit(limit),
    Policy.countDocuments(filter),
  ]);
 
  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPage: Math.ceil(total / limit),
    },
  };
};

/**
 * ⚠️ MỚI: GET POLICY BY ID.
 */
export const getPolicyByIdService = async (id: any) => {
  const policy = await Policy.findById(id);
  if (!policy) {
    throw ApiError.notFound("Policy not found");
  }
  return policy;
};

/**
 * ⚠️ SỬA (review RBAC module): whitelist + validate cú pháp `condition` nếu
 * có mặt trong payload update (cùng lý do như `createPolicyService`).
 */
export const updatePolicyService = async (id: any, payload: any) => {
  const policy = await Policy.findById(id);
  if (!policy) {
    throw ApiError.notFound("Policy not found");
  }

  const safePayload = pickWhitelisted(payload, POLICY_UPDATE_WHITELIST);

  if (safePayload.condition) {
    assertPolicyConditionSyntaxValid(safePayload.condition);
  }

  Object.assign(policy, safePayload);
  const saved = await policy.save();

  // Cùng lý do như `createPolicyService` — broadcast ADMIN thay vì tính
  // "user bị ảnh hưởng" (bất khả thi với Policy).
  notifyUsersByRoleName("ADMIN", {
    type: NotificationType.RBAC_CHANGED,
    title: "Policy RBAC vừa được cập nhật",
    message: `Policy "${saved.name}" (resource: ${saved.resource}, action: ${saved.action}) vừa được cập nhật.`,
  });

  return saved;
};

export const deletePolicyService = async (id: any) => {
  const policy = await Policy.findById(id);
  if (!policy) {
    throw ApiError.notFound("Policy not found");
  }

  // Không cần guard "in use" như Role/Permission: Policy không được tham
  // chiếu bởi field nào khác qua ObjectId ref (chỉ được match runtime theo
  // `resource`/`action` ở `authorizePermission.middleware.ts`), nên xoá
  // Policy không thể tạo dangling reference ở collection khác.
  const { name, resource, action } = policy;

  await policy.deleteOne();

  // Cùng lý do như `createPolicyService` — broadcast ADMIN. Lưu lại
  // `name`/`resource`/`action` vào biến TRƯỚC khi `deleteOne()` vì sau khi
  // xoá, `policy` vẫn còn field trong bộ nhớ (Mongoose không tự xoá field
  // của document instance), nhưng tách riêng cho rõ ràng, tránh phụ thuộc
  // hành vi ngầm định đó.
  notifyUsersByRoleName("ADMIN", {
    type: NotificationType.RBAC_CHANGED,
    title: "Policy RBAC vừa bị xoá",
    message: `Policy "${name}" (resource: ${resource}, action: ${action}) vừa bị xoá.`,
  });

  return true;
};

