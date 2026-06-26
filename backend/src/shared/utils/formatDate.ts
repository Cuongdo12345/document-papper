
/**
 * Hàm dùng chung format định dạng ngày dùng chung khi import excel
 * @param value 
 * @returns 
 */
export function parseExcelDate(value: any): Date {
  if (!value) return new Date();

  // Excel trả về Date object
  if (value instanceof Date) {
    return value;
  }

  // Excel trả về number (serial date)
  if (typeof value === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 86400000);
  }

  // String dạng dd/mm/yyyy
  if (typeof value === "string") {
    const parts = value.split("/");
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const parsed = new Date(`${year}-${month}-${day}`);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    const fallback = new Date(value);
    if (!isNaN(fallback.getTime())) return fallback;
  }

  return new Date();
}