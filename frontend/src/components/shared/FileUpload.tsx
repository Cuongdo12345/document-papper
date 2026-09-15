import { useRef, useState, type DragEvent } from "react";
import { UploadCloud, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadProps {
  /** `accept` chuẩn HTML input (vd `.xlsx,.xls` hoặc `image/png,image/jpeg`). */
  accept?: string;
  /** Danh sách đuôi file hợp lệ để validate lại (input `accept` chỉ lọc ở dialog chọn file, KHÔNG chặn drag/drop) — vd `[".xlsx",".xls"]`. */
  allowedExtensions?: string[];
  maxSizeBytes?: number;
  multiple?: boolean;
  disabled?: boolean;
  /** Controlled — component KHÔNG tự giữ state file đã chọn, để nơi gọi tự quyết định submit/reset (cùng nguyên tắc controlled input của react-hook-form trong dự án). */
  value: File[];
  onChange: (files: File[]) => void;
  helperText?: string;
}

/**
 * Component dùng chung roadmap Mục 20 yêu cầu ("Dùng `FileUpload`... drag/drop
 * nếu phù hợp, file type validation, size validation"). KHÔNG tự gọi API —
 * upload progress/success/failure/retry thuộc về mutation hook ở nơi gọi
 * (component này chỉ chọn + validate file, giữ tách biệt UI/data giống mọi
 * form khác trong dự án).
 */
export function FileUpload({
  accept,
  allowedExtensions,
  maxSizeBytes,
  multiple = false,
  disabled = false,
  value,
  onChange,
  helperText,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validateAndSet(files: File[]) {
    setError(null);

    for (const file of files) {
      if (allowedExtensions?.length) {
        const ext = `.${file.name.split(".").pop()?.toLowerCase()}`;
        if (!allowedExtensions.includes(ext)) {
          setError(`Chỉ chấp nhận file: ${allowedExtensions.join(", ")}`);
          return;
        }
      }
      if (maxSizeBytes && file.size > maxSizeBytes) {
        setError(`File "${file.name}" vượt quá ${formatBytes(maxSizeBytes)}`);
        return;
      }
    }

    onChange(multiple ? [...value, ...files] : files.slice(0, 1));
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    validateAndSet(Array.from(e.dataTransfer.files));
  }

  function removeFile(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) inputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
          isDragging ? "border-primary bg-primary/5" : "border-input",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <UploadCloud className="size-6 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-foreground">
          Kéo thả file vào đây hoặc <span className="font-medium text-primary">chọn file</span>
        </p>
        {helperText && <p className="text-xs text-muted-foreground">{helperText}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) validateAndSet(Array.from(e.target.files));
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      {value.length > 0 && (
        <ul className="space-y-1">
          {value.map((file, index) => (
            <li
              key={`${file.name}-${file.lastModified}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">({formatBytes(file.size)})</span>
              </span>
              {!disabled && (
                <button
                  type="button"
                  aria-label={`Bỏ chọn ${file.name}`}
                  onClick={() => removeFile(index)}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
