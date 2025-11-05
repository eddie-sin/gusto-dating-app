const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");
const crypto = require("crypto");

const SALT_ROUNDS = 12; // adjust if needed

const userSchema = new mongoose.Schema(
  {
    /* SECTION-A: Profile/Public Personal */
    nickname: {
      type: String,
      required: [true, "Please provide a display nickname"],
      trim: true,
      maxlength: [40, "Nickname cannot be longer than 40 characters"],
    },
    dob: {
      type: Date,
      required: [true, "Please provide date of birth"],
    }, // + age

    gender: {
      type: String,
      enum: ["male", "female"],
      required: [true, "Please specify gender (Male or Female)"],
    },

    sexuality: {
      // who the user is attracted to
      type: String,
      enum: ["male", "female", "both"],
      required: [
        true,
        "Please specify sexuality / attraction (male, female, or both)",
      ],
    },

    bio: {
      type: String,
      maxlength: [500, "Bio cannot exceed 500 characters"],
      default: "",
    },

    hobbies: {
      type: [String],
      validate: {
        validator: function (arr) {
          return arr.length >= 1 && arr.length <= 5;
        },
        message: "You must enter between 1 and 5 hobbies.",
      },
      required: [true, "At least one hobby is required."],
    },

    // Optional profile details
    heightFt: {
      type: Number,
    },
    heightIn: {
      type: Number,
    }, //+ cm
    zodiac: {
      type: String,
      trim: true,
    },
    mbti: {
      type: String,
      trim: true,
    },

    /* SECTION-B: Verification */

    name: {
      type: String,
      required: [true, "Please provide your FULL real name"],
      trim: true,
      maxlength: [80, "Name must be at most 80 characters"],
    },

    batch: {
      type: String,
      required: [true, "Please provide your bath no"],
      trim: true,
    },

    contact: {
      type: String,
      required: [true, "Please provide a contact number (Viber)"],
      trim: true,
      unique: true,
    },

    photos: {
      type: [String],
      validate: {
        validator: function (arr) {
          return Array.isArray(arr) && arr.length >= 3;
        },
        message: "Please upload at least 3 photos",
      },
      required: [true, "At least 3 profile photos are required."],
    },

    /* SENSATIVE */

    studentIdPhoto: {
      type: String,
      required: [true, "Student ID (front photo) is required for verification"],
      select: false,
    },

    /* SECTION-C: Authentication */

    username: {
      type: String,
      required: [true, "Please provide a username"],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, "Username must have at least 3 characters"],
      maxlength: [30, "Username must be at most 30 characters"],
      validate: {
        validator: function (v) {
          // simple username regex: letters, numbers, underscore, dot
          return /^[a-z0-9._]+$/.test(v);
        },
        message:
          "Username may contain lowercase letters, numbers, dot and underscore only.",
      },
    },

    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // do not return password by default
    },

    passwordChangedAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
    },

    /* SECTION-D: Admin Work Flow  */

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
    },
    approvedBy: {
      type: mongoose.Schema.ObjectId,
    },

    /* SECTION-E: Backend Work flow  */

    likeLimit: {
      type: Number,
      default: 2, // initial daily like limit
      min: 0,
    },
    dislikeLimit: {
      type: Number,
      default: 10, // initial daily dislike limit
      min: 0,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ==========================
    A. VIRTUALS [they are not stored in database, only calcuated when query] 
   ========================== */

// V-1: Compute age from dob.
userSchema.virtual("age").get(function () {
  if (!this.dob) return undefined;
  const now = new Date();
  if (this.dob > now) return undefined; // future DOB invalid
  const diff = now - this.dob;
  const ageDt = new Date(diff);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
});

// V-2: Compute heightCm from heightFt & heightIn
userSchema.virtual("heightCm").get(function () {
  if (this.heightFt != null && this.heightIn != null) {
    // 1 foot = 30.48 cm, 1 inch = 2.54 cm
    const cm = this.heightFt * 30.48 + this.heightIn * 2.54;
    return Math.round(cm * 10) / 10; // round to 1 decimal place
  }
  return undefined; // only return if both fields are present
});

/* ==========================
   B. Indexes for efficiency (faster query)
   ========================== */
userSchema.index({ status: 1 });

/* ==========================
    C. PRE-SAVE HOOK [this function (middleware) is run before storing in database ] 
   ========================== */

// Hash (encrypt) password before saving to database
userSchema.pre("save", async function (next) {
  // Hash password if it was modified
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  // set passwordChangedAt slightly in the past to avoid token issues
  this.passwordChangedAt = new Date(Date.now() - 1000);
  next();
});

// remove empty or duplicates of hobbie field
userSchema.pre("save", function (next) {
  if (this.hobbies && Array.isArray(this.hobbies)) {
    this.hobbies = this.hobbies
      .map((h) => h.trim().toLowerCase())
      .filter((v, i, a) => v && a.indexOf(v) === i); // removes empty or duplicate
  }
  next();
});

/* ==========================
   D. Instance Methods (methods related to the schema)
   ========================== */

/**
 * 1. Compare candidate password with hashed password in DB
 * @param {string} candidatePassword
 * @param {string} userPassword - hashed (from DB)
 */
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

/**
 * 2. Check whether user changed password after JWT issuance time (authentication related)
 * @param {number} JWTTimestamp - seconds since epoch
 */
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTs = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return changedTs > JWTTimestamp;
  }
  // false means NOT changed after token issued
  return false;
};

const User = mongoose.model("User", userSchema);
module.exports = User;
