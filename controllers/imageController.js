const fs = require("fs");
const fsp = require("fs").promises;
const path = require("path");
const getImageKit = require("../utils/imagekit");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const uploadToImageKit = require("../utils/uploadToImageKit");
const User = require("../models/userModel");

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

/**
 * Upload user media (photos array and optional studentIdPhoto) to ImageKit in structured folders.
 * Folder structure: /gusto/users/{username}/photos and /gusto/users/{username}/studentID
 *
 * Expects multipart form-data with fields:
 *  - photos: multiple images (3-5 recommended)
 *  - studentIdPhoto: single image
 *
 * Returns uploaded URLs and updates the user's document accordingly when provided.
 *
 * @route POST /api/v1/users/media/upload
 * @access Protected
 */
exports.uploadUserMedia = catchAsync(async (req, res, next) => {
  if (!req.user) return next(new AppError("Not authenticated", 401));

  const sanitizeSegment = (s) =>
    String(s || "").toString().trim().replace(/[^a-zA-Z0-9._-]/g, "_");

  const username = req.user.username || req.user.name || req.user.id;
  const userSegment = sanitizeSegment(username) || `user_${String(req.user._id).slice(-6)}`;
  const baseFolder = `/gusto/users/${userSegment}`;

  const tempFiles = [];
  const uploaded = { photos: [], studentIdPhoto: null };

  try {
    // Validate presence of files (or allow keptFileIds-only updates)
    const hasPhotos = Array.isArray(req.files?.photos) && req.files.photos.length > 0;
    const hasId = Array.isArray(req.files?.studentIdPhoto) && req.files.studentIdPhoto.length > 0;
    const hasKeptIds =
      typeof req.body?.keptFileIds !== "undefined" && req.body.keptFileIds !== null;

    if (!hasPhotos && !hasId && !hasKeptIds) {
      return next(new AppError("Please attach 'photos' and/or 'studentIdPhoto' files", 400));
    }

    // Upload photos (if provided)
    if (hasPhotos) {
      if (req.files.photos.length > 10) {
        return next(new AppError("Too many photos. Max 10 allowed in one request.", 400));
      }
      const folder = `${baseFolder}/photos`;
      const photoPromises = req.files.photos.map(async (file, idx) => {
        tempFiles.push(file.path);
        const ext = path.extname(file.originalname) || ".jpg";
        const fileName = `photo_${Date.now()}_${idx}${ext}`;
        return await uploadToImageKit(file.path, fileName, folder);
      });
      uploaded.photos = await Promise.all(photoPromises);
    }

    // Upload student ID (if provided)
    if (hasId) {
      const file = req.files.studentIdPhoto[0];
      tempFiles.push(file.path);
      const ext = path.extname(file.originalname) || ".jpg";
      const fileName = `studentId_${Date.now()}${ext}`;
      uploaded.studentIdPhoto = await uploadToImageKit(
        file.path,
        fileName,
        `${baseFolder}/studentID`
      );
    }

    // Optionally update user's stored media if provided
    const update = {};

    // Merge existing photos (keptFileIds) with newly uploaded photos, if provided
    let finalPhotos = null;
    if (uploaded.photos.length || typeof req.body?.keptFileIds !== "undefined") {
      const currentUser = await User.findById(req.user._id).select("photos");
      const existing = Array.isArray(currentUser?.photos)
        ? currentUser.photos
        : [];

      let keptIds = [];
      if (typeof req.body.keptFileIds === "string") {
        try {
          keptIds = JSON.parse(req.body.keptFileIds) || [];
        } catch (_) {
          keptIds = [];
        }
      } else if (Array.isArray(req.body.keptFileIds)) {
        keptIds = req.body.keptFileIds;
      }

      keptIds = keptIds.map((id) => String(id));

      const keptExisting = existing.filter((p) =>
        keptIds.includes(String(p.fileId || p._id))
      );

      finalPhotos = [...keptExisting, ...uploaded.photos];

      if (finalPhotos.length < 3 || finalPhotos.length > 5) {
        return next(
          new AppError(
            "You must have at least 3 and at most 5 profile photos.",
            400
          )
        );
      }

      update.photos = finalPhotos;
    }

    if (uploaded.studentIdPhoto) update.studentIdPhoto = uploaded.studentIdPhoto;

    let updatedUser = null;
    if (Object.keys(update).length) {
      updatedUser = await User.findByIdAndUpdate(req.user._id, update, {
        new: true,
        runValidators: true,
      });
    }

    // Clean up temp files
    await Promise.all(
      tempFiles.map((p) =>
        fsp.unlink(p).catch(() => {
          // ignore
        })
      )
    );

    res.status(200).json({
      status: "success",
      data: {
        folders: {
          base: baseFolder,
          photos: `${baseFolder}/photos`,
          studentId: `${baseFolder}/studentID`,
        },
        photos: uploaded.photos,
        studentIdPhoto: uploaded.studentIdPhoto,
        user: updatedUser,
      },
    });
  } catch (err) {
    // Best-effort cleanup
    await Promise.all(
      tempFiles.map((p) =>
        fsp.unlink(p).catch(() => {
          // ignore
        })
      )
    );
    next(err);
  }
});