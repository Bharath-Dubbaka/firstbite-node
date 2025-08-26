// scripts/fixDatabase.js - Run this to fix your database
const mongoose = require("mongoose");
require("dotenv").config();

async function fixDatabase() {
   try {
      // Connect to MongoDB
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("✅ Connected to MongoDB");

      const db = mongoose.connection.db;
      
      // 1. DROP the problematic phoneNumber index
      try {
         await db.collection('users').dropIndex("phoneNumber_1");
         console.log("✅ Dropped phoneNumber index");
      } catch (error) {
         console.log("ℹ️ phoneNumber index do not exist or already dropped");
      }

      // 2. List all indexes to verify
      const indexes = await db.collection('users').listIndexes().toArray();
      console.log("📋 Current indexes:", indexes.map(i => i.name));

      // 3. Count users
      const userCount = await db.collection('users').countDocuments();
      console.log(`📊 Total users: ${userCount}`);

      // 4. Show users with null phoneNumber
      const nullPhoneUsers = await db.collection('users').find({ phoneNumber: null }).toArray();
      console.log(`📱 Users with null phoneNumber: ${nullPhoneUsers.length}`);

      console.log("✅ Database cleanup completed!");
      
   } catch (error) {
      console.error("❌ Error:", error);
   } finally {
      await mongoose.connection.close();
      console.log("👋 Disconnected from MongoDB");
      process.exit(0);
   }
}

// Run the fix
fixDatabase();