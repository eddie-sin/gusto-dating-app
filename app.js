/* IMPORTINGS */
const express = require("express"); //main backend framework
const morgan = require("morgan"); //to log api calls
const helmet = require("helmet"); // general & most basic security helmet
const rateLimit = require("express-rate-limit"); // rate limiting, prevent DoS attack
const mongoSanitize = require("express-mongo-sanitize"); // to prevent SQL injection attack
const xssSanitizer = require("./utils/xssSanitizer"); // clean malicious html & js codes [injections], prevent (XSS) attack
const hpp = require("hpp"); // to cleans up duplicate parameters

/* ERROR HANDLERS */
const AppError = require("./utils/appError");
const globalErrorHandler = require("./controllers/errorControllers");
const ImageKit = require("imagekit");

const limiter = rateLimit({
  // x amount of request from one ip in a y time
  max: 100, //requests
  windowMs: 60 * 60 * 1000, //1 hour
  message: "Too many reuests from this IP, please try again in an hour!",
});

//Creating App
const app = express();

//Global MiddleWare Functions
app.use(express.json({ limit: "10kb" })); //body parser
app.use(morgan("dev"));
app.use("/api", limiter);
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": [
          "'self'",
          "https://unpkg.com",
        ],
        "img-src": [
          "'self'",
          "data:",
          "https://ik.imagekit.io",
        ],
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
// temporarily ignoring mogoSanitize middleware (will fix later)
/* app.use(
  mongoSanitize({
    filter: {
      body: true, // sanitize request body
      query: false, // skip query string to avoid getter-only error
      params: false, // skip params
    },
  })
); */
app.use(xssSanitizer);
app.use(
  hpp({
    whitelist: [],
  })
);
app.use(express.static("public")); // serve static assets from /public

// ImageKit instance (env is loaded in server.js before app is required)
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
});

// Auth endpoint for client-side uploads
app.get("/api/v1/imagekit/auth", (req, res) => {
  const authParams = imagekit.getAuthenticationParameters();
  res.status(200).json({
    ...authParams,
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
  });
});

//Importing Routers
const userRouter = require("./routes/userRoutes");

//Mounting
app.use("/api/v1/users", userRouter);

//Error Handling (else part)
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// CENTRALIZED ERROR HANDLER
app.use(globalErrorHandler);

module.exports = app;

/* Eddie Note */
