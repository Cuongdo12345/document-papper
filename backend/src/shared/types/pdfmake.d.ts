// `pdfmake` (0.3.x, unified client/server package) không publish type
// declaration nào (không có `@types/pdfmake` tương ứng trên npm — đã kiểm
// tra trước khi thêm file này, CLAUDE.md Mục 25). Khai báo tối thiểu ĐÚNG
// phần API thực tế đang dùng ở `documentPdf.service.ts`
// (`addFonts`/`setUrlAccessPolicy`/`setLocalAccessPolicy`/`createPdf().getBuffer()`
// — xem `node_modules/pdfmake/js/base.js`/`OutputDocument.js`), không khai
// báo toàn bộ bề mặt API (docDefinition dùng `any`, đủ dùng nội bộ).
declare module "pdfmake" {
  interface PdfMakeOutputDocument {
    getBuffer(): Promise<Buffer>;
    getStream(): Promise<NodeJS.ReadableStream>;
    getBase64(): Promise<string>;
    getDataUrl(): Promise<string>;
  }

  interface PdfMakeInstance {
    addFonts(fonts: Record<string, { normal: string; bold?: string; italics?: string; bolditalics?: string }>): void;
    setFonts(fonts: Record<string, { normal: string; bold?: string; italics?: string; bolditalics?: string }>): void;
    setUrlAccessPolicy(callback: (url: string) => boolean): void;
    setLocalAccessPolicy(callback: (path: string) => boolean): void;
    createPdf(docDefinition: any, options?: any): PdfMakeOutputDocument;
  }

  const pdfMake: PdfMakeInstance;
  export default pdfMake;
}
