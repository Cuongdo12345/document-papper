import { createContext } from "react";
import type { AssetModuleConfig } from "@/features/assets/constants/assetModule.constants";

/** Module tài sản đang hiển thị (CNTT / y tế). `null` khi component nằm ngoài `AssetModuleLayout`. */
export const AssetModuleContext = createContext<AssetModuleConfig | null>(null);
