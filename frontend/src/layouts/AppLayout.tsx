import { Outlet } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { Sidebar } from "@/layouts/Sidebar";
import { Header } from "@/layouts/Header";
import { useUIStore } from "@/stores/uiStore";

/**
 * App Shell (Mục 14 FE-01):
 * ┌─────────────────────────────┐
 * │ Header                      │
 * ├───────────┬─────────────────┤
 * │ Sidebar   │ Main Content    │
 * └───────────┴─────────────────┘
 * Desktop (≥lg): sidebar cố định, expand/collapse. Mobile (<lg): sidebar ẩn,
 * mở qua drawer overlay (Mục 22/23) — trigger ở `Header`.
 */
export function AppLayout() {
  const mobileNavOpen = useUIStore((s) => s.mobileNavOpen);
  const closeMobileNav = useUIStore((s) => s.closeMobileNav);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <div className="hidden lg:block">
        <Sidebar variant="desktop" />
      </div>

      <Dialog.Root open={mobileNavOpen} onOpenChange={(open) => !open && closeMobileNav()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 lg:hidden" />
          <Dialog.Content className="fixed inset-y-0 left-0 z-50 lg:hidden" aria-describedby={undefined}>
            <Dialog.Title className="sr-only">Menu điều hướng</Dialog.Title>
            <Sidebar variant="mobile" onNavigate={closeMobileNav} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
