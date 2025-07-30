// config/database.js
const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
   // const uri =
   //    "mongodb+srv://bharathdubbaka39:mWoHabZonIDorOiK@firstbite.c0kwpij.mongodb.net/firstbiteDB";
   const uri = process.env.MONGODB_URI;

   try {
      // Add connection options for better reliability
      await mongoose.connect(uri, {
         serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
         socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
         // bufferCommands: false, // Disable mongoose buffering
         // bufferMaxEntries: 0, // Disable mongoose buffering
      });
      console.log("✅ MongoDB connected successfully");
   } catch (error) {
      console.error("❌ MongoDB connection error:", error.message);
      throw error;
   }
};

module.exports = { connectDB };
