const mongoose = require("mongoose");

const crushSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    target: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Prevent duplicate crush from same user to same target
crushSchema.index({ user: 1, target: 1 }, { unique: true });

module.exports = mongoose.model("Crush", crushSchema);
