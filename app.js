/* ==========================
   IMPORTS
========================== */
const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xssSanitizer = require("./utils/xssSanitizer");
const hpp = require("hpp");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorControllers");
const ImageKit = require("imagekit");

/* ==========================
   INIT APP
========================== */
const app = express();

/* ==========================
   MIDDLEWARES
========================== */
app.use(express.json({ limit: "10kb" })); // parse JSON
app.use(morgan("dev")); // logging
app.use(
  "/api",
  rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: "Too many requests from this IP, please try again in an hour!",
  })
);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "https://unpkg.com"],
        "img-src": ["'self'", "data:", "https://ik.imagekit.io"],
        "connect-src": [
          "'self'",
          "https://upload.imagekit.io",
          "https://ik.imagekit.io",
        ],
        "style-src": ["'self'", "'unsafe-inline'"],
        "font-src": ["'self'", "data:"],
        "frame-ancestors": ["'self'"],
      },
    },
  })
);
app.use(xssSanitizer);
// app.use(mongoSanitize()); // enable later if needed
app.use(hpp());
app.use(express.static("./public")); // serve public files

/* ==========================
   IMAGEKIT SETUP
========================== */
let imagekit = null;
if (
  process.env.IMAGEKIT_PUBLIC_KEY &&
  process.env.IMAGEKIT_PRIVATE_KEY &&
  process.env.IMAGEKIT_URL_ENDPOINT
) {
  imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
} else {
  console.warn(
    "ImageKit environment variables missing. Client-side uploads will not work."
  );
}

/* Endpoint for client-side ImageKit auth */
app.get("/api/v1/imagekit/auth", (req, res, next) => {
  if (!imagekit) {
    return next(new AppError("ImageKit not configured on server.", 500));
  }
  const authParams = imagekit.getAuthenticationParameters();
  res.status(200).json({
    ...authParams,
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
});

/* ==========================
   ROUTERS
========================== */
const userRouter = require("./routes/userRoutes");
const dislikeRouter = require("./routes/dislikeRoutes");
const adminRouter = require("./routes/adminRoutes");

app.use("/api/v1/users", userRouter);
app.use("/api/v1/dislikes", dislikeRouter);
app.use("/api/v1/admins", adminRouter);

//Error Handling (else part)
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

/* ==========================
   GLOBAL ERROR HANDLER
========================== */
app.use(globalErrorHandler);

module.exports = app;
