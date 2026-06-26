/**
 * AppPageHeader.tsx — CMP-07
 * Layer 1 — Layout Component
 *
 * Header chuẩn cho tất cả private screens (32 màn hình):
 *   - Breadcrumb trail (optional)
 *   - Back button (optional)
 *   - Page title + description
 *   - Action buttons toolbar (optional, right-aligned)
 *   - Extra slot (optional)
 *
 * Dependencies:
 *   - antd: Breadcrumb, Button, Divider, Space, Tooltip, Typography
 *   - react-router-dom: useNavigate, Link
 *   - ./AppPageHeader.types
 *
 * KHÔNG import từ: pages/, features/, hooks/queries/, api/, store/
 * Không gọi API, không đọc store — nhận tất cả qua props.
 */

import React from 'react';
import { Breadcrumb, Button, Divider, Space, Tooltip, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import type {
  AppPageHeaderProps,
  BreadcrumbItem,
  PageAction,
} from './AppPageHeader.types';

const { Title, Text } = Typography;

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** Render một breadcrumb item — link nếu có href, text nếu không */
const BreadcrumbNode: React.FC<{ item: BreadcrumbItem }> = ({ item }) => {
  if (item.href) {
    return (
      <Link to={item.href} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {item.icon}
        {item.label}
      </Link>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {item.icon}
      {item.label}
    </span>
  );
};

/** Render một action button với tooltip và hidden support */
const ActionButton: React.FC<{ action: PageAction }> = ({ action }) => {
  if (action.hidden) return null;

  const btn = (
    <Button
      key={action.key}
      type={
        action.variant === 'danger'
          ? 'primary'
          : action.variant === 'text'
          ? 'text'
          : action.variant === 'link'
          ? 'link'
          : action.variant === 'primary'
          ? 'primary'
          : 'default'
      }
      danger={action.variant === 'danger'}
      icon={action.icon}
      onClick={action.onClick}
      disabled={action.disabled}
      loading={action.loading}
    >
      {action.label}
    </Button>
  );

  // Bọc Tooltip nếu có tooltip text
  if (action.tooltip) {
    return (
      <Tooltip key={action.key} title={action.tooltip}>
        {/* span wrapper cần thiết vì Tooltip không work với disabled Button trực tiếp */}
        <span style={{ display: 'inline-block' }}>{btn}</span>
      </Tooltip>
    );
  }

  return btn;
};

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

/**
 * AppPageHeader
 *
 * Header chuẩn dùng cho tất cả màn hình trong MainLayout.
 * Đặt ở đầu page content, trước FilterBar / DataTable / Form.
 *
 * @example
 * // List page — không có breadcrumb, không có back button
 * <AppPageHeader
 *   title="Danh sách Đề xuất"
 *   actions={[
 *     { key: 'create', label: 'Tạo mới', variant: 'primary', icon: <PlusOutlined />, onClick: ... }
 *   ]}
 * />
 *
 * @example
 * // Detail page — có breadcrumb + back + edit/delete actions
 * <AppPageHeader
 *   title="PR-CNTT-2026-0001"
 *   showBack
 *   breadcrumbs={[
 *     { label: 'Đề xuất', href: '/documents/proposals' },
 *     { label: 'PR-CNTT-2026-0001' },
 *   ]}
 *   actions={[
 *     { key: 'delete', label: 'Xóa', variant: 'danger', hidden: !isAdmin, onClick: ... },
 *     { key: 'edit',   label: 'Chỉnh sửa', variant: 'default', onClick: ... },
 *   ]}
 * />
 */
const AppPageHeader: React.FC<AppPageHeaderProps> = ({
  title,
  description,
  breadcrumbs,
  showBack = false,
  onBack,
  actions,
  extra,
  marginBottom = 24,
  divider = false,
  className,
  style,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // Lọc các action không hidden để xác định có hiển thị toolbar không
  const visibleActions = actions?.filter((a) => !a.hidden) ?? [];
  const hasToolbar = visibleActions.length > 0 || extra != null;

  return (
    <div
      className={className}
      style={{ marginBottom, ...style }}
    >
      {/* ── Breadcrumb ── */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb
          style={{ marginBottom: 8 }}
          items={breadcrumbs.map((item) => ({
            key: item.href ?? item.label,
            title: <BreadcrumbNode item={item} />,
          }))}
        />
      )}

      {/* ── Title row: Back button + Title + Actions ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Left side: Back + Title + Description */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flex: 1, minWidth: 0 }}>
          {/* Back button */}
          {showBack && (
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={handleBack}
              aria-label="Quay lại trang trước"
              style={{
                // Căn chỉnh với dòng đầu của title
                marginTop: 2,
                flexShrink: 0,
              }}
            />
          )}

          {/* Title + Description block */}
          <div style={{ minWidth: 0 }}>
            <Title
              level={4}
              style={{ margin: 0, lineHeight: 1.4 }}
              ellipsis={{ tooltip: typeof title === 'string' ? title : undefined }}
            >
              {title}
            </Title>

            {description && (
              <Text
                type="secondary"
                style={{ fontSize: 13, marginTop: 2, display: 'block' }}
              >
                {description}
              </Text>
            )}
          </div>
        </div>

        {/* Right side: Actions + Extra */}
        {hasToolbar && (
          <Space
            wrap
            style={{ flexShrink: 0 }}
            aria-label="Page actions"
          >
            {actions?.map((action) => (
              <ActionButton key={action.key} action={action} />
            ))}

            {extra}
          </Space>
        )}
      </div>

      {/* ── Optional bottom divider ── */}
      {divider && <Divider style={{ marginTop: 16, marginBottom: 0 }} />}
    </div>
  );
};

export default AppPageHeader;
