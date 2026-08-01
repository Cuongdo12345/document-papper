// // scripts/seed-assets.ts
// //
// // Seed dữ liệu THẬT cho module Quản lý Tài sản/Thiết bị IT bệnh viện:
// //   1. AssetCategory  — danh mục loại thiết bị IT
// //   2. Department     — khoa/phòng (chỉ tạo nếu CHƯA có, không ghi đè dữ liệu cũ)
// //   3. Asset          — tài sản/thiết bị cụ thể, gắn đúng category + department
// //
// // Cách chạy:
// //   npm run seed:assets
// //
// // Script AN TOÀN để chạy nhiều lần (idempotent):
// //   - AssetCategory: upsert theo `code`, không sửa lại name nếu đã tồn tại
// //   - Department: chỉ tạo nếu chưa có `code` đó, giữ nguyên dữ liệu cũ
// //   - Asset: match theo `serialNumber`, đã có thì bỏ qua, chưa có thì tạo mới
// //
// // QUY MÔ: ~105 thiết bị IT, trải đều toàn bộ 18 khoa/phòng thực tế của
// // bệnh viện (khớp với bảng Department trong DB). Trước khi ghi DB, script
// // tự kiểm tra ASSET_SEED không có serialNumber trùng lặp (validateAssetSeed).
// //
// // LƯU Ý: assetCode được sinh bằng `generateAssetCode()` (dùng chung Counter
// // atomic của project) nên phải insert TUẦN TỰ (for...of + await), không
// // dùng `insertMany`/`Promise.all` — tránh 2 asset cùng phòng/cùng năm bị
// // trùng số thứ tự.

// import dotenv from "dotenv";
// dotenv.config();

// import mongoose from "mongoose";
// import { AssetCategory } from "../src/models/assets/assetCategory.model";
// import { Asset, AssetStatus } from "../src/models/assets/asset.model";
// import Department from "../src/models/departments/department.model";
// import { generateAssetCode } from "../src/shared/helpers/generateAssetCode";

// const MONGO_URI = process.env.MONGO_URI as string;

// if (!MONGO_URI) {
//   throw new Error("❌ Thiếu MONGO_URI trong biến môi trường (.env)");
// }

// /* =====================================================================
//    1. DANH MỤC LOẠI THIẾT BỊ IT
// ===================================================================== */

// const CATEGORY_SEED = [
//   { code: "PC", name: "Máy tính để bàn", defaultWarrantyMonths: 24 },
//   { code: "LAPTOP", name: "Máy tính xách tay", defaultWarrantyMonths: 24 },
//   { code: "MONITOR", name: "Màn hình máy tính", defaultWarrantyMonths: 24 },
//   { code: "PRINTER", name: "Máy in", defaultWarrantyMonths: 12 },
//   { code: "SCANNER", name: "Máy scan tài liệu", defaultWarrantyMonths: 12 },
//   { code: "UPS", name: "Bộ lưu điện (UPS)", defaultWarrantyMonths: 12 },
//   { code: "SWITCH", name: "Switch mạng", defaultWarrantyMonths: 36 },
//   { code: "ROUTER", name: "Router / Modem mạng", defaultWarrantyMonths: 36 },
//   {
//     code: "ACCESS_POINT",
//     name: "Access Point Wifi",
//     defaultWarrantyMonths: 24,
//   },
//   { code: "SERVER", name: "Máy chủ (Server)", defaultWarrantyMonths: 36 },
//   { code: "CAMERA", name: "Camera giám sát", defaultWarrantyMonths: 24 },
//   {
//     code: "BARCODE_SCANNER",
//     name: "Máy quét mã vạch",
//     defaultWarrantyMonths: 12,
//   },
//   {
//     code: "CARD_READER",
//     name: "Đầu đọc thẻ / vân tay chấm công",
//     defaultWarrantyMonths: 12,
//   },
//   {
//     code: "HIS_TERMINAL",
//     name: "Terminal tra cứu HIS",
//     defaultWarrantyMonths: 24,
//   },
//   { code: "PROJECTOR", name: "Máy chiếu", defaultWarrantyMonths: 24 },
// ] as const;

// /* =====================================================================
//    2. KHOA / PHÒNG (chỉ tạo nếu chưa có sẵn trong DB)
// ===================================================================== */

// const DEPARTMENT_SEED = [
//   { code: "PTCHC", name: "Phòng Tổ Chức Hành Chính" },
//   { code: "PTCKT", name: "Phòng Tài Chính Kế Toán" },
//   { code: "PĐD", name: "Phòng Điều Dưỡng" },
//   {
//     code: "PĐD-NCKH-CĐT",
//     name: "Phòng Đào Tạo - Ngiên Cứu Khoa Học - Chỉ Đạo Tuyến",
//   },
//   {
//     code: "PKHTH - VTTBYT",
//     name: "Phòng Kế Hoạch Tổng Hợp - Vật Tư Thiết Bị Y Tế",
//   },
//   { code: "KKBĐK - HSCC", name: "Khoa Khám bệnh đa khoa - Hồi sức cấp cứu" },
//   { code: "KVLTL - PHCN", name: "Khoa Vật lý trị liệu - Phục hồi chức năng" },
//   { code: "KD", name: "Khoa Dược" },
//   { code: "KKSNK", name: "Phòng kiểm soát nhiễm khuẩn" },
//   { code: "KDD", name: "Phòng Dinh dưỡng" },
//   { code: "KCC - DS", name: "Khoa Châm cứu - Dưỡng sinh" },
//   { code: "KNTM - LH", name: "Khoa Nội tim mạch - Lão học" },
//   { code: "KNTH", name: "Khoa Nội tổng hợp" },
//   { code: "KNCXK", name: "Khoa Nội cơ xương khớp" },
//   { code: "KXN - CĐHA", name: "Khoa Xét nghiệm - Chẩn đoán hình ảnh" },
//   { code: "NGTH", name: "Khoa Ngoại tổng hợp" },
//   { code: "BANGIAMOC", name: "Ban Giám Đốc" },
//   { code: "CNTT", name: "Phòng Công nghệ thông tin" },
// ] as const;

// /* =====================================================================
//    3. TÀI SẢN / THIẾT BỊ IT CỤ THỂ
// ===================================================================== */

// type AssetSeed = {
//   category: (typeof CATEGORY_SEED)[number]["code"];
//   department: (typeof DEPARTMENT_SEED)[number]["code"];
//   name: string;
//   serialNumber: string;
//   model: string;
//   manufacturer: string;
//   location: string;
//   purchaseDate: string; // ISO date
//   warrantyMonths: number; // dùng để tự tính warrantyExpiredAt
//   purchasePrice: number; // VNĐ
//   supplier: string;
//   status: AssetStatus;
//   specs?: Record<string, any>;
// };

// const ASSET_SEED: AssetSeed[] = [
//   // ===== CNTT — phòng IT: nơi tập trung server/network =====
//   {
//     category: "SERVER",
//     department: "CNTT",
//     name: "Máy chủ ứng dụng HIS",
//     serialNumber: "DELL-R740-SN0001",
//     model: "PowerEdge R740",
//     manufacturer: "Dell",
//     location: "Phòng máy chủ - Tầng 1 nhà CNTT",
//     purchaseDate: "2023-03-10",
//     warrantyMonths: 36,
//     purchasePrice: 185000000,
//     supplier: "Công ty TNHH Tin học Viễn thông An Phát",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Xeon Silver 4210", ram: "64GB", storage: "4TB SSD RAID10", ip: "10.0.1.10" },
//   },
//   {
//     category: "SERVER",
//     department: "CNTT",
//     name: "Máy chủ cơ sở dữ liệu",
//     serialNumber: "HPE-DL380-SN0002",
//     model: "ProLiant DL380 Gen10",
//     manufacturer: "HPE",
//     location: "Phòng máy chủ - Tầng 1 nhà CNTT",
//     purchaseDate: "2023-03-10",
//     warrantyMonths: 36,
//     purchasePrice: 210000000,
//     supplier: "Công ty TNHH Tin học Viễn thông An Phát",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Xeon Gold 5218", ram: "128GB", storage: "8TB SSD RAID10", ip: "10.0.1.11" },
//   },
//   {
//     category: "SWITCH",
//     department: "CNTT",
//     name: "Switch lõi trung tâm",
//     serialNumber: "CISCO-C9300-SN0003",
//     model: "Catalyst 9300-48P",
//     manufacturer: "Cisco",
//     location: "Phòng máy chủ - Tầng 1 nhà CNTT",
//     purchaseDate: "2022-08-01",
//     warrantyMonths: 36,
//     purchasePrice: 95000000,
//     supplier: "Công ty CP Giải pháp mạng ITSol",
//     status: AssetStatus.IN_USE,
//     specs: { ports: 48, ip: "10.0.0.1", firmware: "17.06.04" },
//   },
//   {
//     category: "ROUTER",
//     department: "CNTT",
//     name: "Router biên (Internet Gateway)",
//     serialNumber: "MIKROTIK-CCR-SN0004",
//     model: "CCR1036-8G-2S+",
//     manufacturer: "MikroTik",
//     location: "Phòng máy chủ - Tầng 1 nhà CNTT",
//     purchaseDate: "2022-08-01",
//     warrantyMonths: 24,
//     purchasePrice: 28000000,
//     supplier: "Công ty CP Giải pháp mạng ITSol",
//     status: AssetStatus.IN_USE,
//     specs: { wanIp: "203.113.x.x", lanIp: "10.0.0.254" },
//   },
//   {
//     category: "UPS",
//     department: "CNTT",
//     name: "Bộ lưu điện phòng máy chủ",
//     serialNumber: "APC-SRT10K-SN0005",
//     model: "Smart-UPS SRT 10000VA",
//     manufacturer: "APC by Schneider Electric",
//     location: "Phòng máy chủ - Tầng 1 nhà CNTT",
//     purchaseDate: "2022-08-01",
//     warrantyMonths: 24,
//     purchasePrice: 78000000,
//     supplier: "Công ty CP Giải pháp mạng ITSol",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "LAPTOP",
//     department: "CNTT",
//     name: "Laptop kỹ thuật viên IT",
//     serialNumber: "DELL-5420-SN0006",
//     model: "Latitude 5420",
//     manufacturer: "Dell",
//     location: "Phòng CNTT",
//     purchaseDate: "2024-01-15",
//     warrantyMonths: 24,
//     purchasePrice: 22000000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-1135G7", ram: "16GB", storage: "512GB SSD" },
//   },

//   // ===== Khoa Khám bệnh — quầy tiếp đón, phòng khám =====
//   {
//     category: "PC",
//     department: "KKBĐK - HSCC",
//     name: "Máy tính quầy tiếp đón số 1",
//     serialNumber: "DELL-OPT7010-SN0007",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Quầy tiếp đón số 1 - Khoa Khám bệnh",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-12500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "PC",
//     department: "KKBĐK - HSCC",
//     name: "Máy tính quầy tiếp đón số 2",
//     serialNumber: "DELL-OPT7010-SN0008",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Quầy tiếp đón số 2 - Khoa Khám bệnh",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-12500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "MONITOR",
//     department: "KKBĐK - HSCC",
//     name: "Màn hình quầy tiếp đón số 1",
//     serialNumber: "DELL-P2422H-SN0009",
//     model: "P2422H",
//     manufacturer: "Dell",
//     location: "Quầy tiếp đón số 1 - Khoa Khám bệnh",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 3200000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "PRINTER",
//     department: "KKBĐK - HSCC",
//     name: "Máy in phiếu khám bệnh",
//     serialNumber: "HP-M404-SN0010",
//     model: "LaserJet Pro M404dn",
//     manufacturer: "HP",
//     location: "Quầy tiếp đón - Khoa Khám bệnh",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 12,
//     purchasePrice: 6500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.UNDER_MAINTENANCE,
//   },
//   {
//     category: "CARD_READER",
//     department: "KKBĐK - HSCC",
//     name: "Đầu đọc thẻ BHYT quầy số 1",
//     serialNumber: "ACS-ACR39-SN0011",
//     model: "ACR39U-U1",
//     manufacturer: "ACS",
//     location: "Quầy tiếp đón số 1 - Khoa Khám bệnh",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 12,
//     purchasePrice: 850000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "HIS_TERMINAL",
//     department: "KKBĐK - HSCC",
//     name: "Terminal tra cứu số thứ tự",
//     serialNumber: "ADV-KIOSK-SN0012",
//     model: "Advantech Kiosk UTC-520",
//     manufacturer: "Advantech",
//     location: "Sảnh chờ - Khoa Khám bệnh",
//     purchaseDate: "2022-11-01",
//     warrantyMonths: 24,
//     purchasePrice: 32000000,
//     supplier: "Công ty CP Công nghệ Kiosk Việt",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Khoa Cấp cứu =====
//   {
//     category: "PC",
//     department: "KKBĐK - HSCC",
//     name: "Máy tính trực cấp cứu",
//     serialNumber: "HP-PRODESK-SN0013",
//     model: "ProDesk 400 G7",
//     manufacturer: "HP",
//     location: "Phòng trực - Khoa Cấp cứu",
//     purchaseDate: "2023-02-14",
//     warrantyMonths: 24,
//     purchasePrice: 13800000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-10500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "PRINTER",
//     department: "KKBĐK - HSCC",
//     name: "Máy in nhãn vòng tay bệnh nhân",
//     serialNumber: "ZEBRA-ZD230-SN0014",
//     model: "ZD230",
//     manufacturer: "Zebra",
//     location: "Phòng trực - Khoa Cấp cứu",
//     purchaseDate: "2023-02-14",
//     warrantyMonths: 12,
//     purchasePrice: 4200000,
//     supplier: "Công ty TNHH Giải pháp Mã vạch Việt Nam",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "BARCODE_SCANNER",
//     department: "KKBĐK - HSCC",
//     name: "Máy quét mã vạch vòng tay bệnh nhân",
//     serialNumber: "HONEYWELL-1900-SN0015",
//     model: "Voyager 1900",
//     manufacturer: "Honeywell",
//     location: "Phòng trực - Khoa Cấp cứu",
//     purchaseDate: "2023-02-14",
//     warrantyMonths: 12,
//     purchasePrice: 2100000,
//     supplier: "Công ty TNHH Giải pháp Mã vạch Việt Nam",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Khoa Nội tổng hợp =====
//   {
//     category: "PC",
//     department: "KNTH",
//     name: "Máy tính phòng bác sĩ khoa Nội",
//     serialNumber: "DELL-OPT3000-SN0016",
//     model: "OptiPlex 3000 SFF",
//     manufacturer: "Dell",
//     location: "Phòng bác sĩ - Khoa Nội tổng hợp",
//     purchaseDate: "2022-06-10",
//     warrantyMonths: 24,
//     purchasePrice: 11500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i3-12100", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "PC",
//     department: "KNTH",
//     name: "Máy tính phòng điều dưỡng khoa Nội",
//     serialNumber: "DELL-OPT3000-SN0017",
//     model: "OptiPlex 3000 SFF",
//     manufacturer: "Dell",
//     location: "Phòng điều dưỡng - Khoa Nội tổng hợp",
//     purchaseDate: "2022-06-10",
//     warrantyMonths: 24,
//     purchasePrice: 11500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.LOST,
//   },
//   {
//     category: "PRINTER",
//     department: "KNTH",
//     name: "Máy in đơn thuốc khoa Nội",
//     serialNumber: "CANON-LBP2900-SN0018",
//     model: "LBP2900",
//     manufacturer: "Canon",
//     location: "Phòng bác sĩ - Khoa Nội tổng hợp",
//     purchaseDate: "2021-09-01",
//     warrantyMonths: 12,
//     purchasePrice: 2800000,
//     supplier: "Công ty TNHH Thiết bị Văn phòng Thành Đạt",
//     status: AssetStatus.DISPOSED,
//   },

//   // ===== Khoa Ngoại tổng hợp =====
//   {
//     category: "PC",
//     department: "NGTH",
//     name: "Máy tính phòng bác sĩ khoa Ngoại",
//     serialNumber: "DELL-OPT3000-SN0019",
//     model: "OptiPlex 3000 SFF",
//     manufacturer: "Dell",
//     location: "Phòng bác sĩ - Khoa Ngoại tổng hợp",
//     purchaseDate: "2022-06-10",
//     warrantyMonths: 24,
//     purchasePrice: 11500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i3-12100", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "MONITOR",
//     department: "NGTH",
//     name: "Màn hình phòng mổ 1",
//     serialNumber: "LG-24MK430-SN0020",
//     model: "24MK430H",
//     manufacturer: "LG",
//     location: "Phòng mổ 1 - Khoa Ngoại tổng hợp",
//     purchaseDate: "2022-06-10",
//     warrantyMonths: 24,
//     purchasePrice: 2900000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "CAMERA",
//     department: "NGTH",
//     name: "Camera giám sát hành lang khoa Ngoại",
//     serialNumber: "HIKVISION-2CD-SN0021",
//     model: "DS-2CD2143G0-I",
//     manufacturer: "Hikvision",
//     location: "Hành lang - Khoa Ngoại tổng hợp",
//     purchaseDate: "2023-01-05",
//     warrantyMonths: 24,
//     purchasePrice: 2400000,
//     supplier: "Công ty CP An ninh Camera Sài Gòn",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Khoa Xét nghiệm =====
//   {
//     category: "PC",
//     department: "KXN - CĐHA",
//     name: "Máy tính nhận mẫu xét nghiệm",
//     serialNumber: "HP-PRODESK-SN0022",
//     model: "ProDesk 400 G7",
//     manufacturer: "HP",
//     location: "Quầy nhận mẫu - Khoa Xét nghiệm",
//     purchaseDate: "2023-04-18",
//     warrantyMonths: 24,
//     purchasePrice: 13800000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-10500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "BARCODE_SCANNER",
//     department: "KXN - CĐHA",
//     name: "Máy quét mã vạch ống nghiệm",
//     serialNumber: "HONEYWELL-1900-SN0023",
//     model: "Voyager 1900",
//     manufacturer: "Honeywell",
//     location: "Quầy nhận mẫu - Khoa Xét nghiệm",
//     purchaseDate: "2023-04-18",
//     warrantyMonths: 12,
//     purchasePrice: 2100000,
//     supplier: "Công ty TNHH Giải pháp Mã vạch Việt Nam",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "PRINTER",
//     department: "KXN - CĐHA",
//     name: "Máy in kết quả xét nghiệm",
//     serialNumber: "HP-M404-SN0024",
//     model: "LaserJet Pro M404dn",
//     manufacturer: "HP",
//     location: "Phòng trả kết quả - Khoa Xét nghiệm",
//     purchaseDate: "2023-04-18",
//     warrantyMonths: 12,
//     purchasePrice: 6500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Khoa Chẩn đoán hình ảnh =====
//   {
//     category: "PC",
//     department: "KXN - CĐHA",
//     name: "Máy tính phòng đọc phim X-quang",
//     serialNumber: "DELL-3000-WS-SN0025",
//     model: "Precision 3660 Workstation",
//     manufacturer: "Dell",
//     location: "Phòng đọc phim - Khoa Chẩn đoán hình ảnh",
//     purchaseDate: "2023-07-01",
//     warrantyMonths: 36,
//     purchasePrice: 32000000,
//     supplier: "Công ty TNHH Thiết bị Y tế Hồng Phúc",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i7-12700", ram: "32GB", storage: "1TB SSD", gpu: "NVIDIA T400" },
//   },
//   {
//     category: "MONITOR",
//     department: "KXN - CĐHA",
//     name: "Màn hình đọc phim chẩn đoán (chuyên dụng)",
//     serialNumber: "EIZO-RX370-SN0026",
//     model: "RadiForce RX370",
//     manufacturer: "EIZO",
//     location: "Phòng đọc phim - Khoa Chẩn đoán hình ảnh",
//     purchaseDate: "2023-07-01",
//     warrantyMonths: 36,
//     purchasePrice: 145000000,
//     supplier: "Công ty TNHH Thiết bị Y tế Hồng Phúc",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "SCANNER",
//     department: "KXN - CĐHA",
//     name: "Máy scan phim X-quang",
//     serialNumber: "VIDAR-DIAGNOSTIC-SN0027",
//     model: "DiagnosticPro Advantage",
//     manufacturer: "Vidar",
//     location: "Phòng kỹ thuật - Khoa Chẩn đoán hình ảnh",
//     purchaseDate: "2021-12-01",
//     warrantyMonths: 24,
//     purchasePrice: 68000000,
//     supplier: "Công ty TNHH Thiết bị Y tế Hồng Phúc",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Khoa Dược =====
//   {
//     category: "PC",
//     department: "KD",
//     name: "Máy tính quầy cấp phát thuốc",
//     serialNumber: "DELL-OPT7010-SN0028",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Quầy cấp phát - Khoa Dược",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-12500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "PRINTER",
//     department: "KD",
//     name: "Máy in nhãn thuốc",
//     serialNumber: "ZEBRA-ZD230-SN0029",
//     model: "ZD230",
//     manufacturer: "Zebra",
//     location: "Quầy cấp phát - Khoa Dược",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 12,
//     purchasePrice: 4200000,
//     supplier: "Công ty TNHH Giải pháp Mã vạch Việt Nam",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "BARCODE_SCANNER",
//     department: "KD",
//     name: "Máy quét mã vạch kiểm kho thuốc",
//     serialNumber: "HONEYWELL-1900-SN0030",
//     model: "Voyager 1900",
//     manufacturer: "Honeywell",
//     location: "Kho thuốc - Khoa Dược",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 12,
//     purchasePrice: 2100000,
//     supplier: "Công ty TNHH Giải pháp Mã vạch Việt Nam",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Khoa Hồi sức tích cực (ICU) =====
//   {
//     category: "PC",
//     department: "KKBĐK - HSCC",
//     name: "Máy tính trạm theo dõi bệnh nhân ICU",
//     serialNumber: "HP-PRODESK-SN0031",
//     model: "ProDesk 400 G7",
//     manufacturer: "HP",
//     location: "Trạm điều dưỡng - Khoa ICU",
//     purchaseDate: "2023-02-14",
//     warrantyMonths: 24,
//     purchasePrice: 13800000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-10500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "CAMERA",
//     department: "KKBĐK - HSCC",
//     name: "Camera giám sát phòng bệnh ICU",
//     serialNumber: "HIKVISION-2CD-SN0032",
//     model: "DS-2CD2143G0-I",
//     manufacturer: "Hikvision",
//     location: "Phòng bệnh - Khoa ICU",
//     purchaseDate: "2023-01-05",
//     warrantyMonths: 24,
//     purchasePrice: 2400000,
//     supplier: "Công ty CP An ninh Camera Sài Gòn",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "UPS",
//     department: "KKBĐK - HSCC",
//     name: "Bộ lưu điện trạm điều dưỡng ICU",
//     serialNumber: "APC-SMT1500-SN0033",
//     model: "Smart-UPS SMT1500",
//     manufacturer: "APC by Schneider Electric",
//     location: "Trạm điều dưỡng - Khoa ICU",
//     purchaseDate: "2023-02-14",
//     warrantyMonths: 24,
//     purchasePrice: 9500000,
//     supplier: "Công ty CP Giải pháp mạng ITSol",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Phòng Hành chính quản trị / Kế hoạch tổng hợp / Tài chính kế toán =====
//   {
//     category: "LAPTOP",
//     department: "PTCHC",
//     name: "Laptop trưởng phòng HCQT",
//     serialNumber: "LENOVO-T14-SN0034",
//     model: "ThinkPad T14 Gen 3",
//     manufacturer: "Lenovo",
//     location: "Phòng Hành chính quản trị",
//     purchaseDate: "2024-03-01",
//     warrantyMonths: 36,
//     purchasePrice: 24500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-1240P", ram: "16GB", storage: "512GB SSD" },
//   },
//   {
//     category: "PRINTER",
//     department: "PTCHC",
//     name: "Máy in đa năng phòng HCQT",
//     serialNumber: "CANON-MF-SN0035",
//     model: "imageCLASS MF445dw",
//     manufacturer: "Canon",
//     location: "Phòng Hành chính quản trị",
//     purchaseDate: "2022-10-10",
//     warrantyMonths: 12,
//     purchasePrice: 9800000,
//     supplier: "Công ty TNHH Thiết bị Văn phòng Thành Đạt",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "PC",
//     department: "PKHTH - VTTBYT",
//     name: "Máy tính phòng Kế hoạch tổng hợp",
//     serialNumber: "DELL-OPT7010-SN0036",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Phòng Kế hoạch tổng hợp",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-12500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "PC",
//     department: "PTCKT",
//     name: "Máy tính kế toán viên 1",
//     serialNumber: "DELL-OPT7010-SN0037",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Phòng Tài chính kế toán",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-12500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "PC",
//     department: "PTCKT",
//     name: "Máy tính kế toán viên 2",
//     serialNumber: "DELL-OPT7010-SN0038",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Phòng Tài chính kế toán",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.RESERVED,
//   },
//   {
//     category: "PROJECTOR",
//     department: "PTCHC",
//     name: "Máy chiếu phòng họp giao ban",
//     serialNumber: "EPSON-EB-SN0039",
//     model: "EB-X500",
//     manufacturer: "Epson",
//     location: "Phòng họp giao ban",
//     purchaseDate: "2022-01-15",
//     warrantyMonths: 24,
//     purchasePrice: 12800000,
//     supplier: "Công ty TNHH Thiết bị Văn phòng Thành Đạt",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== BỔ SUNG: mở rộng đủ ~100 thiết bị theo thực tế (khoảng 100 máy) =====

//   // ===== CNTT — mở rộng hạ tầng mạng (Access Point, Switch tầng, NAS backup) =====
//   {
//     category: "ACCESS_POINT",
//     department: "CNTT",
//     name: "Access Point Wifi khu Khám bệnh",
//     serialNumber: "UBIQUITI-UAP6-SN0043",
//     model: "UniFi AP6 Long-Range",
//     manufacturer: "Ubiquiti",
//     location: "Hành lang tầng 1 - Khu Khám bệnh",
//     purchaseDate: "2023-09-01",
//     warrantyMonths: 24,
//     purchasePrice: 4200000,
//     supplier: "Công ty CP Giải pháp mạng ITSol",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "ACCESS_POINT",
//     department: "CNTT",
//     name: "Access Point Wifi khu Nội trú tầng 2",
//     serialNumber: "UBIQUITI-UAP6-SN0044",
//     model: "UniFi AP6 Long-Range",
//     manufacturer: "Ubiquiti",
//     location: "Hành lang tầng 2 - Khu Nội trú",
//     purchaseDate: "2023-09-01",
//     warrantyMonths: 24,
//     purchasePrice: 4200000,
//     supplier: "Công ty CP Giải pháp mạng ITSol",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "ACCESS_POINT",
//     department: "CNTT",
//     name: "Access Point Wifi khu Nội trú tầng 3",
//     serialNumber: "UBIQUITI-UAP6-SN0045",
//     model: "UniFi AP6 Long-Range",
//     manufacturer: "Ubiquiti",
//     location: "Hành lang tầng 3 - Khu Nội trú",
//     purchaseDate: "2023-09-01",
//     warrantyMonths: 24,
//     purchasePrice: 4200000,
//     supplier: "Công ty CP Giải pháp mạng ITSol",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "ACCESS_POINT",
//     department: "CNTT",
//     name: "Access Point Wifi khu Hành chính",
//     serialNumber: "UBIQUITI-UAP6-SN0046",
//     model: "UniFi AP6 Long-Range",
//     manufacturer: "Ubiquiti",
//     location: "Hành lang - Khu Hành chính",
//     purchaseDate: "2023-09-01",
//     warrantyMonths: 24,
//     purchasePrice: 4200000,
//     supplier: "Công ty CP Giải pháp mạng ITSol",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "SWITCH",
//     department: "CNTT",
//     name: "Switch tầng 2 nhà Nội trú",
//     serialNumber: "CISCO-C9200-SN0047",
//     model: "Catalyst 9200-24P",
//     manufacturer: "Cisco",
//     location: "Tủ mạng tầng 2 - Nhà Nội trú",
//     purchaseDate: "2023-09-01",
//     warrantyMonths: 36,
//     purchasePrice: 62000000,
//     supplier: "Công ty CP Giải pháp mạng ITSol",
//     status: AssetStatus.IN_USE,
//     specs: { ports: "24", ip: "10.0.0.2" },
//   },
//   {
//     category: "SWITCH",
//     department: "CNTT",
//     name: "Switch tầng 3 nhà Nội trú",
//     serialNumber: "CISCO-C9200-SN0048",
//     model: "Catalyst 9200-24P",
//     manufacturer: "Cisco",
//     location: "Tủ mạng tầng 3 - Nhà Nội trú",
//     purchaseDate: "2023-09-01",
//     warrantyMonths: 36,
//     purchasePrice: 62000000,
//     supplier: "Công ty CP Giải pháp mạng ITSol",
//     status: AssetStatus.IN_USE,
//     specs: { ports: "24", ip: "10.0.0.3" },
//   },
//   {
//     category: "SERVER",
//     department: "CNTT",
//     name: "Máy chủ lưu trữ backup (NAS)",
//     serialNumber: "SYNOLOGY-RS-SN0049",
//     model: "RackStation RS3621xs+",
//     manufacturer: "Synology",
//     location: "Phòng máy chủ - Tầng 1 nhà CNTT",
//     purchaseDate: "2024-02-20",
//     warrantyMonths: 36,
//     purchasePrice: 145000000,
//     supplier: "Công ty CP Giải pháp mạng ITSol",
//     status: AssetStatus.IN_USE,
//     specs: { storage: "48TB RAID6", ip: "10.0.1.20" },
//   },
//   {
//     category: "CAMERA",
//     department: "CNTT",
//     name: "Camera giám sát phòng máy chủ",
//     serialNumber: "HIKVISION-2CD-SN0050",
//     model: "DS-2CD2143G0-I",
//     manufacturer: "Hikvision",
//     location: "Phòng máy chủ - Tầng 1 nhà CNTT",
//     purchaseDate: "2023-09-01",
//     warrantyMonths: 24,
//     purchasePrice: 2400000,
//     supplier: "Công ty CP An ninh Camera Sài Gòn",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Khoa Khám bệnh đa khoa - HSCC — mở rộng phòng khám chuyên khoa =====
//   {
//     category: "PC",
//     department: "KKBĐK - HSCC",
//     name: "Máy tính phòng khám Nhi",
//     serialNumber: "DELL-OPT7010-SN0051",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Phòng khám Nhi - Khoa Khám bệnh",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-12500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "PC",
//     department: "KKBĐK - HSCC",
//     name: "Máy tính phòng khám Tai Mũi Họng",
//     serialNumber: "DELL-OPT7010-SN0052",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Phòng khám TMH - Khoa Khám bệnh",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-12500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "PC",
//     department: "KKBĐK - HSCC",
//     name: "Máy tính phòng khám Sản phụ khoa",
//     serialNumber: "DELL-OPT7010-SN0053",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Phòng khám Sản - Khoa Khám bệnh",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-12500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "PC",
//     department: "KKBĐK - HSCC",
//     name: "Máy tính trạm điều dưỡng HSCC 1",
//     serialNumber: "HP-PRODESK-SN0054",
//     model: "ProDesk 400 G7",
//     manufacturer: "HP",
//     location: "Trạm điều dưỡng - Khoa HSCC",
//     purchaseDate: "2023-02-14",
//     warrantyMonths: 24,
//     purchasePrice: 13800000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-10500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "PC",
//     department: "KKBĐK - HSCC",
//     name: "Máy tính trạm điều dưỡng HSCC 2",
//     serialNumber: "HP-PRODESK-SN0055",
//     model: "ProDesk 400 G7",
//     manufacturer: "HP",
//     location: "Trạm điều dưỡng - Khoa HSCC",
//     purchaseDate: "2023-02-14",
//     warrantyMonths: 24,
//     purchasePrice: 13800000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-10500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "MONITOR",
//     department: "KKBĐK - HSCC",
//     name: "Màn hình theo dõi trạm điều dưỡng HSCC",
//     serialNumber: "DELL-P2422H-SN0056",
//     model: "P2422H",
//     manufacturer: "Dell",
//     location: "Trạm điều dưỡng - Khoa HSCC",
//     purchaseDate: "2023-02-14",
//     warrantyMonths: 24,
//     purchasePrice: 3200000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "UPS",
//     department: "KKBĐK - HSCC",
//     name: "Bộ lưu điện trạm điều dưỡng HSCC",
//     serialNumber: "APC-SMT1500-SN0057",
//     model: "Smart-UPS SMT1500",
//     manufacturer: "APC by Schneider Electric",
//     location: "Trạm điều dưỡng - Khoa HSCC",
//     purchaseDate: "2023-02-14",
//     warrantyMonths: 24,
//     purchasePrice: 9500000,
//     supplier: "Công ty CP Giải pháp mạng ITSol",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "CAMERA",
//     department: "KKBĐK - HSCC",
//     name: "Camera giám sát sảnh chờ khám bệnh",
//     serialNumber: "HIKVISION-2CD-SN0058",
//     model: "DS-2CD2143G0-I",
//     manufacturer: "Hikvision",
//     location: "Sảnh chờ - Khoa Khám bệnh",
//     purchaseDate: "2023-01-05",
//     warrantyMonths: 24,
//     purchasePrice: 2400000,
//     supplier: "Công ty CP An ninh Camera Sài Gòn",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "PRINTER",
//     department: "KKBĐK - HSCC",
//     name: "Máy in phiếu khám phòng khám Nhi",
//     serialNumber: "HP-M404-SN0059",
//     model: "LaserJet Pro M404dn",
//     manufacturer: "HP",
//     location: "Phòng khám Nhi - Khoa Khám bệnh",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 12,
//     purchasePrice: 6500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Khoa Xét nghiệm - Chẩn đoán hình ảnh — mở rộng =====
//   {
//     category: "PC",
//     department: "KXN - CĐHA",
//     name: "Máy tính phòng xét nghiệm sinh hóa",
//     serialNumber: "HP-PRODESK-SN0060",
//     model: "ProDesk 400 G7",
//     manufacturer: "HP",
//     location: "Phòng xét nghiệm sinh hóa - Khoa XN-CĐHA",
//     purchaseDate: "2023-04-18",
//     warrantyMonths: 24,
//     purchasePrice: 13800000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-10500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "PC",
//     department: "KXN - CĐHA",
//     name: "Máy tính phòng siêu âm",
//     serialNumber: "DELL-OPT7010-SN0061",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Phòng siêu âm - Khoa XN-CĐHA",
//     purchaseDate: "2023-07-01",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "UPS",
//     department: "KXN - CĐHA",
//     name: "Bộ lưu điện máy X-quang kỹ thuật số",
//     serialNumber: "APC-SRT3K-SN0062",
//     model: "Smart-UPS SRT 3000VA",
//     manufacturer: "APC by Schneider Electric",
//     location: "Phòng X-quang - Khoa XN-CĐHA",
//     purchaseDate: "2023-07-01",
//     warrantyMonths: 24,
//     purchasePrice: 32000000,
//     supplier: "Công ty CP Giải pháp mạng ITSol",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "PRINTER",
//     department: "KXN - CĐHA",
//     name: "Máy in phim DICOM",
//     serialNumber: "AGFA-DRYSTAR-SN0063",
//     model: "DRYSTAR 5302",
//     manufacturer: "Agfa HealthCare",
//     location: "Phòng đọc phim - Khoa XN-CĐHA",
//     purchaseDate: "2022-05-15",
//     warrantyMonths: 12,
//     purchasePrice: 185000000,
//     supplier: "Công ty TNHH Thiết bị Y tế Hồng Phúc",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Khoa Nội tổng hợp — mở rộng =====
//   {
//     category: "MONITOR",
//     department: "KNTH",
//     name: "Màn hình phòng bác sĩ khoa Nội",
//     serialNumber: "DELL-P2422H-SN0064",
//     model: "P2422H",
//     manufacturer: "Dell",
//     location: "Phòng bác sĩ - Khoa Nội tổng hợp",
//     purchaseDate: "2022-06-10",
//     warrantyMonths: 24,
//     purchasePrice: 3200000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "BARCODE_SCANNER",
//     department: "KNTH",
//     name: "Máy quét mã vạch vòng tay bệnh nhân khoa Nội",
//     serialNumber: "HONEYWELL-1900-SN0065",
//     model: "Voyager 1900",
//     manufacturer: "Honeywell",
//     location: "Trạm điều dưỡng - Khoa Nội tổng hợp",
//     purchaseDate: "2023-06-10",
//     warrantyMonths: 12,
//     purchasePrice: 2100000,
//     supplier: "Công ty TNHH Giải pháp Mã vạch Việt Nam",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Khoa Ngoại tổng hợp — mở rộng =====
//   {
//     category: "PC",
//     department: "NGTH",
//     name: "Máy tính phòng điều dưỡng khoa Ngoại",
//     serialNumber: "DELL-OPT3000-SN0066",
//     model: "OptiPlex 3000 SFF",
//     manufacturer: "Dell",
//     location: "Phòng điều dưỡng - Khoa Ngoại tổng hợp",
//     purchaseDate: "2022-06-10",
//     warrantyMonths: 24,
//     purchasePrice: 11500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "UPS",
//     department: "NGTH",
//     name: "Bộ lưu điện phòng mổ 1",
//     serialNumber: "APC-SMT1500-SN0067",
//     model: "Smart-UPS SMT1500",
//     manufacturer: "APC by Schneider Electric",
//     location: "Phòng mổ 1 - Khoa Ngoại tổng hợp",
//     purchaseDate: "2022-06-10",
//     warrantyMonths: 24,
//     purchasePrice: 9500000,
//     supplier: "Công ty CP Giải pháp mạng ITSol",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Khoa Dược — mở rộng =====
//   {
//     category: "PC",
//     department: "KD",
//     name: "Máy tính kho thuốc trung tâm",
//     serialNumber: "DELL-OPT7010-SN0068",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Kho thuốc trung tâm - Khoa Dược",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "MONITOR",
//     department: "KD",
//     name: "Màn hình quầy cấp phát thuốc",
//     serialNumber: "DELL-P2422H-SN0069",
//     model: "P2422H",
//     manufacturer: "Dell",
//     location: "Quầy cấp phát - Khoa Dược",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 3200000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Phòng Kế Hoạch Tổng Hợp - VTTBYT — mở rộng =====
//   {
//     category: "LAPTOP",
//     department: "PKHTH - VTTBYT",
//     name: "Laptop quản lý tài sản - vật tư thiết bị y tế",
//     serialNumber: "LENOVO-T14-SN0070",
//     model: "ThinkPad T14 Gen 3",
//     manufacturer: "Lenovo",
//     location: "Phòng Kế hoạch tổng hợp - VTTBYT",
//     purchaseDate: "2024-03-01",
//     warrantyMonths: 36,
//     purchasePrice: 24500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-1240P", ram: "16GB", storage: "512GB SSD" },
//   },

//   // ===== Phòng Tổ Chức Hành Chính — mở rộng =====
//   {
//     category: "CARD_READER",
//     department: "PTCHC",
//     name: "Đầu đọc vân tay chấm công cổng chính",
//     serialNumber: "ZKTECO-K40-SN0071",
//     model: "K40 Pro",
//     manufacturer: "ZKTeco",
//     location: "Cổng bảo vệ chính - Phòng PTCHC",
//     purchaseDate: "2022-10-10",
//     warrantyMonths: 12,
//     purchasePrice: 3500000,
//     supplier: "Công ty TNHH Thiết bị Văn phòng Thành Đạt",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Phòng Điều Dưỡng =====
//   {
//     category: "PC",
//     department: "PĐD",
//     name: "Máy tính phòng Điều Dưỡng 1",
//     serialNumber: "DELL-OPT7010-SN0072",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Phòng Điều Dưỡng",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-12500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "PC",
//     department: "PĐD",
//     name: "Máy tính phòng Điều Dưỡng 2",
//     serialNumber: "DELL-OPT7010-SN0073",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Phòng Điều Dưỡng",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-12500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "PRINTER",
//     department: "PĐD",
//     name: "Máy in phòng Điều Dưỡng",
//     serialNumber: "CANON-MF-SN0074",
//     model: "imageCLASS MF445dw",
//     manufacturer: "Canon",
//     location: "Phòng Điều Dưỡng",
//     purchaseDate: "2022-10-10",
//     warrantyMonths: 12,
//     purchasePrice: 9800000,
//     supplier: "Công ty TNHH Thiết bị Văn phòng Thành Đạt",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "LAPTOP",
//     department: "PĐD",
//     name: "Laptop Trưởng phòng Điều Dưỡng",
//     serialNumber: "LENOVO-T14-SN0075",
//     model: "ThinkPad T14 Gen 3",
//     manufacturer: "Lenovo",
//     location: "Phòng Điều Dưỡng",
//     purchaseDate: "2024-03-01",
//     warrantyMonths: 36,
//     purchasePrice: 24500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-1240P", ram: "16GB", storage: "512GB SSD" },
//   },

//   // ===== Phòng Đào Tạo - NCKH - Chỉ Đạo Tuyến =====
//   {
//     category: "PC",
//     department: "PĐD-NCKH-CĐT",
//     name: "Máy tính phòng Đào tạo - NCKH",
//     serialNumber: "DELL-OPT7010-SN0076",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Phòng Đào Tạo - NCKH - Chỉ Đạo Tuyến",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "LAPTOP",
//     department: "PĐD-NCKH-CĐT",
//     name: "Laptop giảng dạy - tập huấn chỉ đạo tuyến",
//     serialNumber: "DELL-5420-SN0077",
//     model: "Latitude 5420",
//     manufacturer: "Dell",
//     location: "Phòng Đào Tạo - NCKH - Chỉ Đạo Tuyến",
//     purchaseDate: "2024-01-15",
//     warrantyMonths: 24,
//     purchasePrice: 22000000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-1135G7", ram: "16GB", storage: "512GB SSD" },
//   },
//   {
//     category: "PROJECTOR",
//     department: "PĐD-NCKH-CĐT",
//     name: "Máy chiếu phòng tập huấn - đào tạo",
//     serialNumber: "EPSON-EB-SN0078",
//     model: "EB-X500",
//     manufacturer: "Epson",
//     location: "Phòng tập huấn - Phòng Đào Tạo",
//     purchaseDate: "2022-01-15",
//     warrantyMonths: 24,
//     purchasePrice: 12800000,
//     supplier: "Công ty TNHH Thiết bị Văn phòng Thành Đạt",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Khoa Vật lý trị liệu - Phục hồi chức năng =====
//   {
//     category: "PC",
//     department: "KVLTL - PHCN",
//     name: "Máy tính quầy tiếp nhận VLTL-PHCN",
//     serialNumber: "DELL-OPT7010-SN0079",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Quầy tiếp nhận - Khoa VLTL-PHCN",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-12500", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "PC",
//     department: "KVLTL - PHCN",
//     name: "Máy tính phòng tập phục hồi chức năng",
//     serialNumber: "HP-PRODESK-SN0080",
//     model: "ProDesk 400 G7",
//     manufacturer: "HP",
//     location: "Phòng tập PHCN",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 13800000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "PRINTER",
//     department: "KVLTL - PHCN",
//     name: "Máy in phiếu điều trị VLTL-PHCN",
//     serialNumber: "HP-M404-SN0081",
//     model: "LaserJet Pro M404dn",
//     manufacturer: "HP",
//     location: "Quầy tiếp nhận - Khoa VLTL-PHCN",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 12,
//     purchasePrice: 6500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "MONITOR",
//     department: "KVLTL - PHCN",
//     name: "Màn hình phòng tập PHCN",
//     serialNumber: "DELL-P2422H-SN0082",
//     model: "P2422H",
//     manufacturer: "Dell",
//     location: "Phòng tập PHCN",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 3200000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Phòng Kiểm soát nhiễm khuẩn =====
//   {
//     category: "PC",
//     department: "KKSNK",
//     name: "Máy tính phòng Kiểm soát nhiễm khuẩn",
//     serialNumber: "DELL-OPT7010-SN0083",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Phòng Kiểm soát nhiễm khuẩn",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "LAPTOP",
//     department: "KKSNK",
//     name: "Laptop giám sát nhiễm khuẩn bệnh viện",
//     serialNumber: "DELL-5420-SN0084",
//     model: "Latitude 5420",
//     manufacturer: "Dell",
//     location: "Phòng Kiểm soát nhiễm khuẩn",
//     purchaseDate: "2024-01-15",
//     warrantyMonths: 24,
//     purchasePrice: 22000000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "PRINTER",
//     department: "KKSNK",
//     name: "Máy in báo cáo giám sát nhiễm khuẩn",
//     serialNumber: "CANON-MF-SN0085",
//     model: "imageCLASS MF445dw",
//     manufacturer: "Canon",
//     location: "Phòng Kiểm soát nhiễm khuẩn",
//     purchaseDate: "2022-10-10",
//     warrantyMonths: 12,
//     purchasePrice: 9800000,
//     supplier: "Công ty TNHH Thiết bị Văn phòng Thành Đạt",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Phòng Dinh dưỡng =====
//   {
//     category: "PC",
//     department: "KDD",
//     name: "Máy tính quầy suất ăn khoa Dinh dưỡng",
//     serialNumber: "DELL-OPT7010-SN0086",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Phòng Dinh dưỡng",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "PC",
//     department: "KDD",
//     name: "Máy tính kho thực phẩm khoa Dinh dưỡng",
//     serialNumber: "HP-PRODESK-SN0087",
//     model: "ProDesk 400 G7",
//     manufacturer: "HP",
//     location: "Kho thực phẩm - Phòng Dinh dưỡng",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 13800000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "PRINTER",
//     department: "KDD",
//     name: "Máy in thực đơn - phiếu suất ăn",
//     serialNumber: "CANON-MF-SN0088",
//     model: "imageCLASS MF445dw",
//     manufacturer: "Canon",
//     location: "Phòng Dinh dưỡng",
//     purchaseDate: "2022-10-10",
//     warrantyMonths: 12,
//     purchasePrice: 9800000,
//     supplier: "Công ty TNHH Thiết bị Văn phòng Thành Đạt",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Khoa Châm cứu - Dưỡng sinh =====
//   {
//     category: "PC",
//     department: "KCC - DS",
//     name: "Máy tính quầy tiếp nhận Châm cứu - Dưỡng sinh",
//     serialNumber: "DELL-OPT7010-SN0089",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Quầy tiếp nhận - Khoa Châm cứu - Dưỡng sinh",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "PRINTER",
//     department: "KCC - DS",
//     name: "Máy in phiếu điều trị Châm cứu - Dưỡng sinh",
//     serialNumber: "HP-M404-SN0090",
//     model: "LaserJet Pro M404dn",
//     manufacturer: "HP",
//     location: "Quầy tiếp nhận - Khoa Châm cứu - Dưỡng sinh",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 12,
//     purchasePrice: 6500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "MONITOR",
//     department: "KCC - DS",
//     name: "Màn hình phòng khám Châm cứu - Dưỡng sinh",
//     serialNumber: "DELL-P2422H-SN0091",
//     model: "P2422H",
//     manufacturer: "Dell",
//     location: "Phòng khám - Khoa Châm cứu - Dưỡng sinh",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 3200000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Khoa Nội tim mạch - Lão học =====
//   {
//     category: "PC",
//     department: "KNTM - LH",
//     name: "Máy tính phòng bác sĩ khoa Nội tim mạch - Lão học",
//     serialNumber: "DELL-OPT3000-SN0092",
//     model: "OptiPlex 3000 SFF",
//     manufacturer: "Dell",
//     location: "Phòng bác sĩ - Khoa Nội tim mạch - Lão học",
//     purchaseDate: "2022-06-10",
//     warrantyMonths: 24,
//     purchasePrice: 11500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i3-12100", ram: "8GB", storage: "256GB SSD" },
//   },
//   {
//     category: "PC",
//     department: "KNTM - LH",
//     name: "Máy tính trạm điều dưỡng khoa Nội tim mạch - Lão học",
//     serialNumber: "HP-PRODESK-SN0093",
//     model: "ProDesk 400 G7",
//     manufacturer: "HP",
//     location: "Trạm điều dưỡng - Khoa Nội tim mạch - Lão học",
//     purchaseDate: "2023-02-14",
//     warrantyMonths: 24,
//     purchasePrice: 13800000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "PC",
//     department: "KNTM - LH",
//     name: "Máy tính phòng đo điện tim - Holter",
//     serialNumber: "DELL-OPT7010-SN0094",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Phòng đo điện tim - Khoa Nội tim mạch - Lão học",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "MONITOR",
//     department: "KNTM - LH",
//     name: "Màn hình phòng đo điện tim - Holter",
//     serialNumber: "DELL-P2422H-SN0095",
//     model: "P2422H",
//     manufacturer: "Dell",
//     location: "Phòng đo điện tim - Khoa Nội tim mạch - Lão học",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 3200000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "PRINTER",
//     department: "KNTM - LH",
//     name: "Máy in đơn thuốc khoa Nội tim mạch - Lão học",
//     serialNumber: "CANON-LBP2900-SN0096",
//     model: "LBP2900",
//     manufacturer: "Canon",
//     location: "Phòng bác sĩ - Khoa Nội tim mạch - Lão học",
//     purchaseDate: "2021-09-01",
//     warrantyMonths: 12,
//     purchasePrice: 2800000,
//     supplier: "Công ty TNHH Thiết bị Văn phòng Thành Đạt",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Khoa Nội cơ xương khớp =====
//   {
//     category: "PC",
//     department: "KNCXK",
//     name: "Máy tính phòng bác sĩ khoa Nội cơ xương khớp",
//     serialNumber: "DELL-OPT3000-SN0097",
//     model: "OptiPlex 3000 SFF",
//     manufacturer: "Dell",
//     location: "Phòng bác sĩ - Khoa Nội cơ xương khớp",
//     purchaseDate: "2022-06-10",
//     warrantyMonths: 24,
//     purchasePrice: 11500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "PC",
//     department: "KNCXK",
//     name: "Máy tính trạm điều dưỡng khoa Nội cơ xương khớp",
//     serialNumber: "HP-PRODESK-SN0098",
//     model: "ProDesk 400 G7",
//     manufacturer: "HP",
//     location: "Trạm điều dưỡng - Khoa Nội cơ xương khớp",
//     purchaseDate: "2023-02-14",
//     warrantyMonths: 24,
//     purchasePrice: 13800000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "PRINTER",
//     department: "KNCXK",
//     name: "Máy in đơn thuốc khoa Nội cơ xương khớp",
//     serialNumber: "CANON-LBP2900-SN0099",
//     model: "LBP2900",
//     manufacturer: "Canon",
//     location: "Phòng bác sĩ - Khoa Nội cơ xương khớp",
//     purchaseDate: "2021-09-01",
//     warrantyMonths: 12,
//     purchasePrice: 2800000,
//     supplier: "Công ty TNHH Thiết bị Văn phòng Thành Đạt",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "MONITOR",
//     department: "KNCXK",
//     name: "Màn hình trạm điều dưỡng khoa Nội cơ xương khớp",
//     serialNumber: "DELL-P2422H-SN0100",
//     model: "P2422H",
//     manufacturer: "Dell",
//     location: "Trạm điều dưỡng - Khoa Nội cơ xương khớp",
//     purchaseDate: "2023-02-14",
//     warrantyMonths: 24,
//     purchasePrice: 3200000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Ban Giám Đốc =====
//   {
//     category: "LAPTOP",
//     department: "BANGIAMOC",
//     name: "Laptop Giám đốc bệnh viện",
//     serialNumber: "LENOVO-X1CARBON-SN0101",
//     model: "ThinkPad X1 Carbon Gen 11",
//     manufacturer: "Lenovo",
//     location: "Phòng Giám đốc - Ban Giám Đốc",
//     purchaseDate: "2024-05-01",
//     warrantyMonths: 36,
//     purchasePrice: 42000000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i7-1355U", ram: "16GB", storage: "1TB SSD" },
//   },
//   {
//     category: "LAPTOP",
//     department: "BANGIAMOC",
//     name: "Laptop Phó Giám đốc 1",
//     serialNumber: "LENOVO-T14-SN0102",
//     model: "ThinkPad T14 Gen 3",
//     manufacturer: "Lenovo",
//     location: "Phòng Phó Giám đốc - Ban Giám Đốc",
//     purchaseDate: "2024-05-01",
//     warrantyMonths: 36,
//     purchasePrice: 24500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-1240P", ram: "16GB", storage: "512GB SSD" },
//   },
//   {
//     category: "LAPTOP",
//     department: "BANGIAMOC",
//     name: "Laptop Phó Giám đốc 2",
//     serialNumber: "LENOVO-T14-SN0103",
//     model: "ThinkPad T14 Gen 3",
//     manufacturer: "Lenovo",
//     location: "Phòng Phó Giám đốc - Ban Giám Đốc",
//     purchaseDate: "2024-05-01",
//     warrantyMonths: 36,
//     purchasePrice: 24500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//     specs: { cpu: "Intel Core i5-1240P", ram: "16GB", storage: "512GB SSD" },
//   },
//   {
//     category: "PC",
//     department: "BANGIAMOC",
//     name: "Máy tính thư ký Ban Giám Đốc",
//     serialNumber: "DELL-OPT7010-SN0104",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Phòng thư ký - Ban Giám Đốc",
//     purchaseDate: "2023-05-20",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_USE,
//   },
//   {
//     category: "PROJECTOR",
//     department: "BANGIAMOC",
//     name: "Máy chiếu phòng họp Ban Giám Đốc",
//     serialNumber: "EPSON-EB-SN0105",
//     model: "EB-X500",
//     manufacturer: "Epson",
//     location: "Phòng họp - Ban Giám Đốc",
//     purchaseDate: "2022-01-15",
//     warrantyMonths: 24,
//     purchasePrice: 12800000,
//     supplier: "Công ty TNHH Thiết bị Văn phòng Thành Đạt",
//     status: AssetStatus.IN_USE,
//   },

//   // ===== Thiết bị tồn kho — chưa cấp phát (thử nghiệm dashboard/tồn kho) =====
//   {
//     category: "LAPTOP",
//     department: "CNTT",
//     name: "Laptop dự phòng (kho CNTT)",
//     serialNumber: "DELL-5420-SN0040",
//     model: "Latitude 5420",
//     manufacturer: "Dell",
//     location: "Kho thiết bị - Phòng CNTT",
//     purchaseDate: "2024-06-01",
//     warrantyMonths: 24,
//     purchasePrice: 22000000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_STOCK,
//     specs: { cpu: "Intel Core i5-1135G7", ram: "16GB", storage: "512GB SSD" },
//   },
//   {
//     category: "PC",
//     department: "CNTT",
//     name: "Máy tính dự phòng (kho CNTT) 1",
//     serialNumber: "DELL-OPT7010-SN0041",
//     model: "OptiPlex 7010",
//     manufacturer: "Dell",
//     location: "Kho thiết bị - Phòng CNTT",
//     purchaseDate: "2024-06-01",
//     warrantyMonths: 24,
//     purchasePrice: 14500000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_STOCK,
//   },
//   {
//     category: "MONITOR",
//     department: "CNTT",
//     name: "Màn hình dự phòng (kho CNTT) 1",
//     serialNumber: "DELL-P2422H-SN0042",
//     model: "P2422H",
//     manufacturer: "Dell",
//     location: "Kho thiết bị - Phòng CNTT",
//     purchaseDate: "2024-06-01",
//     warrantyMonths: 24,
//     purchasePrice: 3200000,
//     supplier: "Công ty TNHH Thương mại Điện tử Phong Vũ",
//     status: AssetStatus.IN_STOCK,
//   },
// ];

// /* =====================================================================
//    VALIDATE — kiểm tra dữ liệu seed trước khi đụng tới DB
// ===================================================================== */

// const validateAssetSeed = () => {
//   const seen = new Set<string>();
//   const duplicates = new Set<string>();

//   for (const a of ASSET_SEED) {
//     if (seen.has(a.serialNumber)) {
//       duplicates.add(a.serialNumber);
//     }
//     seen.add(a.serialNumber);
//   }

//   if (duplicates.size > 0) {
//     throw new Error(
//       `❌ ASSET_SEED có serialNumber bị trùng lặp: ${[...duplicates].join(", ")}`,
//     );
//   }
// };

// /* =====================================================================
//    HÀM SEED
// ===================================================================== */

// const seedCategories = async () => {
//   console.log("\n📦 Seeding AssetCategory...");
//   const categoryIdByCode: Record<string, mongoose.Types.ObjectId> = {};

//   for (const c of CATEGORY_SEED) {
//     const category = await AssetCategory.findOneAndUpdate(
//       { code: c.code },
//       { $setOnInsert: c },
//       { upsert: true, new: true },
//     );
//     categoryIdByCode[c.code] = category._id as mongoose.Types.ObjectId;
//   }

//   console.log(`   ✅ ${CATEGORY_SEED.length} danh mục sẵn sàng.`);
//   return categoryIdByCode;
// };

// const seedDepartments = async () => {
//   console.log("\n🏥 Seeding Department (chỉ tạo nếu chưa có)...");
//   const departmentIdByCode: Record<string, mongoose.Types.ObjectId> = {};
//   let created = 0;

//   for (const d of DEPARTMENT_SEED) {
//     let department = await Department.findOne({ code: d.code });
//     if (!department) {
//       department = await Department.create(d);
//       created++;
//     }
//     departmentIdByCode[d.code] = department._id as mongoose.Types.ObjectId;
//   }

//   console.log(
//     `   ✅ ${DEPARTMENT_SEED.length} khoa/phòng sẵn sàng (tạo mới ${created}, đã có sẵn ${
//       DEPARTMENT_SEED.length - created
//     }).`,
//   );
//   return departmentIdByCode;
// };

// const seedAssets = async (
//   categoryIdByCode: Record<string, mongoose.Types.ObjectId>,
//   departmentIdByCode: Record<string, mongoose.Types.ObjectId>,
// ) => {
//   console.log(`\n💻 Seeding Asset (tài sản/thiết bị IT) — ${ASSET_SEED.length} thiết bị trong seed...`);
//   let created = 0;
//   let skipped = 0;
//   let failed = 0;

//   // Prefetch 1 lần toàn bộ serialNumber đã tồn tại thay vì findOne từng cái
//   // (ASSET_SEED giờ ~100+ dòng, tránh 100+ round-trip DB không cần thiết).
//   const existingDocs = await Asset.find(
//     { serialNumber: { $in: ASSET_SEED.map((a) => a.serialNumber) } },
//     { serialNumber: 1 },
//   ).lean();
//   const existingSerials = new Set(
//     existingDocs.map((d: { serialNumber: string }) => d.serialNumber),
//   );

//   // Insert TUẦN TỰ (không Promise.all) vì generateAssetCode() dùng Counter
//   // atomic theo department+year — chạy song song vẫn đúng nhờ $inc, nhưng
//   // tuần tự giúp log rõ ràng và dễ debug khi seed dữ liệu lớn.
//   for (const a of ASSET_SEED) {
//     if (existingSerials.has(a.serialNumber)) {
//       skipped++;
//       continue;
//     }

//     const departmentId = departmentIdByCode[a.department];
//     const categoryId = categoryIdByCode[a.category];

//     if (!departmentId || !categoryId) {
//       failed++;
//       console.error(
//         `   ⚠️  Bỏ qua "${a.name}" (${a.serialNumber}): không tìm thấy department/category tương ứng.`,
//       );
//       continue;
//     }

//     try {
//       const purchaseDate = new Date(a.purchaseDate);
//       const warrantyExpiredAt = new Date(purchaseDate);
//       warrantyExpiredAt.setMonth(
//         warrantyExpiredAt.getMonth() + a.warrantyMonths,
//       );

//       const assetCode = await generateAssetCode(departmentId, purchaseDate);

//       await Asset.create({
//         assetCode,
//         category: categoryId,
//         department: departmentId,
//         name: a.name,
//         serialNumber: a.serialNumber,
//         model: a.model,
//         manufacturer: a.manufacturer,
//         location: a.location,
//         purchaseDate,
//         purchasePrice: a.purchasePrice,
//         warrantyExpiredAt,
//         supplier: a.supplier,
//         status: a.status,
//         specs: a.specs || {},
//       });

//       created++;
//       if (created % 20 === 0) {
//         console.log(`   ... đã tạo ${created}/${ASSET_SEED.length - skipped} tài sản`);
//       }
//     } catch (err) {
//       // Không throw để 1 bản ghi lỗi (VD trùng key lạ, validation) không làm
//       // sập toàn bộ quá trình seed ~100 thiết bị — log lại rồi seed tiếp.
//       failed++;
//       console.error(
//         `   ⚠️  Lỗi khi tạo "${a.name}" (${a.serialNumber}):`,
//         err instanceof Error ? err.message : err,
//       );
//     }
//   }

//   console.log(
//     `   ✅ Tạo mới ${created} tài sản, bỏ qua ${skipped} đã tồn tại, lỗi ${failed}.`,
//   );
// };

// /* =====================================================================
//    MAIN
// ===================================================================== */

// const run = async () => {
//   console.log("🚀 Bắt đầu seed dữ liệu module Tài sản/Thiết bị IT...");
//   console.log(`📍 MONGO_URI: ${MONGO_URI.replace(/\/\/.*@/, "//***:***@")}`);

//   validateAssetSeed();
//   console.log(`✅ ASSET_SEED hợp lệ (${ASSET_SEED.length} thiết bị, không trùng serialNumber).`);

//   await mongoose.connect(MONGO_URI);
//   console.log("✅ Đã kết nối MongoDB");

//   const categoryIdByCode = await seedCategories();
//   const departmentIdByCode = await seedDepartments();
//   await seedAssets(categoryIdByCode, departmentIdByCode);

//   console.log("\n🎉 Seed dữ liệu hoàn tất!");
//   await mongoose.disconnect();
//   process.exit(0);
// };

// run().catch((err) => {
//   console.error("\n❌ Seed thất bại:", err);
//   process.exit(1);
// });
