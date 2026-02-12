// routes/adminInhouseOrders.js - COMPLETE CORRECTED VERSION
const express = require("express");
const { Order } = require("../models/Order");
const { Table } = require("../models/Table");
const { CafeMenu } = require("../models/CafeMenu");
const { verifyAdminToken } = require("./admin");
const router = express.Router();

router.use(verifyAdminToken);

router.use((req, res, next) => {
   console.log(`📍 Inhouse Route Hit: ${req.method} ${req.path}`);
   next();
});

// ========== TABLE MANAGEMENT ==========

router.get("/tables", async (req, res) => {
   try {
      const tables = await Table.find()
         .populate({
            path: "currentOrderId",
            select: "orderNumber items totalAmount createdAt orderStatus",
         })
         .sort({ tableNumber: 1 });

      res.json({
         success: true,
         data: tables,
         summary: {
            total: tables.length,
            available: tables.filter((t) => t.status === "available").length,
            occupied: tables.filter((t) => t.status === "occupied").length,
            reserved: tables.filter((t) => t.status === "reserved").length,
         },
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

router.post("/tables", async (req, res) => {
   try {
      const { tableNumber, capacity, location, notes } = req.body;
      const existingTable = await Table.findOne({ tableNumber });
      if (existingTable) {
         return res.status(400).json({
            success: false,
            error: `Table ${tableNumber} already exists`,
         });
      }

      const table = new Table({ tableNumber, capacity, location, notes });
      await table.save();

      res.status(201).json({
         success: true,
         message: `Table ${tableNumber} created successfully`,
         data: table,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

router.get("/tables/:tableNumber", async (req, res) => {
   try {
      const { tableNumber } = req.params;

      const table = await Table.findOne({ tableNumber }).populate({
         path: "currentOrderId",
         select:
            "orderNumber items totalAmount finalAmount orderStatus createdAt statusHistory",
      });

      if (!table) {
         return res.status(404).json({
            success: false,
            error: `Table ${tableNumber} not found`,
         });
      }

      const orderHistory = await Order.find({
         tableNumber,
         orderSource: "in-house",
         orderStatus: { $in: ["completed", "cancelled"] },
      })
         .sort({ createdAt: -1 })
         .limit(10)
         .populate("items.menuItem", "name price");

      res.json({
         success: true,
         data: {
            tableNumber: table.tableNumber,
            status: table.status,
            currentOrderId: table.currentOrderId || null,
            orderHistory,
         },
      });
   } catch (error) {
      console.error("Table history fetch error:", error);
      res.status(500).json({ success: false, error: error.message });
   }
});

// Debug middleware
router.use((req, res, next) => {
   console.log(`\n📍 INHOUSE ROUTE: ${req.method} ${req.path}`);
   console.log(`   Full URL: ${req.originalUrl}`);
   console.log(`   Params:`, req.params);
   console.log(`   Body:`, req.body);
   next();
});

// PATCH /api/admin/inhouse/tables/:tableNumber/status
router.patch("/tables/:tableNumber/status", async (req, res) => {
   try {
      const { tableNumber } = req.params;
      const { status } = req.body;

      console.log(`🔧 Updating table ${tableNumber} to status: ${status}`);

      const table = await Table.findOneAndUpdate(
         { tableNumber: String(tableNumber) }, // Convert to string
         { status },
         { new: true },
      );

      if (!table) {
         console.log(`❌ Table ${tableNumber} not found`);
         return res.status(404).json({
            success: false,
            error: `Table ${tableNumber} not found`,
         });
      }

      console.log(`✅ Table updated:`, table);

      res.json({
         success: true,
         message: `Table ${tableNumber} status updated to ${status}`,
         data: table,
      });
   } catch (error) {
      console.error("❌ Table status update error:", error);
      res.status(500).json({ success: false, error: error.message });
   }
});

// ========== IN-HOUSE ORDER MANAGEMENT ==========

// POST /api/admin/inhouse/orders - Create new order
router.post("/orders", async (req, res) => {
   try {
      const { tableNumber, items, customerName, guestCount, customerNotes } =
         req.body;

      const table = await Table.findOne({ tableNumber });
      if (!table) {
         return res.status(404).json({
            success: false,
            error: `Table ${tableNumber} not found`,
         });
      }

      const existingOrder = await Order.findOne({
         tableNumber,
         orderStatus: {
            $in: ["confirmed", "preparing", "ready", "served", "billing"],
         },
      });

      if (existingOrder) {
         return res.status(400).json({
            success: false,
            error: `Table ${tableNumber} already has an active order`,
            existingOrder: {
               orderNumber: existingOrder.orderNumber,
               status: existingOrder.orderStatus,
               _id: existingOrder._id,
            },
         });
      }

      // ✅ FIXED: Proper date handling for order number
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");

      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const count = await Order.countDocuments({
         orderSource: "in-house",
         createdAt: { $gte: startOfDay, $lt: endOfDay },
      });

      const orderNumber = `IH-${dateStr}-${String(count + 1).padStart(3, "0")}`;

      // Calculate amounts
      let totalAmount = 0;
      const enrichedItems = [];

      for (const item of items) {
         const menuItem = await CafeMenu.findById(item.menuItem);
         if (!menuItem) {
            return res.status(404).json({
               success: false,
               error: `Menu item not found`,
            });
         }

         if (!menuItem.isAvailable) {
            return res.status(400).json({
               success: false,
               error: `${menuItem.name} is currently not available`,
            });
         }

         const itemTotal = menuItem.price * item.quantity;
         totalAmount += itemTotal;

         enrichedItems.push({
            menuItem: item.menuItem,
            quantity: item.quantity,
            price: menuItem.price,
            specialInstructions: item.specialInstructions || "",
            status: "pending",
         });
      }

      const taxes = Math.round(totalAmount * 0.05);
      const finalAmount = totalAmount + taxes;

      const order = new Order({
         orderNumber,
         orderSource: "in-house",
         tableNumber,
         customerName: customerName || null,
         guestCount: guestCount || 1,
         items: enrichedItems,
         orderType: "dine-in",
         totalAmount,
         taxes,
         finalAmount,
         deliveryCharges: 0,
         discountAmount: 0,
         paymentMethod: "cash",
         paymentStatus: "pending",
         orderStatus: "confirmed",
         customerNotes,
         createdBy: req.admin._id,
         statusHistory: [
            {
               status: "confirmed",
               timestamp: new Date(),
               note: `Order placed for Table ${tableNumber}`,
               updatedBy: req.admin._id,
            },
         ],
      });

      await order.save();

      table.status = "occupied";
      table.currentOrderId = order._id;
      table.lastOccupiedAt = new Date();
      await table.save();

      const populatedOrder = await Order.findById(order._id).populate(
         "items.menuItem",
         "name price category image preparationTime",
      );

      res.status(201).json({
         success: true,
         message: `Order ${orderNumber} created for Table ${tableNumber}`,
         data: populatedOrder,
      });
   } catch (error) {
      console.error("In-house order creation error:", error);
      res.status(500).json({ success: false, error: error.message });
   }
});

// GET /api/admin/inhouse/orders
router.get("/orders", async (req, res) => {
   try {
      const { status, date, tableNumber } = req.query;
      const filter = { orderSource: "in-house" };

      if (status) filter.orderStatus = status;
      if (tableNumber) filter.tableNumber = tableNumber;

      if (date) {
         const startOfDay = new Date(date);
         startOfDay.setHours(0, 0, 0, 0);
         const endOfDay = new Date(date);
         endOfDay.setHours(23, 59, 59, 999);
         filter.createdAt = { $gte: startOfDay, $lte: endOfDay };
      }

      const orders = await Order.find(filter)
         .populate("items.menuItem", "name price category preparationTime")
         .populate("createdBy", "name role")
         .sort({ createdAt: -1 });

      res.json({
         success: true,
         count: orders.length,
         data: orders,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// ✅ IMPORTANT: PUT THIS ROUTE BEFORE /:id/generate-bill
// PUT /api/admin/inhouse/orders/:id/add-items
router.put("/orders/:id/add-items", async (req, res) => {
   try {
      const { items } = req.body;

      const order = await Order.findById(req.params.id);
      if (!order) {
         return res.status(404).json({
            success: false,
            error: "Order not found",
         });
      }

      if (order.orderSource !== "in-house") {
         return res.status(400).json({
            success: false,
            error: "This operation is only for in-house orders",
         });
      }

      // ✅ UPDATED: Block only if payment is completed
      if (order.paymentStatus === "completed") {
         return res.status(400).json({
            success: false,
            error: "Cannot add items - payment already completed. Please create a new order.",
         });
      }

      // ✅ UPDATED: Block if order is cancelled
      if (order.orderStatus === "cancelled") {
         return res.status(400).json({
            success: false,
            error: "Cannot add items to cancelled order",
         });
      }

      // ✅ IMPORTANT: If bill was generated, mark it as needing regeneration
      const wasBillGenerated = order.billGenerated;

      let additionalAmount = 0;
      const addedItemNames = [];

      for (const item of items) {
         const menuItem = await CafeMenu.findById(item.menuItem);
         if (!menuItem || !menuItem.isAvailable) {
            return res.status(400).json({
               success: false,
               error: `${menuItem?.name || "Item"} is not available`,
            });
         }

         const itemTotal = menuItem.price * item.quantity;
         additionalAmount += itemTotal;

         addedItemNames.push(`${item.quantity}x ${menuItem.name}`);

         order.items.push({
            menuItem: item.menuItem,
            quantity: item.quantity,
            price: menuItem.price,
            specialInstructions: item.specialInstructions || "",
            status: "pending",
         });
      }

      // Recalculate totals
      order.totalAmount += additionalAmount;
      order.taxes = Math.round(order.totalAmount * 0.05);
      order.finalAmount = order.totalAmount + order.taxes;

      // ✅ If bill was already generated, mark it as outdated
      if (wasBillGenerated) {
         order.billGenerated = false; // Need to regenerate
         order.billGeneratedAt = null;
      }

      order.statusHistory.push({
         status: order.orderStatus,
         timestamp: new Date(),
         note: wasBillGenerated
            ? `⚠️ Added: ${addedItemNames.join(", ")} - Bill needs regeneration`
            : `Added: ${addedItemNames.join(", ")}`,
         updatedBy: req.admin._id,
      });

      await order.save(); // Triggers pre-save hook

      const updatedOrder = await Order.findById(order._id).populate(
         "items.menuItem",
         "name price category",
      );

      res.json({
         success: true,
         message: wasBillGenerated
            ? "Items added - Please regenerate bill before payment"
            : "Items added successfully",
         needsBillRegeneration: wasBillGenerated, // ✅ Flag for frontend
         data: updatedOrder,
      });
   } catch (error) {
      console.error("Add items error:", error);
      res.status(500).json({ success: false, error: error.message });
   }
});

// PUT /api/admin/inhouse/orders/:id/status
router.put("/orders/:id/status", async (req, res) => {
   try {
      const { status, note } = req.body;

      const order = await Order.findById(req.params.id);
      if (!order) {
         return res.status(404).json({
            success: false,
            error: "Order not found",
         });
      }

      order.orderStatus = status;
      order.statusHistory.push({
         status,
         timestamp: new Date(),
         note: note || `Status updated to ${status}`,
         updatedBy: req.admin._id,
      });

      await order.save();

      res.json({
         success: true,
         message: `Order status updated to ${status}`,
         data: order,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// PUT /api/admin/inhouse/orders/:orderId/items/:itemId/status
router.put("/orders/:orderId/items/:itemId/status", async (req, res) => {
   try {
      const { status } = req.body;

      const order = await Order.findById(req.params.orderId).populate(
         "items.menuItem",
         "name",
      );
      if (!order) {
         return res.status(404).json({
            success: false,
            error: "Order not found",
         });
      }

      const item = order.items.id(req.params.itemId);
      if (!item) {
         return res.status(404).json({
            success: false,
            error: "Item not found",
         });
      }
      // ✅ Get item name for better logging
      const itemName = item.menuItem?.name || "Item";
      // Update item status
      item.status = status;
      // ✅ FIXED: Include item name in note
      order.statusHistory.push({
         status: `item_${status}`,
         timestamp: new Date(),
         note: `${itemName} marked as ${status}`,
         updatedBy: req.admin._id,
      });

      await order.save(); // Triggers pre-save hook

      const updatedOrder = await Order.findById(order._id).populate(
         "items.menuItem",
         "name price category preparationTime",
      );

      res.json({
         success: true,
         message: `${itemName} marked as ${status}`,
         data: {
            item,
            orderStatus: updatedOrder.orderStatus,
            order: updatedOrder,
         },
      });
   } catch (error) {
      console.error("Item status update error:", error);
      res.status(500).json({ success: false, error: error.message });
   }
});

// PUT /api/admin/inhouse/orders/:orderId/mark-all-ready
router.put("/orders/:orderId/mark-all-ready", async (req, res) => {
   try {
      const order = await Order.findById(req.params.orderId).populate(
         "items.menuItem",
         "name",
      );

      if (!order) {
         return res.status(404).json({
            success: false,
            error: "Order not found",
         });
      }

      // ✅ Collect item names for better logging
      const itemsMarkedReady = [];

      order.items.forEach((item) => {
         if (item.status !== "ready" && item.status !== "served") {
            item.status = "ready";
            itemsMarkedReady.push(item.menuItem?.name || "Item");
         }
      });

      order.statusHistory.push({
         status: "ready",
         timestamp: new Date(),
         note: `All items ready: ${itemsMarkedReady.join(", ")}`, // ✅ List items
         updatedBy: req.admin._id,
      });

      await order.save();

      res.json({
         success: true,
         message: "All items marked as ready",
         data: order,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// POST /api/admin/inhouse/:id/generate-bill
router.post("/:id/generate-bill", async (req, res) => {
   try {
      const order = await Order.findById(req.params.id).populate(
         "items.menuItem",
         "name price",
      );

      if (!order) {
         return res.status(404).json({
            success: false,
            error: "Order not found",
         });
      }

      // ✅ UPDATED: Allow regeneration if bill exists but items changed
      const isRegeneration = order.billGenerated;

      // Mark bill as generated
      order.billGenerated = true;
      order.billGeneratedAt = new Date();
      order.orderStatus = "billing";

      order.statusHistory.push({
         status: "billing",
         timestamp: new Date(),
         note: isRegeneration
            ? "Bill regenerated with updated items"
            : "Bill generated",
         updatedBy: req.admin._id,
      });

      await order.save();

      // Bill structure
      const bill = {
         orderNumber: order.orderNumber,
         tableNumber: order.tableNumber,
         customerName: order.customerName,
         guestCount: order.guestCount,
         items: order.items.map((item) => ({
            name: item.menuItem.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
         })),
         subtotal: order.totalAmount,
         taxes: order.taxes,
         discount: order.discountAmount,
         finalAmount: order.finalAmount,
         generatedAt: order.billGeneratedAt,
         isRegenerated: isRegeneration, // ✅ Flag
      };

      res.json({
         success: true,
         message: isRegeneration
            ? "Bill regenerated successfully - Please void previous bill"
            : "Bill generated successfully",
         data: { order, bill },
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// POST /api/admin/inhouse/:id/complete-payment
router.post("/:id/complete-payment", async (req, res) => {
   try {
      const { paymentMethod, paymentDetails } = req.body;

      const order = await Order.findById(req.params.id);
      if (!order) {
         return res.status(404).json({
            success: false,
            error: "Order not found",
         });
      }

      if (order.paymentStatus === "completed") {
         return res.status(400).json({
            success: false,
            error: "Payment already completed",
         });
      }

      order.paymentMethod = paymentMethod;
      order.paymentStatus = "completed";
      order.orderStatus = "completed";

      if (paymentDetails) {
         order.paymentDetails = {
            ...paymentDetails,
            timestamp: new Date(),
         };
      }

      order.statusHistory.push({
         status: "completed",
         timestamp: new Date(),
         note: `Payment completed via ${paymentMethod}`,
         updatedBy: req.admin._id,
      });

      await order.save();

      await Table.findOneAndUpdate(
         { tableNumber: order.tableNumber },
         {
            status: "available",
            currentOrderId: null,
            lastClearedAt: new Date(),
         },
      );

      res.json({
         success: true,
         message: `Payment completed. Table ${order.tableNumber} is now available.`,
         data: order,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// GET /api/admin/inhouse/kitchen-display
router.get("/kitchen-display", async (req, res) => {
   try {
      const activeOrders = await Order.find({
         orderSource: { $in: ["in-house", "online"] },
         orderStatus: { $in: ["confirmed", "preparing", "ready"] },
      })
         .populate("items.menuItem", "name preparationTime category")
         .sort({ createdAt: 1 });

      const kitchenView = activeOrders.map((order) => ({
         _id: order._id,
         orderNumber: order.orderNumber,
         orderSource: order.orderSource,
         tableNumber: order.tableNumber,
         orderStatus: order.orderStatus,
         createdAt: order.createdAt,
         items: order.items.map((item) => ({
            _id: item._id,
            name: item.menuItem.name,
            quantity: item.quantity,
            status: item.status,
            specialInstructions: item.specialInstructions,
            preparationTime: item.menuItem.preparationTime,
         })),
      }));

      res.json({
         success: true,
         count: activeOrders.length,
         data: kitchenView,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

module.exports = router;
