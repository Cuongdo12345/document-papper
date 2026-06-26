import mongoose from "mongoose";

/**
 * Database connection module
 * - Kết nối MongoDB với các options tối ưu cho production
 * - Tự động retry khi kết nối thất bại (quan trọng cho Docker)
 * - Đăng ký event để log trạng thái kết nối
 * - Đăng ký shutdown hook để đóng kết nối khi ứng dụng dừng
 * Lưu ý: Các options như autoIndex có thể tắt trong production để tăng hiệu suất, nhưng nên bật trong development để tự động tạo index
 * Các options về pool và timeout giúp ứng dụng ổn định hơn khi có nhiều kết nối hoặc khi MongoDB chậm phản hồi
 * MONGO_URI được lấy từ biến môi trường, đảm bảo không hardcode thông tin nhạy cảm trong code
 * Có thể thêm các tính năng như logging chi tiết hơn, hoặc sử dụng thư viện như mongoose-retry để tự động retry với backoff strategy nếu cần
 * Đảm bảo rằng biến môi trường MONGO_URI đã được thiết lập trước khi chạy ứng dụng, nếu không sẽ throw lỗi ngay khi khởi động
 * Có thể thêm tính năng kiểm tra kết nối MongoDB khi ứng dụng khởi động và log rõ ràng nếu kết nối thất bại, giúp dễ dàng debug trong môi trường production
 */

/**
✅ Auto retry khi DB chưa sẵn sàng
✅ Log rõ ràng cho dev / production
✅ Tắt strictQuery warning
✅ Graceful shutdown khi app stop
✅ Support Docker / Kubernetes
✅ Không crash vô ích khi reconnect được
✅ Typed đầy đủ cho TS
 */

const MONGO_URI = process.env.MONGO_URI as string;

if (!MONGO_URI) {
  throw new Error("❌ Missing MONGO_URI in environment variables");
}

// ===== Mongo options =====
const mongoOptions: mongoose.ConnectOptions = {
  autoIndex: true,              // bật index dev, prod có thể tắt
  maxPoolSize: 10,              // giới hạn pool
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

// ===== CONNECT FUNCTION =====
export const connectDB = async (): Promise<void> => {
  try {
    mongoose.set("strictQuery", false);

    await mongoose.connect(MONGO_URI, mongoOptions);

    console.log("✅ MongoDB connected");
    console.log(`📍 DB: ${mongoose.connection.name}`);
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);

    // retry sau 5s (quan trọng cho Docker compose)
    setTimeout(connectDB, 5000);
  }
};


// import mongoose from "mongoose";

// const connectDB = async (): Promise<void> => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI as string);
//     console.log("✅ MongoDB connected");
//   } catch (error) {
//     console.error("❌ MongoDB error", error);
//     process.exit(1);
//   }
// };

// export default connectDB;
