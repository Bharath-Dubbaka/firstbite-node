// // routes/subscriptions.js
// const express = require("express");
// const { Subscription } = require("../models/Subscription");
// const { User } = require("../models/User");
// const { verifyFirebaseToken } = require("./auth");
// const router = express.Router();

// // POST /api/subscriptions - Create new subscription
// router.post("/", verifyFirebaseToken, async (req, res) => {
//    try {
//       const user = await User.findOne({ firebaseUID: req.user.uid });
//       if (!user) {
//          return res.status(404).json({ error: "User not found" });
//       }

//       const subscription = new Subscription({
//          ...req.body,
//          userId: user._id,
//       });

//       await subscription.save();
//       res.status(201).json(subscription);
//    } catch (error) {
//       res.status(500).json({ error: error.message });
//    }
// });

// // GET /api/subscriptions - Get user's subscriptions
// router.get("/", verifyFirebaseToken, async (req, res) => {
//    try {
//       const user = await User.findOne({ firebaseUID: req.user.uid });
//       const subscriptions = await Subscription.find({ userId: user._id }).sort({
//          createdAt: -1,
//       });

//       res.json(subscriptions);
//    } catch (error) {
//       res.status(500).json({ error: error.message });
//    }
// });

// // PUT /api/subscriptions/:id/pause - Pause subscription
// router.put("/:id/pause", verifyFirebaseToken, async (req, res) => {
//    try {
//       const user = await User.findOne({ firebaseUID: req.user.uid });
//       const subscription = await Subscription.findOneAndUpdate(
//          { _id: req.params.id, userId: user._id },
//          { status: "paused" },
//          { new: true }
//       );

//       if (!subscription) {
//          return res.status(404).json({ error: "Subscription not found" });
//       }

//       res.json(subscription);
//    } catch (error) {
//       res.status(500).json({ error: error.message });
//    }
// });

// // PUT /api/subscriptions/:id/resume - Resume subscription
// router.put("/:id/resume", verifyFirebaseToken, async (req, res) => {
//    try {
//       const user = await User.findOne({ firebaseUID: req.user.uid });
//       const subscription = await Subscription.findOneAndUpdate(
//          { _id: req.params.id, userId: user._id },
//          { status: "active" },
//          { new: true }
//       );

//       if (!subscription) {
//          return res.status(404).json({ error: "Subscription not found" });
//       }

//       res.json(subscription);
//    } catch (error) {
//       res.status(500).json({ error: error.message });
//    }
// });

// module.exports = router;
