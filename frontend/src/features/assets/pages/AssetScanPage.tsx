import { useRef, useState } from "react";
import { ScanLine, CheckCircle2, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { AssetStatusBadge } from "@/features/assets/components/AssetStatusBadge";
import { useLookupAssetByCode } from "@/features/assets/hooks/useLookupAssetByCode";
import { useCheckInAsset } from "@/features/assets/hooks/useCheckInAsset";
import { parseApiError } from "@/utils/parseApiError";
import type { Asset } from "@/types/asset.types";

interface CheckedInEntry {
  assetCode: string;
  name: string;
  checkedAt: string;
}

/**
 * Giai đoạn 5 (roadmap A1) — trang "Quét mã kiểm kê" (mobile-friendly, ô nhập
 * lớn để dễ dùng trên điện thoại khi đi kiểm kê thực tế).
 *
 * CHỦ Ý KHÔNG tự decode QR qua camera ngay trong trình duyệt — cần thêm 1
 * thư viện mới (vd `@zxing/browser`/`html5-qrcode`), CHƯA có sẵn trong
 * project (CLAUDE.md Mục 25 — Dependency Management: chỉ thêm dependency khi
 * có lý do rõ ràng, đã đánh giá). Thay vào đó dùng ĐÚNG thiết kế backend đã
 * có sẵn (`assetQRCode.service.ts` comment gốc): "đầu đọc mã vạch/QR đa số
 * hoạt động như BÀN PHÍM, gõ thẳng nội dung mã vào ô input" — ô nhập dưới
 * đây nhận được CẢ 2 cách, không cần code thêm gì để hỗ trợ đầu đọc vật lý:
 *   1. Gõ tay `assetCode`.
 *   2. Quét bằng đầu đọc QR/mã vạch cầm tay (hành vi HID — giống gõ bàn phím
 *      rồi tự bấm Enter) — phổ biến trong kiểm kê kho/thiết bị y tế thực tế.
 * Nếu sau này cần quét bằng camera điện thoại ngay trong trình duyệt (không
 * có đầu đọc vật lý), đó là 1 task riêng cần xác nhận thêm dependency.
 */
export function AssetScanPage() {
  const [code, setCode] = useState("");
  const [foundAsset, setFoundAsset] = useState<Asset | null>(null);
  const [history, setHistory] = useState<CheckedInEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const lookupMutation = useLookupAssetByCode();
  const checkInMutation = useCheckInAsset();

  function handleLookup(code2: string) {
    const trimmed = code2.trim();
    if (!trimmed) return;
    setFoundAsset(null);
    lookupMutation.mutate(trimmed, {
      onSuccess: (asset) => setFoundAsset(asset),
    });
  }

  function handleConfirm() {
    if (!foundAsset) return;
    checkInMutation.mutate(foundAsset._id, {
      onSuccess: (asset) => {
        setHistory((prev) => [
          { assetCode: asset.assetCode, name: asset.name, checkedAt: new Date().toLocaleTimeString("vi-VN") },
          ...prev,
        ]);
        resetForNext();
      },
    });
  }

  function resetForNext() {
    setCode("");
    setFoundAsset(null);
    lookupMutation.reset();
    inputRef.current?.focus();
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PageHeader
        title="Quét mã kiểm kê"
        description="Quét bằng đầu đọc QR/mã vạch, hoặc gõ tay mã tài sản, để xác nhận đã kiểm kê."
        breadcrumb={[{ label: "Tài sản", to: "/app/assets" }, { label: "Quét mã kiểm kê" }]}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleLookup(code);
        }}
        className="flex gap-2"
      >
        <input
          ref={inputRef}
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Mã tài sản (VD: TB-CNTT-2026-0001)"
          aria-label="Mã tài sản"
          className="flex-1 rounded-md border border-input bg-background px-3 py-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {/* FE-19 — "Xác nhận đã thấy tài sản" (bên dưới, sau khi tìm thấy) mới
            là hành động cốt lõi của trang (kiểm kê); "Tra cứu" chỉ là bước tìm
            trước đó nên hạ xuống secondary, tránh 2 primary cùng hiện đồng thời. */}
        <Button type="submit" variant="secondary" loading={lookupMutation.isPending} disabled={!code.trim()}>
          <ScanLine /> Tra cứu
        </Button>
      </form>

      {lookupMutation.isError && (
        <p role="alert" className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {parseApiError(lookupMutation.error).message}
        </p>
      )}

      {foundAsset && (
        <div className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-semibold text-foreground">{foundAsset.name}</p>
              <p className="text-sm text-muted-foreground">{foundAsset.assetCode}</p>
            </div>
            <AssetStatusBadge status={foundAsset.status} />
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Danh mục</dt>
              <dd className="text-foreground">{foundAsset.category.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Khoa/Phòng</dt>
              <dd className="text-foreground">{foundAsset.department.name}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={handleConfirm} loading={checkInMutation.isPending}>
              <CheckCircle2 /> Xác nhận đã thấy tài sản
            </Button>
            <Button variant="ghost" size="sm" onClick={resetForNext} disabled={checkInMutation.isPending}>
              <RotateCcw /> Quét mã khác
            </Button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-foreground">Đã kiểm kê trong phiên này ({history.length})</h2>
          <ul className="space-y-1 text-sm">
            {history.map((h) => (
              <li
                key={`${h.assetCode}-${h.checkedAt}`}
                className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2"
              >
                <span>
                  <span className="font-medium text-foreground">{h.assetCode}</span>{" "}
                  <span className="text-muted-foreground">— {h.name}</span>
                </span>
                <span className="text-xs text-muted-foreground">{h.checkedAt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
