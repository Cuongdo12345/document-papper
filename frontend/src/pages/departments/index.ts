// // src/pages/departments/index.ts
// // Module Export Structure — public API của Department module
// //
// // Nguồn: DEPARTMENT_MODULE_ANALYSIS.md · DEPARTMENT_UI_SPEC.md
// // Pattern: Re-export tất cả public symbols để import path gọn hơn

// // ─── Pages ────────────────────────────────────────────────────────────────────
// export { DepartmentListPage }   from './DepartmentListPage';   // SCR-14
// export { DepartmentDetailPage } from './DepartmentDetailPage'; // SCR-15
// // ✅ DepartmentCreatePage KHÔNG export — không tồn tại (Create qua Modal)

// // ─── Types ────────────────────────────────────────────────────────────────────
// export type {
//   Department,
//   DepartmentOption,
//   DepartmentPagination,
//   DepartmentListResponse,
//   DepartmentDetailResponse,
//   DepartmentCreateResponse,
//   DepartmentUpdateResponse,
//   DepartmentDeleteResponse,
//   DepartmentApiError,
// } from '../../types/department.types';

// // ─── DTOs ─────────────────────────────────────────────────────────────────────
// export type {
//   GetDepartmentsParams,
//   CreateDepartmentPayload,
//   UpdateDepartmentPayload,
//   DepartmentFormValues,
//   SortOrder,
// } from '../../types/department.dto';

// // ─── Schema ───────────────────────────────────────────────────────────────────
// export {
//   departmentSchema,
//   createDepartmentValidator,
// } from '../../schemas/department.schema';
// export type { DepartmentFormValues as DepartmentSchemaValues } from '../../schemas/department.schema';

// // ─── Constants ────────────────────────────────────────────────────────────────
// export {
//   DEPARTMENT_QUERY_KEYS,
//   DEPARTMENT_MUTATION_KEYS,
//   DEPARTMENT_STALE_TIME,
//   DEPARTMENT_GC_TIME,
//   DEPARTMENT_LIST_DEFAULTS,
//   DEPARTMENT_EMPTY_TEXT,
//   DEPARTMENT_FILTER_KEYS,
//   DEPARTMENT_FILTER_FIELDS,
//   DEPARTMENT_ERROR_MESSAGES,
//   DEPARTMENT_SUCCESS_MESSAGES,
//   DEPARTMENT_MODAL_WIDTH,
//   DEPARTMENT_DELETE_CONFIRM,
// } from '../../constants/department.constants';

// // ─── Permissions ──────────────────────────────────────────────────────────────
// export {
//   DEPARTMENT_ALLOWED_ROLES,
//   DEPARTMENT_DELETE_ROLES,
// } from '../../constants/department.permissions';

// // ─── Routes ───────────────────────────────────────────────────────────────────
// export { DEPARTMENT_ROUTES } from '../../router/routes/department.routes';
