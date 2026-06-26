// (trích đoạn — thêm namespace dashboard vào object endpoint trung tâm, không tạo file riêng theo API_LAYER_SPEC.md §1.1)

// ─── Endpoint Constants — export riêng để department.service.ts import gọn ───

// export const DEPARTMENT_ENDPOINTS = {
//   /** GET /api/departments — list với filter/pagination/sort */
//   list:             '/departments',

//   /** GET /api/departments/:id — detail theo ObjectId */
//   detail:  (id: string) => `/departments/${id}`,

//   /** POST /api/departments — create */
//   create:           '/departments',

//   /** PUT /api/departments/:id — update (KHÔNG phải PATCH) */
//   update:  (id: string) => `/departments/${id}`,

//   /** DELETE /api/departments/:id — hard delete */
//   delete:  (id: string) => `/departments/${id}`,
// } as const;
// ─── Snippet thêm vào object ENDPOINTS trung tâm ──────────────────────────────

/*
// Trong src/api/endpoints.ts, thêm namespace `departments` vào object ENDPOINTS:
*/

export const API_ENDPOINTS = {
  // ... auth, users, departments, documents, workflows, rbac, export, upload, audit, performance

  dashboard: {
    adminSummary: "/dashboard/admin-summary",
    departmentStats: (departmentId: string) =>
      `/dashboard/department/${encodeURIComponent(departmentId)}`,
    proposalConversion: "/dashboard/kpi/proposal-conversion",
    deviceDamageTrend: "/dashboard/kpi/device-damage-trend",
    topDamagedDevices: "/dashboard/kpi/top-damaged-devices",
    topDamagedInks: "/dashboard/kpi/top-damaged-inks",
    deviceStats: "/dashboard/device-stats",
  },

  department: {
    /** GET /departments — list với filter/pagination/sort */
    list: "/departments",
    /** GET /departments/:id — detail theo ObjectId */
    detail: (id: string) => `/departments/${id}`,
    /** POST /departments — create */
    create: "/departments",
    /** PUT /departments/:id — update (KHÔNG phải PATCH) */
    update: (id: string) => `/departments/${id}`,
    /** DELETE /departments/:id — hard delete */
    delete: (id: string) => `/departments/${id}`,
  },
} as const;

// Cuối file endpoints.ts — export riêng để service import không phụ thuộc toàn bộ ENDPOINTS
export const DEPARTMENT_ENDPOINTS = API_ENDPOINTS.department;
export const DASHBOARD_ENDPOINTS = API_ENDPOINTS.dashboard;
