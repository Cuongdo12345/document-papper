import { lazy } from "react";

/**
 * DEV-073/FE-24 — tách riêng file chỉ để wrap `React.lazy` (không khai báo
 * trực tiếp trong `routes/index.tsx`) để tránh warning `only-export-components`
 * (oxlint) của file đó — file này chỉ export đúng 1 component reference.
 * `@xyflow/react` (lib đồ hoạ graph, khá nặng) CHỈ tải khi vào đúng route
 * `/app/system-design`, không nằm trong bundle chính.
 */
export const SystemDesignPage = lazy(() =>
  import("@/features/systemDesign/pages/SystemDesignPage").then((m) => ({ default: m.SystemDesignPage })),
);
