import { getUserEffectivePermissions } from "../permission.service";
import {
  getCachedPermissions,
  clearPermissionCache,
  clearAllPermissionCache,
} from "../permission.cache";

jest.mock("../permission.service");

const mockedGetPermissions = jest.mocked(getUserEffectivePermissions);

describe("permission.cache", () => {
  beforeEach(() => {
    // Cache là module-level singleton (Map dùng chung toàn app) — phải dọn
    // sạch giữa các test bằng clearAllPermissionCache(), không phải
    // jest.clearMocks (cái đó chỉ reset mock call history, KHÔNG xoá Map).
    clearAllPermissionCache();
    mockedGetPermissions.mockReset();
  });

  it("cache MISS lần đầu: gọi getUserEffectivePermissions từ DB", async () => {
    mockedGetPermissions.mockResolvedValue(["DOCUMENT_READ"]);
    const result = await getCachedPermissions("user-1");
    expect(result).toEqual(["DOCUMENT_READ"]);
    expect(mockedGetPermissions).toHaveBeenCalledTimes(1);
  });

  it("cache HIT lần gọi thứ 2 trong TTL: KHÔNG gọi lại DB", async () => {
    mockedGetPermissions.mockResolvedValue(["DOCUMENT_READ"]);
    await getCachedPermissions("user-1");
    const result = await getCachedPermissions("user-1");
    expect(result).toEqual(["DOCUMENT_READ"]);
    // Chỉ gọi DB đúng 1 lần dù gọi getCachedPermissions 2 lần — đây chính
    // là mục đích tồn tại của cache này.
    expect(mockedGetPermissions).toHaveBeenCalledTimes(1);
  });

  it("2 user khác nhau có cache riêng biệt, không lẫn permission của nhau", async () => {
    mockedGetPermissions
      .mockResolvedValueOnce(["DOCUMENT_READ"])
      .mockResolvedValueOnce(["ASSET_CREATE"]);
    const p1 = await getCachedPermissions("user-1");
    const p2 = await getCachedPermissions("user-2");
    expect(p1).toEqual(["DOCUMENT_READ"]);
    expect(p2).toEqual(["ASSET_CREATE"]);
    expect(mockedGetPermissions).toHaveBeenCalledTimes(2);
  });

  it("clearPermissionCache(userId): xoá cache đúng user đó, lần gọi kế tiếp phải query lại DB", async () => {
    mockedGetPermissions
      .mockResolvedValueOnce(["DOCUMENT_READ"])
      .mockResolvedValueOnce(["DOCUMENT_READ", "DOCUMENT_UPDATE"]);
    await getCachedPermissions("user-1");
    clearPermissionCache("user-1");
    const result = await getCachedPermissions("user-1");
    expect(result).toEqual(["DOCUMENT_READ", "DOCUMENT_UPDATE"]);
    expect(mockedGetPermissions).toHaveBeenCalledTimes(2);
  });

  it("clearPermissionCache(userId) KHÔNG ảnh hưởng cache của user khác", async () => {
    mockedGetPermissions.mockResolvedValue(["DOCUMENT_READ"]);
    await getCachedPermissions("user-1");
    await getCachedPermissions("user-2");
    clearPermissionCache("user-1");
    mockedGetPermissions.mockClear();
    await getCachedPermissions("user-2");
    // user-2 vẫn còn cache (không bị xoá lây), nên KHÔNG gọi lại DB.
    expect(mockedGetPermissions).not.toHaveBeenCalled();
  });

  it("clearAllPermissionCache(): xoá sạch cache mọi user", async () => {
    mockedGetPermissions.mockResolvedValue(["DOCUMENT_READ"]);
    await getCachedPermissions("user-1");
    await getCachedPermissions("user-2");
    clearAllPermissionCache();
    mockedGetPermissions.mockClear();
    await getCachedPermissions("user-1");
    await getCachedPermissions("user-2");
    // Cả 2 user đều phải query lại DB sau khi clear all.
    expect(mockedGetPermissions).toHaveBeenCalledTimes(2);
  });

  it("cache HẾT HẠN sau TTL (5 phút): phải query lại DB", async () => {
    jest.useFakeTimers();
    mockedGetPermissions
      .mockResolvedValueOnce(["DOCUMENT_READ"])
      .mockResolvedValueOnce(["DOCUMENT_READ", "DOCUMENT_DELETE"]);
    await getCachedPermissions("user-1");
    // Tua thời gian vượt quá TTL 5 phút (5*60*1000ms) đã hard-code trong
    // permission.cache.ts.
    jest.advanceTimersByTime(5 * 60 * 1000 + 1000);
    const result = await getCachedPermissions("user-1");
    expect(result).toEqual(["DOCUMENT_READ", "DOCUMENT_DELETE"]);
    expect(mockedGetPermissions).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
