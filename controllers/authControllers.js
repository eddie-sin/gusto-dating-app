const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const fs = require("fs").promises;
const path = require("path");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");
const uploadToImageKit = require("../utils/uploadToImageKit");
const { promisify } = require("util");

/* ==========================================
   HELPER FUNCTIONS
========================================== */

// 1. Generate JWT Token
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

// 2. Create & Send JWT via cookie + response
const createAndSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  // Remove sensitive fields before sending
  user.password = undefined;
  user.studentIdPhoto = undefined;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: { user },
  });
};

/* ==========================================
   ROUTE HANDLERS
========================================== */

// SIGNUP — Register new user
exports.signup = catchAsync(async (req, res, next) => {
  // Array to track temporary files for cleanup
  const tempFiles = [];
  let photoUrls = [];
  let studentIdPhotoUrl = null;

  try {
    // 1. Handle photos upload (array of files)
    if (req.files && req.files.photos && req.files.photos.length > 0) {
      // Validate: at least 3 photos required
      if (req.files.photos.length < 3) {
        return next(
          new AppError("Please upload at least 3 photos", 400)
        );
      }

      // Upload each photo to ImageKit
      const uploadPromises = req.files.photos.map(async (file, index) => {
        tempFiles.push(file.path);
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1e9);
        const fileName = `photo_${timestamp}_${random}_${index}${path.extname(file.originalname)}`;
        const url = await uploadToImageKit(
          file.path,
          fileName,
          "/gusto/photos"
        );
        return url;
      });

      photoUrls = await Promise.all(uploadPromises);
    } else {
      // If no files uploaded, check if URLs were provided in body (backward compatibility)
      if (req.body.photos) {
        try {
          photoUrls = typeof req.body.photos === "string" 
            ? JSON.parse(req.body.photos) 
            : req.body.photos;
        } catch (e) {
          return next(new AppError("Invalid photos format", 400));
        }
      } else {
        return next(new AppError("Please upload at least 3 photos", 400));
      }
    }

    // 2. Handle studentIdPhoto upload (single file)
    if (req.files && req.files.studentIdPhoto && req.files.studentIdPhoto.length > 0) {
      const file = req.files.studentIdPhoto[0];
      tempFiles.push(file.path);
      const fileName = `studentId_${Date.now()}_${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
      studentIdPhotoUrl = await uploadToImageKit(
        file.path,
        fileName,
        "/gusto/studentIds"
      );
    } else if (req.body.studentIdPhoto) {
      // Backward compatibility: if URL provided directly
      studentIdPhotoUrl = req.body.studentIdPhoto;
    } else {
      return next(new AppError("Student ID photo is required", 400));
    }

    // 3. Parse other fields (multer provides everything as strings for multipart/form-data)
    let hobbies = [];
    if (req.body.hobbies) {
      try {
        hobbies = typeof req.body.hobbies === "string" 
          ? JSON.parse(req.body.hobbies) 
          : req.body.hobbies;
      } catch (e) {
        hobbies = Array.isArray(req.body.hobbies) ? req.body.hobbies : [req.body.hobbies];
      }
    }

    let heightFt = req.body.heightFt ? parseInt(req.body.heightFt) : undefined;
    let heightIn = req.body.heightIn ? parseInt(req.body.heightIn) : undefined;

    // 4. Create user with ImageKit URLs
    const newUser = await User.create({
      nickname: req.body.nickname,
      dob: req.body.dob,
      gender: req.body.gender,
      sexuality: req.body.sexuality,
      bio: req.body.bio || "",
      hobbies: hobbies,
      heightFt: heightFt,
      heightIn: heightIn,
      zodiac: req.body.zodiac || "",
      mbti: req.body.mbti || "",

      name: req.body.name,
      batch: req.body.batch,
      contact: req.body.contact,
      photos: photoUrls,
      studentIdPhoto: studentIdPhotoUrl,

      username: req.body.username,
      password: req.body.password,

      // status defaults to "pending" automatically
    });

    // 5. Clean up temporary files
    for (const filePath of tempFiles) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error(`Failed to delete temp file: ${filePath}`, err);
      }
    }

    // 6. Send response
    createAndSendToken(newUser, 201, res);
  } catch (error) {
    // Clean up temp files on error
    for (const filePath of tempFiles) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        console.error(`Failed to delete temp file: ${filePath}`, err);
      }
    }
    // Re-throw error to be handled by error handler
    throw error;
  }
});

// LOGIN — Authenticate user and send JWT
exports.login = catchAsync(async (req, res, next) => {
  const { username, password } = req.body;

  // 1. Check presence
  if (!username || !password) {
    return next(new AppError("Please provide username and password", 400));
  }

  // 2. Find user + include password
  const user = await User.findOne({ username }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect username or password", 401));
  }

  // 3. Check user status
  if (user.status === "pending") {
    return next(new AppError("Your account is pending approval by admin.", 403));
  }

  if (user.status === "rejected") {
    return next(new AppError("Your account has been rejected by admin.", 403));
  }

  // 4. Login success
  createAndSendToken(user, 200, res);
});

// PROTECT — middleware for protected routes
exports.protect = catchAsync(async (req, res, next) => {
  // 1. Get token from header or cookie
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError("You are not logged in!", 401));
  }

  // 2. Verify token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // 3. Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError("User no longer exists", 401));
  }

  // 4. Check if password changed after token issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("Password recently changed. Please log in again.", 401)
    );
  }

  // ✅ Grant access
  req.user = currentUser;
  next();
});

// UPDATE PASSWORD — While logged in
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // 1. Get current user (already logged in from protect)
  const user = await User.findById(req.user.id).select("+password");

  // 2. Check current password validity
  if (!(await user.correctPassword(currentPassword, user.password))) {
    return next(new AppError("Incorrect current password", 401));
  }

  // 3. Set new password
  user.password = newPassword;
  await user.save({ validateModifiedOnly: true });

  // 4. Send new token
  createAndSendToken(user, 200, res);
});
