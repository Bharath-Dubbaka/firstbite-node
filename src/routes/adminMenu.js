// While you have a menu.js for customers, it's good practice to create a separate file for admin actions on the menu.
// /src/routes/adminMenu.js
const express = require("express");
const { CafeMenu } = require("../models/CafeMenu");
const { verifyAdminToken } = require("./admin"); // Assuming you export this from admin.js
const router = express.Router();

// PROTECT ALL ROUTES IN THIS FILE
router.use(verifyAdminToken);

// GET /api/admin/menu - Get all menu items for the admin view
router.get("/", async (req, res) => {
   try {
      const items = await CafeMenu.find().sort({ createdAt: -1 });
      res.json({ length: items.length, data: items });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// POST /api/admin/menu - Add a new menu item
router.post("/", async (req, res) => {
   try {
      const newItem = new CafeMenu(req.body);
      await newItem.save();
      res.status(201).json({ success: true, data: newItem });
   } catch (error) {
      res.status(400).json({ success: false, error: error.message });
   }
});

// PUT /api/admin/menu/:id - Update a menu item's details
router.put("/:id", async (req, res) => {
   try {
      const updatedItem = await CafeMenu.findByIdAndUpdate(
         req.params.id,
         req.body,
         { new: true },
      );

      // check if updatedItem is null --- which means item id does not exist
      if (!updatedItem) {
         return res.status(404).json({
            success: false,
            error: "Menu item not found",
         });
      }

      res.json({ success: true, data: updatedItem });
   } catch (error) {
      res.status(400).json({ success: false, error: error.message });
   }
});

// PATCH /api/admin/menu/:id/availability - Toggle availability (Solves Scenario 1)
router.patch("/:id/availability", async (req, res) => {
   try {
      const { isAvailable } = req.body; // Expecting { "isAvailable": false }
      const item = await CafeMenu.findByIdAndUpdate(
         req.params.id,
         { $set: { isAvailable: isAvailable } },
         { new: true },
      );

      //handle the null case before accessing item.name AND If the id doesn’t exist → you’ll get a 404 Not Found
      if (!item) {
         return res.status(404).json({
            success: false,
            error: "Menu item not found",
         });
      }

      res.json({
         success: true,
         message: `"${item.name}" availability set to ${isAvailable}`,
         data: item,
      });
   } catch (error) {
      res.status(400).json({ success: false, error: error.message });
   }
});

// DELETE /api/admin/menu/:id
router.delete("/:id", async (req, res) => {
   try {
      const item = await CafeMenu.findByIdAndDelete(req.params.id);
      if (!item) {
         return res
            .status(404)
            .json({ success: false, error: "Menu item not found" });
      }
      res.json({
         success: true,
         message: `"${item.name}" deleted successfully`,
      });
   } catch (error) {
      console.log(error.message);
      res.status(500).json({ success: false, error: error.message });
   }
});

module.exports = router;
