import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { usePermission } from "@/hooks/usePermission";
import { ASSET_MODULES, assetDetailPath } from "@/features/assets/constants/assetModule.constants";
import type { AssetType } from "@/types/asset.types";

interface AssetNameLinkProps {
  assetType: AssetType | undefined;
  id: string;
  children: ReactNode;
  className?: string;
  title?: string;
}

/**
 * FE-44 — liên kết tới trang chi tiết tài sản ĐÚNG module (`/app/it-assets/:id` hoặc `/app/medical-assets/:id`).
 * Chỉ thành liên kết khi biết loại VÀ người xem có quyền xem chi tiết loại đó (kế hoạch mục 4.7: "liên kết chi tiết
 * chỉ hiện với loại người xem có quyền"); còn lại hiện chữ thường, không dẫn tới trang 403/404.
 */
export function AssetNameLink({ assetType, id, children, className, title }: AssetNameLinkProps) {
  const { hasPermission } = usePermission();
  if (assetType && hasPermission(ASSET_MODULES[assetType].permissions.viewDetail)) {
    return (
      <Link to={assetDetailPath(assetType, id)} className={className} title={title}>
        {children}
      </Link>
    );
  }
  return (
    <span className={className} title={title}>
      {children}
    </span>
  );
}
