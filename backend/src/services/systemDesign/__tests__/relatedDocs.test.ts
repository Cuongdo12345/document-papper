import { getSystemDesignService } from "../systemDesign.service";

/**
 * DEV-074 (2026-09-21) — verify `description`/`features`/`relatedDocs` gắn
 * đúng vào response `getSystemDesignService()`. KHÔNG mock file system —
 * đọc trực tiếp `docs/development/tasks/*.md`/`docs/frontend/tasks/*.md`
 * thật trong repo (đúng mục đích: không hard-code danh sách quan hệ
 * module↔task, xác nhận bằng file thật đang có).
 */
describe("systemDesign.service — module description/relatedDocs (DEV-074)", () => {
  it("module 'vendors' có description + features từ moduleDescriptions.ts", () => {
    const result = getSystemDesignService();
    const vendorsModule = result.modules.find((m) => m.name === "vendors");

    expect(vendorsModule?.description).toBeTruthy();
    expect(vendorsModule?.features?.length).toBeGreaterThan(0);
  });

  it("module 'vendors' tìm đúng DEV-057.md (file thật có nhắc models/vendors/ và features/vendors/)", () => {
    const result = getSystemDesignService();
    const vendorsModule = result.modules.find((m) => m.name === "vendors");

    const paths = vendorsModule?.relatedDocs.map((d) => d.path) ?? [];
    expect(paths).toContain("docs/development/tasks/DEV-057.md");
  });

  it("relatedDocs.url là URL GitHub blob thật, khớp path", () => {
    const result = getSystemDesignService();
    const vendorsModule = result.modules.find((m) => m.name === "vendors");
    const dev057 = vendorsModule?.relatedDocs.find((d) => d.path === "docs/development/tasks/DEV-057.md");

    expect(dev057?.url).toBe("https://github.com/Cuongdo12345/document-papper/blob/main/docs/development/tasks/DEV-057.md");
  });

  it("mọi module đều có relatedDocs là mảng (kể cả rỗng), không undefined", () => {
    const result = getSystemDesignService();
    for (const module of result.modules) {
      expect(Array.isArray(module.relatedDocs)).toBe(true);
    }
  });
});

/**
 * BR-21 (DEV-107, 2026-09-30) — kết quả quét được cache 60 giây, không đọc lại
 * ~150 file mỗi request. Đếm số lần đọc file `.md` thật bằng spy trên `fs.readFileSync`.
 */
import fs from "fs";
import path from "path";
import { buildRelatedDocsMap, RELATED_DOCS_CACHE_TTL_MS } from "../relatedDocs";
import { clearAllMemoryCache } from "../../../shared/cache/memoryCache";

describe("buildRelatedDocsMap — cache (BR-21/DEV-107)", () => {
  const modules = ["vendors", "assets", "auth"];
  let readSpy: jest.SpyInstance;
  // Chuẩn hoá dấu phân cách (Windows dùng "\") rồi so chuỗi — không dùng regex để khỏi phụ thuộc escape.
  const isTaskFile = (p: unknown) => {
    const posix = String(p).split(path.sep).join("/");
    return posix.endsWith(".md") && (posix.includes("/docs/development/tasks/") || posix.includes("/docs/frontend/tasks/"));
  };
  const taskReads = () => readSpy.mock.calls.filter((c) => isTaskFile(c[0])).length;

  beforeEach(() => {
    clearAllMemoryCache();
    jest.useRealTimers();
    readSpy = jest.spyOn(fs, "readFileSync");
  });
  afterEach(() => {
    readSpy.mockRestore();
    jest.useRealTimers();
  });

  it("TTL là 60 giây", () => {
    expect(RELATED_DOCS_CACHE_TTL_MS).toBe(60_000);
  });

  it("lần đầu đọc toàn bộ file task; các lần sau trong TTL KHÔNG đọc file nào", () => {
    buildRelatedDocsMap(modules);
    const first = taskReads();
    expect(first).toBeGreaterThan(100);

    buildRelatedDocsMap(modules);
    buildRelatedDocsMap(modules);
    expect(taskReads()).toBe(first);
  });

  it("kết quả từ cache GIỐNG HỆT kết quả quét mới (không mất/đổi dữ liệu)", () => {
    const fresh = buildRelatedDocsMap(modules);
    const cached = buildRelatedDocsMap(modules);

    expect([...cached.entries()]).toEqual([...fresh.entries()]);
    expect(cached.get("vendors")!.map((d) => d.path)).toContain("docs/development/tasks/DEV-057.md");
  });

  it("hết TTL thì quét lại (thấy file mới), còn 1ms trước hạn thì vẫn dùng cache", () => {
    jest.useFakeTimers().setSystemTime(new Date("2026-01-01T00:00:00Z"));
    buildRelatedDocsMap(modules);
    const first = taskReads();

    jest.setSystemTime(new Date("2026-01-01T00:00:59.999Z"));
    buildRelatedDocsMap(modules);
    expect(taskReads()).toBe(first);

    jest.setSystemTime(new Date("2026-01-01T00:01:00.000Z"));
    buildRelatedDocsMap(modules);
    expect(taskReads()).toBe(first * 2);
  });

  it("danh sách module khác nhau được cache RIÊNG; thứ tự module không làm hụt cache", () => {
    const a = buildRelatedDocsMap(["vendors", "assets"]);
    const afterA = taskReads();
    const b = buildRelatedDocsMap(["assets", "vendors"]); // cùng tập, khác thứ tự
    expect(taskReads()).toBe(afterA);
    expect(b.get("vendors")).toEqual(a.get("vendors"));

    const c = buildRelatedDocsMap(["auth"]); // tập khác -> quét lại
    expect(taskReads()).toBeGreaterThan(afterA);
    expect(c.has("vendors")).toBe(false);
  });

  it("sửa Map trả về KHÔNG làm hỏng cache của lần gọi sau", () => {
    const first = buildRelatedDocsMap(modules);
    first.delete("vendors");
    first.set("bậy", []);

    const second = buildRelatedDocsMap(modules);
    expect(second.has("vendors")).toBe(true);
    expect(second.has("bậy")).toBe(false);
  });
});
