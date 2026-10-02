import { listProjectDocsService, getProjectDocService } from "../projectDocs.service";

/**
 * DEV-075 (2026-09-21) — KHÔNG mock filesystem, đọc thật `docs/01_PROJECT_OVERVIEW.md`
 * → `docs/13_FINAL_PROJECT_REPORT.md` trong repo (đúng mục đích: đọc trực
 * tiếp file, không copy nội dung sang chỗ khác).
 */
describe("projectDocs.service (DEV-075)", () => {
  it("liệt kê đúng 12 tài liệu 01-13 (bỏ 00_PROJECT_MEMORY.md và 06 không tồn tại)", () => {
    const docs = listProjectDocsService();

    expect(docs).toHaveLength(12);
    expect(docs.map((d) => d.id)).not.toContain("00_PROJECT_MEMORY");
    expect(docs.map((d) => d.id).some((id) => id.startsWith("06_"))).toBe(false);
    expect(docs[0].id).toBe("01_PROJECT_OVERVIEW");
    expect(docs[docs.length - 1].id).toBe("13_FINAL_PROJECT_REPORT");
  });

  it("title suy đúng từ dòng H1 đầu file, không hard-code", () => {
    const docs = listProjectDocsService();
    const overview = docs.find((d) => d.id === "01_PROJECT_OVERVIEW");

    expect(overview?.title).toBe("01 — PROJECT OVERVIEW");
  });

  it("getProjectDocService trả đúng nội dung + URL GitHub thật cho id hợp lệ", () => {
    const doc = getProjectDocService("13_FINAL_PROJECT_REPORT");

    expect(doc?.path).toBe("docs/13_FINAL_PROJECT_REPORT.md");
    expect(doc?.url).toBe("https://github.com/Cuongdo12345/document-papper/blob/main/docs/13_FINAL_PROJECT_REPORT.md");
    expect(doc?.content).toContain("FINAL PROJECT REPORT");
  });

  it("getProjectDocService trả undefined cho id không tồn tại trong whitelist (kể cả đúng format regex)", () => {
    expect(getProjectDocService("99_NOT_REAL")).toBeUndefined();
    expect(getProjectDocService("00_PROJECT_MEMORY")).toBeUndefined();
  });

  it("chặn path traversal — id chứa path traversal/ký tự lạ không đọc được file nào ngoài docs/", () => {
    expect(getProjectDocService("../../../../etc/passwd")).toBeUndefined();
    expect(getProjectDocService("01_PROJECT_OVERVIEW/../../../package")).toBeUndefined();
    expect(getProjectDocService("01_project_overview")).toBeUndefined(); // sai case, không khớp file thật
  });
});
