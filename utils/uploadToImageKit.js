const fs = require("fs").promises;
const path = require("path");
const getImageKit = require("./imagekit");
const AppError = require("./appError");

/**
 * Uploads a file to ImageKit and returns both fileId and url
 * @param {string} filePath - Local file path to upload
 * @param {string} fileName - Desired file name on ImageKit
 * @param {string} folder - Optional folder path on ImageKit (e.g., "/gusto/photos")
 * @returns {Promise<{fileId: string, url: string}>} - ImageKit fileId and hosted URL
 */
const uploadToImageKit = async (filePath, fileName, folder = "/gusto") => {
  try {
    // Get ImageKit instance
    const imagekit = getImageKit();
    
    // Read file from local path
    const fileBuffer = await fs.readFile(filePath);
    const fileExtension = path.extname(filePath);

    // Use provided fileName or generate from file path
    const finalFileName = fileName || `upload_${Date.now()}${fileExtension}`;

    // Upload to ImageKit
    const uploadResponse = await imagekit.upload({
      file: fileBuffer,
      fileName: finalFileName,
      folder: folder,
      useUniqueFileName: true,
      overwriteFile: false,
    });

    // Return both fileId and url
    return {
      fileId: uploadResponse.fileId,
      url: uploadResponse.url,
    };
  } catch (error) {
    throw new AppError(
      `Failed to upload image to ImageKit: ${error.message}`,
      500
    );
  }
};

module.exports = uploadToImageKit;

