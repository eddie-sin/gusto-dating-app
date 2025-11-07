const mongoose = require("mongoose");

const dislikeSchema = new mongoose.Schema({
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster lookup & preventing duplicates
dislikeSchema.index({ user: 1, target: 1 }, { unique: true });

module.exports = mongoose.model("Dislike", dislikeSchema);
