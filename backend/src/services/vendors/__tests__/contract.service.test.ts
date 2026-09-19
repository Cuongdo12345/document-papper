// (Roadmap B4 — Quản lý nhà cung cấp & hợp đồng bảo trì, 2026-09-16)
// Regression test cho `contract.service.ts`. Mock Model — không dùng DB
// thật, cùng pattern `assetMaintenancePlan.service.test.ts`.
jest.mock("../../../models/vendors/vendor.model", () => ({
  Vendor: { findOne: jest.fn() },
}));
jest.mock("../../../models/vendors/contract.model", () => ({
  Contract: {
    create: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
  },
}));
jest.mock("../../../models/assets/asset.model", () => ({
  Asset: { countDocuments: jest.fn() },
}));

import { Vendor } from "../../../models/vendors/vendor.model";
import { Contract } from "../../../models/vendors/contract.model";
import { Asset } from "../../../models/assets/asset.model";
import { ContractStatus } from "../../../interfaces/vendors/contract.interface";
import {
  createContractService,
  getAllContractsService,
  getContractsForAssetService,
  getContractByIdService,
  updateContractService,
  cancelContractService,
  restoreContractService,
} from "../contract.service";

const mockedVendor = Vendor as any;
const mockedContract = Contract as any;
const mockedAsset = Asset as any;

const VENDOR_ID = "507f1f77bcf86cd799439001";
const ASSET_ID_1 = "507f1f77bcf86cd799439011";
const ASSET_ID_2 = "507f1f77bcf86cd799439012";
const CONTRACT_ID = "507f1f77bcf86cd799439022";

const makeContractDoc = (overrides: any = {}) => {
  const doc: any = {
    _id: CONTRACT_ID,
    vendor: VENDOR_ID,
    assets: [ASSET_ID_1],
    title: "Hợp đồng bảo trì máy X-quang",
    status: ContractStatus.ACTIVE,
    endDate: new Date(Date.now() + 60 * 86400000), // 60 ngày sau — chưa hết hạn
    save: jest.fn().mockResolvedValue(undefined),
    toObject() {
      const { save, populate, toObject, ...rest } = doc;
      return rest;
    },
    ...overrides,
  };
  doc.populate = jest.fn().mockResolvedValue(doc);
  return doc;
};

describe("createContractService (Roadmap B4)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("vendor không tồn tại/không active → 404, không chạm Asset/Contract", async () => {
    mockedVendor.findOne.mockResolvedValue(null);

    await expect(
      createContractService({ vendor: VENDOR_ID, assets: [ASSET_ID_1], title: "A", startDate: new Date(), endDate: new Date() }),
    ).rejects.toMatchObject({ status: 404 });
    expect(mockedAsset.countDocuments).not.toHaveBeenCalled();
  });

  it("có asset không tồn tại/không active trong danh sách → 400", async () => {
    mockedVendor.findOne.mockResolvedValue({ _id: VENDOR_ID });
    mockedAsset.countDocuments.mockResolvedValue(1); // chỉ 1/2 asset hợp lệ

    await expect(
      createContractService({
        vendor: VENDOR_ID,
        assets: [ASSET_ID_1, ASSET_ID_2],
        title: "A",
        startDate: new Date(),
        endDate: new Date(),
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("thành công — tạo với status ACTIVE, gắn isExpired=false", async () => {
    mockedVendor.findOne.mockResolvedValue({ _id: VENDOR_ID });
    mockedAsset.countDocuments.mockResolvedValue(1);
    const contractDoc = makeContractDoc();
    mockedContract.create.mockResolvedValue(contractDoc);

    const result = await createContractService(
      { vendor: VENDOR_ID, assets: [ASSET_ID_1], title: "Hợp đồng bảo trì máy X-quang", startDate: new Date(), endDate: new Date() },
      "user-1",
    );

    expect(mockedContract.create).toHaveBeenCalledWith(
      expect.objectContaining({ vendor: VENDOR_ID, status: ContractStatus.ACTIVE, createdBy: "user-1" }),
    );
    expect(result.isExpired).toBe(false);
  });
});

describe("getAllContractsService (Roadmap B4)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("expiringWithinDays → filter status ACTIVE + endDate $lte ngưỡng", async () => {
    const query: any = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    mockedContract.find.mockReturnValue(query);
    mockedContract.countDocuments.mockResolvedValue(0);

    await getAllContractsService({ expiringWithinDays: 30 });

    const filterArg = mockedContract.find.mock.calls[0][0];
    expect(filterArg.status).toBe(ContractStatus.ACTIVE);
    expect(filterArg.endDate.$lte).toBeInstanceOf(Date);
  });

  it("filter theo asset — match asset nằm trong mảng assets[]", async () => {
    const query: any = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    mockedContract.find.mockReturnValue(query);
    mockedContract.countDocuments.mockResolvedValue(0);

    await getAllContractsService({ asset: ASSET_ID_1 });

    expect(mockedContract.find).toHaveBeenCalledWith(expect.objectContaining({ assets: ASSET_ID_1 }));
  });

  // ⚠️ Regression (2026-09-16, user báo lọc "Còn hiệu lực" trả về CẢ hợp
  // đồng đã hết hạn — cả 2 đều status="active" trong DB, chỉ khác isExpired
  // tính thêm). 3 case dưới verify status="expired" (giá trị lọc, KHÔNG phải
  // enum thật) dịch đúng sang status=active + endDate $lt now, và
  // status="active" giờ LOẠI TRỪ hợp đồng đã hết hạn (thêm endDate $gte now).
  it('status="expired" → filter status ACTIVE + endDate $lt hiện tại (KHÔNG phải enum thật)', async () => {
    const query: any = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    mockedContract.find.mockReturnValue(query);
    mockedContract.countDocuments.mockResolvedValue(0);

    await getAllContractsService({ status: "expired" });

    const filterArg = mockedContract.find.mock.calls[0][0];
    expect(filterArg.status).toBe(ContractStatus.ACTIVE);
    expect(filterArg.endDate.$lt).toBeInstanceOf(Date);
  });

  it('status="active" → filter status ACTIVE + endDate $gte hiện tại (loại trừ đã hết hạn)', async () => {
    const query: any = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    mockedContract.find.mockReturnValue(query);
    mockedContract.countDocuments.mockResolvedValue(0);

    await getAllContractsService({ status: "active" });

    const filterArg = mockedContract.find.mock.calls[0][0];
    expect(filterArg.status).toBe(ContractStatus.ACTIVE);
    expect(filterArg.endDate.$gte).toBeInstanceOf(Date);
  });

  it('status="cancelled" → filter status CANCELLED, không thêm điều kiện endDate', async () => {
    const query: any = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockResolvedValue([]) };
    mockedContract.find.mockReturnValue(query);
    mockedContract.countDocuments.mockResolvedValue(0);

    await getAllContractsService({ status: "cancelled" });

    expect(mockedContract.find).toHaveBeenCalledWith({ status: ContractStatus.CANCELLED });
  });
});

describe("getContractsForAssetService (Roadmap B4)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("ID tài sản không hợp lệ → 400", async () => {
    await expect(getContractsForAssetService("bad-id")).rejects.toMatchObject({ status: 400 });
  });

  it("trả về mọi hợp đồng chứa asset này, gắn isExpired", async () => {
    const expiredContract = makeContractDoc({ endDate: new Date(Date.now() - 86400000) });
    const query: any = { populate: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue([expiredContract]) };
    mockedContract.find.mockReturnValue(query);

    const result = await getContractsForAssetService(ASSET_ID_1);

    expect(result[0].isExpired).toBe(true);
  });
});

describe("getContractByIdService (Roadmap B4)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("không tìm thấy → 404", async () => {
    mockedContract.findById.mockResolvedValue(null);
    await expect(getContractByIdService(CONTRACT_ID)).rejects.toMatchObject({ status: 404 });
  });
});

describe("updateContractService (Roadmap B4)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("hợp đồng đã cancelled → 400, không cho sửa", async () => {
    mockedContract.findById.mockResolvedValue(makeContractDoc({ status: ContractStatus.CANCELLED }));
    await expect(updateContractService(CONTRACT_ID, { title: "Sửa" })).rejects.toMatchObject({ status: 400 });
  });

  it("đổi endDate → reset expiryAlertSentAt về null", async () => {
    const contractDoc = makeContractDoc({ expiryAlertSentAt: new Date() });
    mockedContract.findById.mockResolvedValue(contractDoc);
    const newEndDate = new Date(Date.now() + 90 * 86400000);

    await updateContractService(CONTRACT_ID, { endDate: newEndDate }, "user-2");

    expect(contractDoc.endDate).toBe(newEndDate);
    expect(contractDoc.expiryAlertSentAt).toBeNull();
  });

  it("đổi assets → validate lại toàn bộ asset mới", async () => {
    const contractDoc = makeContractDoc();
    mockedContract.findById.mockResolvedValue(contractDoc);
    mockedAsset.countDocuments.mockResolvedValue(2);

    await updateContractService(CONTRACT_ID, { assets: [ASSET_ID_1, ASSET_ID_2] }, "user-2");

    expect(mockedAsset.countDocuments).toHaveBeenCalledWith({ _id: { $in: [ASSET_ID_1, ASSET_ID_2] }, isActive: true });
    expect(contractDoc.assets).toEqual([ASSET_ID_1, ASSET_ID_2]);
  });
});

describe("cancelContractService (Roadmap B4)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("set đúng status/cancelledAt/cancelledBy/cancelReason", async () => {
    const contractDoc = makeContractDoc();
    mockedContract.findById.mockResolvedValue(contractDoc);

    await cancelContractService(CONTRACT_ID, "user-3", "Chấm dứt hợp tác với NCC");

    expect(contractDoc.status).toBe(ContractStatus.CANCELLED);
    expect(contractDoc.cancelledBy).toBe("user-3");
    expect(contractDoc.cancelledAt).toBeInstanceOf(Date);
    expect(contractDoc.cancelReason).toBe("Chấm dứt hợp tác với NCC");
  });

  it("hợp đồng đã cancelled → 400, không cho huỷ lại", async () => {
    mockedContract.findById.mockResolvedValue(makeContractDoc({ status: ContractStatus.CANCELLED }));
    await expect(cancelContractService(CONTRACT_ID, "user-1")).rejects.toMatchObject({ status: 400 });
  });
});

describe("restoreContractService (DEV-058)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("set status về ACTIVE, xoá cancelledAt/cancelledBy/cancelReason", async () => {
    const contractDoc = makeContractDoc({
      status: ContractStatus.CANCELLED,
      cancelledAt: new Date(),
      cancelledBy: "user-3",
      cancelReason: "Chấm dứt hợp tác với NCC",
    });
    mockedContract.findById.mockResolvedValue(contractDoc);

    await restoreContractService(CONTRACT_ID, "user-4");

    expect(contractDoc.status).toBe(ContractStatus.ACTIVE);
    expect(contractDoc.cancelledAt).toBeUndefined();
    expect(contractDoc.cancelledBy).toBeUndefined();
    expect(contractDoc.cancelReason).toBeUndefined();
    expect(contractDoc.updatedBy).toBe("user-4");
  });

  it("hợp đồng đang active (chưa huỷ) → 400, không cho khôi phục", async () => {
    mockedContract.findById.mockResolvedValue(makeContractDoc({ status: ContractStatus.ACTIVE }));
    await expect(restoreContractService(CONTRACT_ID, "user-1")).rejects.toMatchObject({ status: 400 });
  });
});
