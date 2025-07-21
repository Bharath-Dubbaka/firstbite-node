
// models/MenuItem.js
const mongoose = require("mongoose");
const validator = require("validator");

const menuItemSchema = new mongoose.Schema({
   name: {
      type: String,
      required: true,
      trim: true,
   },
   description: {
      type: String,
      required: true,
   },
   price: {
      type: Number,
      required: true,
      min: 0,
   },
   image: {
      type: String,
      required: true,
   },
   category: {
      type: String,
      required: true,
      enum: ['cafe', 'dabba'],
   },
   section: {
      type: String,
      required: true, // Quick Bites, Comfort Meals, etc.
   },
   rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
   },
   preparationTime: {
      type: Number, // in minutes
      required: true,
   },
   spiceLevel: {
      type: Number,
      min: 1,
      max: 5,
      default: 1,
   },
   servings: {
      type: String,
      default: "1",
   },
   isVegetarian: {
      type: Boolean,
      default: true,
   },
   isVegan: {
      type: Boolean,
      default: false,
   },
   isGlutenFree: {
      type: Boolean,
      default: false,
   },
   ingredients: [String],
   allergens: [String],
   nutritionInfo: {
      calories: Number,
      protein: Number,
      carbs: Number,
      fat: Number,
   },
   isAvailable: {
      type: Boolean,
      default: true,
   },
   orderCount: {
      type: Number,
      default: 0,
   },
   tags: [String], // popular, new, bestseller, etc.
}, {
   timestamps: true,
});

const MenuItem = mongoose.model("MenuItem", menuItemSchema);
module.exports = { MenuItem };