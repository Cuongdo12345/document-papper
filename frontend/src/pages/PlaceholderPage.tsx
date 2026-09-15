import type { ComponentType } from "react";
import { Construction } from "lucide-react";
import { PageHeader, type BreadcrumbItem } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

interface PlaceholderPageProps {
  title: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  icon?: ComponentType<{ className?: string }>;
}

/**
 * Placeholder cho domain CHƯA có FE task riêng (Users/Departments/Documents
 * — FE-02/03/04+). KHÔNG phải trang nghiệp vụ thật (Mục 4/33 FE-01: không
 * xây Users/Documents Management hoàn chỉnh ở FE-01) — chỉ chứng minh
 * route+layout+PageHeader+EmptyState hoạt động nhất quán, sẵn sàng để FE
 * task sau thay nội dung `<Outlet/>` bằng trang thật mà KHÔNG cần đổi route/
 * layout.
 */
export function PlaceholderPage({ title, description, breadcrumb, icon = Construction }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} breadcrumb={breadcrumb} />
      <EmptyState
        icon={icon}
        title="Chức năng đang được xây dựng"
        message="Trang này sẽ được hoàn thiện ở FE task tiếp theo."
      />
    </div>
  );
}
