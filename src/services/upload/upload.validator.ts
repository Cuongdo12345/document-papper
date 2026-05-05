
/**
 * Validate file uploads
 */

export interface UploadValidateOptions {
  maxFileSize?: number;       // mỗi file
  maxTotalSize?: number;      // tổng dung lượng
  maxFiles?: number;          // số file
  allowedTypes?: string[];    // mime types
}

export const validateFiles = (
  files: Express.Multer.File[],
  options: UploadValidateOptions
) => {
  if (!files || files.length === 0) {
    throw new Error("No files uploaded");
  }

  // validate số lượng file
  if (options.maxFiles && files.length > options.maxFiles) {
    throw new Error(`Max ${options.maxFiles} files allowed`);
  }

  let totalSize = 0;

  for (const file of files) {
    // validate type
    if (
      options.allowedTypes &&
      !options.allowedTypes.includes(file.mimetype)
    ) {
      throw new Error(`File type not allowed: ${file.originalname}`);
    }

    // validate size từng file
    if (options.maxFileSize && file.size > options.maxFileSize) {
      throw new Error(
        `File too large: ${file.originalname} (max ${options.maxFileSize} bytes)`
      );
    }

    totalSize += file.size;
  }

  // validate tổng dung lượng
  if (options.maxTotalSize && totalSize > options.maxTotalSize) {
    throw new Error(
      `Total file size exceeds limit (${options.maxTotalSize} bytes)`
    );
  }

  return true;
};