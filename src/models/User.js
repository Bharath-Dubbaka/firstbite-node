// models/User.js
const mongoose = require("mongoose");
const validator = require("validator");

const userSchema = new mongoose.Schema(
   {
      firstName: {
         type: String,
         required: true,
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
         required: true,
         unique: true,
         validate: {
            validator: function (v) {
               return /^[6-9]\d{9}$/.test(v); // Indian mobile number format
            },
            message: "Please enter a valid Indian mobile number",
         },
      },
      emailID: {
         type: String,
         lowercase: true,
         trim: true,
         validate(value) {
            if (value && !validator.isEmail(value)) {
               throw new Error("Please enter a valid email");
            }
         },
      },
      firebaseUID: {
         type: String,
         required: true,
         unique: true,
      },
      profilePicture: {
         type: String,
         default:
            "https://cdn.pixabay.com/photo/2023/02/18/11/00/icon-7797704_640.png",
         validate(value) {
            if (!validator.isURL(value)) {
               throw new Error("Please enter a valid URL");
            }
         },
      },
      addresses: [
         {
            type: {
               type: String,
               enum: ["home", "work", "other"],
               default: "home",
            },
            addressLine1: { type: String, required: true },
            addressLine2: { type: String },
            city: { type: String, required: true },
            state: { type: String, required: true },
            pincode: { type: String, required: true },
            landmark: { type: String },
            isDefault: { type: Boolean, default: false },
         },
      ],
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
         default: false,
      },
   },
   {
      timestamps: true,
   }
);

const User = mongoose.model("User", userSchema);

module.exports = { User };
