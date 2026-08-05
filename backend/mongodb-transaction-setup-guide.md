<!-- #Ví dụ khi dùng policy trong tần middare
router.get(
  "/documents/:id",
  authorizePermission("DOCUMENT_VIEW", {
    enablePolicies: true,
    resource: "DOCUMENT",
    action: "VIEW",
  }),
  controller.getDocument
); -->

# MongoDB Transactions — Setup & Troubleshooting cho DocPapper (Windows local dev)

## 1. Transaction là gì

Transaction cho phép gộp nhiều thao tác đọc/ghi (nhiều document, nhiều collection) thành **1 đơn vị nguyên tử (atomic)** — hoặc tất cả cùng thành công (commit), hoặc tất cả cùng rollback. Đảm bảo tính chất ACID giống transaction SQL.

### Vì sao DocPapper cần transaction

| Luồng | Các write liên quan | Rủi ro nếu không có transaction |
|---|---|---|
| **Import Excel** (`importDocumentsExcel`) | Tạo nhiều `Document` + ghi `ImportHistory` | Lỗi giữa chừng → document đã lưu một phần nhưng audit trail không khớp |
| **Asset transfer/assign** | Đổi `Asset.assignedTo` + ghi `AssetAssignmentHistory` | Asset đổi chủ nhưng lịch sử không ghi lại, dữ liệu audit sai |
| **Workflow approve** (`approveStep`) | Update `WorkflowInstance` + `Document.workflowStatus` + `Asset.status` | Document báo "approved" nhưng Asset vẫn "AVAILABLE" — data lệch giữa các collection |
| **RBAC** | Gán permission cho role, update cache | Cache và dữ liệu permission thật lệch nhau |

Không có transaction, lỗi giữa chừng không làm crash app mà gây **sai lệch dữ liệu âm thầm** — loại lỗi khó phát hiện nhất, chỉ lộ ra khi người dùng report bất thường.

## 2. Điều kiện bắt buộc: Replica Set

**Transaction KHÔNG chạy được trên MongoDB standalone** (1 node đơn, không init replica set). Bắt buộc phải là:
- Replica Set (kể cả chỉ 1 node — "single-node replica set" đủ cho dev)
- Hoặc Sharded Cluster

Nếu gọi `session.startTransaction()` trên standalone, sẽ gặp lỗi:
```
MongoServerError: Transaction numbers are only allowed on a replica set member or mongos
```

Trên production, nếu dùng **MongoDB Atlas** thì mặc định đã là replica set — không cần cấu hình gì thêm.

## 3. Setup Replica Set trên Windows (không dùng Docker)

### 3.1. Xác định cách MongoDB đang chạy

```powershell
Get-Service | Where-Object {$_.Name -like "*mongo*"}
```

Nếu ra kết quả (ví dụ tên service `CuongMongoDB`) → MongoDB đang chạy dạng **Windows Service**, thao tác theo phần dưới.

### 3.2. Backup file config trước khi sửa (quan trọng)

```powershell
Copy-Item "C:\Program Files\MongoDB\Server\<version>\bin\mongod.cfg" `
          "C:\Program Files\MongoDB\Server\<version>\bin\mongod.cfg.backup"
```

Nếu sau này lỗi, revert nhanh bằng:
```powershell
Copy-Item "C:\Program Files\MongoDB\Server\<version>\bin\mongod.cfg.backup" `
          "C:\Program Files\MongoDB\Server\<version>\bin\mongod.cfg" -Force
Restart-Service <TênService>
```

### 3.3. Sửa file config — bật `replication`

Mở **Notepad với quyền Administrator** (bắt buộc, vì file nằm trong `Program Files`):

1. Start → gõ `notepad` → **chuột phải → Run as administrator**
2. File → Open → đổi filter sang **"All Files (*.*)"** → mở:
   ```
   C:\Program Files\MongoDB\Server\<version>\bin\mongod.cfg
   ```
3. Tìm dòng `#replication:`, sửa thành (dùng **space**, không dùng Tab, thụt lề đúng 2 space):
   ```yaml
   replication:
     replSetName: rs0
   ```
4. Ctrl+S để lưu.

### 3.4. Restart service để áp dụng config

```powershell
Restart-Service <TênService>
Get-Service <TênService>
```

Phải thấy `Status: Running`. Nếu service dừng ngay sau khi start → lỗi cú pháp YAML, xem log (mục 4) hoặc revert bằng backup.

### 3.5. Cài `mongosh` (không đi kèm MongoDB Server từ bản 6+)

1. Tải tại **https://www.mongodb.com/try/download/shell** — chọn Windows, package **msi**
2. Cài xong, **đóng và mở lại PowerShell** (để nhận PATH mới)
3. Kiểm tra: `mongosh --version`

### 3.6. Init replica set (chỉ chạy 1 lần)

```powershell
mongosh --eval "rs.initiate({_id: 'rs0', members: [{_id: 0, host: 'localhost:27017'}]})"
```

Kiểm tra:
```powershell
mongosh --eval "rs.status()"
```
→ thấy `"stateStr" : "PRIMARY"` là thành công.

### 3.7. Cập nhật connection string

`.env`:
```
MONGO_URI=mongodb://localhost:27017/docpapper?replicaSet=rs0
```

### 3.8. Test transaction hoạt động

```typescript
// test-transaction.ts
import mongoose from "mongoose";
import "dotenv/config";

const test = async () => {
  await mongoose.connect(process.env.MONGO_URI!);
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      console.log("✅ Transaction OK — replica set hoạt động đúng");
    });
  } catch (err) {
    console.error("❌ Transaction FAILED:", err);
  } finally {
    await session.endSession();
    await mongoose.disconnect();
  }
};

test();
```

```powershell
npx ts-node test-transaction.ts
```

## 4. Troubleshooting đã gặp trong quá trình setup

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| `Restart-Service MongoDB` báo "không tìm thấy" | Tên service thực tế khác (vd `CuongMongoDB`), không phải `MongoDB` | Kiểm tra tên thật: `Get-Service \| Where-Object {$_.Name -like "*mongo*"}` |
| `mongosh` báo "not recognized" | `mongosh` không đi kèm MongoDB Server bản 6+, cần cài riêng | Cài từ mongodb.com/try/download/shell, mở PowerShell mới sau khi cài |
| Notepad hiện "Save As" khi lưu file `.cfg` | Notepad không chạy quyền Admin, không có quyền ghi vào `Program Files` | Đóng, mở lại Notepad bằng **Run as administrator**, rồi File → Open lại file |
| Compass báo "Failed to connect to localhost:27017" sau khi sửa config | Service dừng/crash do lỗi cú pháp YAML, hoặc **service chưa được restart** để nạp config mới | Restart-Service; nếu vẫn lỗi, xem log qua `Get-Content <path-log> -Tail 30` |
| Log báo `PrimarySteppedDown: No primary exists currently`, `oplog.rs not found` | mongod đang chạy với `--replSet` nhưng **chưa từng `rs.initiate()`** | Chạy `mongosh --eval "rs.initiate({...})"` để hoàn tất, không cần revert config |

### Lấy đường dẫn config thực tế của 1 service bất kỳ (khi không chắc)

```powershell
Get-WmiObject win32_service | Where-Object {$_.Name -eq "<TênService>"} | Select-Object PathName
```

### Xem log để chẩn đoán lỗi cụ thể

```powershell
Get-Content "<đường-dẫn-trong-mục-systemLog.path-của-file-.cfg>" -Tail 30
```

### Kiểm tra port có đang lắng nghe

```powershell
netstat -an | findstr 27017
```

## 5. Áp dụng transaction vào code (Mongoose)

### Helper dùng chung

```typescript
// src/shared/helpers/withTransaction.helper.ts
import mongoose, { ClientSession } from "mongoose";

/**
 * Chạy `fn` bên trong 1 Mongo transaction, tự động commit/abort/endSession
 * và tự retry khi gặp lỗi transient (network glitch, write conflict...).
 */
export const withTransaction = async <T>(
  fn: (session: ClientSession) => Promise<T>,
): Promise<T> => {
  const session = await mongoose.startSession();
  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    // @ts-expect-error - result chắc chắn đã được gán bên trong callback
    return result;
  } finally {
    await session.endSession();
  }
};
```

### Ví dụ áp dụng — Asset transfer

```typescript
export const transferAssetService = async (
  assetId: string,
  toUserId: string,
  toDepartmentId: string,
  handedOverBy: string,
) => {
  return withTransaction(async (session) => {
    const asset = await Asset.findByIdAndUpdate(
      assetId,
      { assignedTo: toUserId, department: toDepartmentId },
      { new: true, session }, // luôn truyền session vào MỌI query bên trong callback
    );

    if (!asset) throw new Error("Asset not found");

    await AssetAssignmentHistory.create(
      [{ asset: assetId, actionType: "TRANSFER", toUser: toUserId, toDepartment: toDepartmentId, handedOverBy, effectiveAt: new Date() }],
      { session }, // create() với session bắt buộc truyền mảng, kể cả 1 phần tử
    );

    return asset;
  });
};
```

### Checklist khi migrate service cũ sang transaction

1. Tìm mọi chỗ có **≥2 write liên quan** trên nhiều collection trong cùng 1 request.
2. Bọc bằng `withTransaction()`, đảm bảo **mọi** Mongoose call bên trong đều truyền `{ session }`.
3. `Model.create(data, { session })` → nhớ đổi `data` thành mảng `[data]`.
4. Không gọi API ngoài (gửi email, call service khác) bên trong transaction — nếu fail giữa chừng sẽ không rollback được side-effect đã xảy ra.
5. Test bằng cách giả lập lỗi giữa chừng (throw thủ công ở write thứ 2) → verify write thứ 1 cũng bị rollback.

## 6. Ghi chú vận hành hàng ngày

- Mỗi lần bật máy, chỉ cần đảm bảo service `<TênService>` đang `Running` (Windows Service tự khởi động cùng hệ thống, không cần chạy tay).
- Chỉ init replica set **1 lần duy nhất** — dữ liệu và cấu hình đã lưu bền trong `dbPath`, không cần lặp lại `rs.initiate()` ở các lần sau.
- Nếu cần rollback về standalone (không dùng transaction nữa): xoá/comment lại đoạn `replication:` trong `mongod.cfg`, restart service, bỏ `?replicaSet=rs0` khỏi connection string.
