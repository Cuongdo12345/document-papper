import mongoose, { ClientSession } from "mongoose";

/**
 * withTransaction — helper bọc 1 chuỗi thao tác ghi NHIỀU collection trong
 * 1 MongoDB multi-document transaction, dùng `session.withTransaction()`.
 *
 * YÊU CẦU TIÊN QUYẾT: `MONGO_URI` phải trỏ tới replica set (hoặc MongoDB
 * Atlas — luôn là replica set sẵn), dạng:
 *   mongodb://host1:27017,host2:27017,host3:27017/dbname?replicaSet=rs0
 * Nếu vẫn là standalone thường, gọi hàm này sẽ lỗi:
 *   MongoServerError: Transaction numbers are only allowed on a replica
 *   set member or mongos
 *
 * Cách dùng — MỌI write bên trong callback đều PHẢI truyền `{ session }`,
 * nếu không write đó sẽ chạy NGOÀI transaction (không rollback được):
 *
 *   const result = await withTransaction(async (session) => {
 *     const doc = await Model.create({ ... }, { session });
 *     await OtherModel.findByIdAndUpdate(id, { ... }, { session });
 *     return doc;
 *   });
 *
 * Lưu ý về `Model.create`:
 *   - Truyền 1 object (không phải mảng) + `{ session }` làm tham số thứ 2
 *     vẫn hoạt động đúng và trả về 1 document (không phải mảng) — dùng
 *     cách này khi chỉ tạo 1 bản ghi, giữ code gọn như bản gốc.
 *   - Chỉ cần dùng dạng mảng `Model.create([{...}], { session })` khi cần
 *     tạo nhiều bản ghi cùng lúc trong 1 lần gọi.
 *
 * `session.withTransaction()` tự động retry theo policy của MongoDB driver
 * khi gặp lỗi transient (VD: write conflict), và tự commit/abort — không
 * cần gọi `session.commitTransaction()`/`abortTransaction()` thủ công.
 */
export const withTransaction = async <T>(
  fn: (session: ClientSession) => Promise<T>,
): Promise<T> => {
  const session = await mongoose.startSession();

  try {
    let result: T | undefined;

    await session.withTransaction(async () => {
      result = await fn(session);
    });

    // Nếu tới đây mà `result` vẫn undefined, nghĩa là `fn` không set gì
    // (hoặc transaction bị abort mà không throw) — về lý thuyết không nên
    // xảy ra vì `withTransaction` sẽ throw nếu abort, nhưng ép kiểu tường
    // minh ở đây để TypeScript không phàn nàn `T | undefined` khi hàm khai
    // báo trả về `T`.
    return result as T;
  } finally {
    // Luôn đóng session dù transaction thành công, bị lỗi, hay throw giữa
    // chừng — tránh rò rỉ session (mỗi session giữ 1 kết nối/tài nguyên
    // phía MongoDB server).
    await session.endSession();
  }
};