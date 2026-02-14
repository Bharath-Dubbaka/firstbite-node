// routes/adminBusinessSettings.js
const express = require("express");
const { BusinessSettings } = require("../models/BusinessSettings");
const { verifyAdminToken } = require("./admin");
const router = express.Router();

router.use(verifyAdminToken);

// Get settings
router.get("/", async (req, res) => {
   const settings = await BusinessSettings.findOne({ isActive: true });
   res.json({ success: true, data: settings });
});

// Update settings
router.put("/", async (req, res) => {
   let settings = await BusinessSettings.findOne({ isActive: true });

   if (!settings) {
      settings = new BusinessSettings(req.body);
   } else {
      Object.assign(settings, req.body);
   }

   settings.lastUpdatedBy = req.admin._id;
   await settings.save();

   res.json({ success: true, data: settings });
});

module.exports = router;
