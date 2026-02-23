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

{
  "category": "PROPOSAL",
  "subType": "PROPOSE_REPAIR",
  "title": "Giấy đề xuất sửa chữa thiết bị",
  "department": "64ff...",
  "referenceTo": "documentId_bien_ban",
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
    "device": {
      "name": "Hộp mực HP",
      "quantity": 1
    }
  }
}