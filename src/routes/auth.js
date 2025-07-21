// routes/auth.js
const express = require("express");
const admin = require("firebase-admin");
const { User } = require("../models/User");
const router = express.Router();

// Initialize Firebase Admin SDK
const serviceAccount = require("../config/firebase-service-account.json");
admin.initializeApp({
   credential: admin.credential.cert(serviceAccount),
});

// Verify Firebase ID token middleware
const verifyFirebaseToken = async (req, res, next) => {
   try {
      const idToken = req.headers.authorization?.split("Bearer ")[1];
      if (!idToken) {
         return res.status(401).json({ error: "No token provided" });
      }

      const decodedToken = await admin.auth().verifyIdToken(idToken);
      req.user = decodedToken;
      next();
   } catch (error) {
      return res.status(401).json({ error: "Invalid token" });
   }
};

// POST /api/auth/login - Login/Register with phone OTP
router.post("/login", verifyFirebaseToken, async (req, res) => {
   try {
      const { firstName, lastName, phoneNumber, email } = req.body;
      const firebaseUID = req.user.uid;

      let user = await User.findOne({ firebaseUID });

      if (!user) {
         // Create new user
         user = new User({
            firstName,
            lastName,
            phoneNumber,
            emailID: email,
            firebaseUID,
            isVerified: true,
         });
         await user.save();
      }

      res.json({
         success: true,
         message: "Login successful",
         user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            email: user.emailID,
            isVerified: user.isVerified,
         },
      });
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

// GET /api/admin/orders - Get all orders with filters
router.get("/orders", verifyAdminToken, async (req, res) => {
   try {
      const {
         status,
         orderType,
         page = 1,
         limit = 20,
         startDate,
         endDate,
      } = req.query;

      const filter = {};
      if (status) filter.orderStatus = status;
      if (orderType) filter.orderType = orderType;
      if (startDate && endDate) {
         filter.createdAt = {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
         };
      }

      const orders = await Order.find(filter)
         .populate("userId", "firstName lastName phoneNumber")
         .populate("items.menuItem", "name price")
         .sort({ createdAt: -1 })
         .limit(limit * 1)
         .skip((page - 1) * limit);

      const totalOrders = await Order.countDocuments(filter);

      res.json({
         orders,
         totalOrders,
         totalPages: Math.ceil(totalOrders / limit),
         currentPage: page,
      });
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

// PUT /api/admin/orders/:id/status - Update order status
router.put("/orders/:id/status", verifyAdminToken, async (req, res) => {
   try {
      const { status, note } = req.body;

      const order = await Order.findById(req.params.id);
      if (!order) {
         return res.status(404).json({ error: "Order not found" });
      }

      order.orderStatus = status;
      order.statusHistory.push({
         status,
         timestamp: new Date(),
         note: note || `Status updated to ${status} by admin`,
      });

      if (status === "delivered") {
         order.actualDeliveryTime = new Date();
      }

      await order.save();
      res.json(order);
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

// GET /api/admin/users - Get all users
router.get("/users", verifyAdminToken, async (req, res) => {
   try {
      const { page = 1, limit = 20, search } = req.query;

      const filter = {};
      if (search) {
         filter.$or = [
            { firstName: { $regex: search, $options: "i" } },
            { lastName: { $regex: search, $options: "i" } },
            { phoneNumber: { $regex: search, $options: "i" } },
            { emailID: { $regex: search, $options: "i" } },
         ];
      }

      const users = await User.find(filter)
         .sort({ createdAt: -1 })
         .limit(limit * 1)
         .skip((page - 1) * limit);

      const totalUsers = await User.countDocuments(filter);

      res.json({
         users,
         totalUsers,
         totalPages: Math.ceil(totalUsers / limit),
         currentPage: page,
      });
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

// POST /api/admin/menu - Add new menu item
router.post("/menu", verifyAdminToken, async (req, res) => {
   try {
      if (!req.admin.permissions.includes("menu")) {
         return res.status(403).json({ error: "Insufficient permissions" });
      }

      const menuItem = new MenuItem(req.body);
      await menuItem.save();
      res.status(201).json(menuItem);
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

// PUT /api/admin/menu/:id - Update menu item
router.put("/menu/:id", verifyAdminToken, async (req, res) => {
   try {
      if (!req.admin.permissions.includes("menu")) {
         return res.status(403).json({ error: "Insufficient permissions" });
      }

      const menuItem = await MenuItem.findByIdAndUpdate(
         req.params.id,
         req.body,
         { new: true }
      );

      if (!menuItem) {
         return res.status(404).json({ error: "Menu item not found" });
      }

      res.json(menuItem);
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

// DELETE /api/admin/menu/:id - Delete menu item
router.delete("/menu/:id", verifyAdminToken, async (req, res) => {
   try {
      if (!req.admin.permissions.includes("menu")) {
         return res.status(403).json({ error: "Insufficient permissions" });
      }

      const menuItem = await MenuItem.findByIdAndDelete(req.params.id);
      if (!menuItem) {
         return res.status(404).json({ error: "Menu item not found" });
      }

      res.json({ message: "Menu item deleted successfully" });
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

// GET /api/admin/analytics - Get analytics data
router.get("/analytics", verifyAdminToken, async (req, res) => {
   try {
      const { period = "7d" } = req.query;

      let startDate;
      const endDate = new Date();

      switch (period) {
         case "7d":
            startDate = new Date(endDate - 7 * 24 * 60 * 60 * 1000);
            break;
         case "30d":
            startDate = new Date(endDate - 30 * 24 * 60 * 60 * 1000);
            break;
         case "90d":
            startDate = new Date(endDate - 90 * 24 * 60 * 60 * 1000);
            break;
         default:
            startDate = new Date(endDate - 7 * 24 * 60 * 60 * 1000);
      }

      const [
         revenueData,
         orderData,
         popularItems,
         customerRetention,
         subscriptionData,
      ] = await Promise.all([
         Order.aggregate([
            {
               $match: {
                  createdAt: { $gte: startDate, $lte: endDate },
                  orderStatus: "delivered",
               },
            },
            {
               $group: {
                  _id: {
                     $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                  },
                  revenue: { $sum: "$finalAmount" },
                  orders: { $sum: 1 },
               },
            },
            { $sort: { _id: 1 } },
         ]),
         Order.aggregate([
            {
               $match: {
                  createdAt: { $gte: startDate, $lte: endDate },
               },
            },
            {
               $group: {
                  _id: "$orderStatus",
                  count: { $sum: 1 },
               },
            },
         ]),
         MenuItem.find().sort({ orderCount: -1 }).limit(10),
         User.aggregate([
            {
               $match: {
                  createdAt: { $gte: startDate, $lte: endDate },
               },
            },
            {
               $lookup: {
                  from: "orders",
                  localField: "_id",
                  foreignField: "userId",
                  as: "orders",
               },
            },
            {
               $project: {
                  totalOrders: { $size: "$orders" },
                  isReturnCustomer: { $gt: [{ $size: "$orders" }, 1] },
               },
            },
            {
               $group: {
                  _id: null,
                  totalCustomers: { $sum: 1 },
                  returnCustomers: {
                     $sum: { $cond: ["$isReturnCustomer", 1, 0] },
                  },
               },
            },
         ]),
         Subscription.aggregate([
            {
               $group: {
                  _id: "$status",
                  count: { $sum: 1 },
               },
            },
         ]),
      ]);

      res.json({
         revenueData,
         orderData,
         popularItems,
         customerRetention: customerRetention[0] || {
            totalCustomers: 0,
            returnCustomers: 0,
         },
         subscriptionData,
      });
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

module.exports = router;
