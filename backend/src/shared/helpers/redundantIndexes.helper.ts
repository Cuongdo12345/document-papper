import type { Db } from "mongodb";

/**
 * BR-19 (DEV-109) — danh sách index THỪA đã bị bỏ khỏi schema nhưng còn nằm lại
 * trong DB (Mongoose `autoIndex` chỉ TẠO index còn thiếu, không bao giờ xoá).
 *
 * Mỗi mục có `coveredBy`: tên index còn lại phục vụ được mọi truy vấn của index
 * bị xoá (index bị xoá là tiền tố / bản trùng của nó). Helper CHỈ xoá khi index
 * `coveredBy` thực sự đang tồn tại — không bao giờ để collection mất hết index
 * phục vụ một kiểu truy vấn.
 */
export interface RedundantIndex {
  collection: string;
  name: string;
  coveredBy: string;
}

export const REDUNDANT_INDEXES: RedundantIndex[] = [
  { collection: "useraudits", name: "user_1", coveredBy: "user_1_createdAt_-1" },
  { collection: "useraudits", name: "performedBy_1", coveredBy: "performedBy_1_createdAt_-1" },
  { collection: "useraudits", name: "action_1", coveredBy: "action_1_createdAt_-1" },
  // Index kép 4 field cũ (đã bị thay bằng 3 compound 2 field, xem userAudit.model.ts).
  { collection: "useraudits", name: "action_1_performedBy_1_user_1_createdAt_-1", coveredBy: "action_1_createdAt_-1" },
  // Trùng với index TTL `createdAt_1` (RV11-04).
  { collection: "apiperformances", name: "createdAt_-1", coveredBy: "createdAt_1" },
  { collection: "notifications", name: "recipient_1", coveredBy: "recipient_1_createdAt_-1" },
  { collection: "documents", name: "referenceTo_1", coveredBy: "referenceTo_1_category_1_isActive_1_createdAt_1" },
];

export type RedundantIndexStatus =
  /** Đã xoá (chế độ apply). */
  | "dropped"
  /** Sẽ xoá (chế độ xem trước). */
  | "would-drop"
  /** Không còn index này (hoặc collection chưa tồn tại) — không làm gì. */
  | "absent"
  /** Index `coveredBy` không tồn tại nên GIỮ LẠI index này, không xoá. */
  | "kept-no-cover";

export interface RedundantIndexResult extends RedundantIndex {
  status: RedundantIndexStatus;
}

const listIndexNames = async (db: Db, collection: string): Promise<string[]> => {
  try {
    return (await db.collection(collection).indexes()).map((i) => i.name as string);
  } catch (err: any) {
    // Collection chưa được tạo (chưa có dữ liệu) -> NamespaceNotFound (code 26).
    if (err?.code === 26 || err?.codeName === "NamespaceNotFound") return [];
    throw err;
  }
};

/**
 * Xoá các index thừa theo TÊN (không dùng `syncIndexes()` để không lỡ xoá index
 * nào khác). `apply=false` chỉ báo cáo. Chạy lại nhiều lần vô hại.
 */
export const dropRedundantIndexes = async (
  db: Db,
  { apply }: { apply: boolean },
  list: RedundantIndex[] = REDUNDANT_INDEXES,
): Promise<RedundantIndexResult[]> => {
  const results: RedundantIndexResult[] = [];

  for (const item of list) {
    const names = await listIndexNames(db, item.collection);

    if (!names.includes(item.name)) {
      results.push({ ...item, status: "absent" });
    } else if (!names.includes(item.coveredBy)) {
      results.push({ ...item, status: "kept-no-cover" });
    } else if (!apply) {
      results.push({ ...item, status: "would-drop" });
    } else {
      await db.collection(item.collection).dropIndex(item.name);
      results.push({ ...item, status: "dropped" });
    }
  }

  return results;
};
