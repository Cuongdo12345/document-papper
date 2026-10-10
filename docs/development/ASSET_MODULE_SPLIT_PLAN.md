# KẾ HOẠCH TÁCH MODULE TÀI SẢN: CNTT và THIẾT BỊ Y TẾ

**Ngày lập:** 2026-10-08 (cập nhật cùng ngày sau khi user chốt toàn bộ câu hỏi mở)
**Trạng thái:** PLANNED — CHƯA triển khai, chưa có task DEV/FE nào được mở. Không bắt đầu Giai đoạn nào khi user chưa chỉ định.
**Loại:** ARCHITECTURE + DATABASE CHANGE + API CHANGE + RBAC CHANGE + FEATURE (hồ sơ CNTT, bản quyền phần mềm) + UI

## 1. Mục tiêu và các quyết định đã chốt (user, 2026-10-08)

Hiện 1 module "Tài sản" gộp cả thiết bị CNTT lẫn thiết bị y tế. Mục tiêu: tách thành 2 module nghiệp vụ, đồng thời bổ sung hồ sơ CNTT có cấu trúc và quản lý bản quyền phần mềm.

| # | Quyết định | Hệ quả |
|---|---|---|
| D1 | **Tách logic, chung 1 collection `assets`** | Thêm trường loại tài sản. Không đổi/di chuyển tham chiếu cũ |
| D2 | **Prefix API và quyền riêng cho mỗi module** | `/api/it-assets/*`, `/api/medical-assets/*`; quyền `IT_ASSET_*`, `MEDICAL_ASSET_*` |
| D3 | **IT quản lý CNTT, Phòng Vật tư-TTB quản lý Y tế**; role xem được cả hai; ADMIN toàn quyền | Quyền sửa không còn chéo |
| D4 | **Gán loại theo danh mục gốc, báo cáo ngoại lệ** | Cơ chế 3 nhóm, mục 4.2 |
| Q-A | **Làm luôn hồ sơ CNTT**: cấu hình phần cứng, mạng, hệ điều hành & firmware, bản quyền phần mềm | Thêm module dữ liệu CNTT (mục 4.6) |
| Q-A1 | Bản quyền: **danh mục bản quyền riêng + gán cho máy** (biết số slot còn trống) | Model `SoftwareLicense` |
| Q-A2 | **Không lưu khóa bản quyền** | Chỉ lưu số hợp đồng/đơn hàng + file chứng từ |
| Q-A3 | **IP trùng: chỉ cảnh báo**; `specs` cũ: **sao chép, giữ bản cũ** | Không chặn lưu; không xoá dữ liệu cũ |
| Q-B | **Tách quyền danh mục theo nhánh** | `IT_ASSET_CATEGORY_*`, `MEDICAL_ASSET_CATEGORY_*` thay `ASSET_CATEGORY_*` |
| Q-C | **Chuyển model y tế sang `models/medicalDevices/`** | System Design hiện module riêng |
| Q-D | Bộ quyền mới tên **`MEDICAL_ASSET_*`, giữ `MEDICAL_DEVICE_*`** | Không đổi quyền đang chạy |
| Q-E | **Giữ nguyên định dạng mã tài sản** `TB-<khoa>-<năm>-<số>` | Không đổi bộ đếm, QR đã in |
| Q-F | **Hai bên xem chéo, không sửa** | IT xem được thiết bị y tế; Vật tư-TTB xem được thiết bị CNTT |
| Q-G | **Cảnh báo thiết bị y tế gửi cả Vật tư-TTB và IT** | Cảnh báo CNTT và bản quyền gửi IT |
| — | Ca xung đột `TB-KD-2023-0003`: **giữ là CNTT, xoá hồ sơ y tế**; hợp đồng trộn 2 loại: **hiện đủ danh sách, chỉ bấm vào loại có quyền xem** | Mục 4.2 |

## 2. Hiện trạng (đã xác minh trong source và DB dev)

**Ranh giới đã có một nửa, nhưng chỉ ở mức quy ước, không được ép:**
- Cây danh mục đã có 2 gốc: `CNTT` ("Thiết bị CNTT") và `TBYT` ("Thiết bị y tế"), 3 cấp (gốc → nhóm → loại).
- Thiết bị y tế đã là phần mở rộng 1-1 của `Asset` qua `MedicalDeviceProfile` (hiệu chuẩn, giấy phép, chứng chỉ người vận hành). Đây là mẫu "lõi chung + phần mở rộng"; hồ sơ CNTT sẽ đi đúng mẫu này.
- **Không nơi nào kiểm tra** danh mục thuộc nhánh nào: `createAsset` chỉ kiểm danh mục là lá (`assertLeafCategory`); `createMedicalDeviceProfileService` gắn hồ sơ y tế vào bất kỳ tài sản nào.

**Số liệu DB dev (`hospital_documents`, đọc-chỉ):** 119 tài sản (105 CNTT, 14 y tế), 46 danh mục, 15 hồ sơ y tế, 6 bản ghi hiệu chuẩn, 3 chứng chỉ vận hành, 1 kế hoạch bảo trì, 110 bản ghi lịch sử cấp phát, 23 hợp đồng trỏ tới tài sản, 1 tài liệu có `relatedAsset`. 38 tài sản có `specs`: `storage` 33, `cpu` 32, `ram` 32, `ip` 6, `ports` 3, và mỗi khóa `lanIp`, `wanIp`, `firmware`, `gpu`, `xuatXu`, `congSuat` 1 lần.

**Kích thước code:**
- Backend: 7 model, ~5.200 dòng ở controller/service/route (`services/assets/assetDevice`, `services/assets/medicalDevice`).
- Frontend: `features/assets` có 73 file (~5.900 dòng); 68 file ngoài nó có nhắc `/assets`; 31 file dùng quyền `ASSET_*`/`MEDICAL_DEVICE_*`.
- Test: 31 file test backend liên quan tài sản.
- Quyền hiện có: 15 `ASSET_*`, 5 `ASSET_CATEGORY_*`, 5 `MEDICAL_DEVICE_*`, 4 `OPERATOR_CERTIFICATE_*`.

**Điểm đáng chú ý khác:**
- Hai cron cảnh báo (`assetAlerts`, `medicalDeviceAlerts`) đều gửi cho role `IT` (`ALERT_RECIPIENT_ROLE = "IT"`).
- Mã tài sản `TB-<mã khoa>-<năm>-<số thứ tự>` dùng chung bộ đếm theo khoa/năm.
- 7 danh mục cũ ở gốc (`MAY_SIEU_AM`, `MAY_THO`, `MAY_DIEN_TIM`, `MAY_TRUYEN_DICH`, `MAY_CHAY_THAN`, `MAY_GAY_ME`, `MAY_THEO_DOI_BN`) và 2 danh mục thử (`CCCCC`, `CCCCC>VVVVV`), đều ngừng dùng, 0 tài sản.
- `authorizePermission` đã nhận mảng quyền (`Permission | Permission[]`), dùng được cho chỗ "một trong hai quyền".

## 3. Phương án và lý do chọn

| Phương án | Ưu | Nhược | Kết luận |
|---|---|---|---|
| **A. Logic, 1 collection + trường `assetType`** | Giữ nguyên mọi tham chiếu (tài liệu, hợp đồng, lịch sử, lịch bảo trì); migration chỉ gán nhãn; ~70% logic (cấp phát, lịch sử, bảo trì, QR, Excel) dùng chung | Phải chủ động ép ranh giới ở service/route | **CHỌN** (D1) |
| B. Vật lý, 2 collection | Cách ly tuyệt đối | Mọi tham chiếu thành đa hình; nhân đôi code và mã; chuyển dữ liệu rủi ro hơn | Không chọn |

**Nguyên tắc thiết kế (CLAUDE.md §11, §12):**
1. **Lõi chung giữ nguyên** (Asset, AssetCategory, AssetAssignmentHistory, AssetMaintenancePlan). Không viết lại logic cấp phát/lịch sử/bảo trì.
2. **Hai module = hai "mặt" trên lõi đó:** mỗi module có router, bộ quyền, trang riêng, cùng gọi service lõi với tham số `assetType`. Dùng *router factory* `buildAssetRouter({ assetType, permissions })` thay vì chép 22 route hai lần.
3. **Phần riêng của mỗi module là phần mở rộng 1-1 hoặc collection riêng**, theo đúng mẫu `MedicalDeviceProfile` đang chạy.

## 4. Thiết kế đích

### 4.1 Cấu trúc module (thư mục `models/`, System Design)

| Thư mục | Model | Vai trò |
|---|---|---|
| `models/assets/` (giữ) | Asset, AssetCategory, AssetAssignmentHistory, AssetMaintenancePlan | Lõi dùng chung |
| `models/medicalDevices/` (mới, Q-C) | MedicalDeviceProfile, CalibrationRecord, OperatorCertificate (chuyển từ `models/assets/`) | Module Thiết bị y tế |
| `models/itDevices/` (mới, Q-A) | ItDeviceProfile, SoftwareLicense | Module Thiết bị CNTT |

Chỉ đổi vị trí file và import, **không đổi tên collection**, dữ liệu không đổi. Thêm entry `itDevices`, `medicalDevices` vào `moduleDescriptions.ts` (CLAUDE.md §36 bước 9).

### 4.2 Dữ liệu lõi và xử lý dữ liệu mơ hồ

- `AssetCategory`: thêm `assetType` (`IT` | `MEDICAL`) **chỉ trên danh mục gốc**, là nguồn sự thật; danh mục con kế thừa.
- `Asset`: thêm `assetType` (bắt buộc sau migrate, có index), phi chuẩn hoá từ gốc danh mục lúc ghi. Dùng enum `AssetType`.
- Bất biến ép ở service (hiện chưa có):
  - `asset.assetType` luôn bằng loại của gốc danh mục; đổi danh mục sang nhánh khác loại bị chặn.
  - `MedicalDeviceProfile` chỉ cho tài sản `MEDICAL`; `ItDeviceProfile` và gán bản quyền chỉ cho tài sản `IT`.
  - `OperatorCertificate.deviceCategory` phải thuộc nhánh y tế.
  - Danh mục chưa gắn vào nhánh nào không được kích hoạt lại hay dùng cho tài sản.
- Index: `{ assetType: 1, status: 1, createdAt: -1 }`, kiểm bằng `explain` và đối chiếu index sẵn có (bài học BR-19).
- **Không đổi:** `Document.relatedAsset`, `Contract.assets`, `AssetAssignmentHistory`, `AssetMaintenancePlan`, `CalibrationRecord`.

**Cơ chế 3 nhóm khi migrate (script không bao giờ đoán):**

| Nhóm | Định nghĩa | Script làm gì |
|---|---|---|
| **A — Rõ ràng** | Loại suy ra từ gốc danh mục, không có tín hiệu trái ngược | Tự gán `assetType` (kể cả tài sản đã xoá mềm) |
| **B — Xung đột** | Hồ sơ y tế trên tài sản CNTT; chứng chỉ vận hành gắn danh mục CNTT; tài sản trỏ tới danh mục ngoài 2 nhánh hoặc không tồn tại | **Dừng, không gán**, liệt kê kèm lý do. Chỉ xử lý theo danh sách ngoại lệ tường minh trong script, mỗi mục có quyết định của user ghi trong file task DEV (trong git, vì `backend/scripts/` không có trong git) |
| **C — Chỉ ghi nhận** | Không ảnh hưởng việc gán loại | In báo cáo, không sửa |

- **Cổng mở module:** hai module mới chỉ bật khi nhóm B còn **0 mục**.
- **Production:** chạy xem trước và quyết lại từ đầu; **không mang danh sách ngoại lệ của DB dev sang**.

Kết quả đối chiếu DB dev và quyết định:

| Ca | Nhóm | Quyết định |
|---|---|---|
| 118/119 tài sản (104 CNTT, 14 y tế gồm 1 đã xoá mềm) | A | Gán tự động |
| `TB-KD-2023-0003` "Máy quét mã vạch kiểm kho thuốc": danh mục CNTT, có hồ sơ y tế hạng A (0 hiệu chuẩn, 0 chứng chỉ, tạo 30/09) | B | **Giữ là CNTT, xoá hồ sơ y tế** |
| 3 chứng chỉ vận hành (AUTOCLAVE, ANESTHESIA ×2) | — | Thuộc nhánh y tế, không xung đột |
| 9 danh mục ngoài 2 nhánh (7 cũ + 2 thử) | C | Không gán loại, không xoá |
| 23 hợp đồng: 15 chỉ CNTT, 1 chỉ y tế, **7 trộn cả hai** | C | Không đổi dữ liệu; hiện đủ danh sách thiết bị, liên kết chi tiết chỉ với loại người xem có quyền |
| 1 tài liệu có `relatedAsset` (CNTT) | C | Không đổi |

### 4.3 API

| Module | Prefix | Nội dung |
|---|---|---|
| CNTT | `/api/it-assets` | CRUD, xoá/khôi phục, cấp phát/luân chuyển/thu hồi, lịch sử, QR, kiểm kê, Excel, kế hoạch bảo trì, cảnh báo, danh mục nhánh CNTT, **hồ sơ CNTT** (`/:id/profile`) |
| CNTT | `/api/software-licenses` | Danh mục bản quyền, gán/gỡ máy, cảnh báo hết hạn |
| Y tế | `/api/medical-assets` | Như CNTT (trừ hồ sơ CNTT) **cộng** hồ sơ y tế, hiệu chuẩn, chứng chỉ người vận hành, dashboard theo hạng, danh mục nhánh TBYT |
| Cũ | `/api/assets`, `/api/assets/medical-devices`, `/api/assets/categories` | Lớp tương thích, đánh dấu deprecated trong OpenAPI, gỡ ở giai đoạn cuối |

- Mount các prefix mới TRƯỚC `/api/assets` (cùng lý do thứ tự mount đã ghi ở `app.ts`).
- **Cô lập theo loại ở tầng service:** `/api/it-assets/:id` với id thiết bị y tế → **404** (không lộ sự tồn tại), và ngược lại.

### 4.4 Quyền

**Bộ quyền mới:**
- `IT_ASSET_*` và `MEDICAL_ASSET_*`, mỗi bộ 15 quyền: VIEW, VIEW_DETAIL, CREATE, UPDATE, DELETE, DELETE_PERMANENT, ASSIGN, DISPOSE, ALERTS_TRIGGER, EXCEL_EXPORT, EXCEL_IMPORT, INVENTORY_CHECK, MAINTENANCE_PLAN_VIEW/CREATE/UPDATE.
- `IT_ASSET_CATEGORY_*` và `MEDICAL_ASSET_CATEGORY_*` (Q-B), mỗi bộ 5: VIEW, CREATE, UPDATE, DELETE, DELETE_PERMANENT. Thay `ASSET_CATEGORY_*`.
- `SOFTWARE_LICENSE_*`: VIEW, CREATE, UPDATE, DELETE, ASSIGN, ALERTS_TRIGGER (6).
- Hồ sơ CNTT dùng `IT_ASSET_VIEW_DETAIL` (xem) và `IT_ASSET_UPDATE` (sửa), không tạo quyền riêng. Khác hồ sơ y tế (có quyền riêng vì mang tính pháp lý, hiệu chuẩn).
- Giữ nguyên `MEDICAL_DEVICE_*` (5) và `OPERATOR_CERTIFICATE_*` (4) (Q-D).
- Tổng: **46 quyền mới**; gỡ 20 quyền cũ (`ASSET_*`, `ASSET_CATEGORY_*`) ở giai đoạn dọn dẹp.

**Ánh xạ role đích:**

| Role | CNTT | Y tế |
|---|---|---|
| ADMIN | toàn bộ | toàn bộ |
| IT | toàn bộ `IT_ASSET_*`, `IT_ASSET_CATEGORY_*`, `SOFTWARE_LICENSE_*` | **chỉ xem** (Q-F): `MEDICAL_ASSET_VIEW`, `_VIEW_DETAIL`, `MEDICAL_ASSET_CATEGORY_VIEW`, `MEDICAL_DEVICE_VIEW`, `OPERATOR_CERTIFICATE_VIEW` |
| PHONG_VAT_TU_TTB | **chỉ xem** (Q-F): `IT_ASSET_VIEW`, `_VIEW_DETAIL`, `IT_ASSET_CATEGORY_VIEW` | toàn bộ `MEDICAL_ASSET_*`, `MEDICAL_ASSET_CATEGORY_*` + `MEDICAL_DEVICE_*` + `OPERATOR_CERTIFICATE_*` (như hiện có) |
| Trưởng khoa, Điều dưỡng trưởng, Ban Giám đốc | VIEW/VIEW_DETAIL | VIEW/VIEW_DETAIL (+ `MEDICAL_DEVICE_VIEW`, `OPERATOR_CERTIFICATE_VIEW` như hiện nay) |
| USER | đối chiếu từng quyền hiện có khi làm, giữ đúng mức hiện tại | như CNTT |

Lưu ý: `ASSET_DELETE_PERMANENT` hiện CỐ Ý không gán cho IT (chỉ ADMIN); giữ nguyên tinh thần đó cho `IT_ASSET_DELETE_PERMANENT` / `MEDICAL_ASSET_DELETE_PERMANENT`. `ASSET_DISPOSE` hiện chỉ Vật tư-TTB có; với IT cần đối chiếu khi làm.

- Chỗ dùng chéo (chọn tài sản cho đề xuất sửa chữa, hợp đồng; xem hợp đồng trộn): chấp nhận **một trong hai** quyền xem.
- Mọi route mới PHẢI có `authorizePermission` và test chặn đúng 401/403 (CLAUDE.md §18, §32). Quyền mới PHẢI được seed vào DB và gán role qua `assignPermissionsToRoleService` (đã hai lần code xong nhưng catalog DB thiếu quyền: DEV-068, DEV-077).

### 4.5 Cảnh báo (Q-G)
| Cron | Người nhận |
|---|---|
| Bảo hành/bảo trì thiết bị CNTT | IT |
| Bản quyền phần mềm sắp/đã hết hạn (mới) | IT |
| Bảo hành/bảo trì thiết bị y tế | Vật tư-TTB **và** IT |
| Hiệu chuẩn, giấy phép, chứng chỉ vận hành (y tế) | Vật tư-TTB **và** IT |

Gửi theo `notifyUsersByRoleName` có sẵn; không gửi trùng cho người có cả hai role (lọc theo user).

### 4.6 Module CNTT: hồ sơ và bản quyền (Q-A)

**`ItDeviceProfile`** (1-1 với tài sản `IT`, giống `MedicalDeviceProfile`):

| Nhóm | Trường | Ghi chú |
|---|---|---|
| Phần cứng | `cpu`, `ram`, `storage`, `gpu` | Chuỗi tự do (dữ liệu cũ dạng "64GB", "4TB SSD RAID10") |
| Mạng | `ipAddress`, `macAddress`, `hostname`, `vlan` | Validate định dạng IP/MAC; index `ipAddress` để tìm; **IP trùng với thiết bị đang hoạt động khác: cảnh báo, không chặn** (Q-A3) |
| Hệ điều hành & firmware | `osName`, `osVersion`, `firmwareVersion` | Lọc được để rà soát máy dùng phiên bản cũ |

Có thể thêm ngày hết hỗ trợ của hệ điều hành để tự cảnh báo, nhưng **chưa nằm trong phạm vi** (chưa được yêu cầu).

**Chuyển dữ liệu `specs` cũ (Q-A3):** script sao chép các khóa nhận ra được sang hồ sơ, **không xoá `specs`**:

| Khóa trong `specs` | Sang | Số tài sản |
|---|---|---|
| `cpu`, `ram`, `storage`, `gpu` | cùng tên | 32 / 32 / 33 / 1 |
| `ip` | `ipAddress` | 6 |
| `firmware` | `firmwareVersion` | 1 |
| `lanIp`, `wanIp`, `ports`, `xuatXu`, `congSuat` | **giữ ở `specs`**, báo cáo nhóm C | thiết bị mạng có 2 IP; không đoán IP nào là chính |

Script chỉ chạy cho tài sản `IT`; IP sai định dạng không chép, báo cáo để sửa tay.

**`SoftwareLicense`** (danh mục bản quyền, Q-A1):

| Trường | Ghi chú |
|---|---|
| `softwareName`, `edition`/`version` | Ví dụ "Microsoft Office", "2021 Standard" |
| `licenseType` | Vĩnh viễn / thuê bao |
| `totalSeats` | Số máy được cài |
| `assets: [ObjectId → Asset]` | Máy đang dùng; theo mẫu `Contract.assets` có sẵn |
| `purchaseDate`, `expiresAt` (bỏ trống nếu vĩnh viễn) | Cron cảnh báo trước hạn |
| `vendor` (→ Vendor), `contractOrOrderNumber` | Liên kết module Nhà cung cấp đã có |
| `proofFile` (→ Upload) | Chứng từ; tải qua cơ chế ownership/quyền như chứng chỉ hiệu chuẩn |
| `isActive`, `deletedAt`, `createdBy`, `updatedBy` | Xoá mềm như các module khác |

- **Không có trường khóa bản quyền** (Q-A2). Ghi rõ trong code để không ai thêm vào sau này mà không có quyết định.
- **Gán máy an toàn khi đồng thời:** dùng 1 lệnh cập nhật có điều kiện (`$addToSet` kèm điều kiện số máy hiện tại < `totalSeats`), không đọc-rồi-ghi (cùng bài học BR-14). Chỉ gán được tài sản `IT` đang hoạt động.
- Tài sản bị thanh lý/xoá: tự gỡ khỏi bản quyền (trả slot) — xác nhận lại khi làm vì liên quan nghiệp vụ.
- Trang chi tiết thiết bị CNTT hiện các bản quyền đang gán.

### 4.7 Frontend
- Hai mục sidebar trong nhóm "Tài sản & Vật tư": **"Thiết bị CNTT"** (`/app/it-assets`) và **"Thiết bị y tế"** (`/app/medical-assets`), cộng **"Bản quyền phần mềm"** (`/app/software-licenses`), mỗi mục gate theo quyền VIEW tương ứng. `/app/assets` cũ chuyển hướng.
- Tái sử dụng component hiện có, tham số hoá bằng `assetType` thay vì chép trang. Trang chi tiết Y tế gắn khối hồ sơ y tế/hiệu chuẩn/chứng chỉ; trang chi tiết CNTT gắn khối hồ sơ CNTT và bản quyền đang gán.
- Form tạo/sửa chỉ liệt kê danh mục thuộc nhánh của module; trang danh mục tách theo nhánh (Q-B).
- Hợp đồng trộn 2 loại: hiện đủ danh sách thiết bị; liên kết chi tiết chỉ hiện với loại người xem có quyền.
- Cập nhật `constants/permissions.ts`, `ROUTE_PERMISSION_MAP.md`, `AUTH_RBAC_MAP.md`.
- Mọi thay đổi frontend phải qua `npm run build` và Playwright (CLAUDE.md §28).

## 5. Lộ trình theo giai đoạn

Mỗi giai đoạn triển khai và hoàn tác độc lập; GĐ 1–7 chỉ thêm, không đổi hành vi cũ. Mỗi giai đoạn là 1 hoặc nhiều task `DEV-XXX`/`FE-XX`; hỏi user xác nhận trước khi bắt đầu từng giai đoạn.

| GĐ | Nội dung | Loại | Kích thước* | Điều kiện hoàn tất |
|---|---|---|---|---|
| **0** ✅ | **DONE 2026-10-08 (`DEV-111.md`)**: sao lưu EJSON đã kiểm chứng khôi phục (`D:\mongo-backups\ejson_hospital_documents_2026-10-08T01-42-27`); mốc test BE 562 unit / 193 e2e, FE 49 vitest / 16 Playwright | Chuẩn bị | S | Có bản sao lưu; mốc test ghi lại |
| **1** ✅ | **DONE 2026-10-08 (`DEV-112.md`)** — DB dev đã migrate (105 IT / 14 MEDICAL, nhóm B = 0); thêm theo user: gốc mới bắt buộc chọn loại + ô chọn loại ở form danh mục; đổi nhánh bị chặn khi còn tài sản. **Nền dữ liệu:** enum `AssetType`; `assetType` cho `AssetCategory` (gốc) và `Asset`; script migrate 3 nhóm (xem trước / `--apply`, idempotent) kèm ngoại lệ `TB-KD-2023-0003`; ép bất biến mục 4.2; index mới | DB | M | Mọi tài sản có `assetType`; nhóm B = 0; e2e bất biến; API cũ chạy y như cũ |
| **2** ✅ | **DONE 2026-10-08 (`DEV-113.md`)** — `models/itDevices/` hoãn sang GĐ 5 (thư mục rỗng không vào git, System Design suy module từ file model). **Cấu trúc module:** chuyển 3 model y tế sang `models/medicalDevices/`; tạo `models/itDevices/`; `moduleDescriptions.ts` | Kiến trúc | S | `tsc`, test toàn bộ xanh; System Design hiện đúng module |
| **3** ✅ | **DONE 2026-10-08 (`DEV-114.md`)** — DB dev đã seed (catalog 117→163); IT cấp đủ + `IT_ASSET_DISPOSE` (user chốt). **Quyền:** thêm 46 quyền vào catalog; seed DB; gán role theo ánh xạ mục 4.4 nhưng **chưa gỡ quyền cũ** | RBAC | M | Kiểm trực tiếp DB đủ quyền; e2e 401/403 cho từng quyền mới |
| **4** ✅ | **DONE 2026-10-08 (`DEV-115.md`)** — đường dẫn con: `/categories`, `/maintenance-plans`, y tế `/:assetId/profile`, `/calibration-records`, `/calibration-alerts/run`, `/operator-certificates`; dashboard theo hạng dời sang GĐ 6. **Backend 2 module:** router factory; `/api/it-assets`, `/api/medical-assets`, danh mục theo nhánh; cô lập theo loại; lớp tương thích `/api/assets` | API | L | e2e cho từng route × từng loại; test 404 chéo loại; OpenAPI |
| **5** ✅ | **DONE 2026-10-08 (`DEV-116.md`)** — code + test xong; script chép `specs` chưa chạy trên DB dev (chờ user); user chốt: tự trả slot khi thanh lý/xoá, hồ sơ CNTT dùng PUT upsert. **Hồ sơ CNTT và bản quyền:** `ItDeviceProfile`, `SoftwareLicense`, route, cảnh báo IP trùng, gán máy có điều kiện số slot, cron hết hạn, script chép `specs` | Feature + DB | L | e2e gồm ca 2 request gán đồng thời vào slot cuối; script chép `specs` chạy trên dữ liệu thật dev |
| **6** ✅ | **DONE 2026-10-09 (`DEV-118.md`)** — cảnh báo theo loại (y tế: Vật tư-TTB + IT), dashboard `?assetType=`, `GET /api/assets/lookup-options` (giữ ở GĐ 8); Excel đã xong từ GĐ 4. **Liên module:** cron theo loại và người nhận mục 4.5; dashboard theo loại; Excel theo loại; Tài liệu/Hợp đồng nhận một trong hai quyền xem | Tích hợp | M | Cảnh báo đúng người nhận; dashboard khớp 119 = 105 + 14 trên DB dev |
| **7** ✅ | **DONE 2026-10-09 (`FE-42.md`/`FE-43.md`/`FE-44.md`, backend `DEV-119.md`)** — `/app/it-assets`, `/app/medical-assets`, `/app/software-licenses`, `/app/assets/*` chuyển hướng; hai widget Dashboard; ô chọn tài sản qua `lookup-options`. Mô tả gốc: **Frontend:** 3 mục sidebar, trang theo loại, hồ sơ CNTT, bản quyền, danh mục theo nhánh, chuyển hướng `/app/assets` | UI | L | `npm run build`, Playwright, kiểm tay bằng role IT và Vật tư-TTB |
| **8** ✅ | **DONE 2026-10-09 (`DEV-120.md`, `FE-45.md`)** — gỡ 5 file route cũ (`/api/assets*` trừ `lookup-options`, `/api/assets/{medical-devices,asset-categories,maintenance-plans}`, `/api/operator-certificates`), gỡ 20 quyền cũ khỏi code + role + catalog DB dev (163 → 143), test chuyển sang route mới. Mô tả gốc: **Dọn dẹp** (đã làm trước, `DEV-117`: gỡ 7 quyền ghi y tế khỏi role IT; CLAUDE.md §36): gỡ 20 quyền cũ khỏi role và catalog, gỡ lớp tương thích, cập nhật OpenAPI/API_REFERENCE/PROJECT_MEMORY/FRONTEND_MEMORY; CLAUDE.md §36 và SKILL.md §3 (chỉ khi user xác nhận sửa rulebook) | Dọn dẹp | S | grep không còn tham chiếu cũ |

*S = vài giờ, M = khoảng 1 ngày, L = nhiều ngày. Ước lượng tương đối, chưa đo. Bổ sung hồ sơ CNTT và bản quyền (GĐ 5, phần của GĐ 7) làm khối lượng tăng đáng kể so với chỉ tách module.

## 6. Chiến lược chuyển đổi và hoàn tác
- **Mở rộng rồi thu hẹp:** thêm cái mới → chạy song song → gỡ cái cũ (GĐ 8). Trước GĐ 8, hoàn tác bằng cách bỏ code mới; dữ liệu cũ không mất (chỉ thêm `assetType`, hồ sơ CNTT là bản sao, `specs` giữ nguyên). Ngoại lệ duy nhất có xoá: hồ sơ y tế của `TB-KD-2023-0003` (đã có quyết định, có sao lưu ở GĐ 0).
- **Migration:** đúng quy tắc sau sự cố DEV-086 — trường mới phải có script backfill và kiểm trên dữ liệu có sẵn thật. Script mặc định chỉ xem trước, `--apply` mới ghi; chạy DB dev trước, production do user chạy khi deploy. `backend/scripts/` bị `.gitignore` nên phải mang script theo thủ công hoặc sửa `.gitignore`.
- **Quyền:** cấp quyền mới → đổi route → gỡ quyền cũ, để không có thời điểm role mất truy cập.
- **Production:** `autoIndex: true` bật vô điều kiện, index mới tự tạo khi khởi động.

## 7. Câu hỏi còn mở
Không còn câu hỏi chặn việc bắt đầu. Hai điểm sẽ xác nhận lại với user khi tới giai đoạn tương ứng:
- GĐ 5: tài sản bị thanh lý/xoá có tự gỡ khỏi bản quyền (trả slot) không.
- GĐ 3: quyền của role `USER` và `ASSET_DISPOSE` cho IT — đối chiếu từng quyền hiện có rồi hỏi nếu có chỗ thay đổi.

## 8. Rủi ro

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| R1 | Gán nhầm loại cho dữ liệu cũ | Trung bình | Cơ chế 3 nhóm, cổng "0 xung đột" |
| R2 | Quyền mới code xong nhưng catalog DB thiếu → menu/nút biến mất | Cao (đã xảy ra 2 lần) | GĐ 3 kiểm trực tiếp DB; luồng gán quyền chuẩn |
| R3 | IT/Vật tư-TTB mất quyền đang cần cho công việc thật | Trung bình (giảm nhờ Q-F xem chéo) | Cấp mới trước, gỡ cũ sau; thử bằng role thật |
| R4 | Frontend gãy do đổi đường dẫn/quyền (68 file nhắc `/assets`) | Trung bình | Lớp tương thích + chuyển hướng; build và Playwright mỗi giai đoạn |
| R5 | Sai cô lập: truy cập tài sản khác loại qua id | Trung bình (bảo mật) | 404 ở lõi service; test chéo loại cho mọi route có `:id` |
| R6 | Vượt số slot bản quyền khi gán đồng thời | Trung bình | Cập nhật có điều kiện, test 2 request đồng thời |
| R7 | Dữ liệu nhạy cảm bản quyền | Thấp (đã loại trừ) | Không lưu khóa (Q-A2); chứng từ qua Upload có kiểm quyền |
| R8 | Phạm vi phình (thêm cảnh báo hệ điều hành hết hỗ trợ, đổi mã tài sản…) | Trung bình | Ghi rõ ngoài phạm vi (mục 10) |

## 9. Kiểm thử (tối thiểu cho mọi giai đoạn)
- E2E (supertest + MongoDB in-memory) cho **mỗi route × mỗi loại**: không token 401; thiếu quyền 403; đúng quyền 200; sai loại 404; xem chéo được, sửa chéo bị 403 (Q-F).
- Test migration trên dữ liệu dựng giống DB thật (gồm ca ngoại lệ), kiểm idempotent; script chép `specs` không ghi đè hồ sơ đã có.
- Test bất biến: đổi danh mục sang nhánh khác bị chặn; hồ sơ y tế cho tài sản CNTT và hồ sơ CNTT cho tài sản y tế bị chặn; gán bản quyền vượt slot bị chặn.
- Test chứng minh bắt được lỗi: tạm gỡ logic cô lập/điều kiện slot rồi xác nhận test fail.
- `tsc`, jest unit, jest e2e, `npm run build` backend; build frontend và Playwright khi đụng frontend.

## 10. Việc KHÔNG nằm trong kế hoạch này
Đổi định dạng mã tài sản (Q-E); lưu khóa bản quyền (Q-A2); cảnh báo hệ điều hành hết hỗ trợ; quản lý vật tư tiêu hao (`Consumable*`, không đổi); đổi nghiệp vụ duyệt/khoa (Q1–Q3 của review backend vẫn giữ nguyên); xoá hay gộp 9 danh mục cũ/thử (chỉ báo cáo).
