// // routes/admin.js
// const express = require("express");
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const { User } = require("../models/User");
// const { Admin } = require("../models/Admin");
// const { Order } = require("../models/Order");
// const { MenuItem } = require("../models/MenuItem");
// const { Subscription } = require("../models/Subscription");
// const router = express.Router();

// // Admin auth middleware
// const verifyAdminToken = async (req, res, next) => {
//    try {
//       const token = req.headers.authorization?.split("Bearer ")[1];
//       if (!token) {
//          return res.status(401).json({ error: "No token provided" });
//       }

//       const decoded = jwt.verify(token, process.env.JWT_SECRET);
//       const admin = await Admin.findById(decoded.id);

//       if (!admin || !admin.isActive) {
//          return res.status(401).json({ error: "Invalid or inactive admin" });
//       }

//       req.admin = admin;
//       next();
//    } catch (error) {
//       return res.status(401).json({ error: "Invalid token" });
//    }
// };

// // POST /api/admin/login - Admin login
// router.post("/login", async (req, res) => {
//    try {
//       const { email, password } = req.body;

//       const admin = await Admin.findOne({ email, isActive: true });
//       if (!admin) {
//          return res.status(401).json({ error: "Invalid credentials" });
//       }

//       const isMatch = await bcrypt.compare(password, admin.password);
//       if (!isMatch) {
//          return res.status(401).json({ error: "Invalid credentials" });
//       }

//       const token = jwt.sign(
//          { id: admin._id, role: admin.role },
//          process.env.JWT_SECRET,
//          { expiresIn: "24h" }
//       );

//       admin.lastLogin = new Date();
//       await admin.save();

//       res.json({
//          success: true,
//          token,
//          admin: {
//             id: admin._id,
//             name: admin.name,
//             email: admin.email,
//             role: admin.role,
//             permissions: admin.permissions,
//          },
//       });
//    } catch (error) {
//       res.status(500).json({ error: error.message });
//    }
// });

// // GET /api/admin/dashboard - Dashboard stats
// router.get("/dashboard", verifyAdminToken, async (req, res) => {
//    try {
//       const today = new Date();
//       const yesterday = new Date(today - 24 * 60 * 60 * 1000);
//       const lastWeek = new Date(today - 7 * 24 * 60 * 60 * 1000);
//       const lastMonth = new Date(today - 30 * 24 * 60 * 60 * 1000);

//       const [
//          totalUsers,
//          totalOrders,
//          totalRevenue,
//          todayOrders,
//          activeSubscriptions,
//          pendingOrders,
//          topMenuItems,
//          recentOrders,
//          userGrowth,
//          orderGrowth,
//       ] = await Promise.all([
//          User.countDocuments({ isActive: true }),
//          Order.countDocuments(),
//          Order.aggregate([
//             { $group: { _id: null, total: { $sum: "$finalAmount" } } },
//          ]),
//          Order.countDocuments({
//             createdAt: { $gte: yesterday },
//          }),
//          Subscription.countDocuments({ status: "active" }),
//          Order.countDocuments({
//             orderStatus: { $in: ["placed", "confirmed", "preparing"] },
//          }),
//          MenuItem.find().sort({ orderCount: -1 }).limit(5),
//          Order.find()
//             .populate("userId", "firstName lastName phoneNumber")
//             .populate("items.menuItem", "name")
//             .sort({ createdAt: -1 })
//             .limit(10),
//          User.countDocuments({
//             createdAt: { $gte: lastWeek },
//          }),
//          Order.countDocuments({
//             createdAt: { $gte: lastWeek },
//          }),
//       ]);

//       res.json({
//          totalUsers,
//          totalOrders,
//          totalRevenue: totalRevenue[0]?.total || 0,
//          todayOrders,
//          activeSubscriptions,
//          pendingOrders,
//          topMenuItems,
//          recentOrders,
//          userGrowth,
//          orderGrowth,
//       });
//    } catch (error) {
//       res.status(500).json({ error: error.message });
//    }
// });
