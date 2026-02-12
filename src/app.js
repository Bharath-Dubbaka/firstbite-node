const express = require("express");
const { connectDB } = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { User } = require("./models/User");
const { CafeMenu } = require("./models/CafeMenu");
const { Order } = require("./models/Order");
const mongoose = require("mongoose");
const verifyFirebaseToken = require("./middlewares/auth");
const adminRoutes = require("./routes/admin");
const adminMenuRoutes = require("./routes/adminMenu");
const adminInhouseOrdersRoutes = require("./routes/adminInhouseOrders");
const adminOrderRoutes = require("./routes/adminOrders");
const publicMenuRoutes = require("./routes/publicMenu"); // Adjust path if needed
const ordersRoutes = require("./routes/order");
const app = express();
// Import routes
const authRoutes = require("./routes/auth");
const { userDetailsRouter } = require("./routes/userDetails");

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
   cors({
      origin: [
         "http://localhost:3000",
         "http://localhost:5173",
         "https://16-171-150-110.nip.io",
      ], // Add your frontend URLs
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
   }),
);

// Routes
app.use("/api/admin", adminRoutes); //admin verify , login, dashboard
app.use("/", userDetailsRouter);
app.use("/api/admin/menu", adminMenuRoutes); //for admin to handle items data
app.use("/api/admin/orders", adminOrderRoutes); //for admin to get order data
app.use("/api/admin/inhouse", adminInhouseOrdersRoutes); //for admin to handle inhouse orders

app.use("/api/menu", publicMenuRoutes); // public menu for users
app.use("/api/orders", ordersRoutes);

app.get("/", verifyFirebaseToken, (req, res) => {
   try {
      res.json({
         message: "Protected route accessed",
         user: { uid: req.user.uid, email: req.user.email },
      });
   } catch (error) {
      console.log(error, "error");
   }
});

// Health check
app.get("/health", (req, res) => {
   res.json({
      message: "🍕 FirstByte API Server",
      version: "1.0.0",
      status: "running",
      timestamp: new Date().toISOString(),
   });
});

// Test route (no DB)
app.get("/test", (req, res) => {
   try {
      console.log("GET /test called");
      res.json({
         message: "success",
         timestamp: new Date().toISOString(),
      });
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: error.message });
   }
});

// Test MongoDB connection
app.get("/test-db", async (req, res) => {
   try {
      const userCount = await User.countDocuments();
      res.json({
         message: "MongoDB connection working!",
         userCount: userCount,
         status: "connected",
      });
   } catch (error) {
      console.error("MongoDB test failed:", error);
      res.status(500).json({
         error: "MongoDB connection failed",
         message: error.message,
      });
   }
});

// Create test user (POST) - Keep for testing ||| outdated
// app.post("/test-user", async (req, res) => {
//    try {
//       console.log("Creating test user...");

//       const testUser = new User({
//          firstName: "Test",
//          lastName: "User",
//          phoneNumber: `999999${Date.now().toString().slice(-4)}`, // Unique phone
//          emailID: "test@example.com",
//          uid: `test-${Date.now()}`,
//          addresses: [
//             {
//                type: "home",
//                addressLine1: "123 Test Street",
//                city: "Test City",
//                state: "Test State",
//                pincode: "123456",
//                isDefault: true,
//             },
//          ],
//       });

//       const savedUser = await testUser.save();
//       console.log("User created successfully:", savedUser._id);

//       res.json({
//          message: "Test user created successfully!",
//          userId: savedUser._id,
//          userData: {
//             firstName: savedUser.firstName,
//             phoneNumber: savedUser.phoneNumber,
//             emailID: savedUser.emailID,
//          },
//       });
//    } catch (error) {
//       console.error("Error creating user:", error);
//       res.status(500).json({
//          error: "Failed to create user",
//          message: error.message,
//       });
//    }
// });

// Get all users
app.get("/users", async (req, res) => {
   try {
      const users = await User.find({}).sort({ createdAt: -1 });

      res.json({
         message: "Users retrieved successfully",
         count: users.length,
         users: users,
      });
   } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({
         error: "Failed to fetch users",
         message: error.message,
      });
   }
});

// Delete test users (cleanup)
app.delete("/test-users", async (req, res) => {
   try {
      const result = await User.deleteMany({
         uid: { $regex: /^test-/ },
      });

      res.json({
         message: "Test users deleted",
         deletedCount: result.deletedCount,
      });
   } catch (error) {
      console.error("Error deleting users:", error);
      res.status(500).json({
         error: "Failed to delete users",
         message: error.message,
      });
   }
});

// 404 handler
app.use("404", (req, res) => {
   console.log("404 - Route not found:", req.method, req.originalUrl);
   res.status(404).json({
      success: false,
      error: "ROUTE_NOT_FOUND",
      message: `Route ${req.method} ${req.originalUrl} not found`,
   });
});

// Global error handling middleware
app.use((error, req, res, next) => {
   console.error("Global error handler:", error);
   res.status(500).json({
      success: false,
      error: "SERVER_ERROR",
      message: "Something went wrong!",
   });
});

const PORT = process.env.PORT || 9999;

// Connect to MongoDB and start server
connectDB()
   .then(() => {
      console.log("✅ MongoDB connected successfully");
      app.listen(PORT, () => {
         console.log(
            `\n🚀 FirstByte Server is running on http://localhost:${PORT}`,
         );
         console.log(`\n📱 Auth Endpoints:`);
         console.log(`   • POST http://localhost:${PORT}/auth/verify-otp`);
         console.log(`   • GET  http://localhost:${PORT}/auth/me`);
         console.log(`   • POST http://localhost:${PORT}/auth/update-profile`);
         console.log(`   • POST http://localhost:${PORT}/auth/logout`);
         console.log(`\n🧪 Test Endpoints:`);
         console.log(`   • GET  http://localhost:${PORT}/test-db`);
         console.log(`   • GET  http://localhost:${PORT}/users`);
      });
   })
   .catch((err) => {
      console.error("❌ MongoDB connection failed:", err.message);
      process.exit(1);
   });
