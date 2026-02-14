// routes/adminTaxConfig.js - Tax Configuration Management Routes
const express = require("express");
const { TaxConfig, defaultConfigs } = require("../models/TaxConfig");
const { verifyAdminToken } = require("./admin");
const router = express.Router();

router.use(verifyAdminToken);

// ========== INITIALIZE DEFAULT CONFIGS ==========
router.post("/initialize", async (req, res) => {
   try {
      // Check if configs already exist
      const existing = await TaxConfig.find();
      if (existing.length > 0) {
         return res.status(400).json({
            success: false,
            error: "Tax configurations already initialized",
         });
      }

      // Create default configs
      const configs = await TaxConfig.insertMany(
         defaultConfigs.map((config) => ({
            ...config,
            lastUpdatedBy: req.admin._id,
         })),
      );

      res.status(201).json({
         success: true,
         message: "Tax configurations initialized successfully",
         data: configs,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// ========== GET ALL CONFIGS ==========
router.get("/", async (req, res) => {
   try {
      const configs = await TaxConfig.find()
         .populate("lastUpdatedBy", "name email")
         .sort({ orderSource: 1 });

      res.json({
         success: true,
         count: configs.length,
         data: configs,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// ========== GET CONFIG BY ORDER SOURCE ==========
router.get("/:orderSource", async (req, res) => {
   try {
      const { orderSource } = req.params;

      const config = await TaxConfig.findOne({ orderSource }).populate(
         "lastUpdatedBy",
         "name email",
      );

      if (!config) {
         return res.status(404).json({
            success: false,
            error: `Configuration for ${orderSource} not found`,
         });
      }

      res.json({
         success: true,
         data: config,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// ========== UPDATE CONFIG ==========
router.put("/:orderSource", async (req, res) => {
   try {
      const { orderSource } = req.params;
      const updates = req.body;

      // Add updater info
      updates.lastUpdatedBy = req.admin._id;

      const config = await TaxConfig.findOneAndUpdate(
         { orderSource },
         updates,
         { new: true, runValidators: true },
      ).populate("lastUpdatedBy", "name email");

      if (!config) {
         return res.status(404).json({
            success: false,
            error: `Configuration for ${orderSource} not found`,
         });
      }

      res.json({
         success: true,
         message: `Configuration for ${orderSource} updated successfully`,
         data: config,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// ========== UPDATE TAX RATES FOR SPECIFIC SOURCE ==========
router.patch("/:orderSource/taxes", async (req, res) => {
   try {
      const { orderSource } = req.params;
      const { enabled, cgst, sgst, igst } = req.body;

      const config = await TaxConfig.findOneAndUpdate(
         { orderSource },
         {
            "taxes.enabled": enabled,
            "taxes.cgst": cgst,
            "taxes.sgst": sgst,
            "taxes.igst": igst,
            lastUpdatedBy: req.admin._id,
         },
         { new: true },
      );

      if (!config) {
         return res.status(404).json({
            success: false,
            error: `Configuration for ${orderSource} not found`,
         });
      }

      res.json({
         success: true,
         message: "Tax rates updated successfully",
         data: config,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// ========== UPDATE SERVICE CHARGE FOR SPECIFIC SOURCE ==========
router.patch("/:orderSource/service-charge", async (req, res) => {
   try {
      const { orderSource } = req.params;
      const { enabled, type, value } = req.body;

      const config = await TaxConfig.findOneAndUpdate(
         { orderSource },
         {
            "serviceCharge.enabled": enabled,
            "serviceCharge.type": type,
            "serviceCharge.value": value,
            lastUpdatedBy: req.admin._id,
         },
         { new: true },
      );

      if (!config) {
         return res.status(404).json({
            success: false,
            error: `Configuration for ${orderSource} not found`,
         });
      }

      res.json({
         success: true,
         message: "Service charge updated successfully",
         data: config,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// ========== UPDATE DELIVERY CHARGES FOR SPECIFIC SOURCE ==========
router.patch("/:orderSource/delivery-charges", async (req, res) => {
   try {
      const { orderSource } = req.params;
      const { enabled, type, value, perKm, minimumCharge } = req.body;

      const config = await TaxConfig.findOneAndUpdate(
         { orderSource },
         {
            "deliveryCharges.enabled": enabled,
            "deliveryCharges.type": type,
            "deliveryCharges.value": value,
            "deliveryCharges.perKm": perKm,
            "deliveryCharges.minimumCharge": minimumCharge,
            lastUpdatedBy: req.admin._id,
         },
         { new: true },
      );

      if (!config) {
         return res.status(404).json({
            success: false,
            error: `Configuration for ${orderSource} not found`,
         });
      }

      res.json({
         success: true,
         message: "Delivery charges updated successfully",
         data: config,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// ========== TOGGLE CONFIG ACTIVE STATUS ==========
router.patch("/:orderSource/toggle", async (req, res) => {
   try {
      const { orderSource } = req.params;

      const config = await TaxConfig.findOne({ orderSource });

      if (!config) {
         return res.status(404).json({
            success: false,
            error: `Configuration for ${orderSource} not found`,
         });
      }

      config.isActive = !config.isActive;
      config.lastUpdatedBy = req.admin._id;
      await config.save();

      res.json({
         success: true,
         message: `Configuration ${config.isActive ? "enabled" : "disabled"} successfully`,
         data: config,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// ========== RESET TO DEFAULT ==========
router.post("/:orderSource/reset", async (req, res) => {
   try {
      const { orderSource } = req.params;

      const defaultConfig = defaultConfigs.find(
         (c) => c.orderSource === orderSource,
      );

      if (!defaultConfig) {
         return res.status(404).json({
            success: false,
            error: `Default configuration for ${orderSource} not found`,
         });
      }

      const config = await TaxConfig.findOneAndUpdate(
         { orderSource },
         {
            ...defaultConfig,
            lastUpdatedBy: req.admin._id,
         },
         { new: true },
      );

      res.json({
         success: true,
         message: `Configuration for ${orderSource} reset to default`,
         data: config,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// ========== CALCULATE PREVIEW ==========
router.post("/preview-calculation", async (req, res) => {
   try {
      const { orderSource, subtotal, options } = req.body;

      if (!subtotal) {
         return res.status(400).json({
            success: false,
            error: "Subtotal is required",
         });
      }

      const { TaxCalculator } = require("../utils/taxCalculator");

      const breakdown = await TaxCalculator.calculateCharges(
         subtotal,
         orderSource || "in-house",
         options || {},
      );

      res.json({
         success: true,
         data: {
            breakdown,
            formatted: TaxCalculator.formatBreakdown(breakdown),
         },
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

module.exports = router;
