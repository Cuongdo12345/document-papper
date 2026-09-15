import { useNavigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

/** ROUTE_PERMISSION_MAP.md — /403, khi ProtectedRoute chặn do thiếu permission. */
export function ForbiddenPage() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-destructive/10">
        <ShieldAlert className="size-8 text-destructive" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold text-foreground">403 — Không đủ quyền truy cập</h1>
        <p className="text-sm text-muted-foreground">Bạn không có quyền truy cập trang này.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>
          Quay lại
        </Button>
        <Button onClick={() => navigate("/app")}>Về trang chủ</Button>
      </div>
    </div>
  );
}
