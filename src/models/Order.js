// models/Order.js - FIXED: Removed duplicate indexes
const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
   {
      orderNumber: {
         type: String,
         required: true,
         unique: true, // ✅ Keep only this, remove schema.index() below
      },

      userId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: function () {
            return this.orderSource === "online";
         },
      },

      orderSource: {
         type: String,
         enum: ["online", "in-house", "swiggy", "zomato", "takeaway"],
         required: true,
         default: "online",
      },

      tableNumber: {
         type: String,
         required: function () {
            return this.orderSource === "in-house";
         },
      },

      customerName: {
         type: String,
         trim: true,
      },

      guestCount: {
         type: Number,
         min: 1,
         default: 1,
      },

      subscriptionId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Subscription",
      },

      items: [
         {
            menuItem: {
               type: mongoose.Schema.Types.ObjectId,
               ref: "CafeMenu",
               required: true,
            },
            quantity: {
               type: Number,
               required: true,
               min: 1,
            },
            price: {
               type: Number,
               required: true,
            },
            specialInstructions: String,
            status: {
               type: String,
               enum: ["pending", "preparing", "ready", "served"],
               default: "pending",
            },
         },
      ],

      deliveryAddress: {
         label: String,
         addressLine1: { type: String },
         addressLine2: { type: String },
         city: { type: String },
         state: { type: String },
         pincode: { type: String },
         landmark: { type: String },
      },

      orderType: {
         type: String,
         enum: ["one-time", "subscription", "dine-in"],
         default: "one-time",
      },

      totalAmount: {
         type: Number,
         required: true,
      },

      discountAmount: {
         type: Number,
         default: 0,
      },

      deliveryCharges: {
         type: Number,
         default: 0,
      },

      taxes: {
         type: Number,
         default: 0,
      },

      finalAmount: {
         type: Number,
         required: true,
      },

      paymentMethod: {
         type: String,
         enum: [
            "razorpay",
            "cod",
            "wallet",
            "cash",
            "card",
            "upi",
            "axis-machine",
         ],
         required: true,
      },

      paymentStatus: {
         type: String,
         enum: ["pending", "completed", "failed", "refunded"],
         default: "pending",
      },

      razorpayOrderId: String,
      razorpayPaymentId: String,
      // Payment machine details for in-house
      paymentDetails: {
         machineId: String, // "AXIS-001"
         transactionId: String,
         approvalCode: String,
         timestamp: Date,
      },

      orderStatus: {
         type: String,
         enum: [
            "placed",
            "confirmed",
            "preparing",
            "ready", // Kitchen prepared item/order
            "dispatched", // For Online
            "delivered", // For Online
            "cancelled",
            "served", // Waiter delivered order/item to table
            "billing", // Bill printed
            "completed", // Paid and Finished for In-house/Takeaway
         ],
         default: "placed",
      },

      statusHistory: [
         {
            status: String,
            timestamp: { type: Date, default: Date.now },
            note: String,
            updatedBy: {
               type: String, // admin ID or "system"
            },
         },
      ],

      expectedDeliveryTime: Date,
      actualDeliveryTime: Date,

      deliveryPersonId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "DeliveryPerson",
      },
      cgst: {
         type: Number,
         default: 0,
      },
      sgst: {
         type: Number,
         default: 0,
      },
      igst: {
         type: Number,
         default: 0,
      },
      serviceCharge: {
         type: Number,
         default: 0,
      },
      packagingCharges: {
         type: Number,
         default: 0,
      },
      roundOff: {
         type: Number,
         default: 0,
      },
      // Notes
      customerNotes: String,
      adminNotes: String,
      kitchenNotes: String, // Special instructions for kitchen

      // Feedback
      rating: {
         type: Number,
         min: 1,
         max: 5,
      },
      review: String,
      isReviewed: {
         type: Boolean,
         default: false,
      },

      createdBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Admin",
      },

      billGenerated: {
         type: Boolean,
         default: false,
      },
      billGeneratedAt: Date,
   },
   {
      timestamps: true,
   },
);

// ✅ REMOVED DUPLICATE INDEXES - Only use compound indexes
orderSchema.index({ orderSource: 1, createdAt: -1 });
orderSchema.index({ orderStatus: 1, orderSource: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });

// Auto-calculate order status based on item statuses

orderSchema.pre("save", function (next) {
   // Only for in-house orders
   if (this.orderSource !== "in-house" || this.items.length === 0) {
      return next();
   }

   // ✅ UPDATED: Don't auto-change if completed or cancelled
   // BUT allow changes if billing (bill printed but not paid yet)
   if (["completed", "cancelled"].includes(this.orderStatus)) {
      return next();
   }

   const itemStatuses = this.items.map((i) => i.status);

   // Check for ANY pending items (new items added)
   const hasPending = itemStatuses.some((s) => s === "pending");
   const allServed = itemStatuses.every((s) => s === "served");
   const allReady = itemStatuses.every((s) => s === "ready" || s === "served");
   const somePreparing = itemStatuses.some((s) => s === "preparing");

   let newStatus = this.orderStatus;

   // ✅ PRIORITY ORDER:

   // 1. If there are pending items AND we're in billing/served
   if (hasPending && ["served", "billing"].includes(this.orderStatus)) {
      // Reset to confirmed so kitchen sees the new items
      newStatus = "confirmed";
   }
   // 2. If all items served
   else if (allServed && this.orderStatus !== "billing") {
      // Don't override billing status
      newStatus = "served";
   }
   // 3. If all items ready or served
   else if (allReady && !["served", "billing"].includes(this.orderStatus)) {
      newStatus = "ready";
   }
   // 4. If some items are preparing
   else if (somePreparing && this.orderStatus === "confirmed") {
      newStatus = "preparing";
   }

   // Only update if status actually changed
   if (newStatus !== this.orderStatus) {
      this.orderStatus = newStatus;

      const lastHistoryStatus =
         this.statusHistory[this.statusHistory.length - 1]?.status;
      if (lastHistoryStatus !== newStatus) {
         this.statusHistory.push({
            status: newStatus,
            timestamp: new Date(),
            note: hasPending
               ? "New items added - bill needs regeneration"
               : `Auto-updated: Items are ${newStatus}`,
            updatedBy: "system",
         });
      }
   }

   next();
});

const Order = mongoose.model("Order", orderSchema);

module.exports = { Order };
