// // models/Order.js
// const mongoose = require("mongoose");
// const validator = require("validator");

// const orderSchema = new mongoose.Schema(
//    {
//       orderNumber: {
//          type: String,
//          required: true,
//          unique: true,
//       },
//       userId: {
//          type: mongoose.Schema.Types.ObjectId,
//          ref: "User",
//          required: true,
//       },
//       subscriptionId: {
//          type: mongoose.Schema.Types.ObjectId,
//          ref: "Subscription",
//       },
//       items: [
//          {
//             menuItem: {
//                type: mongoose.Schema.Types.ObjectId,
//                ref: "MenuItem",
//                required: true,
//             },
//             quantity: {
//                type: Number,
//                required: true,
//                min: 1,
//             },
//             price: {
//                type: Number,
//                required: true,
//             },
//             specialInstructions: String,
//          },
//       ],
//       deliveryAddress: {
//          addressLine1: { type: String, required: true },
//          addressLine2: { type: String },
//          city: { type: String, required: true },
//          state: { type: String, required: true },
//          pincode: { type: String, required: true },
//          landmark: { type: String },
//       },
//       orderType: {
//          type: String,
//          enum: ["one-time", "subscription"],
//          default: "one-time",
//       },
//       totalAmount: {
//          type: Number,
//          required: true,
//       },
//       discountAmount: {
//          type: Number,
//          default: 0,
//       },
//       deliveryCharges: {
//          type: Number,
//          default: 0,
//       },
//       taxes: {
//          type: Number,
//          default: 0,
//       },
//       finalAmount: {
//          type: Number,
//          required: true,
//       },
//       paymentMethod: {
//          type: String,
//          enum: ["razorpay", "cod", "wallet"],
//          required: true,
//       },
//       paymentStatus: {
//          type: String,
//          enum: ["pending", "completed", "failed", "refunded"],
//          default: "pending",
//       },
//       razorpayOrderId: String,
//       razorpayPaymentId: String,
//       orderStatus: {
//          type: String,
//          enum: [
//             "placed",
//             "confirmed",
//             "preparing",
//             "ready",
//             "dispatched",
//             "delivered",
//             "cancelled",
//          ],
//          default: "placed",
//       },
//       statusHistory: [
//          {
//             status: String,
//             timestamp: { type: Date, default: Date.now },
//             note: String,
//          },
//       ],
//       expectedDeliveryTime: Date,
//       actualDeliveryTime: Date,
//       deliveryPersonId: {
//          type: mongoose.Schema.Types.ObjectId,
//          ref: "DeliveryPerson",
//       },
//       customerNotes: String,
//       adminNotes: String,
//       rating: {
//          type: Number,
//          min: 1,
//          max: 5,
//       },
//       review: String,
//       isReviewed: {
//          type: Boolean,
//          default: false,
//       },
//    },
//    {
//       timestamps: true,
//    }
// );

// const Order = mongoose.model("Order", orderSchema);
// module.exports = { Order };
