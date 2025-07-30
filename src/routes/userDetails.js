const express = require("express");
const userDetailsRouter = express.Router();
// src/routes/userDetails.js
const { User } = require("../models/User");
const verifyFirebaseToken = require("../middlewares/auth");

//WE NEED TO CREATE DEFAULT USER DETAILS ASA USER SIGN UP FOR FIRST TIME , IF USER_DETAILS EXISTS ALREADY THEN DON'T
//ON UI SIde of things we only have one btn for signup and signin .. if user details exists we redirect to dashboard for generating new version .. if no user details already in db then create new default quota and default user details and then redirect to userFormPage to fill out more info before dashboard and generating new versions

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
            // Return empty structure if no details found
            return res.json({
               success: true,
               authData: {
                  uid: req.user.uid,
                  og_email: req.user.email,
               },
               message: "No user details found, empty structure returned",
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

         // Prepare update data, ensuring UID matches authenticated user
         const updateData = {
            ...req.body,
            firebaseUID: req.user.uid, // Always use authenticated user's UID
            og_email: req.user.email, // from Auth immutable
         };

         // Remove any undefined or null values at the top level
         Object.keys(updateData).forEach((key) => {
            if (updateData[key] === undefined) {
               delete updateData[key];
            }
         });

         console.log("Updating with data keys:", Object.keys(updateData));

         const userDetails = await User.findOneAndUpdate(
            { firebaseUID: req.user.uid },
            updateData,
            {
               new: true,
               upsert: true, // Create if doesn't exist
               runValidators: true,
            }
         );

         console.log("User details saved successfully");

         res.json({
            success: true,
            data: userDetails,
            message: "User details saved successfully",
         });
      } catch (error) {
         console.error("Error saving user details:", error);

         // Handle validation errors specifically
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

         // Handle duplicate key errors
         if (error.code === 11000) {
            return res.status(409).json({
               success: false,
               message: "User details already exist",
               error: "Duplicate entry",
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

// ========== DELETE USER DETAILS ========== WE CAN USE IT IN HEADER DROPDOWN so user can delete his data for privacy anytime
userDetailsRouter.delete(
   "/api/delete/user-details",
   verifyFirebaseToken,
   async (req, res) => {
      try {
         console.log("Deleting user details for:", req.user.uid);

         const result = await User.findOneAndDelete({
            uid: req.user.uid,
         });

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
