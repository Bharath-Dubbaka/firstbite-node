// models/User.js
const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
   {
      firstName: {
         type: String,
         minLength: 2,
         maxLength: 30,
         trim: true,
      },
      lastName: {
         type: String,
         maxLength: 30,
         trim: true,
      },

      phoneNumber: {
         type: String,
         validate: {
            validator: function (v) {
               return !v || /^[0-9]{10}$/.test(v);
            },
            message: "Phone number must be 10 digits",
         },
      },
      // ✅ FIX: Use consistent field naming - 'email' instead of 'emailID'
      email: {
         type: String,
         lowercase: true,
         unique: true,
         sparse: true, // Same fix for email
         trim: true,
         validate(value) {
            if (value && !validator.isEmail(value)) {
               throw new Error("Please enter a valid email");
            }
         },
      },
      // ✅ FIX: Add name field for Google login
      name: {
         type: String,
         trim: true,
      },
      // ✅ FIX: Add picture field for Google login
      picture: {
         type: String,
         validate(value) {
            if (value && !validator.isURL(value)) {
               throw new Error("Please enter a valid URL");
            }
         },
      },
      uid: {
         type: String,
         required: true,
         unique: true,
      },
      profilePicture: {
         type: String,
         default:
            "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png",
         validate(value) {
            if (value && !validator.isURL(value)) {
               throw new Error("Please enter a valid URL");
            }
         },
      },
      addresses: [
         {
            label: {
               type: String,
               required: true,
               trim: true,
               maxlength: 30,
               default: "Home",
            },
            addressLine1: { type: String, required: true },
            addressLine2: { type: String },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
            landmark: { type: String },
            isDefault: { type: Boolean, default: false },
            latitude: { type: Number },
            longitude: { type: Number },
         },
      ],
      // addresses: [
      //    {
      //       type: {
      //          type: String,
      //          enum: ["home", "work", "other"],
      //          default: "home",
      //       },
      //       addressLine1: { type: String, required: true },
      //       addressLine2: { type: String },
      //       city: { type: String, required: true },
      //       state: { type: String, required: true },
      //       pincode: { type: String, required: true },
      //       landmark: { type: String },
      //       isDefault: { type: Boolean, default: false },
      //    },
      // ],
      preferences: {
         cuisineTypes: [String],
         spiceLevel: {
            type: Number,
            min: 1,
            max: 5,
            default: 3,
         },
         dietaryRestrictions: [String], // vegetarian, vegan, gluten-free, etc.
      },
      isActive: {
         type: Boolean,
         default: true,
      },
      loyaltyPoints: {
         type: Number,
         default: 0,
      },
      totalOrders: {
         type: Number,
         default: 0,
      },
      isVerified: {
         type: Boolean,
         default: true, // Auto-verified when using Firebase OTP
      },
      lastLogin: {
         type: Date,
         default: Date.now,
      },
      registrationSource: {
         type: String,
         enum: ["mobile_otp", "email", "social", "google"],
         default: "google", // Since you're using Google login primarily
      },
   },
   {
      timestamps: true,
   }
);

// ✅ Add compound index for better performance
// userSchema.index({ uid: 1 });
// userSchema.index({ email: 1 });
// ✅ FIX: Create sparse index for phoneNumber
// userSchema.index({ phoneNumber: 1 });

const User = mongoose.model("User", userSchema);

module.exports = { User };
