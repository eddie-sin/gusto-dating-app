const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const SALT_ROUNDS = 12;

const userSchema = new mongoose.Schema(
  {
    /* SECTION-A: Profile/Public Personal */
    nickname: {
      type: String,
      required: [true, "Please enter your nickname"],
      trim: true,
      maxlength: [40, "Your nickname cannot be more than 40 characters"],
    },
    dob: {
      type: Date,
      required: [true, "Please enter your date of birth"],
    },
    gender: {
      type: String,
      enum: {
        values: ["male", "female", "lgbt"],
        message: "That gender option is not available",
      },
      required: [true, "Please select your gender"],
    },
    sexuality: {
      type: String,
      enum: {
        values: ["male", "female", "both"],
        message: "That sexuality option is not available",
      },
      required: [true, "Please select your sexuality/interest"],
    },

    bio: {
      type: String,
      maxlength: [500, "Your bio cannot be longer than 500 characters"],
      default: "",
    },
    hobbies: {
      type: [String],
      validate: {
        validator: (arr) => !arr || arr.length <= 5,
        message: "Hobbies cannot be more than 5",
      },
    },
    heightFt: { type: Number },
    heightIn: { type: Number },
    zodiac: { type: String, trim: true },
    mbti: { type: String, trim: true },
    // Timestamp when user last changed their display name (nickname)
    nicknameChangedAt: { type: Date },

    /* SECTION-B: Verification */
    name: {
      type: String,
      required: [true, "Please enter your full-name"],
      trim: true,
    },
    program: {
      type: String,
      required: [true, "Please enter your program"],
      trim: true,
    },
    batch: {
      type: String,
      required: [true, "Please enter your batch"],
      trim: true,
    },
    contact: {
      type: String,
      required: [true, "Please enter your contact number"],
      trim: true,
      unique: true,
    },

    photos: {
      type: [
        {
          fileId: { type: String, required: true },
          url: { type: String, required: true },
        },
      ],
      validate: {
        validator: (arr) =>
          Array.isArray(arr) && arr.length >= 3 && arr.length <= 5,
        message: "Please upload between 3 and 5 photos",
      },
      required: [true, "Please upload your beautiful photos"],
    },
    studentIdPhoto: {
      type: {
        fileId: { type: String, required: true },
        url: { type: String, required: true },
      },
      required: [true, "Please upload your student ID"],
      select: false,
    },

    /* SECTION-C: Authentication */
    username: {
      type: String,
      required: [true, "Please enter username"],
      unique: true,
      lowercase: [true, "Username should be in lowercase"],
      trim: true,
      minlength: [3, "Username should at least contains 3 letters"],
      maxlength: [30, "Username should not be longer than 30 chatacters"],
      validate: {
        validator: (v) => /^[a-z0-9._]+$/.test(v),
        message:
          "Username may contain lowercase letters, numbers, dot and underscore only.",
      },
    },
    password: {
      type: String,
      required: [true, "Please enter password"],
      minlength: [8, "Password should be at least 8 characters long"],
      select: false,
    },
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
    approvedBy: { type: mongoose.Schema.ObjectId, ref: "Admin" },

    /* SECTION-E: Backend Workflow */
    shownProfiles: { type: [mongoose.Schema.Types.ObjectId], default: [] },

    // DISLIKE WORKFLOW
    dislikesUsedToday: { type: Number, default: 0 },
    lastDislikeReset: { type: Date, default: Date.now },

    // PROPOSE WORKFLOW
    dailyProposeCount: { type: Number, default: 0 },
    lastProposeReset: { type: Date, default: Date.now },

    // ---- NEW: CRUSH WORKFLOW ----
    dailyCrushCount: { type: Number, default: 0 },
    lastCrushReset: { type: Date, default: Date.now },
    crushCount: { type: Number, default: 0 }, // total number of people who crushed this user
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* VIRTUALS */
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

/* INDEX */
userSchema.index({ status: 1 });

/* PRE-SAVE HOOKS */
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
    this.passwordChangedAt = new Date(Date.now() - 1000);
  }

  if (this.hobbies && Array.isArray(this.hobbies)) {
    this.hobbies = this.hobbies
      .map((h) => h.trim().toLowerCase())
      .filter((v, i, a) => v && a.indexOf(v) === i);
  }

  next();
});

/* INSTANCE METHODS */
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

/* STATIC HELPER FOR ADMIN ACTIONS */
userSchema.statics.removeStudentIdPhoto = async function (userId) {
  return await this.findByIdAndUpdate(userId, {
    $unset: { studentIdPhoto: 1 },
  });
};

const User = mongoose.model("User", userSchema);
module.exports = User;
