import { useState } from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEnableTwoFactor, useConfirmTwoFactor, useDisableTwoFactor } from "@/features/auth/hooks/useTwoFactorActions";
import { parseApiError } from "@/utils/parseApiError";
import type { CurrentUser } from "@/types/auth.types";

const SECTION_CLASS = "space-y-3 rounded-lg border border-border bg-card p-4";

interface TwoFactorSectionProps {
  user: CurrentUser;
}

/**
 * Roadmap C1 (Xác thực 2 lớp qua email OTP, DEV-068, 2026-09-19) — self-service
 * opt-in, CHỈ render cho role ADMIN/TRUONG_KHOA/DIEU_DUONG_TRUONG/BAN_GIAM_DOC
 * (`ProfilePage.tsx` tự lọc trước khi mount component này). 3 bước UI cục bộ:
 * "idle" (nút Bật/Tắt) → "otp" (nhập mã sau khi bấm Bật) hoặc "disable" (nhập
 * lại password sau khi bấm Tắt).
 */
export function TwoFactorSection({ user }: TwoFactorSectionProps) {
  const [step, setStep] = useState<"idle" | "otp" | "disable">("idle");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const enableMutation = useEnableTwoFactor();
  const confirmMutation = useConfirmTwoFactor();
  const disableMutation = useDisableTwoFactor();

  function handleEnable() {
    enableMutation.mutate(undefined, { onSuccess: () => setStep("otp") });
  }

  function handleConfirm() {
    confirmMutation.mutate(
      { code },
      {
        onSuccess: () => {
          setStep("idle");
          setCode("");
        },
      },
    );
  }

  function handleCancelOtp() {
    setStep("idle");
    setCode("");
  }

  function handleDisable() {
    disableMutation.mutate(
      { password },
      {
        onSuccess: () => {
          setStep("idle");
          setPassword("");
        },
      },
    );
  }

  function handleCancelDisable() {
    setStep("idle");
    setPassword("");
  }

  return (
    <div className={SECTION_CLASS}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Xác thực 2 lớp (2FA)</h2>
          <p className="text-xs text-muted-foreground">
            Yêu cầu thêm mã xác thực gửi qua email mỗi lần đăng nhập — tăng bảo mật cho tài khoản có quyền cao.
          </p>
        </div>
        {user.twoFactorEnabled ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
            <ShieldCheck className="size-4" /> Đã bật
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <ShieldOff className="size-4" /> Chưa bật
          </span>
        )}
      </div>

      {!user.email && (
        <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
          Tài khoản của bạn chưa có email — liên hệ IT/Quản trị hệ thống để được bổ sung trước khi bật tính năng này.
        </p>
      )}

      {user.email && !user.twoFactorEnabled && step === "idle" && (
        <Button variant="secondary" size="sm" onClick={handleEnable} loading={enableMutation.isPending}>
          Bật xác thực 2 lớp
        </Button>
      )}

      {step === "otp" && (
        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Đã gửi mã 6 số qua email {user.email} — nhập mã để hoàn tất bật 2FA.</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
              inputMode="numeric"
              placeholder="000000"
              className="w-32 rounded-md border border-input bg-background px-3 py-2 text-center text-sm tracking-[0.3em] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button size="sm" onClick={handleConfirm} loading={confirmMutation.isPending} disabled={code.length !== 6}>
              Xác nhận
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancelOtp}>
              Huỷ
            </Button>
          </div>
          {confirmMutation.error && <p className="text-xs text-destructive">{parseApiError(confirmMutation.error).message}</p>}
        </div>
      )}

      {user.twoFactorEnabled && step === "idle" && (
        <Button variant="secondary" size="sm" onClick={() => setStep("disable")}>
          Tắt xác thực 2 lớp
        </Button>
      )}

      {step === "disable" && (
        <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">Nhập lại mật khẩu hiện tại để xác nhận tắt xác thực 2 lớp.</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mật khẩu hiện tại"
              className="min-w-48 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button variant="destructive" size="sm" onClick={handleDisable} loading={disableMutation.isPending} disabled={!password}>
              Xác nhận tắt
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancelDisable}>
              Huỷ
            </Button>
          </div>
          {disableMutation.error && <p className="text-xs text-destructive">{parseApiError(disableMutation.error).message}</p>}
        </div>
      )}
    </div>
  );
}
