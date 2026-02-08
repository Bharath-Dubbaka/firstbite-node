// models/Table.js - For managing restaurant tables
const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema(
   {
      tableNumber: {
         type: String,
         required: true,
         unique: true,
         trim: true,
         // Examples: "1", "21", "5-6" (merged tables)
      },

      capacity: {
         type: Number,
         required: true,
         min: 1,
         default: 4,
      },

      status: {
         type: String,
         enum: ["available", "occupied", "reserved", "merged", "inactive"],
         default: "available",
      },

      location: {
         type: String,
         enum: ["indoor", "outdoor", "balcony", "vip"],
         default: "indoor",
      },

      // Current active order on this table
      currentOrderId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Order",
      },

      // For merged tables
      mergedWith: [
         {
            type: String, // Array of table numbers this is merged with
         },
      ],

      // Metadata
      isActive: {
         type: Boolean,
         default: true,
      },

      notes: String, // "Window seat", "Near kitchen", etc.

      // Tracking
      lastOccupiedAt: Date,
      lastClearedAt: Date,
   },
   {
      timestamps: true,
   },
);

// Index for quick lookups
tableSchema.index({ tableNumber: 1 });
tableSchema.index({ status: 1 });

const Table = mongoose.model("Table", tableSchema);
module.exports = { Table };
