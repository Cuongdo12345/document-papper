import mongoose from "mongoose";

const uploadSchema = new mongoose.Schema(
  {
    fileName: String,
    fileUrl: String,
    fileSize: Number,
    mimeType: String,

    storage: {
      type: String,
      enum: ["local", "s3"],
      default: "local"
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },

    isUsed: {
      type: Boolean,
      default: false
    },

    isDeleted: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

export const Upload = mongoose.model("Upload", uploadSchema);