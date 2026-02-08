// scripts/setupTables.js - One-time setup script for creating tables
require("dotenv").config();
const mongoose = require("mongoose");
const { Table } = require("../src/models/Table");

const tables = [
   // Indoor tables (1-15) - 2 seaters
   ...Array.from({ length: 8 }, (_, i) => ({
      tableNumber: String(i + 1),
      capacity: 2,
      location: "indoor",
      status: "available",
      notes: i < 3 ? "Window seat" : ""
   })),
   
   // Indoor tables (9-15) - 4 seaters
   ...Array.from({ length: 7 }, (_, i) => ({
      tableNumber: String(i + 9),
      capacity: 4,
      location: "indoor",
      status: "available"
   })),
   
   // Outdoor tables (16-20) - 4 seaters
   ...Array.from({ length: 5 }, (_, i) => ({
      tableNumber: String(i + 16),
      capacity: 4,
      location: "outdoor",
      status: "available"
   })),
   
   // Outdoor tables (21-25) - 6 seaters
   ...Array.from({ length: 5 }, (_, i) => ({
      tableNumber: String(i + 21),
      capacity: 6,
      location: "outdoor",
      status: "available"
   })),
   
   // VIP section (26-30) - 6 seaters
   ...Array.from({ length: 5 }, (_, i) => ({
      tableNumber: String(i + 26),
      capacity: 6,
      location: "vip",
      status: "available",
      notes: "VIP section"
   }))
];

async function setupTables() {
   try {
      console.log("🔌 Connecting to MongoDB...");
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("✅ Connected to MongoDB");

      // Check if tables already exist
      const existingCount = await Table.countDocuments();
      if (existingCount > 0) {
         console.log(`⚠️  Found ${existingCount} existing tables.`);
         const readline = require("readline").createInterface({
            input: process.stdin,
            output: process.stdout
         });

         readline.question("Do you want to DELETE all existing tables and create new ones? (yes/no): ", async (answer) => {
            if (answer.toLowerCase() === "yes") {
               await Table.deleteMany({});
               console.log("🗑️  Deleted all existing tables");
               await createTables();
            } else {
               console.log("❌ Operation cancelled");
               process.exit(0);
            }
            readline.close();
         });
      } else {
         await createTables();
      }

   } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
   }
}

async function createTables() {
   try {
      const result = await Table.insertMany(tables);
      console.log(`✅ Successfully created ${result.length} tables`);
      
      // Display summary
      const summary = await Table.aggregate([
         {
            $group: {
               _id: "$location",
               count: { $sum: 1 },
               totalCapacity: { $sum: "$capacity" }
            }
         }
      ]);

      console.log("\n📊 Table Summary:");
      summary.forEach(loc => {
         console.log(`   ${loc._id}: ${loc.count} tables, ${loc.totalCapacity} seats`);
      });

      process.exit(0);
   } catch (error) {
      console.error("❌ Error creating tables:", error.message);
      process.exit(1);
   }
}

// Run the setup
setupTables();