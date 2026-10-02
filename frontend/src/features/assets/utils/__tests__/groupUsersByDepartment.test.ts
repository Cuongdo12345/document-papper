import { describe, expect, it } from "vitest";
import { groupUsersByDepartment } from "../groupUsersByDepartment";
import type { UserListItem } from "@/types/user.types";

const user = (id: string, fullName: string, deptId?: string): UserListItem => ({
  _id: id,
  username: id,
  fullName,
  role: "r",
  isActive: true,
  department: deptId ? { _id: deptId, code: deptId, name: `Khoa ${deptId}` } : null,
});

const users = [user("1", "Trần Văn B", "A"), user("2", "Đỗ Thị C", "B"), user("3", "An Văn A", "A"), user("4", "Không Khoa")];

describe("groupUsersByDepartment", () => {
  it("tách đúng người thuộc khoa đã chọn và người ở khoa khác (kể cả chưa có khoa), sắp theo tên", () => {
    const { inDepartment, others } = groupUsersByDepartment(users, "A");
    expect(inDepartment.map((u) => u._id)).toEqual(["3", "1"]);
    expect(others.map((u) => u._id)).toEqual(["2", "4"]);
  });

  it("khoa chưa có ai -> nhóm khoa rỗng, mọi người vào nhóm khác", () => {
    const { inDepartment, others } = groupUsersByDepartment(users, "Z");
    expect(inDepartment).toEqual([]);
    expect(others).toHaveLength(4);
  });

  it("chưa chọn khoa -> tất cả vào nhóm khác", () => {
    expect(groupUsersByDepartment(users, undefined).inDepartment).toEqual([]);
  });
});
