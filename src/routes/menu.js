// // routes/menu.js
// const express = require("express");
// const { CafeMenu } = require("../models/CafeMenu");
// const router = express.Router();

// // GET /api/menu - Get all menu items
// router.get("/", async (req, res) => {
//    try {
//       const { category, section, isAvailable } = req.query;

//       const filter = {};
//       if (category) filter.category = category;
//       if (section) filter.section = section;
//       if (isAvailable !== undefined)
//          filter.isAvailable = isAvailable === "true";

//       const CafeMenus = await CafeMenu.find(filter).sort({ orderCount: -1 });
//       res.json(CafeMenus);
//    } catch (error) {
//       res.status(500).json({ error: error.message });
//    }
// });

// // GET /api/menu/:id - Get single menu item
// router.get("/:id", async (req, res) => {
//    try {
//       const CafeMenu = await CafeMenu.findById(req.params.id);
//       if (!CafeMenu) {
//          return res.status(404).json({ error: "Menu item not found" });
//       }
//       res.json(CafeMenu);
//    } catch (error) {
//       res.status(500).json({ error: error.message });
//    }
// });

// // GET /api/menu/category/:category - Get items by category
// router.get("/category/:category", async (req, res) => {
//    try {
//       const CafeMenus = await CafeMenu.find({
//          category: req.params.category,
//          isAvailable: true,
//       }).sort({ orderCount: -1 });
//       res.json(CafeMenus);
//    } catch (error) {
//       res.status(500).json({ error: error.message });
//    }
// });

// module.exports = router;
