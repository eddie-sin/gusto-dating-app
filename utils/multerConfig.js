const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure tmp directory exists
const tmpDir = path.join(__dirname, "../public/img/tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tmpDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalname
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  },
});

// File filter: only allow images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Multer instance for signup: handles both photos array and studentIdPhoto
const uploadSignupFiles = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size per file
  },
}).fields([
  { name: "photos", maxCount: 10 }, // Up to 10 photos
  { name: "studentIdPhoto", maxCount: 1 }, // Single student ID photo
]);

module.exports = {
  uploadSignupFiles,
};

