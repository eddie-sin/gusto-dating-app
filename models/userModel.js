const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    /* SECTION-A: Profile/Public Personal */
    nickname: { type: String, required: true, trim: true, maxlength: 40 },
    dob: { type: Date, required: true },
    gender: { type: String, enum: ["male", "female", "lgbt"], required: true },
    sexuality: {
      type: String,
      enum: ["male", "female", "both"],
      required: true,
    },
    bio: { type: String, maxlength: 500, default: "" },
    hobbies: {
      type: [String],
      validate: {
        validator: (arr) => arr.length >= 1 && arr.length <= 5,
        message: "You must enter between 1 and 5 hobbies.",
      },
      required: true,
    },
    heightFt: { type: Number },
    heightIn: { type: Number },
    zodiac: { type: String, trim: true },
    mbti: { type: String, trim: true },

    /* SECTION-B: Verification */
    name: { type: String, required: true, trim: true, maxlength: 80 },
    batch: { type: String, required: true, trim: true },
    contact: { type: String, required: true, trim: true, unique: true },
    photos: {
      type: [String],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 3,
        message: "Please upload at least 3 photos",
      },
      required: true,
    },
    studentIdPhoto: { type: String, required: true, select: false },

    /* SECTION-C: Authentication */
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      validate: {
        validator: (v) => /^[a-z0-9._]+$/.test(v),
        message:
          "Username may contain lowercase letters, numbers, dot and underscore only.",
      },
    },
    password: { type: String, required: true, minlength: 8, select: false },
    passwordChangedAt: { type: Date },
    passwordResetToken: { type: String, select: false },
    passwordResetExpires: { type: Date },

    /* SECTION-D: Admin Workflow */
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
    },
    approvedBy: { type: mongoose.Schema.ObjectId },

    /* SECTION-E: Backend Workflow */
    shownProfiles: { type: [mongoose.Schema.Types.ObjectId], default: [] },

    //1. DISLIKE WORKFLOW
    dislikesUsedToday: { type: Number, default: 0 },
    lastDislikeReset: { type: Date, default: Date.now },

    //2. PROPOSE WORKFLOW
    dailyProposeCount: { type: Number, default: 0 },
    lastProposeReset: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* Virtuals */
userSchema.virtual("age").get(function () {
  if (!this.dob) return undefined;
  const now = new Date();
  if (this.dob > now) return undefined;
  const diff = now - this.dob;
  const ageDt = new Date(diff);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
});

userSchema.virtual("heightCm").get(function () {
  if (this.heightFt != null && this.heightIn != null) {
    const cm = this.heightFt * 30.48 + this.heightIn * 2.54;
    return Math.round(cm * 10) / 10;
  }
  return undefined;
});

/* Index */
userSchema.index({ status: 1 });

/* Pre-save hooks */
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

userSchema.pre("save", function (next) {
  if (this.hobbies && Array.isArray(this.hobbies)) {
    this.hobbies = this.hobbies
      .map((h) => h.trim().toLowerCase())
      .filter((v, i, a) => v && a.indexOf(v) === i);
  }
  next();
});

/* Instance methods */
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTs = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return changedTs > JWTTimestamp;
  }
  return false;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
