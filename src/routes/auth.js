// // // routes/auth.js or your login endpoint
// const express = require("express");
// const admin = require("../config/firebase-admin");
// const { User } = require("../models/User");
// const { verifyFirebaseToken } = require("../middlewares/auth");
// const router = express.Router();

// // POST /auth/verify-otp - Main login endpoint
// router.post("/verify-otp", async (req, res) => {
//    try {
//       console.log("🔐 OTP Verification started");

//       // Get the ID token from Authorization header
//       const authHeader = req.headers.authorization;

//       if (!authHeader || !authHeader.startsWith("Bearer ")) {
//          console.log("❌ No authorization header");
//          return res.status(401).json({
//             success: false,
//             error: "NO_TOKEN",
//             message: "Authorization token required",
//          });
//       }

//       const idToken = authHeader.split("Bearer ")[1];
//       console.log("📱 ID Token received");

//       // Verify the Firebase ID token
//       const decodedToken = await admin.auth().verifyIdToken(idToken);
//       console.log("✅ Token verified for UID:", decodedToken.uid);
//       console.log("📞 Phone number:", decodedToken.phone_number);

//       // Extract user data from request body (optional)
//       const { firstName, lastName, email } = req.body;

//       // Normalize phone number (remove +91 if present)
//       let phoneNumber = decodedToken.phone_number;
//       if (phoneNumber && phoneNumber.startsWith("+91")) {
//          phoneNumber = phoneNumber.substring(3);
//       }

//       if (!phoneNumber) {
//          return res.status(400).json({
//             success: false,
//             error: "INVALID_PHONE",
//             message: "Phone number not found in token",
//          });
//       }

//       // Check if user already exists
//       let user = await User.findOne({ uid: decodedToken.uid });

//       if (!user) {
//          // Create new user
//          console.log("👤 Creating new user");

//          user = new User({
//             uid: decodedToken.uid,
//             phoneNumber: phoneNumber,
//             firstName: firstName || "",
//             lastName: lastName || "",
//             emailID: email || decodedToken.email || "",
//             isVerified: true,
//             lastLogin: new Date(),
//             registrationSource: "mobile_otp",
//          });

//          await user.save();
//          console.log("✅ New user created:", user._id);
//       } else {
//          // Update existing user's last login
//          console.log("👤 Existing user found");
//          user.lastLogin = new Date();

//          // Update profile if provided
//          if (firstName) user.firstName = firstName;
//          if (lastName) user.lastName = lastName;
//          if (email) user.emailID = email;

//          await user.save();
//          console.log("✅ User login updated");
//       }

//       // Return success response
//       const responseData = {
//          success: true,
//          message:
//             user.createdAt.getTime() === user.updatedAt.getTime()
//                ? "Registration successful"
//                : "Login successful",
//          user: {
//             id: user._id,
//             uid: user.uid,
//             phoneNumber: user.phoneNumber,
//             firstName: user.firstName,
//             lastName: user.lastName,
//             emailID: user.emailID,
//             profilePicture: user.profilePicture,
//             isVerified: user.isVerified,
//             lastLogin: user.lastLogin,
//             isNewUser: user.createdAt.getTime() === user.updatedAt.getTime(),
//          },
//       };

//       console.log("🎉 Login successful for user:", user._id);
//       res.json(responseData);
//    } catch (error) {
//       console.error("❌ Login error:", error);

//       // Handle specific Firebase errors
//       if (error.code === "auth/id-token-expired") {
//          return res.status(401).json({
//             success: false,
//             error: "TOKEN_EXPIRED",
//             message: "Session expired. Please login again",
//          });
//       }

//       if (error.code === "auth/id-token-revoked") {
//          return res.status(401).json({
//             success: false,
//             error: "TOKEN_REVOKED",
//             message: "Session invalid. Please login again",
//          });
//       }

//       if (error.code === "auth/invalid-id-token") {
//          return res.status(401).json({
//             success: false,
//             error: "INVALID_TOKEN",
//             message: "Invalid authentication token",
//          });
//       }

//       // Validation errors
//       if (error.name === "ValidationError") {
//          return res.status(400).json({
//             success: false,
//             error: "VALIDATION_ERROR",
//             message: error.message,
//          });
//       }

//       // Generic server error
//       return res.status(500).json({
//          success: false,
//          error: "SERVER_ERROR",
//          message: "Authentication failed. Please try again",
//       });
//    }
// });

// // GET /auth/me - Get current user profile (protected route)
// router.get("/me", verifyFirebaseToken, async (req, res) => {
//    try {
//       const user = req.dbUser;

//       res.json({
//          success: true,
//          user: {
//             id: user._id,
//             uid: user.uid,
//             phoneNumber: user.phoneNumber,
//             firstName: user.firstName,
//             lastName: user.lastName,
//             emailID: user.emailID,
//             profilePicture: user.profilePicture,
//             addresses: user.addresses,
//             preferences: user.preferences,
//             loyaltyPoints: user.loyaltyPoints,
//             totalOrders: user.totalOrders,
//             isVerified: user.isVerified,
//             lastLogin: user.lastLogin,
//          },
//       });
//    } catch (error) {
//       console.error("Error fetching user profile:", error);
//       res.status(500).json({
//          success: false,
//          error: "SERVER_ERROR",
//          message: "Failed to fetch user profile",
//       });
//    }
// });

// // POST /auth/logout - Logout (optional - mainly for cleanup)
// router.post("/logout", verifyFirebaseToken, async (req, res) => {
//    try {
//       // In Firebase, logout is mainly handled on frontend
//       // This endpoint is for any server-side cleanup if needed

//       res.json({
//          success: true,
//          message: "Logged out successfully",
//       });
//    } catch (error) {
//       console.error("Logout error:", error);
//       res.status(500).json({
//          success: false,
//          error: "SERVER_ERROR",
//          message: "Logout failed",
//       });
//    }
// });

// // router.post("/login", async (req, res) => {
// //    try {
// //       console.log("Login endpoint called");
// //       console.log("Headers:", req.headers);

// //       // Get the ID token from Authorization header
// //       const authHeader = req.headers.authorization;

// //       if (!authHeader || !authHeader.startsWith("Bearer ")) {
// //          console.log("No authorization header or invalid format");
// //          return res.status(401).json({
// //             success: false,
// //             error: "No token provided or invalid format",
// //          });
// //       }

// //       const idToken = authHeader.split("Bearer ")[1];
// //       console.log("ID Token received:", idToken ? "Present" : "Missing");

// //       // Verify the ID token
// //       const decodedToken = await admin.auth().verifyIdToken(idToken);
// //       console.log("Token verified for UID:", decodedToken.uid);
// //       console.log("Token phone number:", decodedToken.phone_number);

// //       const { firstName, lastName, phoneNumber, email } = req.body;
// //       console.log("Request body:", req.body);

// //       // Try to find existing user
// //       let user = await User.findOne({ uid: decodedToken.uid });
// //       console.log("Existing user found:", user ? "Yes" : "No");

// //       // If user doesnt exist, create new user
// //       if (!user) {
// //          console.log("Creating new user...");

// //          user = new User({
// //             uid: decodedToken.uid,
// //             phoneNumber: decodedToken.phone_number || phoneNumber,
// //             firstName: firstName || "",
// //             lastName: lastName || "",
// //             email: email || decodedToken.email || "",
// //             isVerified: true, // Phone is verified through Firebase
// //             createdAt: new Date(),
// //             lastLogin: new Date(),
// //          });

// //          await user.save();
// //          console.log("New user created:", user._id);
// //       } else {
// //          // Update last login
// //          user.lastLogin = new Date();
// //          await user.save();
// //          console.log("Existing user login updated");
// //       }

// //       // Return success response
// //       const responseData = {
// //          success: true,
// //          user: {
// //             id: user._id,
// //             uid: user.uid,
// //             phoneNumber: user.phoneNumber,
// //             firstName: user.firstName,
// //             lastName: user.lastName,
// //             email: user.email,
// //             isVerified: user.isVerified,
// //             lastLogin: user.lastLogin,
// //          },
// //          message: "Login successful",
// //       };

// //       console.log("Login successful for user:", user._id);
// //       res.json(responseData);
// //    } catch (error) {
// //       console.error("Login error:", error);
// //       console.error("Error details:", {
// //          code: error.code,
// //          message: error.message,
// //          stack: error.stack,
// //       });

// //       // Handle specific Firebase errors
// //       if (error.code === "auth/id-token-expired") {
// //          return res.status(401).json({
// //             success: false,
// //             error: "Token expired",
// //             message: "Please login again",
// //          });
// //       }

// //       if (error.code === "auth/id-token-revoked") {
// //          return res.status(401).json({
// //             success: false,
// //             error: "Token revoked",
// //             message: "Please login again",
// //          });
// //       }

// //       if (error.code === "auth/invalid-id-token") {
// //          return res.status(401).json({
// //             success: false,
// //             error: "Invalid token",
// //             message: "Authentication failed",
// //          });
// //       }

// //       // Database or other errors
// //       return res.status(500).json({
// //          success: false,
// //          error: "Internal server error",
// //          message: "Something went wrong during authentication",
// //       });
// //    }
// // });

// module.exports = router;
