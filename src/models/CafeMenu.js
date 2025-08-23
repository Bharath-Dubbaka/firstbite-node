// models/CafeMenu.js
const mongoose = require("mongoose");
const validator = require("validator");

const cafeMenuSchema = new mongoose.Schema(
   {
      name: {
         type: String,
         required: true,
         trim: true,
         unique: true,
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
         type: String, // e.g., "Small Bytes", "Gourmet Salads", "Desi Authentic"
         required: true,
      },

      section: {
         type: String, // e.g., Veg, Non-Veg, Beverages, Specials
         required: true,
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
         default: false,
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
         type: Boolean, // The "ON/OFF" switch for a cafe Menu
         default: true,
      },
      orderCount: {
         type: Number,
         default: 0,
      },
      tags: [String], // popular, new, bestseller, 'spicy', 'bestseller', 'vegan', 'contains-nuts' etc.

      menuOrder: {
         type: Number, // ordering within subcategory
         default: 1,
      },
   },
   {
      timestamps: true,
   }
);

cafeMenuSchema.index({ name: "text", category: "text" }); // For search functionality

const CafeMenu = mongoose.model("CafeMenu", cafeMenuSchema);
module.exports = { CafeMenu };

// MenuOrder Field:
// The menuOrder field controls the display sequence of items within a category. For example:
// javascript// In "🍗 Chicken Delicacies" category:
// { name: "Peri Peri Fire Bites", menuOrder: 1 }      // Shows first
// { name: "Buttermilk Crispy Tenders", menuOrder: 2 } // Shows second
// { name: "Chicken Popcorn Tempura", menuOrder: 3 }
