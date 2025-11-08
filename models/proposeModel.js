const mongoose = require("mongoose");

const proposeSchema = new mongoose.Schema({
  from: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "denied", "cancelled"],
    default: "pending",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Prevent duplicate pending proposals from same -> to
proposeSchema.index({ from: 1, to: 1 }, { unique: true });

module.exports = mongoose.model("Propose", proposeSchema);
