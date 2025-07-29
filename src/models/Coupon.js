// // models/Coupon.js
// const mongoose = require("mongoose");
// const validator = require("validator");

// const couponSchema = new mongoose.Schema({
//    code: {
//       type: String,
//       required: true,
//       unique: true,
//       uppercase: true,
//    },
//    description: {
//       type: String,
//       required: true,
//    },
//    discountType: {
//       type: String,
//       enum: ['percentage', 'fixed'],
//       required: true,
//    },
//    discountValue: {
//       type: Number,
//       required: true,
//    },
//    minimumOrderAmount: {
//       type: Number,
//       default: 0,
//    },
//    maximumDiscountAmount: {
//       type: Number,
//    },
//    validFrom: {
//       type: Date,
//       required: true,
//    },
//    validTill: {
//       type: Date,
//       required: true,
//    },
//    usageLimit: {
//       type: Number,
//       default: 1,
//    },
//    usedCount: {
//       type: Number,
//       default: 0,
//    },
//    isActive: {
//       type: Boolean,
//       default: true,
//    },
//    applicableFor: {
//       type: String,
//       enum: ['all', 'new-users', 'existing-users'],
//       default: 'all',
//    },
// }, {
//    timestamps: true,
// });

// const Coupon = mongoose.model("Coupon", couponSchema);
// module.exports = { Coupon };