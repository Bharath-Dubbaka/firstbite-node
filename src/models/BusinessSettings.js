// models/BusinessSettings.js - Legal & Business Information
const mongoose = require("mongoose");

const businessSettingsSchema = new mongoose.Schema(
   {
      // Business Details
      businessName: {
         type: String,
         required: true,
         default: "Love At First Byte",
      },
      tagline: {
         type: String,
         default: "Cafe & Restaurant",
      },

      // Address
      address: {
         line1: {
            type: String,
            required: true,
         },
         line2: String,
         city: {
            type: String,
            required: true,
         },
         state: {
            type: String,
            required: true,
         },
         pincode: {
            type: String,
            required: true,
         },
      },

      // Contact
      contact: {
         phone: {
            type: String,
            required: true,
         },
         email: String,
         website: String,
      },

      // Legal Information (REQUIRED)
      legal: {
         // GST Details
         gstin: {
            type: String,
            required: true,
            match: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
         },
         gstRegistrationDate: Date,

         // FSSAI License (MANDATORY for food businesses)
         fssaiNumber: {
            type: String,
            required: true,
            match: /^[0-9]{14}$/, // 14-digit FSSAI number
         },
         fssaiValidUpto: Date,

         // SAC Code (Service Accounting Code)
         sacCode: {
            type: String,
            default: "996331", // Restaurant & Catering services
         },

         // PAN
         pan: {
            type: String,
            match: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
         },

         // Business Registration
         registrationType: {
            type: String,
            enum: [
               "proprietorship",
               "partnership",
               "llp",
               "private-limited",
               "public-limited",
            ],
         },
         registrationNumber: String,

         // Other Licenses
         tradeLicense: String,
         fireNOC: String,
         healthLicense: String,
      },

      // Bill Settings
      billSettings: {
         prefix: {
            type: String,
            default: "INV",
         },
         startingNumber: {
            type: Number,
            default: 1,
         },
         currentNumber: {
            type: Number,
            default: 1,
         },
         resetPeriod: {
            type: String,
            enum: ["never", "daily", "monthly", "yearly"],
            default: "yearly",
         },
         lastResetDate: Date,

         footer: {
            type: String,
            default: "Thank you for dining with us! Visit again soon.",
         },
         termsAndConditions: {
            type: String,
            default: "Goods once sold will not be taken back or exchanged.",
         },
         showQRCode: {
            type: Boolean,
            default: false,
         },
         upiId: String,
      },

      // Operating Hours
      operatingHours: [
         {
            day: {
               type: String,
               enum: [
                  "monday",
                  "tuesday",
                  "wednesday",
                  "thursday",
                  "friday",
                  "saturday",
                  "sunday",
               ],
            },
            isOpen: {
               type: Boolean,
               default: true,
            },
            openTime: String, // "09:00"
            closeTime: String, // "23:00"
         },
      ],

      // Currency
      currency: {
         code: {
            type: String,
            default: "INR",
         },
         symbol: {
            type: String,
            default: "₹",
         },
      },

      // Invoice Declaration
      invoiceDeclaration: {
         type: String,
         default:
            "This is a computer generated invoice and does not require signature.",
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

// Ensure only one settings document exists
businessSettingsSchema.index({ isActive: 1 }, { unique: true });

const BusinessSettings = mongoose.model(
   "BusinessSettings",
   businessSettingsSchema,
);

module.exports = { BusinessSettings };
