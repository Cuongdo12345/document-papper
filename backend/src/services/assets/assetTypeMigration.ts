import type { Db, ObjectId } from "mongodb";
import { AssetType } from "../../interfaces/assets/asset.interface";

/**
 * DEV-112 (tách module Tài sản, Giai đoạn 1 — docs/development/ASSET_MODULE_SPLIT_PLAN.md
 * mục 4.2). Gán `assetType` cho dữ liệu CÓ SẴN theo cơ chế 3 nhóm, KHÔNG BAO GIỜ đoán:
 *
 *   A — rõ ràng: loại suy ra từ gốc danh mục, không tín hiệu trái ngược → gán.
 *   B — xung đột: dừng, không gán, liệt kê; chỉ xử lý qua ngoại lệ tường minh
 *       có quyết định của user.
 *   C — chỉ ghi nhận.
 *
 * Dùng driver thô (không qua model Mongoose) vì model `Asset` giờ bắt buộc
 * `assetType` — chính là thứ dữ liệu cũ chưa có. Chạy lại nhiều lần vô hại.
 */

export interface AssetTypeException {
  /** Cả mã VÀ _id phải khớp — chặn việc mang nhầm ngoại lệ của DB dev sang DB khác. */
  assetCode: string;
  assetId: string;
  assetType: AssetType;
  /** Xoá hồ sơ thiết bị y tế (chỉ khi hồ sơ không có bản ghi hiệu chuẩn nào). */
  deleteMedicalProfile: boolean;
  reason: string;
}

export interface AssetTypeMigrationOptions {
  apply: boolean;
  /** Mã danh mục gốc → loại. Gốc đã có `assetType` thì giữ, chỉ báo xung đột nếu khác. */
  rootTypeByCode: Record<string, AssetType>;
  exceptions?: AssetTypeException[];
}

export type ConflictKind =
  | "ROOT_TYPE_MISMATCH"
  | "CATEGORY_MISSING"
  | "CATEGORY_UNTYPED"
  | "ASSET_TYPE_MISMATCH"
  | "MEDICAL_PROFILE_ON_NON_MEDICAL"
  | "OPERATOR_CERT_NON_MEDICAL";

export interface Conflict {
  kind: ConflictKind;
  assetCode?: string;
  ref: string;
  detail: string;
}

export interface AssetTypeMigrationReport {
  applied: boolean;
  roots: { code: string; name: string; isActive: boolean; currentType?: AssetType; resultType?: AssetType }[];
  groupA: { total: number; byType: Record<AssetType, number>; alreadyTyped: number };
  groupB: Conflict[];
  groupC: { kind: string; detail: string }[];
  exceptions: { assetCode: string; status: "applied" | "would-apply" | "not-needed" | "refused"; detail: string }[];
  /** Sau khi apply: số tài sản còn thiếu `assetType` (phải = số mục B liên quan tài sản). */
  assetsWithoutType: number;
}

const idStr = (v: unknown) => String(v);

export const runAssetTypeMigration = async (
  db: Db,
  { apply, rootTypeByCode, exceptions = [] }: AssetTypeMigrationOptions,
): Promise<AssetTypeMigrationReport> => {
  const categories = await db.collection("assetcategories").find({}).toArray();
  const byId = new Map(categories.map((c) => [idStr(c._id), c]));

  // --- Gốc danh mục ---
  const groupB: Conflict[] = [];
  const groupC: { kind: string; detail: string }[] = [];
  const rootType = new Map<string, AssetType | undefined>();
  const roots = categories.filter((c) => !c.parentCategory);
  const rootReport: AssetTypeMigrationReport["roots"] = [];
  for (const r of roots) {
    const current = r.assetType as AssetType | undefined;
    const target = rootTypeByCode[r.code];
    if (current && target && current !== target) {
      groupB.push({ kind: "ROOT_TYPE_MISMATCH", ref: r.code, detail: `Gốc đang là ${current}, cấu hình muốn ${target}` });
    }
    const effective = current ?? target;
    rootType.set(idStr(r._id), effective);
    rootReport.push({ code: r.code, name: r.name, isActive: r.isActive !== false, currentType: current, resultType: effective });
  }

  const typeOfCategory = (categoryId: unknown): AssetType | undefined | null => {
    // null = danh mục không tồn tại; undefined = tồn tại nhưng gốc chưa có loại.
    const visited = new Set<string>();
    let node = byId.get(idStr(categoryId));
    if (!node) return null;
    while (node.parentCategory && !visited.has(idStr(node._id))) {
      visited.add(idStr(node._id));
      const parent = byId.get(idStr(node.parentCategory));
      if (!parent) return undefined;
      node = parent;
    }
    return rootType.get(idStr(node._id));
  };

  // --- Tài sản ---
  const assets = await db.collection("assets").find({}).toArray();
  const profiles = await db.collection("medicaldeviceprofiles").find({}).toArray();
  const profileByAsset = new Map(profiles.map((p) => [idStr(p.asset), p]));
  const calibCounts = new Map<string, number>(
    (
      await db
        .collection("calibrationrecords")
        .aggregate<{ _id: ObjectId; n: number }>([{ $group: { _id: "$deviceProfile", n: { $sum: 1 } } }])
        .toArray()
    ).map((x) => [idStr(x._id), x.n]),
  );

  const toAssign: { _id: ObjectId; assetType: AssetType }[] = [];
  const resolved: { exception: AssetTypeException; asset: any; profile: any }[] = [];
  const exceptionReport: AssetTypeMigrationReport["exceptions"] = [];
  const usedExceptions = new Set<string>();
  const byType: Record<AssetType, number> = { [AssetType.IT]: 0, [AssetType.MEDICAL]: 0 };
  let alreadyTyped = 0;

  for (const a of assets) {
    const t = typeOfCategory(a.category);
    if (t === null) {
      groupB.push({ kind: "CATEGORY_MISSING", assetCode: a.assetCode, ref: idStr(a._id), detail: `Danh mục ${idStr(a.category)} không tồn tại` });
      continue;
    }
    if (!t) {
      groupB.push({ kind: "CATEGORY_UNTYPED", assetCode: a.assetCode, ref: idStr(a._id), detail: `Danh mục ${byId.get(idStr(a.category))?.code} không thuộc nhánh nào` });
      continue;
    }
    if (a.assetType && a.assetType !== t) {
      groupB.push({ kind: "ASSET_TYPE_MISMATCH", assetCode: a.assetCode, ref: idStr(a._id), detail: `Đang là ${a.assetType}, danh mục thuộc ${t}` });
      continue;
    }
    const profile = profileByAsset.get(idStr(a._id));
    if (profile && t !== AssetType.MEDICAL) {
      const calibrations = calibCounts.get(idStr(profile._id)) ?? 0;
      const ex = exceptions.find((e) => e.assetCode === a.assetCode);
      if (ex) usedExceptions.add(ex.assetCode);
      const refuse = !ex
        ? undefined
        : ex.assetId !== idStr(a._id)
          ? `_id không khớp (ngoại lệ ghi ${ex.assetId}, DB là ${idStr(a._id)}) — ngoại lệ không dành cho DB này`
          : ex.assetType !== t
            ? `Ngoại lệ muốn ${ex.assetType} nhưng danh mục thuộc ${t}`
            : !ex.deleteMedicalProfile
              ? "Ngoại lệ không cho phép xoá hồ sơ y tế"
              : calibrations > 0
                ? `Hồ sơ có ${calibrations} bản ghi hiệu chuẩn — không tự xoá`
                : undefined;
      if (ex && !refuse) {
        resolved.push({ exception: ex, asset: a, profile });
        exceptionReport.push({
          assetCode: a.assetCode,
          status: apply ? "applied" : "would-apply",
          detail: `Gán ${t}, xoá hồ sơ y tế (hạng ${profile.deviceClass}, 0 hiệu chuẩn). Lý do: ${ex.reason}`,
        });
        continue;
      }
      if (ex) exceptionReport.push({ assetCode: a.assetCode, status: "refused", detail: refuse! });
      groupB.push({
        kind: "MEDICAL_PROFILE_ON_NON_MEDICAL",
        assetCode: a.assetCode,
        ref: idStr(a._id),
        detail: `Tài sản thuộc ${t} nhưng có hồ sơ thiết bị y tế (hạng ${profile.deviceClass}, ${calibrations} bản ghi hiệu chuẩn)`,
      });
      continue;
    }
    if (a.assetType) alreadyTyped++;
    else toAssign.push({ _id: a._id, assetType: t });
    byType[t]++;
  }

  for (const ex of exceptions) {
    if (!usedExceptions.has(ex.assetCode)) {
      exceptionReport.push({ assetCode: ex.assetCode, status: "not-needed", detail: "Không còn xung đột tương ứng (đã xử lý hoặc không tồn tại)" });
    }
  }

  // --- Chứng chỉ người vận hành ---
  for (const c of await db.collection("operatorcertificates").find({}).toArray()) {
    if (typeOfCategory(c.deviceCategory) !== AssetType.MEDICAL) {
      groupB.push({ kind: "OPERATOR_CERT_NON_MEDICAL", ref: idStr(c._id), detail: `Chứng chỉ gắn danh mục ${byId.get(idStr(c.deviceCategory))?.code ?? idStr(c.deviceCategory)} không thuộc nhánh y tế` });
    }
  }

  // --- Nhóm C: chỉ ghi nhận ---
  for (const c of categories) {
    if (typeOfCategory(c._id) === undefined) {
      groupC.push({ kind: "CATEGORY_UNTYPED", detail: `${c.code} (${c.isActive === false ? "ngừng dùng" : "ĐANG DÙNG"}) không thuộc nhánh nào — không gán loại` });
    }
  }
  const assetType = new Map<string, AssetType | undefined>(
    assets.map((a) => [idStr(a._id), (a.assetType as AssetType | undefined) ?? (typeOfCategory(a.category) || undefined)]),
  );
  for (const k of await db.collection("contracts").find({ "assets.0": { $exists: true } }).toArray()) {
    const types = new Set((k.assets as unknown[]).map((x) => assetType.get(idStr(x))));
    if (types.size > 1) groupC.push({ kind: "CONTRACT_MIXED", detail: `Hợp đồng ${k.contractNumber ?? k.code ?? idStr(k._id)} chứa nhiều loại thiết bị` });
  }

  // --- Ghi ---
  if (apply) {
    for (const r of roots) {
      const target = rootTypeByCode[r.code];
      if (!r.assetType && target) {
        await db.collection("assetcategories").updateOne({ _id: r._id, assetType: { $exists: false } }, { $set: { assetType: target } });
      }
    }
    for (const { exception, asset, profile } of resolved) {
      // Kiểm lại ngay lúc ghi; xoá hồ sơ + gán loại trong 1 transaction.
      const session = db.client.startSession();
      try {
        await session.withTransaction(async () => {
          const calibrations = await db.collection("calibrationrecords").countDocuments({ deviceProfile: profile._id }, { session });
          if (calibrations > 0) throw new Error(`${asset.assetCode}: hồ sơ vừa có bản ghi hiệu chuẩn, huỷ ngoại lệ`);
          await db.collection("medicaldeviceprofiles").deleteOne({ _id: profile._id, asset: asset._id }, { session });
          await db.collection("assets").updateOne({ _id: asset._id }, { $set: { assetType: exception.assetType } }, { session });
        });
      } finally {
        await session.endSession();
      }
    }
    if (toAssign.length) {
      await db.collection("assets").bulkWrite(
        toAssign.map((x) => ({
          updateOne: { filter: { _id: x._id, assetType: { $exists: false } }, update: { $set: { assetType: x.assetType } } },
        })),
      );
    }
  }

  return {
    applied: apply,
    roots: rootReport,
    groupA: { total: byType[AssetType.IT] + byType[AssetType.MEDICAL], byType, alreadyTyped },
    groupB,
    groupC,
    exceptions: exceptionReport,
    assetsWithoutType: await db.collection("assets").countDocuments({ assetType: { $exists: false } }),
  };
};
