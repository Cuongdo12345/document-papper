/**
 * BR-19 (docs/31_BACKEND_CODE_REVIEW.md, DEV-109, 2026-09-30) — E2E trên MongoDB
 * THẬT (in-memory): index thừa đã bị bỏ khỏi schema, script xoá index cũ an toàn,
 * và các truy vấn thật vẫn dùng index (không rơi về COLLSCAN / sort trong RAM).
 *
 * Không có route/permission mới; không đụng dữ liệu (chỉ index).
 */
import mongoose, { Types } from "mongoose";
import { startE2EDatabase, stopE2EDatabase } from "./setup";
import UserAudit from "../../models/users/userAudit.model";
import { Notification } from "../../models/notifications/notification.model";
import { NotificationType } from "../../models/notifications/notification.types";
import { ApiPerformanceModel } from "../../models/apiPerformance/apiPerformance.model";
import { Document, DocumentCategory, DocumentSubType } from "../../models/documents/document.model";
import { REDUNDANT_INDEXES, dropRedundantIndexes } from "../../shared/helpers/redundantIndexes.helper";

const db = () => mongoose.connection.db!;
const indexNames = async (collection: string) => (await db().collection(collection).indexes()).map((i) => i.name as string);

/** Gom mọi `indexName` và `stage` trong winningPlan (đệ quy qua inputStage/inputStages). */
const walkPlan = (node: any, out: { indexes: string[]; stages: string[] } = { indexes: [], stages: [] }) => {
  if (!node || typeof node !== "object") return out;
  if (node.stage) out.stages.push(node.stage);
  if (node.indexName) out.indexes.push(node.indexName);
  walkPlan(node.inputStage, out);
  (node.inputStages ?? []).forEach((s: any) => walkPlan(s, out));
  walkPlan(node.queryPlan, out);
  return out;
};
const planOf = async (query: any) => walkPlan((await query.explain("queryPlanner")).queryPlanner.winningPlan);

describe("E2E — Index thừa (BR-19)", () => {
  beforeAll(async () => {
    await startE2EDatabase();
    // Tạo index đúng theo schema hiện tại (giống autoIndex khi app khởi động).
    for (const m of [UserAudit, Notification, ApiPerformanceModel, Document]) {
      await m.createCollection().catch(() => undefined);
      await m.syncIndexes();
    }
  }, 60_000);

  afterAll(async () => {
    await stopE2EDatabase();
  });

  describe("schema hiện tại KHÔNG tạo index thừa", () => {
    it("không index nào trong danh sách thừa được tạo, và index thay thế đều có mặt", async () => {
      for (const r of REDUNDANT_INDEXES) {
        const names = await indexNames(r.collection);
        expect(names).not.toContain(r.name);
        expect(names).toContain(r.coveredBy);
      }
    });

    it("tập index từng collection đúng như mong đợi", async () => {
      expect((await indexNames("useraudits")).sort()).toEqual(["_id_", "action_1_createdAt_-1", "createdAt_-1", "performedBy_1_createdAt_-1", "user_1_createdAt_-1"]);
      expect((await indexNames("apiperformances")).sort()).toEqual(["_id_", "createdAt_1", "endpoint_1"]);
      const notif = await indexNames("notifications");
      expect(notif).not.toContain("recipient_1");
      expect(notif).toEqual(expect.arrayContaining(["recipient_1_createdAt_-1", "recipient_1_isRead_1_createdAt_-1"]));
      expect(await indexNames("documents")).not.toContain("referenceTo_1");
    });
  });

  describe("script xoá index cũ (dropRedundantIndexes)", () => {
    const createStale = async () => {
      await db().collection("useraudits").createIndexes([
        { key: { user: 1 }, name: "user_1" },
        { key: { performedBy: 1 }, name: "performedBy_1" },
        { key: { action: 1 }, name: "action_1" },
        { key: { action: 1, performedBy: 1, user: 1, createdAt: -1 }, name: "action_1_performedBy_1_user_1_createdAt_-1" },
      ]);
      await db().collection("apiperformances").createIndex({ createdAt: -1 }, { name: "createdAt_-1" });
      await db().collection("notifications").createIndex({ recipient: 1 }, { name: "recipient_1" });
      await db().collection("documents").createIndex({ referenceTo: 1 }, { name: "referenceTo_1" });
    };

    it("dry-run: báo 'would-drop' cho cả 7 index cũ nhưng KHÔNG xoá gì", async () => {
      await createStale();

      const res = await dropRedundantIndexes(db(), { apply: false });

      expect(res).toHaveLength(7);
      expect(res.every((r) => r.status === "would-drop")).toBe(true);
      for (const r of REDUNDANT_INDEXES) expect(await indexNames(r.collection)).toContain(r.name);
    });

    it("apply: xoá đúng 7 index cũ; index hợp lệ và dữ liệu còn nguyên", async () => {
      await UserAudit.create({ action: "LOGIN", user: new Types.ObjectId(), performedBy: new Types.ObjectId() });
      const before = await UserAudit.countDocuments();
      const validBefore = (await indexNames("useraudits")).filter((n) => !REDUNDANT_INDEXES.some((r) => r.collection === "useraudits" && r.name === n));

      const res = await dropRedundantIndexes(db(), { apply: true });

      expect(res.every((r) => r.status === "dropped")).toBe(true);
      for (const r of REDUNDANT_INDEXES) expect(await indexNames(r.collection)).not.toContain(r.name);
      expect((await indexNames("useraudits")).sort()).toEqual(validBefore.sort());
      expect(await indexNames("documents")).toContain("documentCode_1");
      expect(await indexNames("apiperformances")).toContain("createdAt_1"); // index TTL vẫn còn
      expect(await UserAudit.countDocuments()).toBe(before);
    });

    it("chạy lại: idempotent, mọi mục 'absent'", async () => {
      const res = await dropRedundantIndexes(db(), { apply: true });
      expect(res.every((r) => r.status === "absent")).toBe(true);
    });

    it("collection chưa tồn tại: 'absent', không văng lỗi", async () => {
      const res = await dropRedundantIndexes(db(), { apply: true }, [{ collection: "khong_ton_tai", name: "x_1", coveredBy: "x_1_y_1" }]);
      expect(res[0].status).toBe("absent");
    });

    it("index thay thế KHÔNG tồn tại -> GIỮ LẠI index cũ ('kept-no-cover'), kể cả khi --apply", async () => {
      await db().createCollection("br19_tmp");
      await db().collection("br19_tmp").createIndex({ a: 1 }, { name: "a_1" });

      const res = await dropRedundantIndexes(db(), { apply: true }, [{ collection: "br19_tmp", name: "a_1", coveredBy: "a_1_b_1" }]);

      expect(res[0].status).toBe("kept-no-cover");
      expect(await indexNames("br19_tmp")).toContain("a_1");
    });
  });

  describe("truy vấn thật vẫn dùng index sau khi bỏ index thừa", () => {
    const userId = new Types.ObjectId();
    const performerId = new Types.ObjectId();
    const proposalA = new Types.ObjectId();
    const proposalB = new Types.ObjectId();

    beforeAll(async () => {
      await UserAudit.insertMany(
        Array.from({ length: 30 }, (_, i) => ({
          action: i % 2 ? "LOGIN" : "UPDATE",
          user: i % 3 ? userId : new Types.ObjectId(),
          performedBy: i % 4 ? performerId : new Types.ObjectId(),
        })),
      );
      await Notification.insertMany(
        Array.from({ length: 30 }, (_, i) => ({
          recipient: i % 3 ? userId : new Types.ObjectId(),
          type: Object.values(NotificationType)[0],
          title: `t${i}`,
          message: `m${i}`,
          isRead: i % 2 === 0,
        })),
      );
      await ApiPerformanceModel.insertMany(Array.from({ length: 30 }, (_, i) => ({ method: "GET", endpoint: `/e${i % 3}`, status: 200, totalTime: i })));
      await Document.insertMany(
        Array.from({ length: 30 }, (_, i) => ({
          documentCode: `BR19-${i}`,
          category: DocumentCategory.REPORT,
          subType: i % 2 ? DocumentSubType.CHECK_DAMAGE : DocumentSubType.CONFIRM_STATUS,
          title: `d${i}`,
          createdBy: userId,
          department: new Types.ObjectId(),
          referenceTo: [i % 2 ? proposalA : proposalB],
          meta: {},
        })),
      );
    });

    it("UserAudit: lọc theo user/performedBy/action + sort createdAt dùng index kép, KHÔNG sort trong RAM", async () => {
      for (const [filter, expected] of [
        [{ user: userId }, "user_1_createdAt_-1"],
        [{ performedBy: performerId }, "performedBy_1_createdAt_-1"],
        [{ action: "LOGIN" }, "action_1_createdAt_-1"],
      ] as const) {
        const plan = await planOf(UserAudit.find(filter).sort({ createdAt: -1 }));
        expect(plan.indexes).toContain(expected);
        expect(plan.stages).not.toContain("COLLSCAN");
        expect(plan.stages).not.toContain("SORT");
      }
    });

    it("Notification: danh sách + đếm chưa đọc theo recipient dùng index có tiền tố recipient", async () => {
      for (const q of [
        Notification.find({ recipient: userId }).sort({ createdAt: -1 }),
        Notification.find({ recipient: userId, isRead: false }).sort({ createdAt: -1 }),
        Notification.find({ recipient: userId, isRead: false }).select({ _id: 1 }), // cùng filter với đếm chưa đọc / markAllAsRead
      ]) {
        const plan = await planOf(q);
        expect(plan.stages).not.toContain("COLLSCAN");
        expect(plan.indexes.some((n) => n.startsWith("recipient_1_"))).toBe(true);
      }
    });

    it("ApiPerformance: lọc khoảng thời gian và sort giảm dần dùng index TTL createdAt_1", async () => {
      const range = await planOf(ApiPerformanceModel.find({ createdAt: { $gte: new Date(0), $lte: new Date() } }));
      expect(range.indexes).toContain("createdAt_1");
      expect(range.stages).not.toContain("COLLSCAN");

      const sorted = await planOf(ApiPerformanceModel.find({}).sort({ createdAt: -1 }));
      expect(sorted.indexes).toContain("createdAt_1");
      expect(sorted.stages).not.toContain("SORT");
    });

    it("Document: mọi kiểu truy vấn theo referenceTo (đơn, $in, kèm subType/isActive — BR-17) dùng index kép, không COLLSCAN", async () => {
      const queries = [
        Document.find({ referenceTo: proposalA }),
        Document.find({ referenceTo: { $in: [proposalA, proposalB] } }),
        Document.find({ category: DocumentCategory.REPORT, isActive: true, referenceTo: { $in: [proposalA, proposalB] } }),
        Document.find({ subType: DocumentSubType.CHECK_DAMAGE, isActive: true, referenceTo: { $in: [proposalA, proposalB] } }),
      ];
      for (const q of queries) {
        const plan = await planOf(q);
        expect(plan.stages).not.toContain("COLLSCAN");
        expect(plan.indexes.length).toBeGreaterThan(0);
      }
      // Truy vấn chỉ có referenceTo: index kép là ứng viên DUY NHẤT nên phải là index thắng.
      expect((await planOf(Document.find({ referenceTo: proposalA }))).indexes).toEqual(["referenceTo_1_category_1_isActive_1_createdAt_1"]);
    });
  });
});
