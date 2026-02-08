// routes/adminInhouseOrders.js - Admin routes for in-house order management
const express = require("express");
const { Order } = require("../models/Order");
const { Table } = require("../models/Table");
const { CafeMenu } = require("../models/CafeMenu");
const { verifyAdminToken } = require("./admin");
const router = express.Router();

// All routes protected by admin authentication
router.use(verifyAdminToken);

// ========== TABLE MANAGEMENT ==========

// GET /api/admin/inhouse/tables - Get all tables with current status
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

// POST /api/admin/inhouse/tables - Create new table
router.post("/tables", async (req, res) => {
   try {
      const { tableNumber, capacity, location, notes } = req.body;

      // Check if table number already exists
      const existingTable = await Table.findOne({ tableNumber });
      if (existingTable) {
         return res.status(400).json({
            success: false,
            error: `Table ${tableNumber} already exists`,
         });
      }

      const table = new Table({
         tableNumber,
         capacity,
         location,
         notes,
      });

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

// PATCH /api/admin/inhouse/tables/:tableNumber/merge - Merge tables
router.patch("/tables/:tableNumber/merge", async (req, res) => {
   try {
      const { tableNumber } = req.params;
      const { mergeTables } = req.body; // Array of table numbers to merge

      // Update main table
      const mainTable = await Table.findOneAndUpdate(
         { tableNumber },
         {
            status: "merged",
            mergedWith: mergeTables,
            tableNumber: `${tableNumber}-${mergeTables.join("-")}`,
         },
         { new: true },
      );

      // Mark merged tables as inactive
      await Table.updateMany(
         { tableNumber: { $in: mergeTables } },
         { status: "inactive" },
      );

      res.json({
         success: true,
         message: "Tables merged successfully",
         data: mainTable,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// PATCH /api/admin/inhouse/tables/:tableNumber/status - Update table status
router.patch("/tables/:tableNumber/status", async (req, res) => {
   try {
      const { tableNumber } = req.params;
      const { status } = req.body;

      const table = await Table.findOneAndUpdate(
         { tableNumber },
         { status },
         { new: true },
      );

      if (!table) {
         return res.status(404).json({
            success: false,
            error: "Table not found",
         });
      }

      res.json({
         success: true,
         message: `Table ${tableNumber} status updated to ${status}`,
         data: table,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// ========== IN-HOUSE ORDER MANAGEMENT ==========

// POST /api/admin/inhouse/orders - Create new in-house order
router.post("/orders", async (req, res) => {
   try {
      const { tableNumber, items, customerName, guestCount, customerNotes } =
         req.body;

      // Validate table exists
      const table = await Table.findOne({ tableNumber });
      if (!table) {
         return res.status(404).json({
            success: false,
            error: `Table ${tableNumber} not found`,
         });
      }

      // Check if table already has an active order
      const existingOrder = await Order.findOne({
         tableNumber,
         orderStatus: { $in: ["placed", "confirmed", "preparing", "ready"] },
      });

      if (existingOrder) {
         return res.status(400).json({
            success: false,
            error: `Table ${tableNumber} already has an active order (#${existingOrder.orderNumber})`,
            existingOrder: {
               orderNumber: existingOrder.orderNumber,
               status: existingOrder.orderStatus,
               _id: existingOrder._id,
            },
         });
      }

      // Generate unique order number for in-house
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
      const count = await Order.countDocuments({
         orderSource: "in-house",
         createdAt: {
            $gte: new Date(today.setHours(0, 0, 0, 0)),
            $lt: new Date(today.setHours(23, 59, 59, 999)),
         },
      });
      const orderNumber = `IH-${dateStr}-${String(count + 1).padStart(3, "0")}`;
      // Example: IH-20250205-001

      // Calculate amounts
      let totalAmount = 0;
      const enrichedItems = [];

      for (const item of items) {
         const menuItem = await CafeMenu.findById(item.menuItem);
         if (!menuItem) {
            return res.status(404).json({
               success: false,
               error: `Menu item ${item.menuItem} not found`,
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

      // Calculate taxes (assuming 5% GST for cafe items)
      const taxes = Math.round(totalAmount * 0.05);
      const finalAmount = totalAmount + taxes;

      // Create order
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
         paymentMethod: "cash", // Default, will be updated during billing
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

      // Update table status
      table.status = "occupied";
      table.currentOrderId = order._id;
      table.lastOccupiedAt = new Date();
      await table.save();

      // Populate the response
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

// GET /api/admin/inhouse/orders - Get all in-house orders
router.get("/orders", async (req, res) => {
   try {
      const { status, date, tableNumber } = req.query;
      const filter = { orderSource: "in-house" };

      if (status) {
         filter.orderStatus = status;
      }

      if (tableNumber) {
         filter.tableNumber = tableNumber;
      }

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

// GET /api/admin/inhouse/orders/active - Get all active in-house orders
router.get("/orders/active", async (req, res) => {
   try {
      const activeOrders = await Order.find({
         orderSource: "in-house",
         orderStatus: { $in: ["placed", "confirmed", "preparing", "ready"] },
      })
         .populate("items.menuItem", "name price category preparationTime")
         .sort({ createdAt: -1 });

      res.json({
         success: true,
         count: activeOrders.length,
         data: activeOrders,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// PUT /api/admin/inhouse/orders/:id/add-items - Add items to existing order
router.put("/:id/add-items", async (req, res) => {
   try {
      const { items } = req.body; // Array of { menuItem, quantity, specialInstructions }

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

      if (
         order.orderStatus === "completed" ||
         order.orderStatus === "cancelled"
      ) {
         return res.status(400).json({
            success: false,
            error: "Cannot add items to completed or cancelled orders",
         });
      }

      // Add new items
      let additionalAmount = 0;
      for (const item of items) {
         const menuItem = await CafeMenu.findById(item.menuItem);
         if (!menuItem || !menuItem.isAvailable) {
            return res.status(400).json({
               success: false,
               error: `Menu item not available`,
            });
         }

         const itemTotal = menuItem.price * item.quantity;
         additionalAmount += itemTotal;

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

      order.statusHistory.push({
         status: order.orderStatus,
         timestamp: new Date(),
         note: `Added ${items.length} new item(s) to order`,
         updatedBy: req.admin._id,
      });

      await order.save();

      const updatedOrder = await Order.findById(order._id).populate(
         "items.menuItem",
         "name price category",
      );

      res.json({
         success: true,
         message: "Items added successfully",
         data: updatedOrder,
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// PUT /api/admin/inhouse/orders/:id/status - Update order status
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

// POST /api/admin/inhouse/orders/:id/generate-bill - Generate bill for order
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

      if (order.billGenerated) {
         return res.status(400).json({
            success: false,
            error: "Bill already generated for this order",
         });
      }

      // Mark bill as generated
      order.billGenerated = true;
      order.billGeneratedAt = new Date();
      order.orderStatus = "billing"; // Order is billing for payment

      order.statusHistory.push({
         status: "billing",
         timestamp: new Date(),
         note: "Bill generated",
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
      };

      res.json({
         success: true,
         message: "Bill generated successfully",
         data: {
            order,
            bill,
         },
      });
   } catch (error) {
      res.status(500).json({ success: false, error: error.message });
   }
});

// POST /api/admin/inhouse/orders/:id/complete-payment - Complete payment & close order
router.post("/:id/complete-payment", async (req, res) => {
   try {
      const { paymentMethod, paymentDetails } = req.body;
      // paymentDetails: { machineId, transactionId, approvalCode } for card payments

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
            error: "Payment already completed for this order",
         });
      }

      // Update payment info
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

      // Free up the table
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

// GET /api/admin/inhouse/kitchen-display - Kitchen Display System (KDS)
router.get("/kitchen-display", async (req, res) => {
   try {
      const activeOrders = await Order.find({
         orderSource: { $in: ["in-house", "online"] },
         orderStatus: { $in: ["placed", "confirmed", "preparing"] },
      })
         .populate("items.menuItem", "name preparationTime category")
         .sort({ createdAt: 1 }); // Oldest first

      // Group items by preparation status
      const kitchenView = activeOrders.map((order) => ({
         _id: order._id,
         orderNumber: order.orderNumber,
         orderSource: order.orderSource,
         tableNumber: order.tableNumber,
         createdAt: order.createdAt,
         items: order.items.map((item) => ({
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
