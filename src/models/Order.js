// models/Order.js
// models/Order.js - UPDATED with In-house Order Support
const mongoose = require("mongoose");
const validator = require("validator");

const orderSchema = new mongoose.Schema(
   {
      orderNumber: {
         type: String,
         required: true,
         unique: true,
         // Format: Online = "LFB1234567890", In-house = "IH-001", "IH-002"
      },

      // ===== USER & ORDER SOURCE =====
      userId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: function () {
            // Required only for online orders, optional for walk-in customers
            return this.orderSource === "online";
         },
      },

      orderSource: {
         type: String,
         enum: ["online", "in-house", "swiggy", "zomato"],
         required: true,
         default: "online",
      },

      // ===== IN-HOUSE ORDER FIELDS =====
      tableNumber: {
         type: String, // "21", "5-6" (for merged tables), "Counter"
         required: function () {
            return this.orderSource === "in-house";
         },
      },

      customerName: {
         type: String, // Optional for in-house orders
         trim: true,
      },

      guestCount: {
         type: Number, // Number of people at table
         min: 1,
         default: 1,
      },

      // ===== EXISTING FIELDS =====
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
            // For kitchen tracking
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
            "ready", // Kitchen is done
            "served", // Waiter delivered to table
            "billing", // Bill printed
            "dispatched", // For Online
            "delivered", // For Online
            "cancelled",
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

      // Metadata
      createdBy: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "Admin", // Which admin created the in-house order
      },

      // Bill details for in-house
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

// Indexes for better performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ orderSource: 1, createdAt: -1 });
orderSchema.index({ tableNumber: 1, orderStatus: 1 });
orderSchema.index({ userId: 1, createdAt: -1 });

// Virtual for display name
orderSchema.virtual("displayName").get(function () {
   if (this.orderSource === "in-house") {
      return this.customerName || `Table ${this.tableNumber}`;
   }
   return this.populated("userId")?.name || "Customer";
});

const Order = mongoose.model("Order", orderSchema);
module.exports = { Order };
