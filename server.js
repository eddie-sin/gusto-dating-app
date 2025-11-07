/* IMPORTINGS */
const mongoose = require("mongoose"); // to access mongoDB
const dotenv = require("dotenv"); // to access env variables

// Load environment variables BEFORE requiring the app so app can use them
dotenv.config({ path: "./config.env" }); // assign to .env file

const app = require("./app"); // express app

// ERROR HANDLING: Handling Code Errors (unCatch)
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down...");
  console.error(err.name, err.message);
  process.exit(1);
});

// dotenv is already configured above

//1. Connection to Cloud mongodb Database
const DB = process.env.DATABASE.replace(
  "<db_password>",
  process.env.DATABASE_PASSWORD
);
mongoose
  .connect(DB) //EDDIE: D mhr local database nae pl tone pr own, (For Safety)
  .then(() => console.log("DB connection successful"))
  .catch((err) => {
    console.error("DB connection failed:", err);
    process.exit(1);
  });

//2. Start Server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`Server started on port: ${port} (${process.env.NODE_ENV})`);
});

// ERROR HANDLING: Handling Async Error (unCatch)
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION! Shutting down...");
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
