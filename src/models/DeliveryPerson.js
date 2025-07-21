
// models/DeliveryPerson.js
const mongoose = require("mongoose");
const validator = require("validator");


const deliveryPersonSchema = new mongoose.Schema({
   name: {
      type: String,
      required: true,
   },
   phoneNumber: {
      type: String,
      required: true,
      unique: true,
   },
   email: {
      type: String,
      validate: {
         validator: function(v) {
            return !v || validator.isEmail(v);
         },
         message: 'Please enter a valid email'
      }
   },
   vehicleNumber: {
      type: String,
      required: true,
   },
   licenseNumber: {
      type: String,
      required: true,
   },
   isActive: {
      type: Boolean,
      default: true,
   },
   currentOrders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
   }],
   rating: {
      type: Number,
      min: 1,
      max: 5,
      default: 5,
   },
   totalDeliveries: {
      type: Number,
      default: 0,
   },
   joiningDate: {
      type: Date,
      default: Date.now,
   },
}, {
   timestamps: true,
});

const DeliveryPerson = mongoose.model("DeliveryPerson", deliveryPersonSchema);
module.exports = { DeliveryPerson };