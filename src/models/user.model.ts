// import { Schema, model, Types } from "mongoose";
import mongoose, { Document as MongoDoc, Schema,Types } from "mongoose";

export interface IUser extends Document {
  username: string;
  password: string;
  fullName: string;
  permissions: [string];
  role: "ADMIN" | "USER" | "IT";
  department?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      // lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    fullName: {
      type: String,
      required: true
    },

    role: {
      type: String,
      enum: ["ADMIN", "USER", "IT"],
      default: "USER"
    },

    permissions: {
        type: [String],
        default: [],
},

    department: {
      type: Types.ObjectId,
      ref: "Department"
    },

    isActive: {
      type: Boolean,
      default: true
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

/**
 * 🔥 INDEX PHỤC VỤ FILTER & SEARCH
 * 📌 Vì sao nên index như vậy
username: search / check tồn tại
department + role: filter admin cực nhiều
createdAt: phân trang + lọc theo ngày rất nhanh
🎯 TÁC DỤNG
Query	Index chạy
login	username
filter user list	compound index
keyword search	text index
sort createdAt	compound index
 */

// UserSchema.index({ username: 1 });
// UserSchema.index({ department: 1 });
// UserSchema.index({ role: 1 });
// UserSchema.index({ createdAt: -1 });

UserSchema.index({ username: 1 }, { unique: true }); // login

UserSchema.index({ department: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ isActive: 1 });

/**
 * Filter + pagination index (rất quan trọng)
 */
UserSchema.index({
  isActive: 1,
  role: 1,
  department: 1,
  createdAt: -1,
});

/**
 * Keyword search username
 */
UserSchema.index({ username: "text" });


export default mongoose.model<IUser>("User", UserSchema);
