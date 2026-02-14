// models/TaxConfig.js - Dynamic Tax & Charge Configuration
const mongoose = require("mongoose");

const taxConfigSchema = new mongoose.Schema(
   {
      orderSource: {
         type: String,
         enum: ["in-house", "takeaway", "online", "swiggy", "zomato"],
         required: true,
         unique: true,
      },

      // Tax Configuration
      taxes: {
         enabled: {
            type: Boolean,
            default: true,
         },
         cgst: {
            type: Number,
            default: 2.5, // 2.5%
            min: 0,
            max: 100,
         },
         sgst: {
            type: Number,
            default: 2.5, // 2.5%
            min: 0,
            max: 100,
         },
         // For states requiring IGST instead of CGST+SGST
         igst: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
         },
      },

      // Service Charge Configuration
      serviceCharge: {
         enabled: {
            type: Boolean,
            default: false,
         },
         type: {
            type: String,
            enum: ["percentage", "flat"],
            default: "percentage",
         },
         value: {
            type: Number,
            default: 0,
            min: 0,
         },
      },

      // Delivery Charges Configuration
      deliveryCharges: {
         enabled: {
            type: Boolean,
            default: false,
         },
         type: {
            type: String,
            enum: ["percentage", "flat", "distance-based"],
            default: "flat",
         },
         value: {
            type: Number,
            default: 0,
            min: 0,
         },
         // For distance-based
         perKm: {
            type: Number,
            default: 10,
            min: 0,
         },
         minimumCharge: {
            type: Number,
            default: 20,
            min: 0,
         },
      },

      // Packaging Charges (for takeaway/delivery)
      packagingCharges: {
         enabled: {
            type: Boolean,
            default: false,
         },
         type: {
            type: String,
            enum: ["percentage", "flat", "per-item"],
            default: "flat",
         },
         value: {
            type: Number,
            default: 0,
            min: 0,
         },
      },

      // Platform Commission (for aggregators)
      platformCommission: {
         enabled: {
            type: Boolean,
            default: false,
         },
         percentage: {
            type: Number,
            default: 0,
            min: 0,
            max: 100,
         },
         deductFromTotal: {
            type: Boolean,
            default: true, // Deduct from restaurant's share
         },
      },

      // Discount Configuration
      discounts: {
         allowManualDiscount: {
            type: Boolean,
            default: true,
         },
         maxDiscountPercent: {
            type: Number,
            default: 50,
            min: 0,
            max: 100,
         },
      },

      // Rounding
      roundOff: {
         enabled: {
            type: Boolean,
            default: true,
         },
         method: {
            type: String,
            enum: ["nearest", "up", "down"],
            default: "nearest",
         },
      },

      isActive: {
         type: Boolean,
         default: true,
      },

      lastUpdatedBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Admin",
      },
   },
   {
      timestamps: true,
   },
);

const TaxConfig = mongoose.model("TaxConfig", taxConfigSchema);

// Default configurations
const defaultConfigs = [
   {
      orderSource: "in-house",
      taxes: {
         enabled: true,
         cgst: 2.5,
         sgst: 2.5,
      },
      serviceCharge: {
         enabled: false,
         type: "percentage",
         value: 10,
      },
      deliveryCharges: {
         enabled: false,
      },
      packagingCharges: {
         enabled: false,
      },
   },
   {
      orderSource: "takeaway",
      taxes: {
         enabled: true,
         cgst: 2.5,
         sgst: 2.5,
      },
      serviceCharge: {
         enabled: false,
      },
      deliveryCharges: {
         enabled: false,
      },
      packagingCharges: {
         enabled: true,
         type: "flat",
         value: 10,
      },
   },
   {
      orderSource: "online",
      taxes: {
         enabled: true,
         cgst: 2.5,
         sgst: 2.5,
      },
      serviceCharge: {
         enabled: false,
      },
      deliveryCharges: {
         enabled: true,
         type: "flat",
         value: 40,
      },
      packagingCharges: {
         enabled: true,
         type: "flat",
         value: 15,
      },
   },
   {
      orderSource: "swiggy",
      taxes: {
         enabled: true,
         cgst: 2.5,
         sgst: 2.5,
      },
      serviceCharge: {
         enabled: false,
      },
      deliveryCharges: {
         enabled: false, // Swiggy handles delivery
      },
      packagingCharges: {
         enabled: true,
         type: "per-item",
         value: 5,
      },
      platformCommission: {
         enabled: true,
         percentage: 25,
         deductFromTotal: true,
      },
   },
   {
      orderSource: "zomato",
      taxes: {
         enabled: true,
         cgst: 2.5,
         sgst: 2.5,
      },
      serviceCharge: {
         enabled: false,
      },
      deliveryCharges: {
         enabled: false, // Zomato handles delivery
      },
      packagingCharges: {
         enabled: true,
         type: "per-item",
         value: 5,
      },
      platformCommission: {
         enabled: true,
         percentage: 23,
         deductFromTotal: true,
      },
   },
];

module.exports = { TaxConfig, defaultConfigs };
