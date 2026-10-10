import { useContext } from "react";
import { AssetModuleContext } from "@/features/assets/context/assetModuleContext";
import type { AssetModuleConfig } from "@/features/assets/constants/assetModule.constants";

/**
 * Module tài sản hiện tại (loại, đường dẫn API/trang, bộ quyền). CHỈ dùng trong cây route do
 * `AssetModuleLayout` bọc; ném lỗi rõ ràng nếu dùng sai chỗ thay vì âm thầm gọi nhầm API.
 */
export function useAssetModule(): AssetModuleConfig {
  const module = useContext(AssetModuleContext);
  if (!module) throw new Error("useAssetModule phải được dùng bên trong <AssetModuleLayout>");
  return module;
}
