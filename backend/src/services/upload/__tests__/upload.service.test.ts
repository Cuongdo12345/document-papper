/**
 * MỚI (2026-09-12, theo yêu cầu user — thêm tìm kiếm/lọc cho `GET /api/upload`).
 * Trước đây domain Upload KHÔNG có bất kỳ test nào (`find . -iname
 * "*.test.ts"` khớp "upload" → 0 kết quả) — filter-building trước đó nằm
 * thẳng trong controller (`upload.controller.ts`), nay rút ra
 * `upload.service.ts` (`buildFilesFilter`/`getFilesService`) NHÂN TIỆN lúc
 * thêm search/filter, đúng flow chuẩn Controller → Service → Model
 * (CLAUDE.md Mục 14) và để test được thuần logic không cần mock Mongoose
 * cho phần quan trọng nhất (`buildFilesFilter`) — cùng tinh thần
 * `documents.scope.test.ts` (`applyDepartmentFilter`).
 */
jest.mock("../../../models/uploadFiles/upload.model", () => ({
  Upload: {
    find: jest.fn(),
    countDocuments: jest.fn(),
    insertMany: jest.fn(),
  },
}));

import { Upload } from "../../../models/uploadFiles/upload.model";
import { buildFilesFilter, getFilesService } from "../upload.service";

const mockedUpload = Upload as unknown as {
  find: jest.Mock;
  countDocuments: jest.Mock;
};

describe("upload.service — buildFilesFilter", () => {
  it("non-admin: LUÔN ép uploadedBy = chính họ, BỎ QUA uploadedBy client truyền trong query (đóng IDOR IMP-009, không để field lọc mới mở lại lỗ hổng)", () => {
    const filter = buildFilesFilter({ uploadedBy: "nguoi-khac" }, { isAdmin: false, userId: "toi" });
    expect(filter).toEqual({ isDeleted: false, uploadedBy: "toi" });
  });

  it("ADMIN không truyền uploadedBy → không lọc theo người tải lên (xem tất cả)", () => {
    const filter = buildFilesFilter({}, { isAdmin: true, userId: "admin-1" });
    expect(filter).toEqual({ isDeleted: false });
  });

  it("ADMIN có truyền uploadedBy → lọc thêm đúng theo người đó (tính năng lọc CHỈ có ý nghĩa với ADMIN)", () => {
    const filter = buildFilesFilter({ uploadedBy: "user-x" }, { isAdmin: true, userId: "admin-1" });
    expect(filter.uploadedBy).toBe("user-x");
  });

  it("keyword → $regex không phân biệt hoa/thường trên fileName, escape ký tự đặc biệt (RV06-02, cùng pattern escapeRegex đã dùng ở Document/Asset)", () => {
    const filter = buildFilesFilter({ keyword: "báo cáo (1).xlsx" }, { isAdmin: true, userId: "a" });
    expect(filter.fileName.$options).toBe("i");
    expect(() => new RegExp(filter.fileName.$regex)).not.toThrow();
    // ký tự "(" ")" "." phải được escape thành literal, không còn ý nghĩa regex
    expect(filter.fileName.$regex).toBe("báo cáo \\(1\\)\\.xlsx");
  });

  it("mimeType → khớp CHÍNH XÁC (không phải regex)", () => {
    const filter = buildFilesFilter({ mimeType: "application/pdf" }, { isAdmin: true, userId: "a" });
    expect(filter.mimeType).toBe("application/pdf");
  });

  it("fromDate/toDate → khoảng createdAt $gte/$lte", () => {
    const filter = buildFilesFilter(
      { fromDate: "2026-01-01", toDate: "2026-01-31" },
      { isAdmin: true, userId: "a" },
    );
    expect(filter.createdAt.$gte).toEqual(new Date("2026-01-01"));
    expect(filter.createdAt.$lte).toEqual(new Date("2026-01-31"));
  });

  it("chỉ truyền fromDate (không toDate) → chỉ có $gte", () => {
    const filter = buildFilesFilter({ fromDate: "2026-01-01" }, { isAdmin: true, userId: "a" });
    expect(filter.createdAt).toEqual({ $gte: new Date("2026-01-01") });
  });

  it("không truyền field lọc nào (non-admin) → filter chỉ còn isDeleted + uploadedBy ép buộc", () => {
    const filter = buildFilesFilter({}, { isAdmin: false, userId: "me" });
    expect(filter).toEqual({ isDeleted: false, uploadedBy: "me" });
  });
});

describe("upload.service — getFilesService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("gọi Upload.find với đúng filter + sort/skip/limit theo tham số, Upload.countDocuments với CÙNG filter", async () => {
    const sortMock = jest.fn().mockReturnThis();
    const skipMock = jest.fn().mockReturnThis();
    const limitMock = jest.fn().mockResolvedValue([{ _id: "f1" }]);
    mockedUpload.find.mockReturnValue({ sort: sortMock, skip: skipMock, limit: limitMock });
    mockedUpload.countDocuments.mockResolvedValue(1);

    const result = await getFilesService(
      { page: 2, limit: 10, sortBy: "fileName", order: "asc", keyword: "abc" },
      { isAdmin: true, userId: "admin-1" },
    );

    expect(mockedUpload.find).toHaveBeenCalledWith(
      expect.objectContaining({ isDeleted: false, fileName: expect.any(Object) }),
    );
    expect(sortMock).toHaveBeenCalledWith({ fileName: 1 });
    expect(skipMock).toHaveBeenCalledWith(10); // (page 2 - 1) * limit 10
    expect(limitMock).toHaveBeenCalledWith(10);
    expect(mockedUpload.countDocuments).toHaveBeenCalledWith(mockedUpload.find.mock.calls[0][0]);
    expect(result).toEqual({ items: [{ _id: "f1" }], total: 1 });
  });

  it("order=desc mặc định → sort -1", async () => {
    const sortMock = jest.fn().mockReturnThis();
    const skipMock = jest.fn().mockReturnThis();
    const limitMock = jest.fn().mockResolvedValue([]);
    mockedUpload.find.mockReturnValue({ sort: sortMock, skip: skipMock, limit: limitMock });
    mockedUpload.countDocuments.mockResolvedValue(0);

    await getFilesService(
      { page: 1, limit: 10, sortBy: "createdAt", order: "desc" },
      { isAdmin: false, userId: "user-1" },
    );

    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(skipMock).toHaveBeenCalledWith(0);
  });
});
