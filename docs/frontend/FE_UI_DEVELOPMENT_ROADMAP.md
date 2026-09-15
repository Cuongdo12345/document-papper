# FE_UI_DEVELOPMENT_ROADMAP.md

## Frontend UI/UX Development Roadmap --- Document Papper

**Status:** APPROVED DIRECTION\
**Scope:** FE-01 trở đi\
**Design direction:** Modern Healthcare Enterprise\
**Primary source:** FE Knowledge Base + FE_FOUNDATION_SPEC.md\
**Purpose:** Là roadmap UI/UX master cho toàn bộ Frontend, bổ sung cho
FE development roadmap và không thay thế Foundation Specification.

------------------------------------------------------------------------

# 1. Mục tiêu

Frontend không chỉ cần đúng chức năng mà phải đạt:

-   Modern Healthcare Enterprise
-   Professional và đáng tin cậy
-   Clean, rõ hierarchy
-   Information-dense nhưng không chật
-   Nhất quán giữa các module
-   Responsive
-   Accessibility cơ bản
-   Loading / Empty / Error / Success states đầy đủ
-   Permission-aware UI
-   Có thể mở rộng mà không phá Design System

Từ FE-01 trở đi, mỗi task phải được đánh giá đồng thời theo:

``` text
FUNCTIONAL
+
UI DESIGN
+
UX
+
RESPONSIVE
+
ACCESSIBILITY
+
PERMISSION UX
```

------------------------------------------------------------------------

# 2. Nguyên tắc thiết kế tổng thể

## 2.1 Modern Healthcare Enterprise

Ưu tiên:

-   nền sáng, sạch
-   typography dễ đọc
-   visual hierarchy rõ
-   spacing có hệ thống
-   màu semantic rõ ràng
-   card và panel tiết chế
-   bảng thông tin dễ scan
-   action chính nổi bật nhưng không lòe loẹt

Tránh:

-   gradient lạm dụng
-   neon colors
-   shadow nặng
-   border radius quá lớn
-   animation liên tục
-   dashboard kiểu template generic
-   quá nhiều card/metric không có giá trị
-   icon trang trí không cần thiết

## 2.2 Information hierarchy

Mỗi màn hình nên trả lời nhanh:

1.  Tôi đang ở đâu?
2.  Trang này dùng để làm gì?
3.  Thông tin quan trọng nhất là gì?
4.  Tôi có thể thực hiện action nào?
5.  Trạng thái hiện tại là gì?
6.  Nếu có lỗi hoặc không có dữ liệu thì tôi phải làm gì?

## 2.3 UI consistency

Không tạo style riêng cho từng page nếu component/token đã tồn tại.

Shared component phải được ưu tiên tái sử dụng.

------------------------------------------------------------------------

# 3. Design System Roadmap

FE_FOUNDATION_SPEC.md xác nhận các token cụ thể vẫn cần quyết định
riêng. Vì vậy FE-01 là mốc chốt UI Foundation đầu tiên.

## FE-01 Design System Foundation

Chốt:

-   Color palette
-   Semantic colors
-   Typography
-   Font scale
-   Spacing scale
-   Border radius
-   Border
-   Shadow/elevation
-   Focus state
-   Disabled state
-   Hover state
-   Status colors
-   Layout widths
-   Breakpoints

### Semantic color groups

Tối thiểu cần nhóm:

``` text
Primary
Secondary
Success
Warning
Danger
Info
Neutral
Background
Surface
Border
Text
Muted
```

Status color phải có mapping riêng cho:

-   workflowStatus
-   AssetStatus

Không dùng một mapping màu duy nhất cho hai domain nếu semantics khác
nhau.

------------------------------------------------------------------------

# 4. Component strategy

Theo Foundation Specification:

## Tailwind

Dùng cho:

-   layout
-   spacing
-   typography
-   color
-   responsive
-   visual styling

## shadcn/ui

Chỉ dùng cho component có behavior/accessibility phức tạp:

-   Select
-   DatePicker
-   Dialog/Modal
-   Dropdown Menu
-   Popover
-   Tabs
-   Toast
-   Table primitives

Không giữ nguyên default theme của shadcn; phải override theo Design
System của project.

## Custom shared components

Ưu tiên xây:

``` text
AppButton
StatusBadge
PermissionBadge
PageHeader
DataTable
FilterBar
AppModal
AppDrawer
FileUpload
EmptyState
LoadingState
ErrorState
ConfirmDialog
```

Component phải nằm đúng boundary và không chứa business rule của domain.

------------------------------------------------------------------------

# 5. Global UX states

Mọi feature page phải có state rõ ràng.

## Loading

-   ưu tiên skeleton cho bảng/card/page content
-   không dùng spinner che toàn bộ màn hình nếu skeleton phù hợp
-   giữ layout ổn định để tránh layout shift

## Empty

Ví dụ:

``` text
Chưa có tài liệu nào
[Tạo tài liệu]
```

Empty state phải giải thích nguyên nhân hoặc action tiếp theo khi có
thể.

## Error

Không để trang trắng.

Phải có:

``` text
Thông báo lỗi
[Thử lại]
```

## Success

Mutation thành công cần feedback rõ:

-   toast
-   inline feedback nếu phù hợp
-   refresh/invalidate query đúng cách

## Disabled

Action không khả dụng phải có visual state rõ ràng.

## Permission denied

Nếu user không có permission:

-   ẩn action khi phù hợp
-   hoặc disable + giải thích khi UX cần giữ context
-   route bị chặn phải đi tới `/403`

Permission UI chỉ là UX; backend vẫn là security boundary.

------------------------------------------------------------------------

# 6. Responsive strategy

Đối tượng chính là nhân viên bệnh viện sử dụng desktop/laptop/tablet.

Ưu tiên:

``` text
Desktop
Laptop
Tablet
Mobile
```

Breakpoints dùng Tailwind mặc định nếu chưa có quyết định khác:

``` text
sm
md
lg
xl
2xl
```

Không bắt buộc mobile-first sâu, nhưng mobile không được vỡ layout.

## Sidebar

Desktop:

``` text
Expanded sidebar
```

Tablet:

``` text
Collapsible sidebar
```

Mobile:

``` text
Drawer navigation
```

## Data table

Bảng nhiều cột:

-   scroll ngang trong container riêng
-   hoặc ẩn cột phụ ở breakpoint phù hợp
-   không để toàn bộ page bị scroll ngang nếu có thể tránh

------------------------------------------------------------------------

# 7. FE-01 --- Authentication + App Shell + UI Foundation

## Mục tiêu

FE-01 là mốc tạo visual language đầu tiên cho toàn hệ thống.

### UI scope

#### Login

-   Brand/logo
-   Welcome message
-   Username
-   Password
-   Show/hide password
-   Submit
-   Loading
-   Validation
-   API error
-   Responsive layout
-   Keyboard accessibility

#### Auth pages

-   Login
-   Forgot password
-   Reset password

Register chỉ triển khai khi backend contract/decision được xác nhận.

### App Shell

-   AppLayout
-   Sidebar
-   Header
-   Main content area
-   User/profile area
-   Responsive navigation
-   Breadcrumb/page context nếu cần
-   403
-   404

### Sidebar

Navigation phải permission-driven.

Không hard-code:

``` text
role === "ADMIN"
```

trong từng menu item.

### FE-01 shared components

Ưu tiên:

``` text
AppButton
PageHeader
StatusBadge
PermissionBadge
LoadingState
EmptyState
ErrorState
ConfirmDialog
```

Chỉ tạo component thực sự cần cho FE-01 và có khả năng tái sử dụng.

### FE-01 UI quality gate

``` text
[ ] Visual hierarchy
[ ] Design tokens
[ ] Login polished
[ ] App shell polished
[ ] Sidebar responsive
[ ] Header responsive
[ ] Loading state
[ ] Error state
[ ] Empty/fallback state
[ ] Permission-aware navigation
[ ] Focus states
[ ] Keyboard basics
[ ] No console errors
```

------------------------------------------------------------------------

# 8. FE-02 --- RBAC / Permission UI Foundation

## Mục tiêu

Biến RBAC backend thành UI behavior nhất quán.

### UI

-   PermissionGuard
-   ProtectedRoute
-   403 page
-   PermissionBadge
-   Permission-aware actions
-   Permission-aware navigation

### Quy tắc

Nguồn permission:

``` text
GET /users/me
    ↓
user.permissions[]
```

Không:

-   decode JWT để quyết định permission
-   hard-code role-permission mapping
-   rải `user.permissions.includes()` khắp UI

Tất cả dùng shared permission abstraction.

------------------------------------------------------------------------

# 9. FE-03 --- Users / Departments UI

Nếu roadmap FE hiện tại tách Users và Departments thành các task riêng,
giữ mapping task tương ứng; UI roadmap này mô tả UX chung.

## Users

UI cần:

-   PageHeader
-   Search/filter area
-   DataTable
-   StatusBadge
-   Role display
-   Create/Edit form
-   Detail view nếu cần
-   Password/reset actions
-   Confirmation dialog
-   Loading/empty/error
-   Permission-aware actions

## Departments

UI cần:

-   List
-   Search/filter nếu API hỗ trợ
-   Create/Edit
-   Detail hoặc drawer nếu phù hợp
-   Active/inactive state
-   Confirmation
-   Loading/empty/error

### Table rules

Server-side pagination/sorting/filtering.

Không tải toàn bộ dataset rồi filter client nếu backend có query params.

------------------------------------------------------------------------

# 10. FE-04/05 --- Documents Core UI

Documents là domain trung tâm, nên cần UI quality cao hơn CRUD thông
thường.

## Documents List

Ưu tiên:

-   PageHeader
-   primary CTA
-   FilterBar
-   keyword search
-   category/subType filters
-   department filter
-   workflow status filter
-   date range
-   DataTable
-   status badges
-   row actions
-   pagination
-   export action

Filter chính phải phản ánh URL search params.

## Document detail

Nên có visual hierarchy:

``` text
Document identity
↓
Status
↓
Metadata
↓
Items / content
↓
Workflow
↓
Attachments / files
↓
Actions
```

Không biến detail thành một form dài không phân nhóm.

## Create/Edit

-   React Hook Form
-   Zod
-   field grouping
-   clear labels
-   inline validation
-   server error mapping
-   conditional fields
-   business rule visibility

Ví dụ:

`relatedAsset` chỉ hiển thị/bắt buộc khi business rule của subtype yêu
cầu.

## Workflow status

StatusBadge phải có mapping rõ ràng cho 5 workflow statuses.

------------------------------------------------------------------------

# 11. FE Workflow UI

Workflow cần thể hiện trạng thái và action rõ hơn CRUD.

Các action:

``` text
Approve
Reject
Complete
```

phải:

-   permission-aware
-   state-aware
-   confirmation nếu destructive
-   hiển thị reason/input nếu backend yêu cầu
-   disable action không hợp lệ

Nên dùng:

-   status badge
-   timeline/step indicator nếu phù hợp
-   action group
-   confirmation dialog

Không cho user thấy hàng loạt action không thể thực hiện.

------------------------------------------------------------------------

# 12. Assets UI

Assets có dataset lớn và nhiều workflow.

## Asset List

-   FilterBar
-   search
-   category/status filters
-   department/assignment filters nếu API hỗ trợ
-   DataTable
-   pagination
-   sorting
-   status badge
-   row actions

## Asset Detail

Phân nhóm:

``` text
Asset identity
Assignment
Current status
Department/location
Medical device profile
Assignment history
Actions
```

Medical Device Profile là sub-feature nghiệp vụ nhưng UI có thể dùng
section/tab trong asset detail nếu phù hợp.

## Assignment workflow

Các action:

``` text
Assign
Transfer
Return
```

nên có modal/drawer chuyên biệt, tránh form dài trong page.

------------------------------------------------------------------------

# 13. Medical Devices UI

UI cần nhấn mạnh:

-   device identity
-   calibration status
-   calibration records
-   dates
-   next calibration
-   history

Nếu có deadline/threshold:

-   dùng semantic status
-   cảnh báo rõ
-   không dùng màu làm nguồn thông tin duy nhất

------------------------------------------------------------------------

# 14. Asset Categories UI

CRUD đơn giản nhưng vẫn dùng chung:

-   PageHeader
-   DataTable/list
-   Create/Edit
-   ConfirmDialog
-   StatusBadge nếu domain có status
-   Loading/empty/error

Không tạo visual language mới.

------------------------------------------------------------------------

# 15. Dashboard UI

Dashboard là màn hình có yêu cầu visual cao nhất sau App Shell.

## Nguyên tắc

Không biến dashboard thành collection của các card.

Mỗi widget phải trả lời một câu hỏi nghiệp vụ.

## Layout đề xuất

``` text
PageHeader
↓
KPI summary
↓
Operational overview
↓
Charts / trends
↓
Pending / alert sections
↓
Upcoming / attention-required items
```

## KPI cards

-   metric
-   label
-   trend/context nếu API hỗ trợ
-   semantic status nếu phù hợp

Không tự bịa trend hoặc percentage nếu backend không trả dữ liệu.

## Charts

Chỉ trực quan hóa dữ liệu API thực tế.

Không tạo chart chỉ để trang đẹp.

## Filters

Dashboard filter:

``` text
month
year
daysAhead
daysThreshold
```

phải validate client-side trước khi gọi API vì backend domain này không
có validation đầy đủ theo KB.

------------------------------------------------------------------------

# 16. RBAC Admin UI

Domain:

``` text
rbac/
```

UI gồm:

-   Roles
-   Permissions
-   Policies

Ưu tiên:

-   permission matrix
-   role detail
-   policy detail
-   clear read/write/action separation
-   warning trước destructive change

Không hiển thị raw technical data nếu không cần thiết cho admin.

------------------------------------------------------------------------

# 17. Audit Logs UI

Audit logs là màn hình information-dense.

Ưu tiên:

-   filter
-   date range
-   actor/user
-   action
-   resource
-   status/result nếu API hỗ trợ
-   DataTable
-   detail drawer/modal

Không nhồi tất cả metadata vào bảng.

Chi tiết audit nên mở bằng Drawer/Modal để giữ bảng dễ scan.

------------------------------------------------------------------------

# 18. Notifications UI

Notifications là self-scoped.

UI:

-   notification center
-   unread indicator
-   list
-   read/unread state
-   empty state
-   loading
-   error
-   navigation tới resource nếu backend cung cấp reference

Không tạo global notification feed nếu backend scope là self-only.

------------------------------------------------------------------------

# 19. Profile UI

Profile gồm:

-   user information
-   role/permission context phù hợp
-   update profile
-   change password

Security-sensitive actions cần confirmation/feedback rõ ràng.

Không hiển thị permission technical detail nếu không phục vụ UX.

------------------------------------------------------------------------

# 20. Upload / Excel UI

## File upload

Dùng `FileUpload`.

Phải có:

-   drag/drop nếu phù hợp
-   file type validation
-   size validation
-   upload progress nếu axios hỗ trợ
-   success
-   failure
-   retry

## Excel import

Flow ưu tiên:

``` text
Select file
↓
Validate
↓
Preview / dry-run
↓
Review errors
↓
Confirm import
↓
Result summary
```

Nếu API trả preview/dryRun.

Không cho user import trực tiếp khi có thể preview.

## Export

Export là page-level action:

``` text
ExportButton
```

Không nhúng export behavior vào DataTable.

------------------------------------------------------------------------

# 21. Shared Page Pattern

Các trang list nên có pattern thống nhất:

``` text
Page
├── PageHeader
│   ├── title
│   ├── description
│   └── primary action
│
├── FilterBar
│
├── DataTable
│
└── Pagination
```

Detail:

``` text
Page
├── PageHeader
├── Status / summary
├── Content sections
├── Related information
└── Actions
```

Form:

``` text
Page/Drawer
├── Header
├── Form sections
├── Validation
└── Footer actions
```

------------------------------------------------------------------------

# 22. Table UX Rules

Theo Foundation Specification:

-   server-side pagination
-   server-side filtering
-   server-side sorting
-   filter state trong URL
-   query key gồm params
-   skeleton table khi loading
-   EmptyState khi không có data
-   ErrorState + retry khi lỗi
-   row actions được pre-filter theo permission
-   export không thuộc DataTable

Không hiển thị sort option ngoài whitelist DTO của từng domain.

------------------------------------------------------------------------

# 23. Form UX Rules

Dùng:

``` text
React Hook Form
+
Zod
+
shadcn Form pattern
```

Rules:

-   label rõ
-   required indicator nhất quán
-   inline field error
-   form-level server errors
-   disable submit khi đang mutation
-   tránh reset form ngoài ý muốn
-   confirm khi rời form có unsaved changes nếu flow cần
-   cross-field validation bằng Zod
-   backend validation vẫn là nguồn cuối

------------------------------------------------------------------------

# 24. Modal / Drawer Rules

Dùng:

-   Modal/Dialog cho confirmation và task ngắn
-   Drawer cho detail/edit workflow có context
-   Page navigation cho form lớn/phức tạp

Không nhét form quá dài vào modal nhỏ.

Dialog phải có keyboard/focus accessibility.

------------------------------------------------------------------------

# 25. Accessibility baseline

Mọi FE task:

``` text
[ ] Input có label
[ ] Button có accessible name
[ ] Keyboard navigation cơ bản
[ ] Focus visible
[ ] Dialog focus trap
[ ] Không dùng màu là tín hiệu duy nhất
[ ] Contrast đủ dùng
[ ] Error message liên kết với field khi phù hợp
```

------------------------------------------------------------------------

# 26. Motion / Micro-interaction

Chỉ dùng animation để:

-   phản hồi action
-   chuyển trạng thái
-   mở/đóng panel
-   loading feedback

Không dùng animation để trang trí liên tục.

Ưu tiên nhanh, subtle và không gây mất tập trung.

------------------------------------------------------------------------

# 27. Visual QA checklist

Trước khi đánh dấu mỗi FE task DONE:

## Visual

``` text
[ ] Typography consistent
[ ] Spacing consistent
[ ] Colors follow tokens
[ ] Radius consistent
[ ] Shadows consistent
[ ] Icons consistent
[ ] Alignment correct
[ ] No visual clutter
```

## UX

``` text
[ ] Primary action obvious
[ ] Destructive action protected
[ ] Loading state
[ ] Empty state
[ ] Error state
[ ] Success feedback
[ ] Disabled state
[ ] Permission state
```

## Responsive

``` text
[ ] Desktop
[ ] Laptop
[ ] Tablet
[ ] Mobile basic
```

## Technical

``` text
[ ] TypeScript
[ ] Build
[ ] Tests relevant to task
[ ] No console errors
[ ] No duplicated component
[ ] No hardcoded API path
[ ] No duplicated permission logic
```

------------------------------------------------------------------------

# 28. Definition of Done --- UI

Một FE task chỉ đạt UI DONE khi:

``` text
FUNCTIONAL
    +
VISUAL
    +
UX
    +
RESPONSIVE
    +
ACCESSIBILITY
    +
PERMISSION
```

Không chấp nhận:

``` text
API chạy
CRUD chạy
UI sơ sài
=> DONE
```

------------------------------------------------------------------------

# 29. UI implementation order

Roadmap tổng quát:

``` text
FE-00
Project Bootstrap
        ↓
FE-01
Authentication
+
App Shell
+
Design System Foundation
        ↓
FE-02
RBAC / Permission UI
        ↓
FE-03+
Users / Departments
        ↓
Documents Core
        ↓
Workflow
        ↓
Assets
        ↓
Medical Devices
        ↓
RBAC Admin
        ↓
Dashboard
        ↓
Audit Logs
        ↓
Notifications
        ↓
Profile
        ↓
Upload / Excel
        ↓
Global UI Polish
+
Accessibility pass
+
Responsive pass
+
Visual regression review
```

Thứ tự số FE cụ thể phải giữ theo **FE Master Roadmap đã được phê
duyệt**; file này chỉ định nghĩa UI/UX scope và quality cho từng nhóm.

------------------------------------------------------------------------

# 30. Relationship với các tài liệu khác

``` text
FE_MASTER_ROADMAP
        ↓
quyết định WHAT / WHEN
        ↓
FE_UI_DEVELOPMENT_ROADMAP
        ↓
quyết định UI/UX QUALITY + DESIGN EVOLUTION
        ↓
FE_FOUNDATION_SPEC
        ↓
quyết định architecture / technical constraints
        ↓
FE-01 / FE-02 / ...
        ↓
implementation prompt
```

Nguồn liên quan:

-   FE_CONTEXT.md
-   FE_ARCHITECTURE.md
-   FE_FOUNDATION_SPEC.md
-   UI_REQUIREMENTS.md
-   SHARED_COMPONENTS_LIBRARY.md
-   STATE_MAPPING.md
-   DATA_FLOW.md
-   ERROR_HANDLING.md
-   ROUTE_PERMISSION_MAP.md
-   DOCUMENT_DOMAIN_MAP.md
-   AUTH_RBAC_MAP.md
-   FRONTEND_MEMORY.md

------------------------------------------------------------------------

# 31. Quy tắc chống drift

Claude Code không được tự ý:

-   tạo design system thứ hai
-   đổi component library
-   đưa Ant Design/MUI vào project
-   hard-code permission theo role
-   tạo API mới không có backend contract
-   thay đổi business logic để phục vụ UI
-   duplicate shared component
-   đổi status color tùy từng page
-   tạo fake KPI/chart data
-   bỏ loading/empty/error state để hoàn thành nhanh

Nếu phát hiện thiếu hoặc conflict:

``` text
STOP
→ report
→ đề xuất decision
→ không âm thầm thay đổi architecture
```

------------------------------------------------------------------------

# 32. Future UI polish phase

Sau khi các domain chính hoàn thành, thực hiện một vòng:

## UI Polish

-   spacing consistency
-   typography consistency
-   table density
-   form density
-   modal sizing
-   drawer sizing
-   status colors
-   empty states
-   error messages
-   responsive issues
-   accessibility
-   interaction consistency

## Performance UX

-   skeleton
-   optimistic UI chỉ khi an toàn
-   query caching
-   pagination
-   debounce
-   tránh unnecessary re-render

------------------------------------------------------------------------

# 33. Master UI principle

> Build the product as one healthcare enterprise system, not as a
> collection of CRUD pages.

Mỗi module mới phải trông như một phần của cùng một sản phẩm.

Ưu tiên:

``` text
Clarity
Consistency
Trust
Speed
Accessibility
Maintainability
```

hơn:

``` text
Decoration
Animation
Visual complexity
```

------------------------------------------------------------------------

# 34. Status

``` text
FE-00 Bootstrap                 DONE
RBAC backend micro-fix         IN PROGRESS / PENDING VERIFY
FE UI Roadmap                  THIS DOCUMENT
FE-01                          NEXT
```

Sau khi RBAC micro-fix PASS:

``` text
RBAC verified
    ↓
FE-01 implementation
    ↓
Design System
    ↓
Authentication
    ↓
App Shell
    ↓
UI Quality Gate
```
