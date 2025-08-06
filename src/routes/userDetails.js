// routes/userDetails.js - FIXED VERSION
const express = require("express");
const userDetailsRouter = express.Router();
const { User } = require("../models/User");
const verifyFirebaseToken = require("../middlewares/auth");

// ========== GET USER DETAILS ==========
userDetailsRouter.get(
   "/api/user-details",
   verifyFirebaseToken,
   async (req, res) => {
      try {
         console.log("Fetching user details for:", req.user.uid);

         const userDetails = await User.findOne({ uid: req.user.uid });

         if (!userDetails) {
            console.log("No user details found, returning empty structure");
            return res.json({
               success: true,
               data: null,
               authData: {
                  uid: req.user.uid,
                  email: req.user.email,
               },
               message: "No user details found",
            });
         }

         console.log("User details fetched successfully");
         res.json({
            success: true,
            data: userDetails,
            message: "User details fetched successfully",
         });
      } catch (error) {
         console.error("Error fetching user details:", error);
         res.status(500).json({
            success: false,
            message: "Failed to fetch user details",
            error: error.message,
         });
      }
   }
);

// ========== CREATE/UPDATE USER DETAILS ==========
userDetailsRouter.post(
   "/api/post/user-details",
   verifyFirebaseToken,
   async (req, res) => {
      try {
         console.log("Saving user details for:", req.user.uid);
         console.log("Request body keys:", Object.keys(req.body));

         // ✅ FIX: Clean data and remove null/empty values
         // ✅ Define allowed fields only (whitelist)
         const allowedFields = [
            "firstName",
            "lastName",
            "phoneNumber",
            "picture",
            "profilePicture",
            "addresses",
            "preferences",
            "name",
         ];

         // ✅ Filter only allowed fields from body
         const cleanData = {};
         for (const key of allowedFields) {
            if (
               req.body.hasOwnProperty(key) &&
               req.body[key] !== undefined &&
               req.body[key] !== null &&
               req.body[key] !== ""
            ) {
               cleanData[key] = req.body[key];
            }
         }

         // ✅ Add Firebase-provided info
         const updateData = {
            ...cleanData,
            uid: req.user.uid,
            email: req.user.email,
            lastLogin: new Date(),
         };

         console.log("Sanitized update keys:", Object.keys(updateData));

         // ✅ FIX: First try to find existing user
         let userDetails = await User.findOne({ uid: req.user.uid });

         if (userDetails) {
            // Update existing user
            Object.assign(userDetails, updateData);
            userDetails = await userDetails.save();
            console.log("User details updated successfully");
         } else {
            // Create new user - but first check if email exists
            const existingEmailUser = await User.findOne({
               email: req.user.email,
            });
            if (existingEmailUser) {
               return res.status(409).json({
                  success: false,
                  message: "Email already exists with different UID",
                  error: "Duplicate entry",
               });
            }

            userDetails = new User(updateData);
            userDetails = await userDetails.save();
            console.log("User details created successfully");
         }

         res.json({
            success: true,
            data: userDetails,
            message: userDetails.isNew
               ? "User created successfully"
               : "User updated successfully",
         });
      } catch (error) {
         console.error("Error saving user details:", error);

         // Handle duplicate key errors
         if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            const value = error.keyValue[field];

            console.log(
               `Duplicate key error on field: ${field} with value: ${value}`
            );

            return res.status(409).json({
               success: false,
               message: `${field} already exists`,
               error: "Duplicate entry",
               field: field,
               value: value,
            });
         }

         // Handle validation errors
         if (error.name === "ValidationError") {
            const validationErrors = Object.keys(error.errors).map((key) => ({
               field: key,
               message: error.errors[key].message,
               value: error.errors[key].value,
            }));

            return res.status(400).json({
               success: false,
               message: "Validation failed",
               errors: validationErrors,
            });
         }

         res.status(500).json({
            success: false,
            message: "Failed to save user details",
            error: error.message,
         });
      }
   }
);

// ========== DELETE USER DETAILS ==========
userDetailsRouter.delete(
   "/api/delete/user-details",
   verifyFirebaseToken,
   async (req, res) => {
      try {
         console.log("Deleting user details for:", req.user.uid);

         const result = await User.findOneAndDelete({ uid: req.user.uid });

         if (!result) {
            return res.status(404).json({
               success: false,
               message: "User details not found",
            });
         }

         console.log("User details deleted successfully");
         res.json({
            success: true,
            message: "User details deleted successfully",
         });
      } catch (error) {
         console.error("Error deleting user details:", error);
         res.status(500).json({
            success: false,
            message: "Failed to delete user details",
            error: error.message,
         });
      }
   }
);

module.exports = { userDetailsRouter };
