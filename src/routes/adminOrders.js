// Like with the menu, let's create a dedicated route file for admins to manage orders.

// /src/routes/adminOrders.js
const express = require("express");
const { Order } = require("../models/Order");
const { verifyAdminToken } = require("./admin");
const router = express.Router();

router.use(verifyAdminToken);

// GET /api/admin/orders - Get all orders with filtering
router.get("/", async (req, res) => {
   try {
      const { date, status } = req.query;
      const filter = {};

      if (date) {
         // e.g., ?date=2025-08-13
         const startOfDay = new Date(date);
         startOfDay.setHours(0, 0, 0, 0);
         const endOfDay = new Date(date);
         endOfDay.setHours(23, 59, 59, 999);
         filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
      }
      if (status) {
         // e.g., ?status=delivered
         filter.orderStatus = status;
      }

      const orders = await Order.find(filter)
         .populate("userId", "name phoneNumber email") // Get user's name and phone
         .sort({ createdAt: -1 });

      res.json({ success: true, data: orders });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// GET /api/admin/orders/export - Export meal list for the kitchen (Solves Scenario 2)
router.get("/export", async (req, res) => {
   try {
      const { date = new Date().toISOString().split("T")[0] } = req.query; // Default to today

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const orders = await Order.find({
         createdAt: { $gte: startOfDay, $lte: endOfDay },
         orderStatus: { $ne: "cancelled" }, // Ignore cancelled orders
      }).populate("items.menuItem", "name");

      const mealList = {};
      for (const order of orders) {
         for (const item of order.items) {
            const mealName = item.menuItem.name;
            mealList[mealName] = (mealList[mealName] || 0) + item.quantity;
         }
      }

      res.json({
         success: true,
         date: date,
         totalMeals: Object.values(mealList).reduce((sum, q) => sum + q, 0),
         breakdown: mealList,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// PUT /api/admin/orders/:id/status - Update delivery status (Solves Scenario 3)
router.put("/:id/status", async (req, res) => {
   try {
      const { status, note } = req.body; // expecting { "status": "delivered", "note": "Handed to customer" }

      const updatedOrder = await Order.findByIdAndUpdate(
         req.params.id,
         {
            $set: { orderStatus: status },
            $push: {
               statusHistory: {
                  status: status,
                  note: note || `Status updated by admin`,
                  timestamp: new Date(),
               },
            },
         },
         { new: true }
      );
      res.json({ success: true, data: updatedOrder });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// GET /api/orders/:id - Get single order
router.get("/:id", async (req, res) => {
   try {
      const order = await Order.findOne({
         _id: req.params.id,
      })
         .populate({
            path: "items.menuItem", // ✅ FIXED: Correct path
            model: "CafeMenu", // ✅ FIXED: Correct model name
            select:
               "name description price image category section isVegetarian spiceLevel preparationTime rating",
         })
         .populate({
            path: "userId",
            model: "User",
            select: "name email firstName lastName",
         });
      if (!order) {
         console.log(
            "Order not found for ID:",
            req.params.id,
            "and user:",
            user._id
         );
         return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
   } catch (error) {
      res.status(500).json({
         error: error.message,
         stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
   }
});

module.exports = router;
