// routes/tempRegisterRoutes.js
const express = require("express");
const router = express.Router();
const tempCtrl = require("../controllers/tempRegisterControllers");

// Start a registration: returns registrationId
router.post("/start", tempCtrl.startRegistration);

// Check session status (current step)
router.get("/status", tempCtrl.getStatus);

// Get partial data (for prefill)
router.get("/data", tempCtrl.getData);

// Save step data (1..14)
router.post("/step/:step", tempCtrl.saveStep);

// Finalize: create User
router.post("/complete", tempCtrl.completeRegistration);

module.exports = router;
