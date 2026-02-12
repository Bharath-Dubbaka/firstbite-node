const mongoose = require("mongoose");
require("dotenv").config(); // if you use .env

const { Table } = require("../src/models/Table");
const { Order } = require("../src/models/Order");

async function emergencyFix() {
   try {
      // 🔥 CONNECT TO DB (use same URI as server.js)
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("✅ Connected to MongoDB");

      const order = await Order.findOne({
         orderNumber: "IH-20260205-006",
      });

      if (order) {
         order.items.forEach((item) => (item.status = "served"));
         await order.save();
         console.log("✅ Fixed order IH-20260205-006");
      } else {
         console.log("❌ Order not found");
      }

      await Table.updateOne(
         { tableNumber: 10 },
         { status: "available", currentOrderId: null },
      );

      console.log("✅ Freed Table 10");

      process.exit();
   } catch (error) {
      console.error("❌ Error:", error.message);
      process.exit(1);
   }
}

emergencyFix();
