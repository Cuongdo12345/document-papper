import { importAssetsExcel } from "@/api/assets.api";

/** Hàm thuần — xem chú thích gốc ở `useImportDocumentsExcel.ts` (cùng lý do). */
export function useImportAssetsExcel() {
  return async function runImport(file: File, dryRun: boolean) {
    const response = await importAssetsExcel(file, dryRun);
    return response.data.data;
  };
}
