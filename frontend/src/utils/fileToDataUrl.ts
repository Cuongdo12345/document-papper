/**
 * [MỚI DEV-079] Đọc 1 File (ảnh đại diện) thành data URI base64 đầy đủ
 * (`data:image/png;base64,...`) — khớp `UpdateAvatarDTO` backend (lưu
 * THẲNG base64 trong document User, không qua multer/file riêng).
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Không đọc được file"));
    reader.readAsDataURL(file);
  });
}
