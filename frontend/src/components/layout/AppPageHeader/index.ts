/**
 * components/common/AppPageHeader/index.ts
 *
 * Barrel export cho AppPageHeader module.
 *
 * Import pattern cho consumers:
 *
 *   // Component
 *   import AppPageHeader from '@/components/common/AppPageHeader'
 *
 *   // Types
 *   import type {
 *     AppPageHeaderProps,
 *     PageAction,
 *     BreadcrumbItem,
 *     ActionButtonVariant,
 *   } from '@/components/common/AppPageHeader'
 */

// ── Component (default export) ──
export { default } from './AppPageHeader';

// ── Types ──
export type {
  AppPageHeaderProps,
  BreadcrumbItem,
  PageAction,
  ActionButtonVariant,
} from './AppPageHeader.types';
