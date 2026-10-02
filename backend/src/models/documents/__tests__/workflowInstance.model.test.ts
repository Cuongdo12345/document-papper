/**
 * BR-07 (DEV-095) — chặn regression: index `{documentId:1, createdAt:-1}`
 * phục vụ mọi truy vấn "workflow của 1 tài liệu" (mở chi tiết tài liệu,
 * gửi duyệt, xem workflow theo tài liệu). Thiếu index này là COLLSCAN. Chỉ
 * đọc định nghĩa schema, không cần DB.
 */
import WorkflowInstance from "../workflowInstance.model";

describe("WorkflowInstance schema indexes (BR-07)", () => {
  const keys = () => WorkflowInstance.schema.indexes().map(([fields]) => fields);

  it("có index { documentId: 1, createdAt: -1 }, không unique", () => {
    const entry = WorkflowInstance.schema.indexes().find(
      ([fields]) => JSON.stringify(fields) === JSON.stringify({ documentId: 1, createdAt: -1 }),
    );
    expect(entry).toBeDefined();
    expect(entry![1]?.unique).not.toBe(true); // 1 tài liệu có nhiều workflow khi gửi duyệt lại
  });

  it("giữ nguyên 2 index cũ", () => {
    expect(keys()).toEqual(
      expect.arrayContaining([
        { status: 1, createdAt: 1 },
        { "steps.role": 1, createdAt: -1 },
      ]),
    );
  });
});
