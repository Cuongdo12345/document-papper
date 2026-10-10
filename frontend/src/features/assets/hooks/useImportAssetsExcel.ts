import { importAssetsExcel } from "@/api/assets.api";
import { useAssetModule } from "@/features/assets/hooks/useAssetModule";

/** Hàm thuần — xem chú thích gốc ở `useImportDocumentsExcel.ts` (cùng lý do). */
export function useImportAssetsExcel() {
  const { type } = useAssetModule();
  return async function runImport(file: File, dryRun: boolean) {
    const response = await importAssetsExcel(type, file, dryRun);
    return response.data.data;
  };
}
