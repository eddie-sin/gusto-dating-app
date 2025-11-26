const mongoose = require("mongoose");

const TempRegisterSchema = new mongoose.Schema(
  {
    registrationId: {
      type: String,
      required: true,
      unique: true,
    },
    currentStep: {
      type: Number,
      default: 1,
    },
    // store partial user data progressively
    data: {
      type: Object,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// auto-delete temp documents after 24 hours
TempRegisterSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24 }
);

const TempRegister = mongoose.model("TempRegister", TempRegisterSchema);
module.exports = TempRegister;
