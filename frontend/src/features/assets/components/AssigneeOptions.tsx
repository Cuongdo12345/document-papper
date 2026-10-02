import { groupUsersByDepartment } from "@/features/assets/utils/groupUsersByDepartment";
import type { UserListItem } from "@/types/user.types";

interface AssigneeOptionsProps {
  users: UserListItem[];
  /** Khoa/phòng đang chọn — người thuộc khoa này được đưa lên nhóm đầu. */
  departmentId: string | undefined;
}

/**
 * [FE-38] Các `<optgroup>` cho ô chọn người được giao tài sản (Cấp phát + Luân
 * chuyển). Trước đây chỉ liệt kê user CÙNG khoa → khoa chưa có tài khoản nào
 * (đa số khoa trên DB thật) thì ô chọn trống trơn, không lý do. Backend KHÔNG bắt
 * người nhận phải cùng khoa (`assignAssetService`/`transferAssetService` chỉ
 * kiểm tra user tồn tại + chứng chỉ vận hành DEV-077) — nên vẫn cho chọn người
 * khoa khác, kèm tên khoa của họ để không nhầm (user chốt hướng này).
 */
export function AssigneeOptions({ users, departmentId }: AssigneeOptionsProps) {
  const { inDepartment, others } = groupUsersByDepartment(users, departmentId);

  return (
    <>
      {departmentId && (
        <optgroup label="Thuộc khoa/phòng đã chọn">
          {inDepartment.length === 0 ? (
            <option disabled value="__none__">
              (Khoa/phòng này chưa có người dùng nào)
            </option>
          ) : (
            inDepartment.map((u) => (
              <option key={u._id} value={u._id}>
                {u.fullName} ({u.username})
              </option>
            ))
          )}
        </optgroup>
      )}
      {others.length > 0 && (
        <optgroup label="Khoa/phòng khác">
          {others.map((u) => (
            <option key={u._id} value={u._id}>
              {u.fullName} ({u.username}) — {u.department?.name ?? "Chưa có khoa/phòng"}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );
}
