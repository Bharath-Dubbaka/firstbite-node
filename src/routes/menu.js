// // routes/menu.js
// const express = require("express");
// const { MenuItem } = require("../models/MenuItem");
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

//       const menuItems = await MenuItem.find(filter).sort({ orderCount: -1 });
//       res.json(menuItems);
//    } catch (error) {
//       res.status(500).json({ error: error.message });
//    }
// });

// // GET /api/menu/:id - Get single menu item
// router.get("/:id", async (req, res) => {
//    try {
//       const menuItem = await MenuItem.findById(req.params.id);
//       if (!menuItem) {
//          return res.status(404).json({ error: "Menu item not found" });
//       }
//       res.json(menuItem);
//    } catch (error) {
//       res.status(500).json({ error: error.message });
//    }
// });

// // GET /api/menu/category/:category - Get items by category
// router.get("/category/:category", async (req, res) => {
//    try {
//       const menuItems = await MenuItem.find({
//          category: req.params.category,
//          isAvailable: true,
//       }).sort({ orderCount: -1 });
//       res.json(menuItems);
//    } catch (error) {
//       res.status(500).json({ error: error.message });
//    }
// });

// module.exports = router;
