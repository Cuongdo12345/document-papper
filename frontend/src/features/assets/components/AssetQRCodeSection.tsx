import { useEffect, useMemo } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingState } from "@/components/shared/LoadingState";
import { useAssetQRCode } from "@/features/assets/hooks/useAssetQRCode";
import { triggerBrowserDownload } from "@/utils/downloadBlob";

interface AssetQRCodeSectionProps {
  assetId: string;
  assetCode: string;
  assetName: string;
}

/**
 * Giai đoạn 5 (roadmap A1) — hiển thị/in/tải ảnh QR code (encode `assetCode`,
 * xem `assetQRCode.service.ts`) để dán tem vật lý lên thiết bị.
 *
 * Backend trả PNG thô (KHÔNG bọc JSON) — fetch qua `responseType:"blob"` rồi
 * tự tạo Object URL cục bộ để `<img>` hiển thị được (giống pattern
 * `useDownloadFile`, FE-15) — auth của app dùng Bearer header (`axios.ts`),
 * nên KHÔNG thể trỏ thẳng `<img src="/api/assets/:id/qrcode">` (trình duyệt
 * tự request ảnh, không có cách nào gắn kèm header Authorization).
 */
export function AssetQRCodeSection({ assetId, assetCode, assetName }: AssetQRCodeSectionProps) {
  const qrQuery = useAssetQRCode(assetId);
  // Tính URL ngay lúc render (không qua `useEffect`+`setState` — tránh
  // double-render không cần thiết) — chỉ dùng `useEffect` riêng cho việc DỌN
  // (`revokeObjectURL`), đúng khuyến nghị "Effects should synchronize React
  // with external systems" (oxlint `set-state-in-effect`).
  const qrUrl = useMemo(() => (qrQuery.data ? URL.createObjectURL(qrQuery.data) : null), [qrQuery.data]);

  useEffect(() => {
    return () => {
      if (qrUrl) URL.revokeObjectURL(qrUrl);
    };
  }, [qrUrl]);

  function handlePrint() {
    if (!qrUrl) return;
    // Cửa sổ riêng chỉ chứa đúng QR + mã + tên, canh giữa — đủ dùng để in tem
    // dán (không cần thư viện in nhãn chuyên dụng cho phạm vi task này).
    //
    // ⚠️ Dựng nội dung bằng DOM API (`createElement`/`textContent`) thay vì
    // `document.write(templateString)` — `assetCode`/`assetName` là dữ liệu
    // người dùng nhập khi tạo tài sản (`CreateAssetDTO.name` không giới hạn
    // ký tự), nội suy thẳng vào chuỗi HTML sẽ mở đường XSS nếu asset từng
    // được đặt tên chứa `<script>`/thẻ HTML khác. `textContent` không parse
    // HTML nên an toàn tuyệt đối với input bất kỳ.
    const printWindow = window.open("", "_blank", "width=400,height=500");
    if (!printWindow) return;

    printWindow.document.title = assetCode;
    Object.assign(printWindow.document.body.style, {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif",
      margin: "0",
      padding: "16px",
      textAlign: "center",
    });

    const img = printWindow.document.createElement("img");
    img.alt = `QR ${assetCode}`;
    img.style.width = "200px";
    img.style.height = "200px";
    // Đợi ẢNH thật sự load xong rồi mới gọi print() — window "about:blank" đã
    // load xong NGAY khi mở (không đợi ảnh chèn sau đó), nên không dùng
    // `printWindow.onload` (có thể không bao giờ fire lại) như khi còn dùng
    // `document.write`/`document.close()` (kỹ thuật đó tự re-trigger load
    // event, đã bỏ vì lý do XSS nêu trên).
    img.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
    img.src = qrUrl;

    const codeEl = printWindow.document.createElement("p");
    codeEl.style.cssText = "font-weight:600;margin:8px 0 2px;font-size:14px;";
    codeEl.textContent = assetCode;

    const nameEl = printWindow.document.createElement("p");
    nameEl.style.cssText = "font-size:12px;color:#555;margin:0;";
    nameEl.textContent = assetName;

    printWindow.document.body.append(img, codeEl, nameEl);
  }

  if (qrQuery.isLoading) return <LoadingState variant="spinner" label="Đang tạo mã QR..." />;
  // Section PHỤ (không phải dữ liệu chính của trang) — lỗi tạo QR không nên
  // chặn cả AssetDetailPage bằng ErrorState toàn trang, chỉ ẩn lặng section này.
  if (qrQuery.isError || !qrUrl) return null;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      <img
        src={qrUrl}
        alt={`Mã QR tài sản ${assetCode}`}
        className="size-40 shrink-0 rounded-md border border-border bg-white p-2"
      />
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Dán tem này lên thiết bị — nhân viên có thể dùng đầu đọc QR/mã vạch (hoặc gõ tay mã) ở trang{" "}
          <span className="font-medium text-foreground">"Quét mã kiểm kê"</span> để tra cứu nhanh và ghi nhận kiểm kê.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => triggerBrowserDownload(qrQuery.data!, `QR-${assetCode}.png`)}>
            <Download /> Tải ảnh
          </Button>
          <Button variant="secondary" size="sm" onClick={handlePrint}>
            <Printer /> In tem
          </Button>
        </div>
      </div>
    </div>
  );
}
