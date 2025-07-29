// // models/Admin.js
// const mongoose = require("mongoose");
// const validator = require("validator");

// const adminSchema = new mongoose.Schema(
//    {
//       name: {
//          type: String,
//          required: true,
//       },
//       email: {
//          type: String,
//          required: true,
//          unique: true,
//          lowercase: true,
//          validate: {
//             validator: validator.isEmail,
//             message: "Please enter a valid email",
//          },
//       },
//       password: {
//          type: String,
//          required: true,
//          minLength: 8,
//       },
//       role: {
//          type: String,
//          enum: ["super-admin", "admin", "kitchen-staff", "delivery-manager"],
//          default: "admin",
//       },
//       permissions: [
//          {
//             type: String,
//             enum: [
//                "users",
//                "orders",
//                "menu",
//                "subscriptions",
//                "delivery",
//                "analytics",
//                "settings",
//             ],
//          },
//       ],
//       isActive: {
//          type: Boolean,
//          default: true,
//       },
//       lastLogin: Date,
//    },
//    {
//       timestamps: true,
//    }
// );

// const Admin = mongoose.model("Admin", adminSchema);
// module.exports = { Admin };
