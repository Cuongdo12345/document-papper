import { useNavigate } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

/** ROUTE_PERMISSION_MAP.md — /404, route không khớp. */
export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <FileQuestion className="size-8 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">404 — Không tìm thấy trang</h1>
        <p className="text-sm text-muted-foreground">Đường dẫn bạn truy cập không tồn tại.</p>
      </div>
      <Button onClick={() => navigate("/app")}>Về trang chủ</Button>
    </div>
  );
}
