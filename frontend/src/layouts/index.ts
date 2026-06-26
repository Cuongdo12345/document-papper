// ─── MainLayout ───────────────────────────────────────────────────────────────
export { default as MainLayout }           from './MainLayout/MainLayout'
export { default as GlobalToastConsumer }  from './MainLayout/GlobalToastConsumer'
export { default as MobileSidebarOverlay } from './MainLayout/MobileSidebarOverlay'

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export { default as Sidebar }               from './Sidebar/Sidebar'
export { default as SidebarMenu }           from './Sidebar/SidebarMenu'
export { default as SidebarLogo }           from './Sidebar/SidebarLogo'
export { default as SidebarCollapseButton } from './Sidebar/SidebarCollapseButton'
export {
  MENU_GROUPS,
  resolveActiveKey,
  resolveOpenGroupKey,
} from './Sidebar/menu.config'
export type { MenuItemConfig, MenuGroupConfig, Role } from './Sidebar/menu.config'

// ─── Header ───────────────────────────────────────────────────────────────────
// export { default as Header }          from './Header/Header'
// export { default as ProfileDropdown } from './Header/ProfileDropdown'
