import { useState } from "react";
import { X } from "lucide-react";
import { useAssets } from "@/features/assets/hooks/useAssets";
import { useDebounce } from "@/hooks/useDebounce";

export interface PickedAsset {
  id: string;
  label: string;
}

interface AssetMultiPickerProps {
  value: PickedAsset[];
  onChange: (next: PickedAsset[]) => void;
  error?: string;
}

/**
 * Roadmap B4 — chọn NHIỀU tài sản cho 1 Contract (đã xác nhận với user: 1
 * hợp đồng ↔ nhiều tài sản). KHÔNG tái dùng thẳng `AssetPicker`
 * (`features/documents/components/`) vì đó là combobox single-value — model
 * chọn lựa khác hẳn (mảng thay vì 1 giá trị), sửa lại API của nó sẽ phá vỡ
 * mọi chỗ đang dùng single-select (Document PROPOSE_REPAIR, MaintenancePlan).
 * Component MỚI này chỉ khác biệt ở phần state (mảng + chip xoá được), phần
 * search vẫn tái dùng `useAssets` hiện có.
 */
export function AssetMultiPicker({ value, onChange, error }: AssetMultiPickerProps) {
  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedKeyword = useDebounce(keyword);

  const query = useAssets({ keyword: debouncedKeyword || undefined, limit: 20 }, open && debouncedKeyword.length > 0);
  const selectedIds = new Set(value.map((v) => v.id));
  const results = (query.data?.data ?? []).filter(
    (a) => a.status !== "DISPOSED" && a.status !== "LOST" && !selectedIds.has(a._id),
  );

  function addAsset(id: string, label: string) {
    onChange([...value, { id, label }]);
    setKeyword("");
    setOpen(false);
  }

  function removeAsset(id: string) {
    onChange(value.filter((v) => v.id !== id));
  }

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((v) => (
            <li key={v.id} className="flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1 text-xs text-foreground">
              {v.label}
              <button type="button" aria-label={`Bỏ chọn ${v.label}`} onClick={() => removeAsset(v.id)}>
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="relative">
        <input
          value={keyword}
          onChange={(e) => {
            setKeyword(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Tìm theo mã/tên tài sản để thêm..."
          aria-invalid={!!error}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {open && debouncedKeyword && (
          <div className="absolute z-10 mt-1 max-h-64 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg">
            {query.isLoading && <p className="p-3 text-sm text-muted-foreground">Đang tìm...</p>}
            {!query.isLoading && results.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">Không tìm thấy tài sản phù hợp.</p>
            )}
            {results.map((asset) => (
              <button
                key={asset._id}
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                onMouseDown={() => addAsset(asset._id, `${asset.assetCode} — ${asset.name}`)}
              >
                <span className="font-mono text-xs text-muted-foreground">{asset.assetCode}</span> — {asset.name}
              </button>
            ))}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
