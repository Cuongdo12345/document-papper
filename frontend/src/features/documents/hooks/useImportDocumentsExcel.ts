import { importDocumentsExcel } from "@/api/documentExcel.api";

/**
 * Hàm thuần (KHÔNG `useMutation`) — `ExcelImportWizard` tự quản lý state
 * pending/error riêng (dùng chung 1 flow cho cả preview lẫn commit, không
 * hợp với 1 `useMutation` cố định biến), truyền thẳng vào prop `runImport`.
 * Query invalidation sau khi commit thành công do NƠI GỌI (`DocumentExcelMenu`)
 * tự làm qua prop `onImported`, không làm ở đây.
 */
export function useImportDocumentsExcel() {
  return async function runImport(file: File, dryRun: boolean) {
    const response = await importDocumentsExcel(file, dryRun);
    return response.data.data;
  };
}
