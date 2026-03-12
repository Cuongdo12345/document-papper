Đúng rồi 👍. Với những gì bạn đã gửi trong các bước trước, hiện tại mình **đã có đủ bức tranh backend của các module chính** để có thể thiết kế UI hoàn chỉnh.

## 1️⃣ Các module đã đủ thông tin

Bạn đã cung cấp **model + service + controller + routes** cho các phần sau:

### 🔐 Auth

* Login
* Logout
* Change password
* Get current user (`/users/me`)

UI có thể build:

* **Login page**
* **Profile page**
* **Change password modal**

---

### 👤 User

Routes chính:

```
POST   /users
GET    /users
GET    /users/:id
GET    /users/me
PATCH  /users/me
PUT    /users/:id
DELETE /users/:id
PATCH  /users/restore/:id
PATCH  /users/change-password
PATCH  /users/reset-password/:id
```

UI build được:

```
User List
Create User
Edit User
Delete User
Restore User
Reset Password
User Profile
```

---

### 🏢 Department

Routes:

```
POST   /departments
GET    /departments
GET    /departments/:id
PUT    /departments/:id
DELETE /departments/:id
```

UI build được:

```
Department List
Create Department
Edit Department
Delete Department
```

---

### 📄 Document

Routes:

```
POST   /documents/proposal
GET    /documents
GET    /documents/:id
PUT    /documents/:id
DELETE /documents/delete-by-month
DELETE /documents/:id
PATCH  /documents/restore/:id
GET    /documents/:proposalId/reports
```

UI build được:

```
Document List
Document Detail
Create Proposal
Edit Document
Delete Document
Restore Document
Proposal → Reports
Delete documents by month (admin tool)
```

---

### 📊 User Audit

Routes:

```
GET /userAudit
GET /userAudit/dashboard
```

UI build được:

```
Audit Logs
Audit Dashboard (charts)
```

---

# 2️⃣ Tổng thể hệ thống UI có thể xây

Dựa trên backend bạn đã gửi, hệ thống UI hoàn chỉnh sẽ gồm:

```
Auth
   Login

Dashboard
   Overview stats
   Activity charts

Documents
   Document List
   Document Detail
   Create Proposal
   Edit Document
   Proposal Reports

Users
   User List
   Create User
   Edit User
   User Detail

Departments
   Department List
   Create Department
   Edit Department

Audit
   Audit Logs
   Audit Dashboard
```

---

# 3️⃣ Sidebar UI sẽ như này

```
Dashboard

Documents
   All Documents
   Create Proposal

Users
   User Management

Departments
   Department Management

Audit
   Audit Logs
   Audit Dashboard
```

---

# 4️⃣ Những gì **không cần thêm từ backend nữa**

Để build UI, mình **không cần thêm**:

* models
* services
* controllers
* routes

vì:

```
API contract đã rõ
permission đã rõ
payload đã rõ
```

---

# 5️⃣ Những thứ **UI cần biết thêm (nếu có)**

Chỉ còn vài thứ nhỏ nếu bạn muốn UI **chuẩn hơn**:

### 1️⃣ Enum values

Ví dụ:

```
DocumentCategory
DocumentSubType
UserRole
AuditAction
```

---

### 2️⃣ Meta structure của document

Ví dụ:

```
meta: {
   deviceName
   inkType
   quantity
   price
}
```

---

### 3️⃣ Permission list

Ví dụ:

```
USER_CREATE
USER_UPDATE
USER_DELETE
AUDIT_VIEW
DEPARTMENT_CREATE
```

để UI **show/hide button**.

---

# 6️⃣ Kết luận

✔ Backend bạn gửi đã đủ để:

```
build full frontend system
```

bao gồm:

```
15+ UI screens
dashboard
user management
document workflow
audit system
```

---

💡 Nếu bạn muốn, bước tiếp theo mình có thể giúp bạn **3 thứ cực quan trọng cho project này**:

### 1️⃣ Thiết kế **Frontend Architecture chuẩn production**

Cho project của bạn:

```
React
TypeScript
React Query
Zustand
Shadcn UI
```

---

### 2️⃣ Vẽ **UI layout + wireframe cho toàn bộ hệ thống**

Khoảng **15–18 screens**.

---

### 3️⃣ Viết luôn **API client + folder structure frontend**

giúp bạn **build UI nhanh gấp 3–4 lần**.

---

Nếu bạn muốn mình có thể **vẽ luôn kiến trúc frontend tối ưu cho project Node.js document workflow của bạn** (đây là bước quan trọng nhất trước khi bắt đầu code UI).

Rất tốt 👍. Với phần **`DOCUMENT_RULES` + `PERMISSIONS` + `ROLE_PERMISSIONS`** bạn vừa gửi thì bây giờ mình đã hiểu **gần như toàn bộ logic nghiệp vụ + phân quyền của hệ thống**. Mình sẽ tổng hợp lại để bạn thấy rõ **UI phải hoạt động thế nào theo backend của bạn**.

---

# 1️⃣ Enum & Rules của Document (từ `DOCUMENT_RULES`)

Bạn đang định nghĩa rule theo **SubType → Category + Reference**.

### Report types

| SubType        | Category | Require Reference | Reference SubType |
| -------------- | -------- | ----------------- | ----------------- |
| CHECK_DAMAGE   | REPORT   | true              | PROPOSE_REPAIR    |
| CONFIRM_STATUS | REPORT   | true              | PROPOSE_INK       |

---

### Proposal types

| SubType             | Category | Require Reference |
| ------------------- | -------- | ----------------- |
| PROPOSE_REPAIR      | PROPOSAL | false             |
| PROPOSE_INK         | PROPOSAL | false             |
| PROPOSE_PROCUREMENT | PROPOSAL | false             |

---

## Workflow thực tế

```
PROPOSE_REPAIR
      ↓
CHECK_DAMAGE
```

```
PROPOSE_INK
      ↓
CONFIRM_STATUS
```

```
PROPOSE_PROCUREMENT
      ↓
(no report)
```

---

# 2️⃣ UI Logic phải tuân theo `DOCUMENT_RULES`

Frontend nên dùng logic giống backend:

```ts
const DOCUMENT_RULES = {
  CHECK_DAMAGE: {
    category: "REPORT",
    requireReference: true,
    referenceSubType: "PROPOSE_REPAIR"
  }
}
```

---

## UI Create Document

### Nếu user tạo:

```
CHECK_DAMAGE
```

UI **bắt buộc phải chọn proposal**:

```
Select PROPOSE_REPAIR
```

---

### Nếu tạo:

```
CONFIRM_STATUS
```

UI phải chọn:

```
Select PROPOSE_INK
```

---

### Nếu tạo:

```
PROPOSE_INK
PROPOSE_REPAIR
PROPOSE_PROCUREMENT
```

UI **không cần reference**.

---

# 3️⃣ Permission System của bạn (rất chuẩn)

Bạn đang dùng **Permission Based Access Control (PBAC)**.

Permission constants:

```
USER_*
DOCUMENT_*
DEPARTMENT_*
AUDIT_*
SYSTEM_*
```

Điều này rất tốt vì:

```
role chỉ map permission
permission quyết định action
```

---

# 4️⃣ Roles trong hệ thống

Bạn có 3 role:

```
ADMIN
IT
USER
```

---

## ADMIN

```
Full permissions
```

```ts
ADMIN: [...Object.values(PERMISSIONS)]
```

---

## IT

Quyền:

```
DOCUMENT_CREATE
DOCUMENT_UPDATE
DOCUMENT_VIEW_DETAIL
AUDIT_VIEW

DEPARTMENT_VIEW
DEPARTMENT_CREATE
DEPARTMENT_UPDATE
DEPARTMENT_DELETE

USER_CHANGE_PASSWORD
```

---

## USER

Quyền:

```
DOCUMENT_CREATE
DOCUMENT_VIEW
DOCUMENT_VIEW_DETAIL
DOCUMENT_UPDATE
DOCUMENT_DELETE

USER_CHANGE_PASSWORD
```

---

# 5️⃣ UI Permission Rules

Frontend nên check permission giống backend.

Ví dụ:

```ts
function hasPermission(permission) {
  return user.permissions.includes(permission);
}
```

---

## Document List

| Action | Permission           |
| ------ | -------------------- |
| View   | DOCUMENT_VIEW        |
| Detail | DOCUMENT_VIEW_DETAIL |
| Create | DOCUMENT_CREATE      |
| Edit   | DOCUMENT_UPDATE      |
| Delete | DOCUMENT_DELETE      |

---

## User Management

| Action     | Permission   |
| ---------- | ------------ |
| View users | USER_VIEW    |
| Create     | USER_CREATE  |
| Update     | USER_UPDATE  |
| Delete     | USER_DELETE  |
| Restore    | USER_RESTORE |

---

## Department

| Action | Permission        |
| ------ | ----------------- |
| View   | DEPARTMENT_VIEW   |
| Create | DEPARTMENT_CREATE |
| Update | DEPARTMENT_UPDATE |
| Delete | DEPARTMENT_DELETE |

---

## Audit

| Page            | Permission           |
| --------------- | -------------------- |
| Audit logs      | AUDIT_VIEW           |
| Audit dashboard | AUDIT_VIEW_DASHBOARD |

---

# 6️⃣ UI Sidebar nên render theo permission

Ví dụ:

### ADMIN

```
Dashboard
Documents
Users
Departments
Audit Logs
Audit Dashboard
System Settings
```

---

### IT

```
Dashboard
Documents
Departments
Audit Logs
```

---

### USER

```
Dashboard
Documents
```

---

# 7️⃣ UI Create Report Flow

Ví dụ:

User mở:

```
PROPOSE_REPAIR
```

UI hiển thị button:

```
Create CHECK_DAMAGE
```

API call:

```
POST /documents/proposal
```

payload:

```json
{
  "category": "REPORT",
  "subType": "CHECK_DAMAGE",
  "referenceTo": ["proposalId"]
}
```

---

# 8️⃣ Document Detail Page

Sections:

```
Document Info
Meta Info
Reference Document
Related Reports
Audit Logs
```

---

# 9️⃣ Document List Filters

UI filter nên có:

```
Category
SubType
Department
CreatedBy
Date
Keyword
```

---

# 🔟 Dashboard Metrics (gợi ý)

Dựa vào workflow của bạn dashboard rất dễ build.

Cards:

```
Total PROPOSE_INK
Total PROPOSE_REPAIR
Total PROPOSE_PROCUREMENT
Total CHECK_DAMAGE
Total CONFIRM_STATUS
```

---

Charts:

```
Documents by SubType
Documents by Department
Documents by Month
```

---

# 1️⃣1️⃣ Kiến trúc backend của bạn khá tốt

Bạn đang follow pattern:

```
Models
 ↓
Services
 ↓
Controllers
 ↓
Routes
```

Cộng thêm:

```
Permission constants
Role permission map
Document rules
```

Đây là **kiến trúc enterprise-level cho Node.js backend**.

---

# 1️⃣2️⃣ Hiện tại mình đã hiểu ~100% hệ thống của bạn

Mình đã có:

```
Workflow document
Reference logic
Permissions
Roles
API routes
Services logic
```

Tức là mình **có thể thiết kế full UI system chính xác theo backend của bạn**.

---

# 🚀 Nếu bạn muốn, mình có thể giúp bạn thêm một bước cực mạnh:

### 1️⃣ Thiết kế **Frontend Architecture chuẩn cho project này**

```
React
TypeScript
React Query
Zustand
Shadcn UI
```

---

### 2️⃣ Vẽ **UI Wireframe cho toàn bộ hệ thống (18 screens)**

Bao gồm:

```
Dashboard
Document workflow
User management
Department management
Audit logs
```

---

### 3️⃣ Thiết kế **Dynamic Document Form Engine**

để form tự render theo:

```
PROPOSE_INK
PROPOSE_REPAIR
PROPOSE_PROCUREMENT
CHECK_DAMAGE
CONFIRM_STATUS
```

→ frontend **không cần viết form riêng từng loại document**.

---

Nếu bạn muốn, mình có thể **vẽ luôn sơ đồ kiến trúc frontend tối ưu nhất cho hệ thống document management của bạn**.
Cái này sẽ giúp bạn **build UI nhanh hơn ~3–4 lần và dễ maintain lâu dài**.


===================================================================================================================================================

Ok 👍 mình chỉnh lại đúng nghiệp vụ thực tế của bạn và build lại model + quan hệ chuẩn TypeScript, đảm bảo:

✔ Giấy đề xuất tạo trước

✔ Biên bản xác nhận / kiểm tra tạo sau

✔ Quan hệ 1 đề xuất → nhiều biên bản

✔ Mở rộng được sau này (nghiệm thu, thanh lý, sửa chữa xong…)

Mình làm theo tư duy Document gốc (root) → Document phát sinh (child).

I. Chuẩn lại luồng nghiệp vụ (rất quan trọng)
🔧 Sửa chữa thiết bị
Giấy đề xuất sửa chữa (PROPOSE_REPAIR)
        ↓
Biên bản kiểm tra hư hỏng (CHECK_DAMAGE)
        ↓
(có thể phát sinh)
→ Biên bản nghiệm thu sửa chữa
→ Thanh lý / thay thế

🖨️ Thay mực
Giấy đề xuất thay mực (PROPOSE_INK)
        ↓
Biên bản xác nhận tình trạng (CONFIRM_STATUS)


👉 Biên bản luôn PHỤ THUỘC đề xuất, không tồn tại độc lập.

II. Thiết kế lại quan hệ Document (chuẩn & mở rộng)
🔑 Nguyên tắc

Proposal là root

Report là child

Quan hệ ngược:
Report.referenceTo → Proposal._id


///////////////////////////////////////////////////////////////////////////////////////
1️⃣ Nguyên tắc nghiệp vụ (rất quan trọng)
✅ ĐƯỢC PHÉP SỬA

title

content

meta

items (nếu là đề xuất)

participants, checkResult (nếu là biên bản)

updatedAt, updatedBy

❌ KHÔNG ĐƯỢC SỬA

category (PROPOSAL / REPORT)

subType

documentCode

referenceTo

createdBy

createdAt

🔐 Quyền sửa
Role	Điều kiện
ADMIN	Sửa tất cả
USER	Chỉ sửa document do mình tạo & chưa duyệt


//Lệnh cài đặt packeg npm i --save-dev @types/compression
//npm create vite@latest frontend lệnh tạo froned


//////////////////////////////////////////////////////////////////////////////////////////////////
Mẫu tạo biên bản và đề xuất

biên bản kiểm tra sửa chữa
{
  "category": "REPORT",
  "subType": "CHECK_DAMAGE",
  "title": "Biên bản kiểm tra tình trạng hư hỏng thiết bị",
  "department": "64ff...",
  "meta": {
    "checkDate": "2026-01-07",
    "location": "Khoa Nội tổng hợp",
    "representatives": {
      "departmentRep": "Phạm Thị Kim Lý",
      "inspector": "Đỗ Mạnh Cường"
    },
    "device": {
      "name": "Máy vi tính"
    },
    "inspectionResult": "Hỏng nguồn, CPU",
    "proposedSolution": "Đề xuất sửa chữa"
  }
}

Giấy đề xuất sửa chửa
POST /api/documents
Authorization: Bearer <token>

Mẫu đề xuất sửa chữa thiết bị
{
  "category": "PROPOSAL",
  "subType": "PROPOSE_REPAIR",
  "title": "Giấy đề xuất sửa chữa thiết bị",
  "department": "64ff...",
  "referenceTo": "",
  "meta": {
    "items": [
      {
        "deviceName": "Máy vi tính",
        "quantity": 1,
        "note": "Hỏng nguồn, CPU"
      }
    ]
  }
}

Mẫu đề xuất thay mực
{
  "category": "PROPOSAL",
  "subType": "PROPOSE_INK",
  "title": "Đề xuất thay mực máy in",
  "meta": {
    "items": [
      {
        "deviceName": "Máy vi tính",
        "quantity": 1,
        "note": "Hỏng nguồn, CPU"
      }
    ]
  }
}

Biên bản xác nhận tình trang thay mực
{
  "category": "REPORT",
  "subType": "CONFIRM_STATUS",
  "title": "Biên bản xác nhận tình trạng thiết bị",
  "department": "depId",
  "createdBy": "userId",
  "meta": {
    "checkDate": "2026-02-03",
    "location": "Khoa Nội Cơ Xương Khớp",
    "representatives": {
      "departmentRep": "Trần Thị Ngọc Hạnh",
      "inspector": "Đỗ Mạnh Cường"
    },
    "device": {
      "name": "Hộp mực máy in",
      "relatedDevice": "Máy in HP",
      "quantity": 1
    },
    "inspectionResult": "Khi in giấy bị đen đường dọc",
    "proposedSolution": "Thay drum và gạt lớn hộp mực"
  }
}