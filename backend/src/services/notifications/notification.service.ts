// services/notifications/notification.service.ts
import { Types } from "mongoose";
import {
  Notification,
  NotificationChannel,
  NotificationPriority,
  NotificationResourceType,
  NotificationType,
} from "../../models/notifications/notification.model";
import { User } from "../../models/users/user.model";
import { Role } from "../../models/rbac/role.model";
import ApiError from "../../shared/errors/ApiError";
import { toOptionalObjectId } from "../../shared/utils/Mongoid.util";
import { sendMail } from "../../shared/utils/mailer";
import { escapeHtml } from "../../shared/utils/html.util";
import type { BroadcastNotificationInput } from "../../dto/notifications/notification.dto";

/* =====================================================================
   TẠO NOTIFICATION (điểm gọi từ CÁC SERVICE KHÁC)
   =====================================================================
   Đây là hàm được `workflow.service.ts` / `document.service.ts` /
   `excel.service.ts` / `rbac.service.ts` gọi tới khi có sự kiện xảy ra.

   THIẾT KẾ QUAN TRỌNG: hàm này KHÔNG BAO GIỜ throw ra ngoài — notification
   là tác vụ PHỤ, không phải điều kiện bắt buộc để nghiệp vụ chính (approve
   step, submit document...) thành công. Nếu tạo notification thất bại, chỉ
   log lỗi, không làm fail request nghiệp vụ đang gọi tới đây.
   Cùng pattern với `auditAdminBypass` trong `authorizePermission.middleware.ts`
   (ghi audit best-effort, `.catch()` thay vì để lỗi văng lên).
===================================================================== */

export type CreateNotificationParams = {
  recipient: string | Types.ObjectId;
  createdBy?: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  resourceType?: NotificationResourceType;
  resourceId?: string | Types.ObjectId;
  priority?: NotificationPriority;
  /** true => cố gắng gửi thêm qua email (best-effort, không chặn nếu lỗi) */
  sendEmail?: boolean;
};

export const createNotification = async (
  params: CreateNotificationParams,
): Promise<void> => {
  try {
    const recipientId = toOptionalObjectId(
      params.recipient,
      "recipient không hợp lệ",
    );
    if (!recipientId) return;

    const channelsSent: NotificationChannel[] = [NotificationChannel.IN_APP];

    const doc = await Notification.create({
      recipient: recipientId,
      createdBy: params.createdBy
        ? toOptionalObjectId(params.createdBy)
        : undefined,
      type: params.type,
      title: params.title,
      message: params.message,
      resourceType: params.resourceType,
      resourceId: params.resourceId
        ? toOptionalObjectId(params.resourceId)
        : undefined,
      priority: params.priority ?? NotificationPriority.NORMAL,
      channelsSent, // ghi trước "in_app" — luôn coi là đã tạo thành công ở đây
    });

    // Gửi email best-effort — KHÔNG await chặn caller, và tự bắt lỗi riêng để
    // 1 lần gửi mail thất bại không ảnh hưởng tới việc notification in-app
    // (đã tạo xong ở trên) vẫn hiển thị bình thường cho user.
    if (params.sendEmail) {
      sendEmailForNotification(recipientId, params.title, params.message, doc._id).catch(
        (err) => {
          console.error("[notification.service] Gửi email thất bại:", err);
        },
      );
    }
  } catch (err) {
    console.error("[notification.service] createNotification thất bại:", err);
  }
};

/**
 * Gửi email cho 1 notification đã tạo. Tách riêng khỏi `createNotification`
 * để không chặn write chính, và để cập nhật `channelsSent` SAU KHI gửi thành
 * công (tránh ghi "đã gửi email" trước khi thực sự gửi).
 */
const sendEmailForNotification = async (
  recipientId: Types.ObjectId,
  title: string,
  message: string,
  notificationId: Types.ObjectId,
) => {
  const user = await User.findById(recipientId).select("email fullName");
  if (!user?.email) return; // user cũ chưa migrate email — bỏ qua, không throw

  // DEV-015/MEDIUM-10 (RV10-02): `message` là free-text (có thể chứa
  // Document.title/tên tự đặt của user khác) — escape trước khi nội suy vào
  // HTML email, tránh HTML/email injection.
  await sendMail({
    to: user.email,
    subject: title,
    html: `<p>${escapeHtml(message)}</p>`,
  });

  await Notification.findByIdAndUpdate(notificationId, {
    $addToSet: { channelsSent: NotificationChannel.EMAIL },
  });
};

/* =====================================================================
   BROADCAST HELPER — dùng khi 1 sự kiện cần báo cho NHIỀU user cùng lúc
   (vd tất cả user có role trùng `WorkflowTemplate.steps[i].role`).
   Tách riêng khỏi `createNotification` (vốn nhận đúng 1 `recipient`) để nơi
   gọi không phải tự viết lại vòng lặp + tự bắt lỗi từng user.
===================================================================== */

export const notifyUsersByRoleName = async (
  roleName: string,
  payload: Omit<CreateNotificationParams, "recipient">,
): Promise<void> => {
  try {
    const role = await Role.findOne({ name: roleName }).select("_id");
    if (!role) return;

    const users = await User.find({ role: role._id, isActive: true }).select(
      "_id",
    );

    // `Promise.allSettled` thay vì `Promise.all`: 1 user gửi lỗi (vd thiếu
    // email) không được làm dừng việc gửi cho các user còn lại trong danh
    // sách broadcast.
    await Promise.allSettled(
      users.map((u) => createNotification({ ...payload, recipient: u._id })),
    );
  } catch (err) {
    console.error("[notification.service] notifyUsersByRoleName thất bại:", err);
  }
};

/**
 * Broadcast theo phòng ban — dùng cho `DOCUMENT_SUBMITTED` (báo các thành
 * viên cùng khoa/phòng biết có tài liệu mới, KHÔNG đi qua workflow).
 * `excludeUserId` dùng để loại người vừa tạo document ra khỏi danh sách
 * nhận — tránh tự thông báo cho chính mình.
 */
export const notifyUsersByDepartment = async (
  departmentId: string | Types.ObjectId,
  payload: Omit<CreateNotificationParams, "recipient">,
  excludeUserId?: string | Types.ObjectId,
): Promise<void> => {
  try {
    const deptId = toOptionalObjectId(departmentId, "Department id không hợp lệ");
    if (!deptId) return;

    const filter: Record<string, unknown> = { department: deptId, isActive: true };
    if (excludeUserId) filter._id = { $ne: excludeUserId };

    const users = await User.find(filter).select("_id");

    await Promise.allSettled(
      users.map((u) => createNotification({ ...payload, recipient: u._id })),
    );
  } catch (err) {
    console.error("[notification.service] notifyUsersByDepartment thất bại:", err);
  }
};

/**
 * Broadcast tới 1 danh sách userId ĐÃ BIẾT SẴN — dùng khi caller đã tự query
 * được danh sách user liên quan (vd `rbac.service.ts` đã có sẵn
 * `affectedUsers` từ việc clear permission cache cho 1 role), tránh
 * `notification.service.ts` phải query lại DB lần nữa cho cùng 1 tập user.
 */
export const notifyUserIds = async (
  userIds: Array<string | Types.ObjectId>,
  payload: Omit<CreateNotificationParams, "recipient">,
): Promise<void> => {
  try {
    await Promise.allSettled(
      userIds.map((id) => createNotification({ ...payload, recipient: id })),
    );
  } catch (err) {
    console.error("[notification.service] notifyUserIds thất bại:", err);
  }
};

/* =====================================================================
   TRUY VẤN — dùng bởi notification.controller.ts (API cho FE)
===================================================================== */

export const getNotificationsForUser = async (
  userId: string | Types.ObjectId,
  options: { page: number; limit: number; isRead?: boolean; type?: string },
) => {
  const recipientId = toOptionalObjectId(userId, "User id không hợp lệ");

  const filter: Record<string, unknown> = { recipient: recipientId };
  if (options.isRead !== undefined) filter.isRead = options.isRead;
  if (options.type) filter.type = options.type;

  const skip = (options.page - 1) * options.limit;

  const [items, total, unreadCount] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit)
      .lean(),
    Notification.countDocuments(filter),
    Notification.countDocuments({ recipient: recipientId, isRead: false }),
  ]);

  return {
    items,
    total,
    unreadCount,
    page: options.page,
    limit: options.limit,
    totalPages: Math.ceil(total / options.limit) || 1,
  };
};

/**
 * Đánh dấu đã đọc — CHỈ cho phép chính chủ (`recipient === userId`) thao
 * tác. Đây là điểm chặn IDOR quan trọng nhất của module: nếu thiếu check
 * này, user A truyền id notification của user B vào là đọc/đánh dấu được
 * luôn — controller KHÔNG được bỏ qua tham số `userId` khi gọi hàm này.
 */
export const markAsRead = async (
  notificationId: string,
  userId: string | Types.ObjectId,
) => {
  const recipientId = toOptionalObjectId(userId, "User id không hợp lệ");

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: recipientId,
  });

  if (!notification) {
    throw ApiError.notFound("Không tìm thấy thông báo");
  }

  if (!notification.isRead) {
    notification.isRead = true;
    notification.readAt = new Date();
    await notification.save();
  }

  return notification;
};

export const markAllAsRead = async (userId: string | Types.ObjectId) => {
  const recipientId = toOptionalObjectId(userId, "User id không hợp lệ");

  const result = await Notification.updateMany(
    { recipient: recipientId, isRead: false },
    { $set: { isRead: true, readAt: new Date() } },
  );

  return { modifiedCount: result.modifiedCount };
};

/**
 * Đếm nhanh số notification chưa đọc — tách riêng khỏi
 * `getNotificationsForUser` để FE poll badge chuông mỗi vài giây mà không
 * phải kéo cả danh sách (query rẻ hơn nhiều: chỉ `countDocuments` trên index
 * `{ recipient: 1, isRead: 1, createdAt: -1 }` đã có sẵn).
 */
export const getUnreadCount = async (userId: string | Types.ObjectId) => {
  const recipientId = toOptionalObjectId(userId, "User id không hợp lệ");

  const unreadCount = await Notification.countDocuments({
    recipient: recipientId,
    isRead: false,
  });

  return { unreadCount };
};

/**
 * Xoá 1 notification — CHỈ chính chủ (`recipient === userId`) mới xoá được,
 * cùng nguyên tắc chặn IDOR như `markAsRead`. Đây là xoá hẳn (hard delete),
 * không phải soft delete: notification không có giá trị nghiệp vụ cần giữ
 * lại lịch sử sau khi user đã chủ động dọn khỏi danh sách của họ (khác với
 * Document — nơi soft delete cần thiết cho audit).
 */
export const deleteNotification = async (
  notificationId: string,
  userId: string | Types.ObjectId,
) => {
  const recipientId = toOptionalObjectId(userId, "User id không hợp lệ");

  const result = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: recipientId,
  });

  if (!result) {
    throw ApiError.notFound("Không tìm thấy thông báo");
  }

  return { deleted: true };
};

/* =====================================================================
   ADMIN — quản trị Notification (MỚI, 2026-09-10) — xem
   `notification.dto.ts` cho bối cảnh đầy đủ. Tái dùng `notifyUserIds`
   (helper broadcast đã có sẵn, đang chạy ổn định cho 4 module khác) thay vì
   viết lại vòng lặp gửi — chỉ thêm bước RESOLVE danh sách user theo `scope`.
===================================================================== */

/** Resolve `scope` → danh sách `_id` user THẬT SỰ tồn tại + đang active — không tin tưởng payload client gửi lên chứa ID rác/user đã bị vô hiệu hoá. */
const resolveBroadcastRecipientIds = async (
  input: BroadcastNotificationInput,
): Promise<Types.ObjectId[]> => {
  if (input.scope === "ALL") {
    const users = await User.find({ isActive: true }).select("_id");
    return users.map((u) => u._id);
  }

  if (input.scope === "ROLE") {
    const role = await Role.findOne({ name: input.roleName }).select("_id");
    if (!role) {
      throw ApiError.badRequest(`Role "${input.roleName}" không tồn tại`);
    }
    const users = await User.find({ role: role._id, isActive: true }).select("_id");
    return users.map((u) => u._id);
  }

  if (input.scope === "DEPARTMENT") {
    const deptId = toOptionalObjectId(input.departmentId, "departmentId không hợp lệ");
    if (!deptId) return [];
    const users = await User.find({ department: deptId, isActive: true }).select("_id");
    return users.map((u) => u._id);
  }

  // scope === "USERS"
  const ids = (input.userIds ?? [])
    .map((id) => toOptionalObjectId(id))
    .filter((id): id is Types.ObjectId => !!id);
  if (ids.length === 0) return [];
  const users = await User.find({ _id: { $in: ids }, isActive: true }).select("_id");
  return users.map((u) => u._id);
};

/**
 * Soạn + gửi thông báo hệ thống (`type: SYSTEM` — enum có sẵn từ đầu nhưng
 * CHƯA từng có điểm gọi nào dùng tới, xem `notification.types.ts`) tới nhiều
 * user cùng lúc. `createdBy` = ADMIN đang gọi (audit "ai gửi thông báo này").
 */
export const broadcastNotificationService = async (
  createdBy: string | Types.ObjectId,
  input: BroadcastNotificationInput,
) => {
  const recipientIds = await resolveBroadcastRecipientIds(input);

  if (recipientIds.length === 0) {
    throw ApiError.badRequest("Không tìm thấy người nhận nào khớp phạm vi đã chọn");
  }

  await notifyUserIds(recipientIds, {
    createdBy,
    type: NotificationType.SYSTEM,
    title: input.title,
    message: input.message,
    priority: input.priority as NotificationPriority | undefined,
    sendEmail: input.sendEmail,
  });

  return { recipientCount: recipientIds.length };
};

/**
 * Xem thông báo của BẤT KỲ user nào (giám sát/debug — vd "user X báo không
 * nhận được thông báo duyệt tài liệu, kiểm tra xem hệ thống đã tạo bản ghi
 * chưa"). KHÁC HẲN `getNotificationsForUser`: KHÔNG tự khoá `recipient` theo
 * người gọi — permission `NOTIFICATION_VIEW_ALL` (chỉ ADMIN) là ranh giới
 * bảo mật duy nhất ở đây, PHẢI luôn gắn kèm middleware đó ở route, không
 * được gọi hàm này từ bất kỳ route nào thiếu permission tương ứng.
 */
export const getAllNotificationsAdmin = async (options: {
  page: number;
  limit: number;
  recipient?: string;
  isRead?: boolean;
  type?: string;
}) => {
  const filter: Record<string, unknown> = {};

  if (options.recipient) {
    const recipientId = toOptionalObjectId(options.recipient, "recipient không hợp lệ");
    if (recipientId) filter.recipient = recipientId;
  }
  if (options.isRead !== undefined) filter.isRead = options.isRead;
  if (options.type) filter.type = options.type;

  const skip = (options.page - 1) * options.limit;

  const [items, total] = await Promise.all([
    Notification.find(filter)
      .populate("recipient", "username email fullName")
      .populate("createdBy", "username email fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(options.limit)
      .lean(),
    Notification.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page: options.page,
    limit: options.limit,
    totalPages: Math.ceil(total / options.limit) || 1,
  };
};