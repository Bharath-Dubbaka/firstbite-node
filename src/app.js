const express = require("express");
const { connectDB } = require("./config/database");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { User } = require("./models/User");
const mongoose = require("mongoose");

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(
   cors({
      origin: "http://localhost:3000",
      credentials: true,
   })
);

// Simple test route first
// app.get("/", (req, res) => {
//    res.json({ message: "Server is working!" });
// });

app.get("/test", (req, res) => {
   try {
      console.log("GET /test called");
      res.json({ message: "success" });
   } catch (error) {
      console.error("Error:", error);
      res.status(500).json({ error: error.message });
   }
});

// Comment out any other routes temporarily
// If you have auth routes or other routes, comment them out like this:
// app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
   res.json({ message: "Server is working without MongoDB!" });
});

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

//db check
app.get("/db-info", async (req, res) => {
   try {
      const dbName = mongoose.connection.db.databaseName;
      const collections = await mongoose.connection.db
         .listCollections()
         .toArray();
      const userCount = await User.countDocuments();

      res.json({
         message: "Database information",
         databaseName: dbName,
         collections: collections.map((c) => c.name),
         userCount: userCount,
         connectionString:
            "mongodb+srv://...resumeonflycluster.bdlzhop.mongodb.net/" + dbName,
      });
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

// Create test user (POST)
app.post("/test-user", async (req, res) => {
   try {
      console.log("Creating test user...", req.body);

      // user data
      const testUser = new User(req.body);

      const savedUser = await testUser.save();
      console.log("User created successfully:", savedUser._id);

      res.json({
         message: "Test user created successfully!",
         userId: savedUser._id,
         userData: savedUser,
      });
   } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({
         error: "Failed to create user",
         message: error.message,
         details: error.errors || "No additional details",
      });
   }
});

// Get all users
app.get("/users", async (req, res) => {
   try {
      const users = await User.find({});

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

// Start server without MongoDB first

const PORT = 9999;

app.listen(PORT, () => {
   console.log(`🚀 Server running on http://localhost:${PORT}`);
   console.log(`📍 Test: http://localhost:${PORT}/test`);
});

connectDB()
   .then(() => {
      console.log("✅ MongoDB connected");
      app.listen(PORT, () => {
         console.log(`🚀 Server running on http://localhost:${PORT}`);
      });
   })
   .catch((err) => {
      console.error("❌ MongoDB connection failed:", err);
   });
