const getImageKit = require("../utils/imagekit");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

/**
 * Get ImageKit authentication parameters for client-side uploads
 * @route GET /api/v1/images/auth
 * @access Public
 */
exports.getImageKitAuth = catchAsync(async (req, res, next) => {
  try {
    // Get ImageKit instance (will throw if env vars are missing)
    const imagekit = getImageKit();
    
    // Get authentication parameters
    const authParams = imagekit.getAuthenticationParameters();

    // Return auth parameters with public key and URL endpoint
    res.status(200).json({
      status: "success",
      ...authParams,
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
  } catch (error) {
    return next(new AppError("ImageKit not configured on server.", 500));
  }
});

/**
 * Delete an ImageKit file by fileId
 * @route DELETE /api/v1/images/file
 * @access Public (for demo). Consider protecting in production.
 * Body: { fileId: string }
 */
exports.deleteImage = catchAsync(async (req, res, next) => {
  const fileId = req.body?.fileId || req.query?.fileId;
  if (!fileId) {
    return next(new AppError("fileId is required to delete an image", 400));
  }

  const imagekit = getImageKit();
  await imagekit.deleteFile(fileId);

  res.status(200).json({
    status: "success",
    message: "Image deleted successfully",
    data: { fileId },
  });
});

