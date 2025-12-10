const crypto = require("crypto");
const TempRegister = require("../models/tempRegisterModel");
const User = require("../models/userModel");
const catchAsync = require("../utils/catchAsync");
const AppError = require("../utils/appError");

/** Helpers **/
const getRegistrationIdFromReq = (req) => {
  return (
    req.body?.registrationId ||
    req.query?.registrationId ||
    req.headers?.["x-registration-id"]
  );
};

const formatMongooseError = (err) => {
  if (err.code === 11000) {
    const keys = Object.keys(err.keyValue || {});
    return {
      message: `${keys.join(", ")} already exists`,
      fields: err.keyValue,
    };
  }
  if (err.name === "ValidationError") {
    const errors = {};
    Object.values(err.errors).forEach((e) => {
      errors[e.path] = e.message;
    });
    return { message: "Validation failed", errors };
  }
  return { message: err.message || "Unknown error" };
};

/** Controllers **/

// POST /api/register/start
exports.startRegistration = catchAsync(async (req, res, next) => {
  const registrationId = crypto.randomUUID();
  const temp = await TempRegister.create({ registrationId });

  res.status(201).json({
    success: true,
    registrationId: temp.registrationId,
  });
});

// GET /api/register/status?registrationId=...
exports.getStatus = catchAsync(async (req, res, next) => {
  const registrationId = getRegistrationIdFromReq(req);
  if (!registrationId)
    return next(new AppError("registrationId required", 400));

  const temp = await TempRegister.findOne({ registrationId }).lean();
  if (!temp)
    return next(new AppError("Registration session not found/expired", 404));

  res.json({
    success: true,
    registrationId: temp.registrationId,
    currentStep: temp.currentStep,
  });
});

// GET /api/register/data?registrationId=...
exports.getData = catchAsync(async (req, res, next) => {
  const registrationId = getRegistrationIdFromReq(req);
  if (!registrationId)
    return next(new AppError("registrationId required", 400));

  const temp = await TempRegister.findOne({ registrationId }).lean();
  if (!temp)
    return next(new AppError("Registration session not found/expired", 404));

  const safeData = { ...temp.data };
  delete safeData.password;
  delete safeData.passwordConfirm;
  delete safeData.studentIdPhoto?.select;

  res.json({
    success: true,
    data: safeData,
    currentStep: temp.currentStep,
  });
});

// POST /api/register/step/:step
exports.saveStep = catchAsync(async (req, res, next) => {
  const registrationId = getRegistrationIdFromReq(req);
  const step = Number(req.params.step);
  const pageData = req.body.data;

  if (!registrationId)
    return next(new AppError("registrationId required", 400));
  if (!Number.isInteger(step) || step < 1 || step > 14)
    return next(new AppError("Invalid step", 400));

  const temp = await TempRegister.findOne({ registrationId });
  if (!temp)
    return next(new AppError("Registration session not found/expired", 404));

  // Prevent skipping steps
  if (temp.currentStep < step) {
    return next(new AppError("Invalid step order", 403));
  }

  // Merge partial data
  temp.data = { ...(temp.data || {}), ...(pageData || {}) };

  // Advance step only if user is currently on this step
  if (temp.currentStep === step) {
    temp.currentStep = step + 1;
  }

  await temp.save();
  res.json({ success: true, currentStep: temp.currentStep });
});

// POST /api/register/complete
exports.completeRegistration = catchAsync(async (req, res, next) => {
  const registrationId = getRegistrationIdFromReq(req);
  if (!registrationId)
    return next(new AppError("registrationId required", 400));

  const temp = await TempRegister.findOne({ registrationId });
  if (!temp)
    return next(new AppError("Registration session not found/expired", 404));

  // Create real user (this triggers validation)
  try {
    const user = await User.create(temp.data);

    // Remove temp record after successful registration
    await TempRegister.deleteOne({ registrationId });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.passwordResetToken;
    delete userObj.passwordResetExpires;
    delete userObj.studentIdPhoto;

    res.status(201).json({ success: true, user: userObj });
  } catch (err) {
    const formatted = formatMongooseError(err);
    return next(new AppError(formatted.message, 400));
  }
});
