const mongoose = require("mongoose");

const matchSchema = new mongoose.Schema({
  //user lists
  users: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  ],
  createdAt: { type: Date, default: Date.now },
});

matchSchema.index({ users: 1 });

module.exports = mongoose.model("Match", matchSchema);
