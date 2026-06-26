// // src/components/feedback/AppModal/AppModal.tsx
// import { Modal } from 'antd';
// import type { ReactNode } from 'react';
// import { AppButton } from '../../../components/common/AppButton';

// // ─── Types ────────────────────────────────────────────────────────────────────

// /**
//  * variant:
//  *  "standard"  — Modal thông thường, có title + content + footer
//  *  "confirm"   — Dùng cho action nguy hiểm (xóa, force logout…)
//  *               Hiển thị icon warning, footer luôn là confirm + cancel
//  */
// export type AppModalVariant = 'standard' | 'confirm';

// /**
//  * footerMode:
//  *  "ok-cancel"  — 2 nút: [Cancel] [Confirm]
//  *  "ok-only"    — 1 nút: [Confirm]  ← dùng cho ForgotPasswordPage modal
//  *  "none"       — Không có footer, component tự render footer trong children
//  */
// export type AppModalFooterMode = 'ok-cancel' | 'ok-only' | 'none';

// export interface AppModalProps {
//   // ── Visibility ─────────────────────────────────────────────────────────────
//   open: boolean;
//   onClose: () => void;

//   // ── Content ────────────────────────────────────────────────────────────────
//   title?: ReactNode;
//   children?: ReactNode;

//   // ── Variant & Footer ───────────────────────────────────────────────────────
//   variant?: AppModalVariant;
//   footerMode?: AppModalFooterMode;

//   /** Text nút confirm — default: "Xác nhận" */
//   confirmText?: string;
//   /** Text nút cancel — default: "Huỷ" */
//   cancelText?: string;

//   /** Callback khi click Confirm button */
//   onConfirm?: () => void;
//   /** Loading state cho Confirm button (khi confirm trigger async action) */
//   confirmLoading?: boolean;

//   // ── Behavior ───────────────────────────────────────────────────────────────
//   /** Đóng modal khi click mask — default: false */
//   maskClosable?: boolean;
//   /** Hiển thị nút × ở góc phải title — default: true */
//   closable?: boolean;

//   // ── Layout ─────────────────────────────────────────────────────────────────
//   /** Width của modal — default: 520 (AntD default) */
//   width?: number | string;

//   /** Thêm className vào modal content wrapper nếu cần override style */
//   className?: string;
// }

// // ─── Component ───────────────────────────────────────────────────────────────

// export const AppModal = ({
//   open,
//   onClose,
//   title,
//   children,
//   variant = 'standard',
//   footerMode = 'ok-cancel',
//   confirmText = 'Xác nhận',
//   cancelText = 'Huỷ',
//   onConfirm,
//   confirmLoading = false,
//   maskClosable = false,
//   closable = true,
//   width,
//   className,
// }: AppModalProps) => {
//   // ── Footer builder ─────────────────────────────────────────────────────────
//   const renderFooter = (): ReactNode => {
//     if (footerMode === 'none') return null;

//     if (footerMode === 'ok-only') {
//       return (
//         <AppButton
//           variant={variant === 'confirm' ? 'danger' : 'primary'}
//           onClick={onConfirm ?? onClose}
//           loading={confirmLoading}
//         >
//           {confirmText}
//         </AppButton>
//       );
//     }

//     // ok-cancel (default)
//     return (
//       <>
//         <AppButton variant="secondary" onClick={onClose} disabled={confirmLoading}>
//           {cancelText}
//         </AppButton>
//         <AppButton
//           variant={variant === 'confirm' ? 'danger' : 'primary'}
//           onClick={onConfirm}
//           loading={confirmLoading}
//         >
//           {confirmText}
//         </AppButton>
//       </>
//     );
//   };

//   // ── Render ─────────────────────────────────────────────────────────────────
//   return (
//     <Modal
//       open={open}
//       onCancel={onClose}
//       title={title}
//       footer={footerMode === 'none' ? null : renderFooter()}
//       maskClosable={maskClosable}
//       closable={closable}
//       width={width}
//       className={className}
//       destroyOnClose
//     >
//       {children}
//     </Modal>
//   );
// };
