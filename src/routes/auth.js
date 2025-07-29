// // routes/auth.js or your login endpoint
// const express = require("express");
// const admin = require("../config/firebase-admin");
// const { User } = require("../models/User");
// const router = express.Router();

// router.post("/login", async (req, res) => {
//    try {
//       console.log("Login endpoint called");
//       console.log("Headers:", req.headers);

//       // Get the ID token from Authorization header
//       const authHeader = req.headers.authorization;

//       if (!authHeader || !authHeader.startsWith("Bearer ")) {
//          console.log("No authorization header or invalid format");
//          return res.status(401).json({
//             success: false,
//             error: "No token provided or invalid format",
//          });
//       }

//       const idToken = authHeader.split("Bearer ")[1];
//       console.log("ID Token received:", idToken ? "Present" : "Missing");

//       // Verify the ID token
//       const decodedToken = await admin.auth().verifyIdToken(idToken);
//       console.log("Token verified for UID:", decodedToken.uid);
//       console.log("Token phone number:", decodedToken.phone_number);

//       const { firstName, lastName, phoneNumber, email } = req.body;
//       console.log("Request body:", req.body);

//       // Try to find existing user
//       let user = await User.findOne({ firebaseUID: decodedToken.uid });
//       console.log("Existing user found:", user ? "Yes" : "No");

//       // If user doesn't exist, create new user
//       if (!user) {
//          console.log("Creating new user...");

//          user = new User({
//             firebaseUID: decodedToken.uid,
//             phoneNumber: decodedToken.phone_number || phoneNumber,
//             firstName: firstName || "",
//             lastName: lastName || "",
//             email: email || decodedToken.email || "",
//             isVerified: true, // Phone is verified through Firebase
//             createdAt: new Date(),
//             lastLogin: new Date(),
//          });

//          await user.save();
//          console.log("New user created:", user._id);
//       } else {
//          // Update last login
//          user.lastLogin = new Date();
//          await user.save();
//          console.log("Existing user login updated");
//       }

//       // Return success response
//       const responseData = {
//          success: true,
//          user: {
//             id: user._id,
//             firebaseUID: user.firebaseUID,
//             phoneNumber: user.phoneNumber,
//             firstName: user.firstName,
//             lastName: user.lastName,
//             email: user.email,
//             isVerified: user.isVerified,
//             lastLogin: user.lastLogin,
//          },
//          message: "Login successful",
//       };

//       console.log("Login successful for user:", user._id);
//       res.json(responseData);
//    } catch (error) {
//       console.error("Login error:", error);
//       console.error("Error details:", {
//          code: error.code,
//          message: error.message,
//          stack: error.stack,
//       });

//       // Handle specific Firebase errors
//       if (error.code === "auth/id-token-expired") {
//          return res.status(401).json({
//             success: false,
//             error: "Token expired",
//             message: "Please login again",
//          });
//       }

//       if (error.code === "auth/id-token-revoked") {
//          return res.status(401).json({
//             success: false,
//             error: "Token revoked",
//             message: "Please login again",
//          });
//       }

//       if (error.code === "auth/invalid-id-token") {
//          return res.status(401).json({
//             success: false,
//             error: "Invalid token",
//             message: "Authentication failed",
//          });
//       }

//       // Database or other errors
//       return res.status(500).json({
//          success: false,
//          error: "Internal server error",
//          message: "Something went wrong during authentication",
//       });
//    }
// });

// module.exports = router;
