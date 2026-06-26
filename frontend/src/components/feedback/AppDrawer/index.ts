// ─── Exports ──────────────────────────────────────────────────────────────────

export { default as AppDrawer } from './AppDrawer'
export { default } from './AppDrawer'

export type {
  AppDrawerProps,
  AppDrawerMode,
  AppDrawerPlacement,
  DrawerFooterAction,
  DrawerCloseGuard,
  DrawerErrorState,
  Role,
} from './AppDrawer.types'

export { buildDrawerFooter, filterActionsByRole, DEFAULT_SUBMIT_TEXT } from './AppDrawer.footer'

// ─────────────────────────────────────────────────────────────────────────────
// USAGE RULES
// ─────────────────────────────────────────────────────────────────────────────
//
// ## REUSE RULES
//
// RULE 1 — AppDrawer là reusable component duy nhất cho Drawer trong toàn hệ thống.
//          Không tạo custom Drawer wrapper khác.
//
// RULE 2 — open/onClose state quản lý bởi parent (local useState).
//          Không đưa drawer state lên Zustand.
//          Ref: STATE_MAPPING.md §10 Modal State Mapping.
//
// RULE 3 — Mode phải khớp với intent:
//          view   → read-only, footer chỉ [Đóng]
//          create → blank form, footer [Hủy] [Tạo mới]
//          edit   → pre-filled form, footer [Hủy] [Lưu thay đổi]
//          custom → page kiểm soát hoàn toàn footer via footerActions
//
// RULE 4 — submitLoading PHẢI được truyền khi có mutation:
//          submitLoading={mutation.isPending}
//          AppDrawer tự block close và disable cancel khi submitLoading=true.
//
// RULE 5 — destroyOnClose=true (default) — KHÔNG override thành false
//          trừ khi có lý do rõ ràng (vd: tab content cần giữ scroll position).
//          Lý do: AntD Form không reset nếu không unmount.
//
// RULE 6 — closeGuard phải được truyền với mode='create' hoặc 'edit'
//          khi form có dữ liệu quan trọng (tránh mất data do click nhầm).
//          isDirty: () => form.isFieldsTouched()
//
// RULE 7 — Permission-aware actions: truyền roles vào DrawerFooterAction.
//          ADMIN bypass tự động — không cần check isAdmin thủ công trong page.
//
// RULE 8 — width mặc định 520px cho simple forms.
//          Dùng 640-720px cho complex forms (nhiều columns, checkboxes).
//          Trên mobile < 640px → tự động 100% bất kể width prop.
//
// ## DO NOT DUPLICATE RULES
//
// ✗ KHÔNG tạo DrawerWrapper, SidePanel, SlideOver riêng — dùng AppDrawer.
//
// ✗ KHÔNG dùng AntD Drawer trực tiếp trong page — luôn qua AppDrawer.
//
// ✗ KHÔNG đưa business logic vào AppDrawer:
//   - Không gọi API trong AppDrawer
//   - Không import từ hooks/queries/
//   - Không import từ store/ (ngoại trừ auth.store cho roleName)
//
// ✗ KHÔNG tự build footer trong children rồi truyền hideFooter=true
//   trừ khi footerActions/onSubmit/mode không đủ để xử lý use case.
//
// ✗ KHÔNG lưu drawer state (isOpen, editingRecord) vào Zustand store.
//   Dùng local useState trong parent component.
//
// ✗ KHÔNG re-implement close guard logic trong page.
//   Truyền closeGuard prop thay vì tự handle onClose.
//
// ## CORRECT USAGE PATTERN (create/edit)
//
// const [open, setOpen] = useState(false)
// const [form] = Form.useForm()
// const mutation = useCreateSomething()
//
// const handleSubmit = async () => {
//   const values = await form.validateFields()
//   await mutation.mutateAsync(values)
//   setOpen(false)
//   form.resetFields()
// }
//
// return (
//   <>
//     <Button onClick={() => setOpen(true)}>Tạo mới</Button>
//     <AppDrawer
//       open={open}
//       onClose={() => { setOpen(false); form.resetFields() }}
//       mode="create"
//       title="Tạo mới"
//       onSubmit={handleSubmit}
//       submitLoading={mutation.isPending}
//       closeGuard={{ isDirty: () => form.isFieldsTouched() }}
//     >
//       <Form form={form} layout="vertical">
//         ...
//       </Form>
//     </AppDrawer>
//   </>
// )
