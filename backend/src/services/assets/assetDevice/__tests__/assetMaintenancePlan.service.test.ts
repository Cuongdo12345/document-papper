// (Roadmap B2 — Lịch bảo trì chủ động, 2026-09-15) Regression test cho
// `assetMaintenancePlan.service.ts`. Mock Model — không dùng DB thật, cùng
// pattern `calibrationRecord.service.test.ts`.
jest.mock("../../../../models/assets/asset.model", () => ({
  Asset: { findOne: jest.fn() },
}));
jest.mock("../../../../models/assets/assetMaintenancePlan.model", () => ({
  AssetMaintenancePlan: {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
  },
}));

import { Asset } from "../../../../models/assets/asset.model";
import { AssetMaintenancePlan } from "../../../../models/assets/assetMaintenancePlan.model";
import { MaintenancePlanStatus } from "../../../../interfaces/assets/assetMaintenancePlan.interface";
import {
  createMaintenancePlanService,
  getMaintenancePlansForAssetService,
  updateMaintenancePlanService,
  completeMaintenancePlanService,
  cancelMaintenancePlanService,
  getMaintenanceCalendarService,
} from "../assetMaintenancePlan.service";

const mockedAsset = Asset as any;
const mockedPlan = AssetMaintenancePlan as any;

const ASSET_ID = "507f1f77bcf86cd799439011";
const PLAN_ID = "507f1f77bcf86cd799439022";

const makePlanDoc = (overrides: any = {}) => {
  const doc: any = {
    _id: PLAN_ID,
    asset: ASSET_ID,
    title: "Bảo trì định kỳ",
    status: MaintenancePlanStatus.PLANNED,
    scheduledDate: new Date(Date.now() + 5 * 86400000), // 5 ngày sau — chưa overdue
    save: jest.fn().mockResolvedValue(undefined),
    toObject() {
      const { save, populate, toObject, ...rest } = doc;
      return rest;
    },
    ...overrides,
  };
  // `.populate()` (Mongoose thật) resolve về CHÍNH document đó (mutated in
  // place), KHÔNG PHẢI undefined — mock phải trả lại đúng `doc` để
  // `withIsOverdue(await plan.populate(...))` trong service không crash.
  doc.populate = jest.fn().mockResolvedValue(doc);
  return doc;
};

describe("createMaintenancePlanService (Roadmap B2)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("ID tài sản không hợp lệ → 400, không chạm DB", async () => {
    await expect(createMaintenancePlanService("not-an-id", {})).rejects.toMatchObject({ status: 400 });
    expect(mockedAsset.findOne).not.toHaveBeenCalled();
  });

  it("tài sản không tồn tại/không active → 404", async () => {
    mockedAsset.findOne.mockResolvedValue(null);
    await expect(createMaintenancePlanService(ASSET_ID, { title: "A", scheduledDate: new Date() })).rejects.toMatchObject({
      status: 404,
    });
  });

  it("thành công — tạo với status PLANNED, gắn isOverdue=false cho ngày tương lai", async () => {
    mockedAsset.findOne.mockResolvedValue({ _id: ASSET_ID });
    const planDoc = makePlanDoc();
    mockedPlan.create.mockResolvedValue(planDoc);

    const result = await createMaintenancePlanService(ASSET_ID, { title: "Bảo trì định kỳ", scheduledDate: new Date() }, "user-1");

    expect(mockedPlan.create).toHaveBeenCalledWith(
      expect.objectContaining({ asset: ASSET_ID, status: MaintenancePlanStatus.PLANNED, createdBy: "user-1" }),
    );
    expect(result.isOverdue).toBe(false);
  });
});

describe("getMaintenancePlansForAssetService (Roadmap B2)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("ID tài sản không hợp lệ → 400", async () => {
    await expect(getMaintenancePlansForAssetService("bad-id", {})).rejects.toMatchObject({ status: 400 });
  });

  it("tài sản không tồn tại → 404", async () => {
    mockedAsset.findOne.mockResolvedValue(null);
    await expect(getMaintenancePlansForAssetService(ASSET_ID, {})).rejects.toMatchObject({ status: 404 });
  });

  it("trả về danh sách phân trang, mỗi item có isOverdue", async () => {
    mockedAsset.findOne.mockResolvedValue({ _id: ASSET_ID });
    const overduePlan = makePlanDoc({ scheduledDate: new Date(Date.now() - 86400000), status: MaintenancePlanStatus.PLANNED });
    const query: any = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue([overduePlan]),
    };
    mockedPlan.find.mockReturnValue(query);
    mockedPlan.countDocuments.mockResolvedValue(1);

    const result = await getMaintenancePlansForAssetService(ASSET_ID, { page: 1, limit: 20 });

    expect(result.data[0].isOverdue).toBe(true);
    expect(result.pagination.total).toBe(1);
  });
});

describe("update/complete/cancel MaintenancePlanService (Roadmap B2)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("update: ID kế hoạch không hợp lệ → 400", async () => {
    await expect(updateMaintenancePlanService("bad-id", {})).rejects.toMatchObject({ status: 400 });
  });

  it("update: không tìm thấy → 404", async () => {
    mockedPlan.findById.mockResolvedValue(null);
    await expect(updateMaintenancePlanService(PLAN_ID, {})).rejects.toMatchObject({ status: 404 });
  });

  it("update: đã completed/cancelled → 400, không cho sửa", async () => {
    mockedPlan.findById.mockResolvedValue(makePlanDoc({ status: MaintenancePlanStatus.COMPLETED }));
    await expect(updateMaintenancePlanService(PLAN_ID, { title: "Sửa" })).rejects.toMatchObject({ status: 400 });
  });

  it("update: còn PLANNED → sửa field + save", async () => {
    const planDoc = makePlanDoc();
    mockedPlan.findById.mockResolvedValue(planDoc);

    await updateMaintenancePlanService(PLAN_ID, { title: "Tên mới" }, "user-2");

    expect(planDoc.title).toBe("Tên mới");
    expect(planDoc.updatedBy).toBe("user-2");
    expect(planDoc.save).toHaveBeenCalledTimes(1);
  });

  it("complete: set đúng status/completedAt/completedBy/resolutionNote", async () => {
    const planDoc = makePlanDoc();
    mockedPlan.findById.mockResolvedValue(planDoc);

    await completeMaintenancePlanService(PLAN_ID, "user-3", "Đã thay linh kiện");

    expect(planDoc.status).toBe(MaintenancePlanStatus.COMPLETED);
    expect(planDoc.completedBy).toBe("user-3");
    expect(planDoc.completedAt).toBeInstanceOf(Date);
    expect(planDoc.resolutionNote).toBe("Đã thay linh kiện");
  });

  it("complete: plan đã cancelled → 400, không cho complete lại", async () => {
    mockedPlan.findById.mockResolvedValue(makePlanDoc({ status: MaintenancePlanStatus.CANCELLED }));
    await expect(completeMaintenancePlanService(PLAN_ID, "user-1")).rejects.toMatchObject({ status: 400 });
  });

  it("cancel: set đúng status/cancelledAt/cancelledBy", async () => {
    const planDoc = makePlanDoc();
    mockedPlan.findById.mockResolvedValue(planDoc);

    await cancelMaintenancePlanService(PLAN_ID, "user-4", "Thiết bị đã thanh lý");

    expect(planDoc.status).toBe(MaintenancePlanStatus.CANCELLED);
    expect(planDoc.cancelledBy).toBe("user-4");
    expect(planDoc.cancelledAt).toBeInstanceOf(Date);
  });
});

describe("getMaintenanceCalendarService (Roadmap B2)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("tính đúng khoảng ngày [đầu tháng, đầu tháng kế tiếp) cho query", async () => {
    const query: any = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([]),
    };
    mockedPlan.find.mockReturnValue(query);

    await getMaintenanceCalendarService({ month: 3, year: 2026 });

    const filterArg = mockedPlan.find.mock.calls[0][0];
    expect(filterArg.scheduledDate.$gte).toEqual(new Date(2026, 2, 1));
    expect(filterArg.scheduledDate.$lt).toEqual(new Date(2026, 3, 1));
  });

  it("lọc theo department TRONG BỘ NHỚ sau populate — chỉ giữ plan đúng khoa", async () => {
    const planDeptA = makePlanDoc({ asset: { department: { _id: "dept-a" } } });
    const planDeptB = makePlanDoc({ _id: "plan-2", asset: { department: { _id: "dept-b" } } });
    const query: any = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([planDeptA, planDeptB]),
    };
    mockedPlan.find.mockReturnValue(query);

    const result = await getMaintenanceCalendarService({ month: 3, year: 2026, department: "dept-a" });

    expect(result).toHaveLength(1);
  });

  it("KHÔNG truyền department → trả về TẤT CẢ (không lọc)", async () => {
    const planDeptA = makePlanDoc({ asset: { department: { _id: "dept-a" } } });
    const planDeptB = makePlanDoc({ _id: "plan-2", asset: { department: { _id: "dept-b" } } });
    const query: any = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockResolvedValue([planDeptA, planDeptB]),
    };
    mockedPlan.find.mockReturnValue(query);

    const result = await getMaintenanceCalendarService({ month: 3, year: 2026 });

    expect(result).toHaveLength(2);
  });
});
