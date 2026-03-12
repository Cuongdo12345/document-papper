Mình đã **giải nén và đọc structure toàn bộ project backend của bạn**. Dự án khá đầy đủ và đúng kiểu **production backend Node.js + TypeScript + MongoDB**. Dưới đây là **phân tích kiến trúc thực tế của codebase** (không phải suy đoán nữa vì mình đã thấy cấu trúc project).

---

# 1️⃣ Tổng quan kiến trúc project

Root backend của bạn:

```
document-manager
│
├── server.ts
├── src
│   ├── app.ts
│   ├── config
│   ├── controllers
│   ├── dtos
│   ├── export
│   ├── middlewares
│   ├── models
│   ├── routes
│   ├── services
│   ├── shared
│   └── views
```

Kiến trúc này thuộc dạng:

**Layered Architecture + Service Pattern**

```
Route
 ↓
Middleware
 ↓
Controller
 ↓
Service
 ↓
Model (Mongoose)
 ↓
MongoDB
```

---

# 2️⃣ Backend Request Flow (thực tế)

Flow request của hệ thống:

```
Client
  │
  ▼
Routes
  │
  ▼
Middlewares
  │
  ▼
Controller
  │
  ▼
Service
  │
  ▼
Model (Mongoose)
  │
  ▼
MongoDB
```

Ví dụ API:

```
POST /documents
```

Flow:

```
document.route.ts
     ↓
auth.middleware
     ↓
authorizePermission.middleware
     ↓
validate.middleware
     ↓
document.controller
     ↓
documents.service
     ↓
document.model
     ↓
MongoDB
```

---

# 3️⃣ Folder Architecture phân tích chi tiết

## 1. server.ts

Entry point server

```
create Express server
connect database
start listening port
```

---

## 2. app.ts

Nơi config:

```
express
middlewares
routes
error handling
swagger
```

Flow:

```
Express App
  │
  ├── cors
  ├── json parser
  ├── routes
  └── error middleware
```

---

# 4️⃣ Config Layer

```
src/config
```

bao gồm:

```
database/
   database.ts
   database.events.ts
   database.shutdown.ts
   mongo.logger.ts
```

Đây là:

```
MongoDB connection manager
```

Có:

```
connect
reconnect
shutdown
logging
```

Đây là **thiết kế tốt cho production**.

---

# 5️⃣ Models (Database Layer)

```
src/models
```

gồm:

```
apiPerformance.model.ts
counter.model.ts
department.model.ts
document.model.ts
passwordResetToken.model.ts
refreshToken.model.ts
user.model.ts
userAudit.model.ts
```

### Core Collections

```
Users
Departments
Documents
UserAudits
```

### Supporting Collections

```
RefreshTokens
PasswordResetTokens
Counters
ApiPerformance
```

---

# 6️⃣ Services Layer

```
src/services
```

services của bạn:

```
auths.service.ts
dashboard.service.ts
departments.service.ts
documents.service.ts
export.service.ts
userAudits.service.ts
users.service.ts
```

Service layer chịu trách nhiệm:

```
business logic
database interaction
data transformation
workflow
```

Ví dụ:

```
documents.service
```

xử lý:

```
create proposal
create report
repair workflow
import excel
document statistics
```

---

# 7️⃣ Controllers Layer

```
src/controllers
```

controllers:

```
auth.controller.ts
dashboard.controller.ts
department.controller.ts
document.controller.ts
export-excel.controller.ts
performance.controller.ts
user.controller.ts
userAudit.controller.ts
```

Controllers:

```
handle request
call services
return response
```

---

# 8️⃣ Routes Layer

```
src/routes
```

routes:

```
auth.routes.ts
dashboard.route.ts
department.routes.ts
document.route.ts
export-excel.route.ts
performance.routes.ts
user.routes.ts
userAudit.routes.ts
```

Pattern:

```
Router → Controller
```

Ví dụ:

```
/api/documents
/api/users
/api/departments
```

---

# 9️⃣ Middleware Layer

```
src/middlewares
```

middlewares:

```
auth.middleware.ts
authorizePermission.middleware.ts
error.middleware.ts
performance.middleware.ts
upload.middleware.ts
validate.middleware.ts
```

### Auth Middleware

```
JWT verification
```

### Permission Middleware

```
RBAC permission check
```

### Upload Middleware

```
Multer
```

### Performance Middleware

```
API latency tracking
```

### Validate Middleware

```
request validation
```

---

# 🔟 Shared Layer (rất tốt)

```
src/shared
```

structure:

```
constants
errors
helpers
types
utils
```

### constants

```
permission.constant.ts
rolePermission.map.ts
documentRules.ts
```

### helpers

```
auth.helper.ts
document-excel.mapper.ts
document.filter.helper.ts
generate-code.ts
```

### utils

```
formatDate
generateDocumentCode
getNext
```

---

# 11️⃣ DTO Layer

```
src/dtos
```

DTO dùng cho:

```
request validation
data mapping
```

ví dụ:

```
update-document.dto.ts
user.dto.ts
userAudit.dto.ts
```

---

# 12️⃣ Export Layer

```
src/export
```

chứa:

```
excel export files
```

Excel được generate bởi:

```
export.service
```

---

# 13️⃣ Email Templates

```
src/views/email
```

```
forgotPassword.ejs
```

được dùng cho:

```
reset password
```

---

# 14️⃣ Authentication Architecture

Auth system:

```
JWT
+
Refresh Token
+
Password Reset Token
```

Collections:

```
Users
RefreshTokens
PasswordResetTokens
```

Flow:

```
Login
 ↓
JWT access token
 ↓
Refresh token
 ↓
API requests
```

---

# 15️⃣ Permission System

Permission được định nghĩa trong:

```
permission.constant.ts
rolePermission.map.ts
```

Flow:

```
User role
   ↓
rolePermission.map
   ↓
permissions
   ↓
authorizePermission.middleware
```

RBAC system.

---

# 16️⃣ Document Workflow Engine

Core system của project.

Document types:

```
PROPOSE_REPAIR
PROPOSE_INK
PROPOSE_PROCUREMENT
```

Reports:

```
CHECK_DAMAGE
CONFIRM_STATUS
```

Workflow:

```
Proposal
  ↓
Report
  ↓
Repair workflow
  ↓
Signed confirmation
```

Document fields quan trọng:

```
repairStatus
signedBy[]
referenceTo
```

---

# 17️⃣ Dashboard Analytics

Dashboard được build trong:

```
dashboard.service.ts
```

Thống kê:

```
repair quantity
ink quantity
procurement quantity
monthly statistics
```

---

# 18️⃣ Performance Monitoring

Bạn có middleware:

```
performance.middleware
```

và model:

```
apiPerformance.model
```

để track:

```
API latency
execution time
endpoint performance
```

---

# 19️⃣ Kiến trúc thực tế của hệ thống

System architecture:

```
Frontend (React Admin)
        │
        ▼
Express API
        │
        ▼
Middleware Layer
        │
        ▼
Controller Layer
        │
        ▼
Service Layer
        │
        ▼
Mongoose Models
        │
        ▼
MongoDB
```

---

# 20️⃣ Đánh giá kiến trúc hiện tại

### Điểm mạnh

✔ Layered architecture rõ ràng
✔ Service pattern chuẩn
✔ Middleware tách riêng
✔ RBAC permission system
✔ Excel import/export
✔ Dashboard analytics
✔ Performance monitoring

Đây là **backend khá chuẩn cho enterprise admin system**.

---

### Điểm có thể cải thiện

1️⃣ Service khá lớn

```
documents.service
```

có thể tách thành:

```
documentProposal.service
documentReport.service
documentRepair.service
```

---

2️⃣ Repository layer

Hiện tại:

```
Service → Model
```

có thể tách thêm:

```
Service
 ↓
Repository
 ↓
Model
```

---

3️⃣ Domain layer

Có thể refactor thành:

```
Domain Driven Design
```

---

# ⭐ Đánh giá tổng thể

Kiến trúc project của bạn:

```
Layered Architecture
+
Service Pattern
+
RBAC Permission
+
Workflow Engine
```

Mức độ:

```
Intermediate → Senior backend architecture
```

Khá tốt cho hệ thống:

```
Document Management System
Repair Workflow System
```

---



///////////////////////////////////////////////////////////////////////////////////////////////
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