import mongoose from "mongoose";

/**
 * Đăng ký các event listener cho kết nối MongoDB để log rõ ràng trạng thái kết nối, lỗi, ngắt kết nối và tái kết nối. Điều này giúp dev dễ dàng theo dõi và debug trong cả môi trường development và production.
 * Các event được đăng ký bao gồm:
 * - connected: khi kết nối thành công
 * - error: khi có lỗi kết nối
 * disconnected: khi kết nối bị ngắt
 * - reconnected: khi kết nối được tái thiết lập sau khi bị ngắt
 * 
 * Việc đăng ký event này nên được thực hiện ngay sau khi gọi connectDB() để đảm bảo rằng tất cả các trạng thái kết nối đều được log rõ ràng.
 */
export const registerMongoEvents = () => {
  mongoose.connection.on("connected", () => {
    console.log("🟢 MongoDB connected");
  });

  mongoose.connection.on("error", (err) => {
    console.error("🔴 MongoDB error:", err);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("🟡 MongoDB disconnected");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("🔵 MongoDB reconnected");
  });
};