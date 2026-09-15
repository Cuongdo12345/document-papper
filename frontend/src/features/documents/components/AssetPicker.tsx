import { useState } from "react";
import { useAssets } from "@/features/assets/hooks/useAssets";
import { useDebounce } from "@/hooks/useDebounce";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AssetPickerProps {
  value?: string;
  selectedLabel?: string;
  onChange: (assetId: string | undefined, label: string | undefined) => void;
  error?: string;
}

/**
 * Combobox chọn `relatedAsset` (BẮT BUỘC cho PROPOSE_REPAIR) — tìm kiếm debounce
 * qua `GET /assets?keyword=...`. `QueryAssetDTO.status` CHỈ nhận 1 giá trị đơn
 * (không phải danh sách loại trừ), nên lọc DISPOSED/LOST ở CLIENT sau khi có
 * kết quả (DOCUMENT_DOMAIN_MAP.md Mục 2: không cho chọn asset 2 trạng thái này).
 */
export function AssetPicker({ value, selectedLabel, onChange, error }: AssetPickerProps) {
  const [keyword, setKeyword] = useState("");
  const [open, setOpen] = useState(false);
  const debouncedKeyword = useDebounce(keyword);

  const query = useAssets({ keyword: debouncedKeyword || undefined, limit: 20 }, open && debouncedKeyword.length > 0);
  const results = (query.data?.data ?? []).filter((a) => a.status !== "DISPOSED" && a.status !== "LOST");

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm">
        <span className="text-foreground">{selectedLabel ?? value}</span>
        <Button type="button" variant="ghost" size="sm" aria-label="Bỏ chọn" onClick={() => onChange(undefined, undefined)}>
          <X />
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={keyword}
        onChange={(e) => {
          setKeyword(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Tìm theo mã/tên tài sản..."
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
              onMouseDown={() => {
                onChange(asset._id, `${asset.assetCode} — ${asset.name}`);
                setKeyword("");
                setOpen(false);
              }}
            >
              <span className="font-mono text-xs text-muted-foreground">{asset.assetCode}</span> — {asset.name}
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
