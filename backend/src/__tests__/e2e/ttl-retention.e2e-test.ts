/**
 * BR-13 (docs/31_BACKEND_CODE_REVIEW.md, DEV-110, 2026-09-30) — E2E trên MongoDB
 * THẬT (in-memory): TTL index tự xoá `RefreshToken` hết hạn (đúng lúc `expiresAt`)
 * và `Notification` cũ hơn 90 ngày, còn dữ liệu còn hạn thì giữ nguyên và app vẫn
 * chạy đúng (refresh token, danh sách phiên).
 *
 * TTL monitor của MongoDB mặc định quét mỗi 60 giây; test hạ xuống 1 giây bằng
 * `setParameter ttlMonitorSleepSecs` (chỉ áp dụng cho instance in-memory của test)
 * rồi chờ thật sự cho tới khi bản ghi bị xoá — không mock.
 *
 * Không có route/permission mới.
 */
import request from "supertest";
import crypto from "crypto";
import mongoose, { Types } from "mongoose";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import { seedRbac, seedDepartments, seedUser } from "./seedTestData";
import RefreshToken from "../../models/auth/refreshToken.model";
import { Notification, NOTIFICATION_RETENTION_DAYS } from "../../models/notifications/notification.model";
import { NotificationType } from "../../models/notifications/notification.types";

const PASSWORD = "Password123";
const DAY = 24 * 60 * 60 * 1000;

const setTtlSleep = (secs: number) => mongoose.connection.db!.admin().command({ setParameter: 1, ttlMonitorSleepSecs: secs });

const waitFor = async (predicate: () => Promise<boolean>, timeoutMs = 30_000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await predicate()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

describe("E2E — TTL / lưu giữ dữ liệu (BR-13)", () => {
  let app: import("express").Express;
  let userId: Types.ObjectId;
  let accessToken: string;
  let refreshToken: string;

  const rawToken = (fields: Record<string, unknown>) => ({
    user: userId,
    token: crypto.randomBytes(16).toString("hex"),
    revoked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...fields,
  });

  const rawNotification = (title: string, ageDays: number) => {
    const at = new Date(Date.now() - ageDays * DAY);
    return { recipient: userId, type: Object.values(NotificationType)[0], title, message: title, isRead: false, createdAt: at, updatedAt: at };
  };

  beforeAll(async () => {
    await startE2EDatabase();
    app = (await import("../../app")).default;
    await RefreshToken.createCollection().catch(() => undefined);
    await Notification.createCollection().catch(() => undefined);
    await RefreshToken.syncIndexes();
    await Notification.syncIndexes();
    await setTtlSleep(1);

    const roleIds = await seedRbac();
    const { deptA } = await seedDepartments();
    const user = await seedUser({ username: "br13_user", password: PASSWORD, fullName: "User", roleId: roleIds.USER, departmentId: deptA });
    userId = user._id as Types.ObjectId;
    const login = await request(app).post("/api/auths/login").send({ username: "br13_user", password: PASSWORD });
    accessToken = login.body.data.accessToken;
    refreshToken = login.body.data.refreshToken;
  }, 60_000);

  afterAll(async () => {
    await setTtlSleep(60).catch(() => undefined);
    await stopE2EDatabase();
  });

  it("schema tạo đúng TTL index: RefreshToken.expiresAt (0 giây), Notification.createdAt (90 ngày)", async () => {
    const rt = (await RefreshToken.collection.indexes()).find((i) => i.name === "expiresAt_1");
    expect(rt).toMatchObject({ key: { expiresAt: 1 }, expireAfterSeconds: 0 });

    const nt = (await Notification.collection.indexes()).find((i) => i.name === "createdAt_1");
    expect(NOTIFICATION_RETENTION_DAYS).toBe(90);
    expect(nt).toMatchObject({ key: { createdAt: 1 }, expireAfterSeconds: 90 * 24 * 60 * 60 });
  });

  it("MongoDB thật sự xoá token hết hạn + thông báo >90 ngày, giữ token còn hạn (kể cả đã thu hồi) và thông báo còn trong hạn", async () => {
    const expiredA = rawToken({ expiresAt: new Date(Date.now() - 60_000) });
    const expiredB = rawToken({ expiresAt: new Date(Date.now() - 30 * DAY), revoked: true });
    const liveRevoked = rawToken({ expiresAt: new Date(Date.now() + 3 * DAY), revoked: true });
    const liveActive = rawToken({ expiresAt: new Date(Date.now() + 3 * DAY) });
    await RefreshToken.collection.insertMany([expiredA, expiredB, liveRevoked, liveActive]);
    await Notification.collection.insertMany([rawNotification("cu-91-ngay", 91), rawNotification("cu-200-ngay", 200), rawNotification("con-89-ngay", 89), rawNotification("moi", 0)]);

    const deleted = await waitFor(async () => {
      const expiredLeft = await RefreshToken.countDocuments({ token: { $in: [expiredA.token, expiredB.token] } });
      const oldNotifLeft = await Notification.countDocuments({ title: { $in: ["cu-91-ngay", "cu-200-ngay"] } });
      return expiredLeft === 0 && oldNotifLeft === 0;
    });
    expect(deleted).toBe(true);

    // Token còn hạn giữ nguyên (đã thu hồi hay chưa), token đăng nhập thật cũng còn.
    expect(await RefreshToken.countDocuments({ token: { $in: [liveRevoked.token, liveActive.token] } })).toBe(2);
    expect(await Notification.countDocuments({ title: { $in: ["con-89-ngay", "moi"] } })).toBe(2);
  }, 60_000);

  it("sau khi TTL chạy, app vẫn hoạt động: refresh token thật còn dùng được, danh sách phiên chỉ có phiên còn hạn", async () => {
    const refreshed = await request(app).post("/api/auths/refresh-token").send({ refreshToken });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.accessToken).toBeTruthy();

    const sessions = await request(app).get("/api/auths/sessions").set("Authorization", `Bearer ${accessToken}`);
    expect(sessions.status).toBe(200);
    // Chỉ phiên đăng nhập thật + phiên `liveActive` (còn hạn, chưa thu hồi); token hết hạn/đã thu hồi không xuất hiện.
    const list = (sessions.body.data ?? sessions.body) as unknown[];
    expect(list).toHaveLength(2);
  });

  it("token hết hạn chưa kịp bị TTL xoá vẫn KHÔNG được liệt kê (lọc hạn ở tầng truy vấn không đổi)", async () => {
    await setTtlSleep(3600); // tạm dừng TTL monitor để bản ghi hết hạn còn nằm trong DB
    await new Promise((r) => setTimeout(r, 1500));
    const lingering = rawToken({ expiresAt: new Date(Date.now() - 60_000) });
    await RefreshToken.collection.insertOne(lingering);

    const sessions = await request(app).get("/api/auths/sessions").set("Authorization", `Bearer ${accessToken}`);
    expect(sessions.status).toBe(200);
    expect(((sessions.body.data ?? sessions.body) as unknown[]).length).toBe(2);
    expect(await RefreshToken.countDocuments({ token: lingering.token })).toBe(1);
    await setTtlSleep(1);
  }, 30_000);
});
