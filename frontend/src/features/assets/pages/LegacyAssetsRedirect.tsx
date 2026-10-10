import { Navigate, useLocation } from "react-router-dom";
import { ErrorState } from "@/components/shared/ErrorState";
import { LoadingState } from "@/components/shared/LoadingState";
import { usePermission } from "@/hooks/usePermission";
import { PERMISSIONS } from "@/constants/permissions";
import { useAssetLookupItem } from "@/features/assets/hooks/useAssetLookup";
import { ASSET_MODULES, assetDetailPath } from "@/features/assets/constants/assetModule.constants";
import { parseApiError } from "@/utils/parseApiError";

/** Trang con tĩnh của module (không phải id tài sản). */
const STATIC_SUBPATHS = new Set(["create", "categories", "scan", "maintenance-calendar"]);

/**
 * FE-42 (tách module Tài sản, Giai đoạn 7) — đường dẫn cũ `/app/assets/*` (link đã lưu, thông báo cũ, bookmark)
 * chuyển hướng sang module mới:
 *   - `/app/assets` và trang con tĩnh (`create`, `categories`, `scan`, `maintenance-calendar`) → module đầu tiên
 *     người dùng có quyền xem (CNTT trước, rồi y tế);
 *   - `/app/assets/:id` → hỏi backend tài sản thuộc loại nào (`/assets/lookup-options/:id`) rồi chuyển tới đúng
 *     `/app/it-assets/:id` hoặc `/app/medical-assets/:id`.
 */
export function LegacyAssetsRedirect() {
  const { pathname } = useLocation();
  const { hasPermission } = usePermission();
  const sub = pathname.replace(/^\/app\/assets\/?/, "").split("/")[0] ?? "";
  const isStatic = sub === "" || STATIC_SUBPATHS.has(sub);

  const lookup = useAssetLookupItem(isStatic ? undefined : sub);

  if (isStatic) {
    const module = hasPermission(PERMISSIONS.IT_ASSET_VIEW)
      ? ASSET_MODULES.IT
      : hasPermission(PERMISSIONS.MEDICAL_ASSET_VIEW)
        ? ASSET_MODULES.MEDICAL
        : null;
    if (!module) {
      return <ErrorState message="Tài khoản của bạn không có quyền xem tài sản nào." />;
    }
    return <Navigate to={sub ? `${module.routeBase}/${sub}` : module.routeBase} replace />;
  }

  if (lookup.isLoading) return <LoadingState label="Đang mở tài sản..." />;
  if (lookup.isError || !lookup.data) {
    return (
      <ErrorState
        message={lookup.error ? parseApiError(lookup.error).message : "Không tìm thấy tài sản, hoặc bạn không có quyền xem loại tài sản này."}
        onRetry={() => lookup.refetch()}
      />
    );
  }
  return <Navigate to={assetDetailPath(lookup.data.assetType, lookup.data._id)} replace />;
}
