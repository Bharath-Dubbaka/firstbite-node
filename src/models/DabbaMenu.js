// /src/models/DabbaMenu.js (A new file you will create)
const mongoose = require("mongoose");

const dabbaMenuSchema = new mongoose.Schema(
   {
      // The specific date this menu is for
      date: {
         type: Date,
         required: true,
      },

      // What meal of the day is this for?
      mealType: {
         type: String,
         required: true,
         enum: ["breakfast", "lunch", "dinner"],
      },

      // An array of references to the items from your master dabbaMenu collection
      items: [
         {
            type: mongoose.Schema.Types.ObjectId,
            ref: "CafeMenu", // This links to the CafeMenu model
            required: true,
         },
      ],
   },
   { timestamps: true }
);

// Ensure you can't have two lunch menus on the same day
dabbaMenuSchema.index({ date: 1, mealType: 1 }, { unique: true });

const DabbaMenu = mongoose.model("DabbaMenu", dabbaMenuSchema);
module.exports = { DabbaMenu };
