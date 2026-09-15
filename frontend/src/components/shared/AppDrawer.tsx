import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: "sm" | "md" | "lg";
  children: ReactNode;
}

const WIDTH_CLASS: Record<NonNullable<AppDrawerProps["width"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

/**
 * SHARED_COMPONENTS_LIBRARY.md: "AppDrawer" — panel trượt từ phải cho
 * form dài/chi tiết record (vd Document detail, Asset detail — FE-04+).
 * Cùng nền Radix Dialog với `AppModal`, chỉ khác vị trí/animation.
 */
export function AppDrawer({ open, onClose, title, width = "md", children }: AppDrawerProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className={cn(
            "fixed right-0 top-0 z-50 h-full w-full border-l border-border bg-card shadow-lg",
            "data-[state=open]:animate-in data-[state=open]:slide-in-from-right data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
            WIDTH_CLASS[width],
          )}
        >
          <div className="flex items-center justify-between border-b border-border p-4">
            <Dialog.Title className="text-base font-semibold text-foreground">{title}</Dialog.Title>
            <Dialog.Close
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Đóng"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>
          <div className="h-[calc(100%-57px)] overflow-y-auto p-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
