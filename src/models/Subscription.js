// models/Subscription.js
const mongoose = require("mongoose");
const validator = require("validator");

const subscriptionSchema = new mongoose.Schema(
   {
      userId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      planType: {
         type: String,
         enum: ["daily", "weekly", "monthly"],
         required: true,
      },
      subscriptionType: {
         type: String,
         enum: ["breakfast", "lunch", "dinner", "combo"],
         required: true,
      },
      startDate: {
         type: Date,
         required: true,
      },
      endDate: {
         type: Date,
         required: true,
      },
      isActive: {
         type: Boolean,
         default: true,
      },
      status: {
         type: String,
         enum: ["active", "paused", "cancelled", "expired"],
         default: "active",
      },
      preferences: {
         cuisineTypes: [String],
         spiceLevel: Number,
         dietaryRestrictions: [String],
      },
      deliveryAddress: {
         addressLine1: { type: String, required: true },
         addressLine2: { type: String },
         city: { type: String, required: true },
         state: { type: String, required: true },
         pincode: { type: String, required: true },
         landmark: { type: String },
      },
      deliveryTime: {
         type: String,
         required: true, // "8:00 AM", "1:00 PM", etc.
      },
      pricePerMeal: {
         type: Number,
         required: true,
      },
      totalAmount: {
         type: Number,
         required: true,
      },
      paidAmount: {
         type: Number,
         default: 0,
      },
      nextPaymentDate: Date,
      razorpaySubscriptionId: String,
      pausedDates: [Date],
      deliveredMeals: {
         type: Number,
         default: 0,
      },
      totalMeals: {
         type: Number,
         required: true,
      },
      autoRenewal: {
         type: Boolean,
         default: true,
      },
   },
   {
      timestamps: true,
   }
);

const Subscription = mongoose.model("Subscription", subscriptionSchema);
module.exports = { Subscription };
