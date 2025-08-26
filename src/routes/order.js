// routes/orders.js
const express = require("express");
const { Order } = require("../models/Order");
const verifyFirebaseToken = require("../middlewares/auth");
const { User } = require("../models/User");
const router = express.Router();

// POST /api/orders - Create new order
router.post("/", verifyFirebaseToken, async (req, res) => {
   try {
      console.log("Creating order with payload:", req.body);

      const user = await User.findOne({ uid: req.user.uid });
      if (!user) {
         console.log("User not found for uid:", req.user.uid);
         return res.status(404).json({ error: "User not found" });
      }
      console.log("User found:", user._id);

      const orderNumber = `LFB${Date.now()}${Math.floor(Math.random() * 1000)}`;

      const orderData = new Order({
         ...req.body,
         userId: user._id,
         orderNumber,
         statusHistory: [
            {
               status: "placed",
               timestamp: new Date(),
               note: "Order placed successfully",
            },
         ],
      });

      console.log("Creating order with data:", orderData);

      const order = new Order(orderData);
      const savedOrder = await order.save();

      console.log("Order saved successfully:", savedOrder._id);

      // Update users total orders
      await User.findByIdAndUpdate(user._id, {
         $inc: { totalOrders: 1 },
      });

      res.status(201).json(savedOrder);
   } catch (error) {
      console.error("Order creation error:", error);
      res.status(500).json({
         error: error.message,
         stack:
            process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
   }
});

// GET /api/orders - Get user's orders
router.get("/", verifyFirebaseToken, async (req, res) => {
   try {
      const user = await User.findOne({ uid: req.user.uid });
      if (!user) {
         return res.status(404).json({ error: "User not found" });
      }
      const orders = await Order.find({ userId: user._id })
         .populate("items.menuItem")
         .sort({ createdAt: -1 });

      res.json(orders);
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

// GET /api/orders/:id - Get single order
router.get("/:id", verifyFirebaseToken, async (req, res) => {
   try {
      const user = await User.findOne({ uid: req.user.uid });
      if (!user) {
         return res.status(404).json({ error: "User not found" });
      }
      const order = await Order.findOne({
         _id: req.params.id,
         userId: user._id,
      })
         .populate("items.menuItem") // This populates the menuItem details
         .populate("userId", "name email"); // Optional: populate user info

      if (!order) {
         return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

// PUT /api/orders/:id/cancel - Cancel order
router.put("/:id/cancel", verifyFirebaseToken, async (req, res) => {
   try {
      const user = await User.findOne({ uid: req.user.uid });
      if (!user) {
         return res.status(404).json({ error: "User not found" });
      }
      const order = await Order.findOne({
         _id: req.params.id,
         userId: user._id,
      });

      if (!order) {
         return res.status(404).json({ error: "Order not found" });
      }

      if (!["placed", "confirmed"].includes(order.orderStatus)) {
         return res.status(400).json({ error: "Order cannot be cancelled" });
      }

      order.orderStatus = "cancelled";
      order.statusHistory.push({
         status: "cancelled",
         timestamp: new Date(),
         note: req.body.reason || "Cancelled by user",
      });

      await order.save();
      res.json(order);
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

// POST /api/orders/:id/review - Add review
router.post("/:id/review", verifyFirebaseToken, async (req, res) => {
   try {
      const user = await User.findOne({ uid: req.user.uid });
      if (!user) {
         return res.status(404).json({ error: "User not found" });
      }
      const order = await Order.findOneAndUpdate(
         { _id: req.params.id, userId: user._id },
         {
            rating: req.body.rating,
            review: req.body.review,
            isReviewed: true,
         },
         { new: true }
      );

      if (!order) {
         return res.status(404).json({ error: "Order not found" });
      }

      res.json(order);
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

module.exports = router;
