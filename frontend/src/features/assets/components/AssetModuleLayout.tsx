import { Outlet } from "react-router-dom";
import { AssetModuleContext } from "@/features/assets/context/assetModuleContext";
import { ASSET_MODULES } from "@/features/assets/constants/assetModule.constants";
import type { AssetType } from "@/types/asset.types";

/**
 * Route layout cho `/app/it-assets/*` và `/app/medical-assets/*` — cung cấp module (loại tài sản) cho mọi
 * trang/hook con qua `useAssetModule()`. Không render thêm giao diện.
 */
export function AssetModuleLayout({ assetType }: { assetType: AssetType }) {
  return (
    <AssetModuleContext.Provider value={ASSET_MODULES[assetType]}>
      <Outlet />
    </AssetModuleContext.Provider>
  );
}
