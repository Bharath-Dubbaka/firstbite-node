// routes/payments.js
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const { Order } = require("../models/Order");
const { User } = require("../models/User");
const { verifyFirebaseToken } = require("./auth");
const router = express.Router();

const razorpay = new Razorpay({
   key_id: process.env.RAZORPAY_KEY_ID,
   key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// POST /api/payments/create-order - Create Razorpay order
router.post("/create-order", verifyFirebaseToken, async (req, res) => {
   try {
      const { amount, currency = "INR", orderId } = req.body;

      const options = {
         amount: amount * 100, // amount in paise
         currency,
         receipt: orderId,
      };

      const order = await razorpay.orders.create(options);
      res.json(order);
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

// POST /api/payments/verify - Verify payment
router.post("/verify", verifyFirebaseToken, async (req, res) => {
   try {
      const {
         razorpay_order_id,
         razorpay_payment_id,
         razorpay_signature,
         orderId,
      } = req.body;

      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
         .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
         .update(body.toString())
         .digest("hex");

      if (expectedSignature === razorpay_signature) {
         // Payment verified successfully
         await Order.findByIdAndUpdate(orderId, {
            paymentStatus: "completed",
            razorpayOrderId: razorpay_order_id,
            razorpayPaymentId: razorpay_payment_id,
            orderStatus: "confirmed",
            $push: {
               statusHistory: {
                  status: "confirmed",
                  timestamp: new Date(),
                  note: "Payment completed and order confirmed",
               },
            },
         });

         res.json({ success: true, message: "Payment verified successfully" });
      } else {
         res.status(400).json({ error: "Payment verification failed" });
      }
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

module.exports = router;

// GET /api/auth/profile - Get user profile
router.get("/profile", verifyFirebaseToken, async (req, res) => {
   try {
      const user = await User.findOne({ firebaseUID: req.user.uid });
      if (!user) {
         return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

// PUT /api/auth/profile - Update user profile
router.put("/profile", verifyFirebaseToken, async (req, res) => {
   try {
      const user = await User.findOneAndUpdate(
         { firebaseUID: req.user.uid },
         req.body,
         { new: true }
      );
      res.json(user);
   } catch (error) {
      res.status(500).json({ error: error.message });
   }
});

module.exports = { router, verifyFirebaseToken };
