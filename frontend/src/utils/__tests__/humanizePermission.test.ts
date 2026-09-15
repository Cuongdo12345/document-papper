import { describe, expect, it } from "vitest";
import { humanizePermission } from "@/utils/humanizePermission";

describe("humanizePermission", () => {
  it("formats a simple 2-word permission", () => {
    expect(humanizePermission("USER_CREATE")).toBe("User create");
  });

  it("formats a 3-word permission", () => {
    expect(humanizePermission("DOCUMENT_EXCEL_EXPORT")).toBe("Document excel export");
  });

  it("formats a single-word permission (no underscore)", () => {
    expect(humanizePermission("SYSTEM_ADMIN")).toBe("System admin");
  });

  it("handles a permission with no underscore at all", () => {
    expect(humanizePermission("DASHBOARD")).toBe("Dashboard");
  });

  it("returns the original string unchanged for an empty input", () => {
    expect(humanizePermission("")).toBe("");
  });
});
