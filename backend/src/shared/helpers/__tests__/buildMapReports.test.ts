/**
 * BR-17 (DEV-105) — `buildMapFromReports` chỉ nạp biên bản của đúng các đề xuất
 * được truyền vào, không còn tải toàn bộ biên bản của hệ thống.
 */
import { Types } from "mongoose";

jest.mock("../../../models/documents/document.model", () => ({
  Document: { find: jest.fn() },
  DocumentSubType: { CONFIRM_STATUS: "CONFIRM_STATUS", CHECK_DAMAGE: "CHECK_DAMAGE" },
}));

import { Document } from "../../../models/documents/document.model";
import { buildMapFromReports } from "../buildMapReports";

const mockedFind = (Document as any).find as jest.Mock;
const mockFindResult = (rows: any[]) =>
  mockedFind.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(rows) }) });

const id = () => new Types.ObjectId();

describe("buildMapFromReports (BR-17)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("không có đề xuất nào -> map rỗng, KHÔNG truy vấn DB", async () => {
    const map = await buildMapFromReports("CHECK_DAMAGE" as any, []);

    expect(map.size).toBe(0);
    expect(mockedFind).not.toHaveBeenCalled();
  });

  it("truy vấn có giới hạn theo referenceTo $in đúng danh sách đề xuất (không quét toàn bộ biên bản)", async () => {
    const [a, b] = [id(), id()];
    mockFindResult([]);

    await buildMapFromReports("CHECK_DAMAGE" as any, [a, b]);

    expect(mockedFind).toHaveBeenCalledTimes(1);
    expect(mockedFind).toHaveBeenCalledWith({
      subType: "CHECK_DAMAGE",
      isActive: true,
      referenceTo: { $in: [a, b] },
    });
  });

  it("key là referenceTo[0]; tính text/total như cũ", async () => {
    const proposal = id();
    mockFindResult([
      { referenceTo: [proposal], meta: { items: [{ description: "Gạt", quantity: 2, unitPrice: 1000 }] } },
    ]);

    const map = await buildMapFromReports("CHECK_DAMAGE" as any, [proposal]);

    expect(map.get(proposal.toString())).toEqual({ text: "Gạt | SL:2 | 1000", total: 2000 });
  });

  it("bỏ qua biên bản có referenceTo[0] KHÔNG thuộc danh sách (chỉ khớp vì phần tử sau) và biên bản không có referenceTo", async () => {
    const wanted = id();
    const other = id();
    mockFindResult([
      { referenceTo: [other, wanted], meta: { items: [{ description: "X", quantity: 1, unitPrice: 1 }] } },
      { referenceTo: [], meta: { items: [] } },
      { meta: { items: [] } },
    ]);

    const map = await buildMapFromReports("CHECK_DAMAGE" as any, [wanted]);

    expect(map.size).toBe(0);
  });
});
