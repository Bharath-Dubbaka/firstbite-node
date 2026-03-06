// models/Bill.js - Immutable Bill Snapshot
// Once isLocked = true (payment completed), this document NEVER changes.
// This is the source of truth for accounts, audits, and reprints.

const mongoose = require("mongoose");

const billSchema = new mongoose.Schema(
   {
      // ── Identity ──────────────────────────────────────────────
      billNumber: {
         type: String,
         required: true,
         unique: true,
         // e.g. "B2026-001", sequential per day
      },

      orderId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Order",
         required: true,
      },

      // ── Table / Customer snapshot ─────────────────────────────
      tableNumber: String,
      customerName: String,
      guestCount: Number,
      orderSource: String,
      orderNumber: String,

      // ── Items snapshot (frozen at bill generation time) ───────
      items: [
         {
            name: { type: String, required: true }, // snapshot
            quantity: { type: Number, required: true },
            basePrice: { type: Number, required: true }, // per unit excl addons
            selectedAddons: [
               {
                  name: String,
                  price: Number,
               },
            ],
            unitTotal: Number, // (basePrice + addons) × quantity
         },
      ],

      // ── Charges snapshot (frozen at bill generation time) ─────
      subtotal: { type: Number, required: true },

      cgstRate: { type: Number, default: 0 }, // % stored explicitly
      cgst: { type: Number, default: 0 },

      sgstRate: { type: Number, default: 0 },
      sgst: { type: Number, default: 0 },

      igstRate: { type: Number, default: 0 },
      igst: { type: Number, default: 0 },

      totalTax: { type: Number, default: 0 },

      serviceChargeRate: { type: Number, default: 0 }, // % stored explicitly
      serviceCharge: { type: Number, default: 0 },
      serviceChargeWaived: { type: Boolean, default: false },

      packagingCharges: { type: Number, default: 0 },
      deliveryCharges: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      roundOff: { type: Number, default: 0 },

      grandTotal: { type: Number, required: true },

      // ── Payment snapshot (filled on complete-payment) ─────────
      paymentMethod: {
         type: String,
         enum: ["cash", "upi", "card", "axis-machine", null],
         default: null,
      },
      paymentCompletedAt: { type: Date, default: null },
      paymentStatus: {
         type: String,
         enum: ["generated", "paid", "voided"],
         default: "generated",
      },

      // ── Audit ─────────────────────────────────────────────────
      generatedBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Admin",
      },
      generatedAt: { type: Date, default: Date.now },

      isRegenerated: { type: Boolean, default: false },
      previousBillId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Bill",
         default: null,
         // points to the bill this one replaced (on regeneration)
      },

      // ── Immutability lock ─────────────────────────────────────
      isLocked: { type: Boolean, default: false },
      lockedAt: { type: Date, default: null },
   },
   {
      timestamps: true,
   },
);

// ── Indexes ───────────────────────────────────────────────────
billSchema.index({ orderId: 1 });
billSchema.index({ billNumber: 1 });
billSchema.index({ paymentStatus: 1 });
billSchema.index({ generatedAt: -1 });

// ── Immutability enforcement ──────────────────────────────────
// Once isLocked = true, block ALL field changes except nothing.
billSchema.pre("save", function (next) {
   if (!this.isNew && this.isLocked) {
      // Allow the lock itself to be set (first time)
      const modified = this.modifiedPaths();
      // The only time we allow saving a locked doc is when
      // we just set isLocked = true in the same operation.
      // After that, any subsequent save is blocked.
      const allowedOnLock = [
         "isLocked",
         "lockedAt",
         "paymentMethod",
         "paymentCompletedAt",
         "paymentStatus",
         "updatedAt",
         "__v",
      ];

      const illegalChanges = modified.filter((p) => !allowedOnLock.includes(p));
      if (illegalChanges.length > 0) {
         return next(
            new Error(
               `Bill ${this.billNumber} is locked and cannot be modified. Illegal fields: ${illegalChanges.join(", ")}`,
            ),
         );
      }
   }
   next();
});

const Bill = mongoose.model("Bill", billSchema);
module.exports = { Bill };
