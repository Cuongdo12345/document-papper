import fs from "fs";
import path from "path";
import mongoose from "mongoose";

/**
 * DEV-073 (2026-09-21) — `GET /api/system-design`. Introspect TRỰC TIẾP
 * `mongoose.modelNames()` + `schema.paths` của từng model thật đang chạy
 * trong process này — KHÔNG đọc/parse `docs/04_DATABASE_ANALYSIS.md` (tài
 * liệu đó có thể lỗi thời, xem lịch sử DEV-071 — chính là lý do task này
 * yêu cầu lấy thẳng từ schema thay vì tin tài liệu). Nếu source code models
 * thay đổi (thêm/bớt field, thêm ref), response endpoint này tự động đúng
 * theo, không cần cập nhật tay như file dữ liệu tĩnh FE-23 trước đó.
 */

export interface SystemDesignModule {
  name: string;
  models: string[];
}

export interface SystemDesignModel {
  name: string;
  module: string;
  collection: string;
  fields: string[];
}

export interface SystemDesignRelationship {
  model: string;
  field: string;
  ref: string;
}

export interface SystemDesignResult {
  totalModels: number;
  modules: SystemDesignModule[];
  models: SystemDesignModel[];
  relationships: SystemDesignRelationship[];
}

const MODELS_ROOT = path.join(__dirname, "../../models");

/**
 * Tìm export là 1 Mongoose Model thật trong 1 file `*.model.ts` — model
 * files trong repo dùng LẪN LỘN 2 kiểu export (`export const X = model(...)`
 * VÀ `export default model(...)`, xác nhận qua đọc trực tiếp 31 file model
 * thật) nên KHÔNG thể giả định 1 tên export cố định. Nhận diện bằng đặc
 * điểm thật của 1 Mongoose Model (`typeof === "function"` + có `.modelName`
 * + có `.schema`) thay vì đoán tên biến.
 */
function findModelExport(mod: unknown): mongoose.Model<unknown> | undefined {
  if (!mod || typeof mod !== "object") return undefined;
  const candidates = Object.values(mod as Record<string, unknown>);
  for (const candidate of candidates) {
    if (
      typeof candidate === "function" &&
      typeof (candidate as { modelName?: unknown }).modelName === "string" &&
      (candidate as { schema?: unknown }).schema
    ) {
      return candidate as mongoose.Model<unknown>;
    }
  }
  return undefined;
}

/**
 * Quét `backend/src/models/<domain>/*.model.ts` (require từng file — an
 * toàn, `require()` idempotent nhờ Node module cache, không tạo
 * `OverwriteModelError` dù model đã được app.ts import từ trước) để suy ra
 * domain (= tên thư mục cha) của từng model — ĐÚNG yêu cầu "modules: suy ra
 * từ đường dẫn thư mục model", không hard-code danh sách domain/model nào.
 * `require()` các file này CŨNG chính là bước khiến `mongoose.modelNames()`
 * chắc chắn đầy đủ khi hàm này chạy trong 1 process CHƯA từng import các
 * model (vd chạy riêng trong unit test) — thứ tự gọi hàm này TRƯỚC khi đọc
 * `mongoose.modelNames()` ở `getSystemDesignService()` là bắt buộc.
 */
function buildModelDomainMap(): Map<string, string> {
  const modelNameToDomain = new Map<string, string>();
  if (!fs.existsSync(MODELS_ROOT)) return modelNameToDomain;

  const domainEntries = fs.readdirSync(MODELS_ROOT, { withFileTypes: true }).filter((entry) => entry.isDirectory());

  for (const domainEntry of domainEntries) {
    const domainPath = path.join(MODELS_ROOT, domainEntry.name);
    const modelFiles = fs.readdirSync(domainPath).filter((file) => /\.model\.(ts|js)$/.test(file));

    for (const file of modelFiles) {
      const filePath = path.join(domainPath, file);
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = require(filePath);
      const modelExport = findModelExport(mod);
      if (modelExport) {
        modelNameToDomain.set(modelExport.modelName, domainEntry.name);
      }
    }
  }

  return modelNameToDomain;
}

/**
 * Trích quan hệ `ref` TRỰC TIẾP từ `schema.paths` — 3 kiểu khai báo ref đã
 * xác nhận CÓ THẬT trong source (đọc trực tiếp qua Mongoose schema runtime,
 * không suy đoán):
 *  1. ObjectId đơn: `{type: ObjectId, ref: "X"}` → `path.options.ref`.
 *  2. Mảng shorthand: `{type: [ObjectId], ref: "X"}` (vd `User.extraPermissions`)
 *     → ref nằm THẲNG ở `path.options.ref` (không phải trên caster).
 *  3. Mảng object-literal: `[{type: ObjectId, ref: "X"}]` (vd `Contract.assets`)
 *     → ref nằm ở `path.embeddedSchemaType.options.ref`.
 * Subdocument/DocumentArray (`path.schema` tồn tại, vd `WorkflowInstance.steps`,
 * `ConsumableRequest.items`, `Document.signedBy`) → đệ quy vào field con,
 * đặt tên field dạng `steps[].approvedBy` — khớp field thật user sẽ thấy
 * trong response JSON của chính model đó.
 */
function extractRelations(schemaPaths: mongoose.Schema["paths"], prefix = ""): { field: string; ref: string }[] {
  const relations: { field: string; ref: string }[] = [];

  for (const [key, schemaType] of Object.entries(schemaPaths)) {
    if (key === "_id" || key === "__v") continue;
    const field = `${prefix}${key}`;
    const st = schemaType as unknown as {
      instance: string;
      options?: { ref?: string };
      embeddedSchemaType?: { instance: string; options?: { ref?: string } };
      schema?: mongoose.Schema;
    };

    if (st.instance === "ObjectId" && st.options?.ref) {
      relations.push({ field, ref: st.options.ref });
    } else if (st.instance === "Array" && st.options?.ref) {
      relations.push({ field: `${field}[]`, ref: st.options.ref });
    } else if (st.instance === "Array" && st.embeddedSchemaType?.instance === "ObjectId" && st.embeddedSchemaType.options?.ref) {
      relations.push({ field: `${field}[]`, ref: st.embeddedSchemaType.options.ref });
    } else if (st.schema) {
      relations.push(...extractRelations(st.schema.paths, `${field}[].`));
    }
  }

  return relations;
}

export function getSystemDesignService(): SystemDesignResult {
  // Bắt buộc chạy TRƯỚC mongoose.modelNames() — xem comment buildModelDomainMap().
  const modelDomainMap = buildModelDomainMap();
  const modelNames = mongoose.modelNames();

  const models: SystemDesignModel[] = [];
  const relationships: SystemDesignRelationship[] = [];
  const modulesMap = new Map<string, string[]>();

  for (const name of modelNames) {
    const model = mongoose.model(name);
    const moduleName = modelDomainMap.get(name) ?? "unknown";

    models.push({
      name,
      module: moduleName,
      collection: model.collection.name,
      fields: Object.keys(model.schema.paths).filter((f) => f !== "__v"),
    });

    for (const relation of extractRelations(model.schema.paths)) {
      relationships.push({ model: name, field: relation.field, ref: relation.ref });
    }

    if (!modulesMap.has(moduleName)) modulesMap.set(moduleName, []);
    modulesMap.get(moduleName)!.push(name);
  }

  const modules: SystemDesignModule[] = [...modulesMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, modelsInModule]) => ({ name, models: modelsInModule.sort() }));

  return {
    totalModels: modelNames.length,
    modules,
    models: models.sort((a, b) => a.name.localeCompare(b.name)),
    relationships,
  };
}
