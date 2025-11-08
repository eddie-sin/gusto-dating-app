/* ===============================
   IMPORTS
=============================== */
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const app = require("./app");
const Admin = require("./models/adminModel");

/* ===============================
   LOAD ENV VARIABLES
=============================== */
dotenv.config({ path: "./config.env" });

/* ===============================
   HANDLE UNCAUGHT EXCEPTIONS
=============================== */
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

/* ===============================
   DATABASE CONNECTION
=============================== */
let DB;
if (process.env.NODE_ENV === "development" && process.env.DATABASE_LOCAL) {
  DB = process.env.DATABASE_LOCAL;
  console.log("Using local MongoDB:", DB);
} else {
  DB = process.env.DATABASE.replace(
    "<db_password>",
    process.env.DATABASE_PASSWORD
  );
  console.log("Using cloud MongoDB.");
}

mongoose
  .connect(DB, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("DB connection successful"))
  .catch((err) => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });

/* ===============================
   SEED FIXED ADMIN
=============================== */
const seedAdmin = async () => {
  try {
    const username = "GDA-Admin"; // <-- set your admin username here
    const password = "24K%gda%OakGyi"; // <-- set your admin password here

    const existing = await Admin.findOne({ username });
    if (!existing) {
      await Admin.create({ username, password });
      console.log("Admin user seeded:", username);
    } else {
      console.log("Admin user already exists:", username);
    }
  } catch (err) {
    console.error("Admin seeding failed:", err.message);
  }
};

/* ===============================
   START SERVER
=============================== */
const port = process.env.PORT || 3000;
const server = app.listen(port, async () => {
  console.log(`Server running on port ${port} (${process.env.NODE_ENV})`);
  await seedAdmin();
});

/* ===============================
   HANDLE UNHANDLED REJECTIONS
=============================== */
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  console.error(err.name, err.message);
  server.close(() => process.exit(1));
});
