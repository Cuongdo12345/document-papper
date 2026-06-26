// src/pages/dashboard/DashboardPage.tsx
//
// SCR-04 — Dashboard chính. Route: /dashboard
// Guard: PrivateRoute allowedRoles={['ADMIN']} (router level — không PermissionGate ở đây)
//
// Source: DASHBOARD_UI_SPEC.md §1, §2, §7, §12 · LAYOUT_IMPLEMENTATION_SUMMARY.md
//
// Kiến trúc lazy-per-tab: AntD Tabs render tất cả TabPane trong DOM nhưng mỗi
// Tab component tự quản lý enabled={activeTab === TAB_KEY} cho query của nó —
// đảm bảo chỉ tab đang active mới gọi API (DASHBOARD_UI_SPEC.md §1.2).

import { useState } from "react";
import { Tabs } from "antd";
import AppPageHeader from "../../components/layout/AppPageHeader";
import {
  DASHBOARD_TAB_KEYS,
  DASHBOARD_DEFAULT_TAB,
  type DashboardTabKey,
} from "../../constants/dashboard.constants";

import { OverviewTab } from "./tabs/OverviewTab";
import { DepartmentTab } from "./tabs/DepartmentTab";
import { ProposalKpiTab } from "./tabs/ProposalKpiTab";
import { DamageTrendTab } from "./tabs/DamageTrendTab";
import { TopDamagedDevicesTab } from "./tabs/TopDamagedDevicesTab";
import { TopDamagedInksTab } from "./tabs/TopDamagedInksTab";
import { DeviceStatsTab } from "./tabs/DeviceStatsTab";

// ⚠️ departmentList query KHÔNG thuộc Dashboard module — đây là query của module
// Departments (ngoài phạm vi 7 dashboard endpoints). DashboardPage chỉ consume,
// không tự định nghĩa. Import path là placeholder — chỉnh theo vị trí thực tế
// khi module Departments được build.
import { useDepartments } from "../../hooks/queries/useDepartment";

// ─────────────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  // ── Tab state — local, không sync URL ─────────────────────────────────────
  const [activeTab, setActiveTab] = useState<DashboardTabKey>(
    DASHBOARD_DEFAULT_TAB,
  );

  // ── Department options dùng chung Tab 2, Tab 5, Tab 6 ─────────────────────
  // Load 1 lần, share giữa nhiều tab — tránh gọi departmentList API 3 lần riêng biệt
  // const { data: departmentListData, isLoading: isDepartmentListLoading } =
  //   useDepartmentList();

  // const departmentOptions = (departmentListData ?? []).map((dept: any) => ({
  //   value: dept._id,
  //   label: dept.name,
  // }));

  // Thay bằng — departmentOptions đã được hook tính sẵn, không cần map lại
  const { departmentOptions, isLoading: isDepartmentListLoading } =
    useDepartments({ limit: 999, sortBy: 'name', order: 'asc' });

  // ── Tabs config — DASHBOARD_UI_SPEC.md §1.1 ───────────────────────────────
  const tabItems = [
    {
      key: DASHBOARD_TAB_KEYS.OVERVIEW,
      label: "Tổng quan",
      children: (
        <OverviewTab enabled={activeTab === DASHBOARD_TAB_KEYS.OVERVIEW} />
      ),
    },
    {
      key: DASHBOARD_TAB_KEYS.BY_DEPARTMENT,
      label: "Theo phòng ban",
      children: (
        <DepartmentTab
          enabled={activeTab === DASHBOARD_TAB_KEYS.BY_DEPARTMENT}
          departmentOptions={departmentOptions}
          departmentOptionsLoading={isDepartmentListLoading}
        />
      ),
    },
    {
      key: DASHBOARD_TAB_KEYS.KPI_PROPOSAL,
      label: "KPI Đề xuất",
      children: (
        <ProposalKpiTab
          enabled={activeTab === DASHBOARD_TAB_KEYS.KPI_PROPOSAL}
        />
      ),
    },
    {
      key: DASHBOARD_TAB_KEYS.DAMAGE_TREND,
      label: "Xu hướng hư hỏng",
      children: (
        <DamageTrendTab
          enabled={activeTab === DASHBOARD_TAB_KEYS.DAMAGE_TREND}
        />
      ),
    },
    {
      key: DASHBOARD_TAB_KEYS.TOP_DEVICES,
      label: "Top thiết bị hỏng",
      children: (
        <TopDamagedDevicesTab
          enabled={activeTab === DASHBOARD_TAB_KEYS.TOP_DEVICES}
          departmentOptions={departmentOptions}
          departmentOptionsLoading={isDepartmentListLoading}
        />
      ),
    },
    {
      key: DASHBOARD_TAB_KEYS.TOP_INKS,
      label: "Top mực hao hụt",
      children: (
        <TopDamagedInksTab
          enabled={activeTab === DASHBOARD_TAB_KEYS.TOP_INKS}
          departmentOptions={departmentOptions}
          departmentOptionsLoading={isDepartmentListLoading}
        />
      ),
    },
    {
      key: DASHBOARD_TAB_KEYS.DEVICE_STATS,
      label: "Thống kê thiết bị",
      children: (
        <DeviceStatsTab
          enabled={activeTab === DASHBOARD_TAB_KEYS.DEVICE_STATS}
        />
      ),
    },
  ];

  return (
    <div>
      {/* AppPageHeader — DASHBOARD_UI_SPEC.md §1.3: không có actions (read-only) */}
      <AppPageHeader title="Dashboard" breadcrumbs={[{ label: "Trang chủ" }]} />

      {/* Tabs type="card" — DASHBOARD_UI_SPEC.md §1.4 */}
      <Tabs
        type="card"
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as DashboardTabKey)}
        items={tabItems}
        destroyInactiveTabPane={false}
        style={{ marginTop: 24 }}
      />
    </div>
  );
}
