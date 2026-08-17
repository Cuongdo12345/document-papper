// scripts/seed-assignment-history.ts
//
// Seed dữ liệu THẬT cho Giai đoạn 2 (AssetAssignmentHistory):
//
//   PHẦN A — Backfill lịch sử cấp phát ban đầu cho các Asset đã seed ở
//   Giai đoạn 1 mà KHÔNG còn nằm trong kho (mọi status khác IN_STOCK:
//   IN_USE, RESERVED, LOST, DISPOSED, UNDER_MAINTENANCE). Các asset này
//   được tạo trực tiếp với status tương ứng, KHÔNG đi qua
//   assignAssetService, nên chưa có bản ghi AssetAssignmentHistory nào —
//   kể cả asset đã LOST/DISPOSED/UNDER_MAINTENANCE cũng từng được cấp
//   phát cho 1 khoa/phòng trước khi đổi trạng thái, nên vẫn cần backfill.
//   Phần này ghi trực tiếp vào DB (KHÔNG gọi service) vì đây là "khôi
//   phục lịch sử" cho dữ liệu cũ, có effectiveAt = purchaseDate — không
//   phải hành động đang xảy ra.
//
//   PHẦN B — Demo luồng cấp phát/luân chuyển/thu hồi THẬT bằng cách gọi
//   ĐÚNG các service đã build (assignAssetService/transferAssetService/
//   returnAssetService) trên 3 asset "dự phòng" (IN_STOCK) đã seed ở
//   Giai đoạn 1 — vừa tạo dữ liệu lịch sử phong phú, vừa verify luôn code
//   Giai đoạn 2 chạy đúng trên dữ liệu thật (đổi status, ghi lịch sử đúng).
//
// Cách chạy:
//   npm run seed:assignment-history
//
// YÊU CẦU: đã chạy `npm run seed:assets` (Giai đoạn 1) trước đó, và DB
// phải có ÍT NHẤT 1 User (ưu tiên role "IT") để dùng làm người thực hiện
// thao tác (`handedOverBy`) — field bắt buộc trong AssetAssignmentHistory.
//
// Script AN TOÀN để chạy lại nhiều lần (idempotent + có thể RESUME nếu lần
// chạy trước bị lỗi/crash giữa chừng):
//   - Phần A: bỏ qua asset đã có bất kỳ bản ghi lịch sử nào.
//   - Phần B: đếm số bản ghi lịch sử đã có cho asset đó, coi đó là số bước
//     ĐÃ hoàn thành (mỗi bước assign/transfer/return luôn tạo đúng 1 bản
//     ghi), rồi CHỈ chạy tiếp các bước còn lại — không skip toàn bộ kịch
//     bản chỉ vì asset đã có history. Điều này quan trọng vì nếu 1 bước
//     (VD "assign") đã cập nhật DB xong nhưng script crash ngay sau đó
//     (trước khi kịp chạy "transfer"/"return"), lần chạy lại phải tiếp
//     tục đúng chỗ dang dở thay vì bỏ qua vĩnh viễn phần còn lại.
//     Giới hạn: nếu có ai đó thao tác thêm history cho asset này từ bên
//     ngoài script (VD qua Postman) xen giữa các lần chạy, số đếm có thể
//     lệch — chấp nhận được vì đây là script demo/seed, không phải logic
//     nghiệp vụ chính thức.

import dotenv from "dotenv";
dotenv.config();

import mongoose from "mongoose";
import { Asset, AssetStatus } from "../src/models/assets/asset.model";
// BẮT BUỘC import để Mongoose đăng ký model "AssetCategory" (populate("category")
// trong assetAssignment.service.ts cần model này đã được register).
//
// LƯU Ý QUAN TRỌNG: phải dùng bare import kiểu `import "..."` (KHÔNG import
// binding `{ AssetCategory }`) — vì khi chạy bằng `ts-node-dev --transpile-only`
// (transpile từng file riêng lẻ, không có type-check cross-file), TypeScript
// coi 1 import có binding nhưng KHÔNG được dùng ở đâu trong file là "có thể
// loại bỏ" và sẽ elide (xoá) hẳn câu lệnh `require(...)` khỏi JS build ra —
// khiến model "AssetCategory" không bao giờ được đăng ký lúc runtime, gây lỗi
// `MissingSchemaError: Schema hasn't been registered for model "AssetCategory"`
// ngay tại `assetAssignment.service.ts` khi nó populate("category"). Bare
// import (không có binding) thì compiler biết chắc đây là side-effect import
// nên KHÔNG bao giờ bị elide, dù chạy ở chế độ transpile-only hay không.
import "../src/models/assets/assetCategory.model";
import { AssetAssignmentHistory, AssetAssignmentActionType } from "../src/models/assets/assetAssignmentHistory.model";
import Department from "../src/models/departments/department.model";
import { User } from "../src/models/users/user.model";
import { Role } from "../src/models/rbac/role.model";
import {
  assignAssetService,
  transferAssetService,
  returnAssetService,
} from "../src/services/assets/assetDevice/assetAssignment.service";

const MONGO_URI = process.env.MONGO_URI as string;

if (!MONGO_URI) {
  throw new Error("❌ Thiếu MONGO_URI trong biến môi trường (.env)");
}

/* =====================================================================
   HÀM PHỤ TRỢ
===================================================================== */

/**
 * Tìm 1 User để làm "actor" thực hiện thao tác cấp phát/luân chuyển/thu
 * hồi (field `handedOverBy` bắt buộc). Ưu tiên user có role "IT" (đúng
 * nghiệp vụ — nhân viên IT là người bàn giao thiết bị thật), fallback về
 * bất kỳ user active nào nếu DB chưa có ai role IT.
 */
const resolveActorUser = async (): Promise<mongoose.Types.ObjectId> => {
  const itRole = await Role.findOne({ name: "IT" });

  let actor = null;
  if (itRole) {
    actor = await User.findOne({ role: itRole._id, isActive: true }).sort({
      createdAt: 1,
    });
  }

  if (!actor) {
    actor = await User.findOne({ isActive: true }).sort({ createdAt: 1 });
  }

  if (!actor) {
    throw new Error(
      "Không tìm thấy User nào trong DB (kể cả không có role IT) để dùng làm " +
        "người thực hiện thao tác cấp phát/luân chuyển (`handedOverBy`). " +
        "Vui lòng tạo ít nhất 1 User trước khi chạy script này.",
    );
  }

  return actor._id as mongoose.Types.ObjectId;
};

/**
 * Tìm 1 user đang active thuộc khoa/phòng theo `departmentId` — dùng để
 * gán `toUser` thực tế cho asset khi demo (nếu khoa đó có user nào trong
 * DB). Nhận thẳng `departmentId` (không phải `code`) vì nơi gọi hàm này
 * (bước "assign") đã có sẵn Department từ trước đó — tránh query
 * `Department.findOne` lần thứ 2 cho cùng 1 khoa/phòng.
 *
 * Trả về `undefined` nếu không có user nào — asset vẫn cấp phát được,
 * chỉ là do khoa quản lý chung, không gắn cá nhân cụ thể.
 */
const findUserInDepartment = async (
  departmentId: mongoose.Types.ObjectId,
): Promise<mongoose.Types.ObjectId | undefined> => {
  const user = await User.findOne({
    department: departmentId,
    isActive: true,
  }).sort({ createdAt: 1 });

  return user ? (user._id as mongoose.Types.ObjectId) : undefined;
};

/* =====================================================================
   PHẦN A — BACKFILL LỊCH SỬ CẤP PHÁT BAN ĐẦU
===================================================================== */

const backfillInitialAssignHistory = async (
  actorUserId: mongoose.Types.ObjectId,
) => {
  console.log(
    "\n📜 Phần A — Backfill lịch sử cấp phát ban đầu cho asset KHÔNG ở kho (từ Giai đoạn 1)...",
  );

  // Đối chiếu với dữ liệu thật (hospital_documents_assets.json) cho thấy
  // Giai đoạn 1 seed trực tiếp 6 trạng thái: IN_USE, IN_STOCK, RESERVED,
  // LOST, DISPOSED, UNDER_MAINTENANCE — TẤT CẢ trừ IN_STOCK đều đại diện
  // cho asset đã từng được "đưa vào sử dụng" tại 1 khoa/phòng cụ thể
  // (RESERVED = đã giữ chỗ cho khoa, LOST/DISPOSED/UNDER_MAINTENANCE =
  // từng IN_USE trước khi đổi trạng thái), nên đều cần 1 bản ghi ASSIGN
  // backfill giống IN_USE. Chỉ IN_STOCK (còn nằm trong kho CNTT, chưa
  // từng cấp phát cho ai) là KHÔNG cần — nhóm này được xử lý ở Phần B.
  const deployedAssets = await Asset.find({
    status: { $ne: AssetStatus.IN_STOCK },
    isActive: true,
  });

  let created = 0;
  let skipped = 0;

  for (const asset of deployedAssets) {
    const alreadyHasHistory = await AssetAssignmentHistory.exists({
      asset: asset._id,
    });
    if (alreadyHasHistory) {
      skipped++;
      continue;
    }

    await AssetAssignmentHistory.create({
      asset: asset._id,
      actionType: AssetAssignmentActionType.ASSIGN,
      fromDepartment: undefined,
      toDepartment: asset.department,
      fromUser: undefined,
      toUser: asset.assignedTo,
      handedOverBy: actorUserId,
      reason:
        asset.status === AssetStatus.IN_USE
          ? "Cấp phát ban đầu khi mua sắm/lắp đặt (backfill lịch sử cho dữ liệu Giai đoạn 1)"
          : `Cấp phát ban đầu khi mua sắm/lắp đặt (backfill lịch sử cho dữ liệu Giai đoạn 1) — ` +
            `asset hiện ở trạng thái ${asset.status}, chưa có thao tác chuyển/thu hồi nào khác được ghi nhận`,
      effectiveAt: asset.purchaseDate || asset.createdAt || new Date(),
    });
    created++;
  }

  console.log(
    `   ✅ Tạo mới ${created} bản ghi lịch sử, bỏ qua ${skipped} asset đã có lịch sử từ trước.`,
  );
};

/* =====================================================================
   PHẦN B — DEMO LUỒNG THẬT QUA SERVICE (assign -> transfer -> return)
===================================================================== */

type DemoStep =
  | { action: "assign"; toDepartmentCode: string; reason: string }
  | { action: "transfer"; toDepartmentCode: string; reason: string }
  | { action: "return"; reason: string };

type DemoScenario = {
  serialNumber: string; // khớp serialNumber trong scripts/seed-assets.ts (Giai đoạn 1)
  steps: DemoStep[];
};

/**
 * 3 asset "dự phòng" (IN_STOCK) đã seed sẵn ở Giai đoạn 1 — dùng để demo
 * đủ cả 3 hành động (assign/transfer/return) qua ĐÚNG code service thật,
 * không phải insert thẳng vào DB. Chọn asset dự phòng (không phải asset
 * đang phục vụ thật) để không ảnh hưởng tới dữ liệu demo trạng thái khác
 * đang dùng để test filter/dashboard.
 */
const DEMO_SCENARIOS: DemoScenario[] = [
  {
    serialNumber: "DELL-5420-SN0040", // Laptop dự phòng (kho CNTT)
    steps: [
      {
        action: "assign",
        toDepartmentCode: "PKHTH - VTTBYT",
        reason:
          "Cấp phát laptop dự phòng cho Phòng Kế Hoạch Tổng Hợp - Vật Tư Thiết Bị Y Tế",
      },
      {
        action: "transfer",
        toDepartmentCode: "PTCKT",
        reason: "PKHTH - VTTBYT bàn giao lại, luân chuyển sang Phòng Tài Chính Kế Toán",
      },
      {
        action: "return",
        reason: "Phòng TCKT hoàn thành dự án, thu hồi lại kho CNTT",
      },
    ],
  },
  {
    serialNumber: "DELL-OPT7010-SN0041", // Máy tính dự phòng (kho CNTT)
    steps: [
      {
        action: "assign",
        toDepartmentCode: "PTCHC",
        reason: "Cấp phát máy tính dự phòng cho Phòng Tổ Chức Hành Chính",
      },
      {
        action: "return",
        reason: "Nhân viên nghỉ việc, thu hồi lại kho CNTT",
      },
    ],
  },
  {
    serialNumber: "DELL-P2422H-SN0042", // Màn hình dự phòng (kho CNTT)
    steps: [
      {
        action: "assign",
        toDepartmentCode: "KNTH",
        reason: "Cấp phát màn hình dự phòng cho Khoa Nội tổng hợp",
      },
      // Cố tình DỪNG LẠI ở IN_USE (không return) — để có ví dụ 1 asset
      // dự phòng vẫn đang được dùng, không quay về kho.
    ],
  },
];

const runDemoScenarios = async (actorUserId: mongoose.Types.ObjectId) => {
  console.log(
    "\n🎬 Phần B — Demo luồng cấp phát/luân chuyển/thu hồi qua service thật...",
  );

  for (const scenario of DEMO_SCENARIOS) {
    const asset = await Asset.findOne({ serialNumber: scenario.serialNumber });

    if (!asset) {
      console.log(
        `   ⚠️  Bỏ qua ${scenario.serialNumber}: không tìm thấy asset trong DB ` +
          `(chạy \`npm run seed:assets\` trước, hoặc asset này đã bị xoá/đổi serialNumber).`,
      );
      continue;
    }

    const existingHistoryCount = await AssetAssignmentHistory.countDocuments({
      asset: asset._id,
    });

    if (existingHistoryCount >= scenario.steps.length) {
      console.log(
        `   ⏭  Bỏ qua "${asset.name}" (${scenario.serialNumber}): đã hoàn thành đủ ${scenario.steps.length} bước từ lần chạy trước.`,
      );
      continue;
    }

    // RESUME: nếu lần chạy trước bị lỗi/crash giữa chừng (VD: đã chạy xong
    // bước "assign" nhưng chưa tới "transfer"/"return"), số bản ghi lịch
    // sử hiện có (`existingHistoryCount`) chính là số bước ĐÃ hoàn thành —
    // vì mỗi bước assign/transfer/return luôn tạo ĐÚNG 1 bản ghi lịch sử.
    // Chỉ cần chạy tiếp từ bước kế tiếp, KHÔNG chạy lại từ đầu (chạy lại
    // bước "assign" khi asset đã IN_USE sẽ bị service từ chối vì sai điều
    // kiện trạng thái).
    const remainingSteps = scenario.steps.slice(existingHistoryCount);

    if (existingHistoryCount > 0) {
      console.log(
        `   ↻ "${asset.name}" (${scenario.serialNumber}): phát hiện đã hoàn thành ${existingHistoryCount}/${scenario.steps.length} bước từ lần chạy trước (có thể do lỗi giữa chừng) — tiếp tục từ bước còn lại.`,
      );
    }

    console.log(`   ▶ ${asset.name} (${scenario.serialNumber}):`);

    for (const step of remainingSteps) {
      if (step.action === "assign") {
        const department = await Department.findOne({
          code: step.toDepartmentCode,
        });
        if (!department) {
          console.log(
            `      ❌ Thiếu Department code="${step.toDepartmentCode}" trong DB — bỏ qua bước assign này.`,
          );
          continue;
        }

        const toUser = await findUserInDepartment(
          department._id as mongoose.Types.ObjectId,
        );

        await assignAssetService(
          String(asset._id),
          {
            toDepartment: String(department._id),
            toUser: toUser ? String(toUser) : undefined,
            reason: step.reason,
          },
          actorUserId,
        );

        console.log(
          `      ✅ ASSIGN -> ${step.toDepartmentCode}${
            toUser ? " (kèm user cụ thể)" : " (chưa gán user cụ thể)"
          }`,
        );
      } else if (step.action === "transfer") {
        const department = await Department.findOne({
          code: step.toDepartmentCode,
        });
        if (!department) {
          console.log(
            `      ❌ Thiếu Department code="${step.toDepartmentCode}" trong DB — bỏ qua bước transfer này.`,
          );
          continue;
        }

        // CHỦ Ý gỡ user cũ (toUser: "") khi luân chuyển sang khoa/phòng
        // khác — tránh để lại `assignedTo` trỏ tới 1 người thuộc khoa CŨ
        // trong khi `department` đã đổi sang khoa mới, gây dữ liệu vô lý.
        // Nếu khoa mới có sẵn user cụ thể, có thể gán lại tương tự bước
        // assign, nhưng ở đây cố tình để trống (khoa quản lý chung) cho
        // đơn giản và vì kịch bản demo không cần độ chi tiết đó.
        await transferAssetService(
          String(asset._id),
          {
            toDepartment: String(department._id),
            toUser: "",
            reason: step.reason,
          },
          actorUserId,
        );

        console.log(`      ✅ TRANSFER -> ${step.toDepartmentCode} (đã gỡ user cũ)`);
      } else if (step.action === "return") {
        await returnAssetService(
          String(asset._id),
          { reason: step.reason },
          actorUserId,
        );

        console.log(`      ✅ RETURN -> về kho (IN_STOCK)`);
      }
    }
  }
};

/* =====================================================================
   MAIN
===================================================================== */

const run = async () => {
  console.log("🚀 Bắt đầu seed dữ liệu Giai đoạn 2 (AssetAssignmentHistory)...");
  console.log(`📍 MONGO_URI: ${MONGO_URI.replace(/\/\/.*@/, "//***:***@")}`);

  await mongoose.connect(MONGO_URI);
  console.log("✅ Đã kết nối MongoDB");

  const actorUserId = await resolveActorUser();
  console.log(`👤 Actor thực hiện thao tác (handedOverBy): ${actorUserId}`);

  await backfillInitialAssignHistory(actorUserId);
  await runDemoScenarios(actorUserId);

  console.log("\n🎉 Seed dữ liệu Giai đoạn 2 hoàn tất!");
  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error("\n❌ Seed thất bại:", err);
  process.exit(1);
});