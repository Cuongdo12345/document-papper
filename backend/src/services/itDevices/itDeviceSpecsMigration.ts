// services/itDevices/itDeviceSpecsMigration.ts
//
// DEV-116 (tách module Tài sản, Giai đoạn 5) — sao chép `Asset.specs` (dữ liệu cũ, dạng tự do) sang `ItDeviceProfile`.
// Quyết định Q-A3 của user: SAO CHÉP, GIỮ BẢN CŨ (`specs` không bị xoá/sửa); IP trùng chỉ báo cáo, không chặn.
//
// Ánh xạ khoá (docs/development/ASSET_MODULE_SPLIT_PLAN.md mục 4.6):
//   cpu, ram, storage, gpu -> cùng tên | ip -> ipAddress | firmware -> firmwareVersion
//   lanIp, wanIp, ports, xuatXu, congSuat (và mọi khoá khác) -> GIỮ Ở `specs`, chỉ báo cáo (thiết bị mạng có 2 IP, không đoán IP nào là chính).
// Chỉ tài sản loại IT. IP sai định dạng KHÔNG chép, báo cáo để sửa tay.
// Idempotent và KHÔNG ghi đè: trường nào hồ sơ đã có giá trị thì bỏ qua (chạy lại không đổi gì).

import net from "net";
import { Types } from "mongoose";
import { Asset } from "../../models/assets/asset.model";
import { ItDeviceProfile } from "../../models/itDevices/itDeviceProfile.model";
import { AssetType } from "../../interfaces/assets/asset.interface";

type TargetField = "cpu" | "ram" | "storage" | "gpu" | "ipAddress" | "firmwareVersion";

const SPEC_TO_PROFILE: Record<string, TargetField> = {
  cpu: "cpu",
  ram: "ram",
  storage: "storage",
  gpu: "gpu",
  ip: "ipAddress",
  firmware: "firmwareVersion",
};

export interface ItSpecsMigrationReport {
  apply: boolean;
  /** Tài sản IT có `specs` không rỗng. */
  assetsWithSpecs: number;
  /** Tài sản có ít nhất một khoá sao chép được. */
  assetsToCopy: number;
  profilesCreated: number;
  profilesUpdated: number;
  fieldsCopied: Partial<Record<TargetField, number>>;
  /** Trường đã có giá trị trong hồ sơ nên không ghi đè. */
  fieldsSkippedExisting: number;
  invalidIps: { assetCode: string; value: string }[];
  /** IP xuất hiện ở hơn một tài sản (chỉ cảnh báo, vẫn chép). */
  duplicateIps: { ip: string; assetCodes: string[] }[];
  /** Khoá ở lại `specs`, kèm số tài sản. */
  keptInSpecs: Record<string, number>;
  /** Tài sản có lanIp/wanIp — cần người quyết IP nào là chính. */
  assetsWithLanOrWanIp: string[];
}

const toText = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text === "" ? undefined : text;
};

export async function runItDeviceSpecsMigration(options: { apply: boolean }): Promise<ItSpecsMigrationReport> {
  const { apply } = options;

  const assets = await Asset.find({ assetType: AssetType.IT, specs: { $exists: true, $nin: [null, {}] } })
    .select("_id assetCode specs")
    .lean();

  const existing = new Map<string, Record<string, unknown>>();
  for (const p of await ItDeviceProfile.find({ asset: { $in: assets.map((a) => a._id) } }).lean()) {
    existing.set(String(p.asset), p as unknown as Record<string, unknown>);
  }

  const report: ItSpecsMigrationReport = {
    apply,
    assetsWithSpecs: 0,
    assetsToCopy: 0,
    profilesCreated: 0,
    profilesUpdated: 0,
    fieldsCopied: {},
    fieldsSkippedExisting: 0,
    invalidIps: [],
    duplicateIps: [],
    keptInSpecs: {},
    assetsWithLanOrWanIp: [],
  };

  const ops: any[] = [];
  const codesByIp = new Map<string, string[]>();

  for (const asset of assets) {
    const specs = (asset.specs ?? {}) as Record<string, unknown>;
    if (Object.keys(specs).length === 0) continue;
    report.assetsWithSpecs++;

    const profile = existing.get(String(asset._id));
    const toSet: Partial<Record<TargetField, string>> = {};

    for (const [key, raw] of Object.entries(specs)) {
      const target = SPEC_TO_PROFILE[key];
      if (!target) {
        report.keptInSpecs[key] = (report.keptInSpecs[key] ?? 0) + 1;
        if ((key === "lanIp" || key === "wanIp") && !report.assetsWithLanOrWanIp.includes(asset.assetCode)) {
          report.assetsWithLanOrWanIp.push(asset.assetCode);
        }
        continue;
      }
      const value = toText(raw);
      if (value === undefined) continue;

      if (target === "ipAddress" && net.isIP(value) === 0) {
        report.invalidIps.push({ assetCode: asset.assetCode, value });
        continue;
      }
      if (profile && toText(profile[target]) !== undefined) {
        report.fieldsSkippedExisting++;
        continue;
      }
      toSet[target] = value;
    }

    const fields = Object.keys(toSet) as TargetField[];
    if (fields.length === 0) continue;

    report.assetsToCopy++;
    for (const f of fields) report.fieldsCopied[f] = (report.fieldsCopied[f] ?? 0) + 1;
    if (toSet.ipAddress) codesByIp.set(toSet.ipAddress, [...(codesByIp.get(toSet.ipAddress) ?? []), asset.assetCode]);
    if (profile) report.profilesUpdated++;
    else report.profilesCreated++;

    ops.push({ updateOne: { filter: { asset: asset._id as Types.ObjectId }, update: { $set: toSet }, upsert: true } });
  }

  for (const [ip, codes] of codesByIp) {
    if (codes.length > 1) report.duplicateIps.push({ ip, assetCodes: codes });
  }

  if (apply && ops.length > 0) {
    await ItDeviceProfile.bulkWrite(ops, { ordered: false });
  }

  return report;
}
