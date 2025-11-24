/* ==========================
   IMPORTS
========================== */
const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const mongoSanitize = require("express-mongo-sanitize");
const xssSanitizer = require("./utils/xssSanitizer");
const hpp = require("hpp");
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorControllers");

/* ==========================
   INIT APP
========================== */
const app = express();

/* ==========================
   MIDDLEWARES
========================== */
app.use(express.json({ limit: "10kb" })); // parse JSON
app.use(cookieParser()); // parse cookies (for jwt)
app.use(morgan("dev")); // logging

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: "Too many requests from this IP, please try again in an hour!",
});
app.use("/api", limiter);

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        // Allow inline scripts and attribute handlers (e.g., onclick) used across public/*.html
        "script-src": ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.tailwindcss.com"],
        "script-src-elem": ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.tailwindcss.com"],
        "script-src-attr": ["'unsafe-inline'"],
        "img-src": ["'self'", "data:", "https://ik.imagekit.io"],
        "connect-src": [
          "'self'",
          "https://upload.imagekit.io",
          "https://ik.imagekit.io",
        ],
        "style-src": ["'self'", "'unsafe-inline'", "https://rsms.me", "https://cdn.tailwindcss.com", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
        "font-src": ["'self'", "data:", "https://rsms.me", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
        "frame-ancestors": ["'self'"],
      },
    },
  })
);

app.use(xssSanitizer);
// app.use(mongoSanitize()); // enable later if needed
app.use(hpp());

/* Serve static files */
app.use(express.static("./public")); // main frontend
app.use("/admin", express.static("./public/admin")); // admin UI

/* ==========================
   ROUTERS
========================== */
const userRouter = require("./routes/userRoutes");
const adminRouter = require("./routes/adminRoutes");
const dislikeRouter = require("./routes/dislikeRoutes");
const proposeRouter = require("./routes/proposeRoutes");
const imageRouter = require("./routes/imageRoutes");
const crushRouter = require("./routes/crhRoutes");
const matchRouter = require("./routes/matchRoutes");


app.use("/api/v1/users", userRouter);
app.use("/api/v1/admins", adminRouter);
app.use("/api/v1/dislikes", dislikeRouter);
app.use("/api/v1/proposes", proposeRouter);
app.use("/api/v1/images", imageRouter);
app.use("/api/v1/crushes", crushRouter);
app.use("/api/v1/matches", matchRouter);


/* Serve Admin UI Pages */
app.get("/admin", (req, res) => {
  res.sendFile(`${__dirname}/public/admin/login.html`);
});
app.get("/admin/dashboard", (req, res) => {
  res.sendFile(`${__dirname}/public/admin/dashboard.html`);
});

/* ==========================
   ERROR HANDLING
========================== */
// 404
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
app.use(globalErrorHandler);

module.exports = app;
