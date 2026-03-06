// routes/adminInhouseOrders.js - COMPLETE CORRECTED VERSION
const express = require("express");
const { Order } = require("../models/Order");
const { Table } = require("../models/Table");
const { CafeMenu } = require("../models/CafeMenu");
const { verifyAdminToken } = require("./admin");
const router = express.Router();
const { TaxCalculator } = require("../utils/taxCalculator");
const { Bill } = require("../models/Bill");
const mongoose = require("mongoose"); // ← ADD THIS
const { getNextSequence } = require("../models/Counter");
const { getSourceCode } = require("../utils/orderSources"); // NEW: For debugging

router.use(verifyAdminToken);

router.use((req, res, next) => {
   console.log(`📍 Inhouse Route Hit: ${req.method} ${req.path}`);
   next();
});

// ── Helper: generate sequential bill number ───────────────────────────────────
async function generateBillNumber() {
   const year = new Date().getFullYear();
   const seq = await getNextSequence(`BILL-${year}`);
   return `${year}-${String(seq).padStart(6, "0")}`;
}

// ── Helper: build Bill snapshot from order ────────────────────────────────────
function buildBillSnapshot(order, billNumber, adminId, previousBillId = null) {
   const subtotal = order.totalAmount;

   // Derive rates from stored rupee amounts + subtotal
   // These are stored explicitly on the Bill so they never need recalculation
   const cgstRate =
      subtotal > 0 ? parseFloat(((order.cgst / subtotal) * 100).toFixed(2)) : 0;
   const sgstRate =
      subtotal > 0 ? parseFloat(((order.sgst / subtotal) * 100).toFixed(2)) : 0;
   const igstRate =
      subtotal > 0 ? parseFloat(((order.igst / subtotal) * 100).toFixed(2)) : 0;
   const scRate =
      subtotal > 0
         ? parseFloat(((order.serviceCharge / subtotal) * 100).toFixed(2))
         : 0;

   return {
      billNumber,
      orderId: order._id,
      orderNumber: order.orderNumber,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      guestCount: order.guestCount,
      orderSource: order.orderSource,

      items: order.items.map((item) => ({
         name: item.name || item.menuItem?.name || "Deleted Item",
         quantity: item.quantity,
         basePrice: item.price,
         selectedAddons: item.selectedAddons || [],
         unitTotal:
            (item.price +
               (item.selectedAddons?.reduce((s, a) => s + a.price, 0) || 0)) *
            item.quantity,
      })),

      subtotal,
      cgstRate,
      cgst: order.cgst || 0,
      sgstRate,
      sgst: order.sgst || 0,
      igstRate,
      igst: order.igst || 0,
      totalTax: order.taxes || 0,

      serviceChargeRate: scRate,
      serviceCharge: order.serviceCharge || 0,
      serviceChargeWaived: order.serviceChargeWaived || false,

      packagingCharges: order.packagingCharges || 0,
      deliveryCharges: order.deliveryCharges || 0,
      discount: order.discountAmount || 0,
      roundOff: order.roundOff || 0,
      grandTotal: order.finalAmount,

      paymentStatus: "generated",
      generatedBy: adminId,
      generatedAt: new Date(),
      isRegenerated: previousBillId !== null,
      previousBillId,
      isLocked: false,
   };
}

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
      const sourceCode = getSourceCode("in-house"); // "888"
      const seq = await getNextSequence(`ORD-${sourceCode}`);
      const orderNumber = `${sourceCode}-${String(seq).padStart(6, "0")}`;
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

         enrichedItems.push({
            menuItem: item.menuItem,
            name: menuItem.name,
            quantity: item.quantity,
            price: menuItem.price, // ← base price only, addons are separate
            selectedAddons: (item.selectedAddons || []).map((a) => ({
               name: a.name,
               price: a.price, // ← snapshot at order time
            })),
            specialInstructions: item.specialInstructions || "",
            status: "pending",
         });

         // And update totalAmount calculation:
         const addonTotal = (item.selectedAddons || []).reduce(
            (s, a) => s + a.price,
            0,
         );
         const itemTotal = (menuItem.price + addonTotal) * item.quantity;
         totalAmount += itemTotal;
      }

      // ✅ NEW: Use dynamic tax calculator
      const breakdown = await TaxCalculator.calculateCharges(
         totalAmount, // ✅ Use totalAmount (calculated above)
         "in-house", // ✅ Hardcoded for in-house orders
         {
            itemCount: enrichedItems.length, // ✅ Use enrichedItems
            discountAmount: 0, // ✅ Set to 0 or get from req.body if needed
         },
      );

      const order = new Order({
         orderNumber,
         orderSource: "in-house",
         tableNumber,
         customerName: customerName || null,
         guestCount: guestCount || 1,
         items: enrichedItems,
         orderType: "dine-in",
         totalAmount: breakdown.subtotal,
         taxes: breakdown.totalTax,
         cgst: breakdown.cgst,
         sgst: breakdown.sgst,
         serviceCharge: breakdown.serviceCharge || 0,
         deliveryCharges: breakdown.deliveryCharges || 0,
         packagingCharges: breakdown.packagingCharges || 0,
         discountAmount: breakdown.discount || 0,
         roundOff: breakdown.roundOff || 0,
         finalAmount: breakdown.grandTotal,
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

// GET /api/admin/inhouse/orders/:id
// GET single in-house order
router.get("/orders/:id", async (req, res) => {
   try {
      const order = await Order.findById(req.params.id)
         .populate("items.menuItem", "name price category preparationTime")
         .populate("createdBy", "name");

      if (!order) {
         return res.status(404).json({
            success: false,
            error: "Order not found",
         });
      }

      res.json({
         success: true,
         data: order,
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
      if (order.paymentStatus === "refunded") {
         return res.status(400).json({
            success: false,
            error: "Cannot generate bill for a refunded order",
         });
      }
      if (order.orderStatus === "cancelled") {
         return res.status(400).json({
            success: false,
            error: "Cannot generate bill for a cancelled order",
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

         const addonTotal = (item.selectedAddons || []).reduce(
            (s, a) => s + a.price,
            0,
         );
         const itemTotal = (menuItem.price + addonTotal) * item.quantity;
         additionalAmount += itemTotal;

         order.items.push({
            menuItem: item.menuItem,
            name: menuItem.name,
            price: menuItem.price,
            selectedAddons: (item.selectedAddons || []).map((a) => ({
               name: a.name,
               price: a.price,
            })),
            quantity: item.quantity,
            specialInstructions: item.specialInstructions || "",
            status: "pending",
         });
      }

      // ✅ FIX - honor original rates by back-calculating percentages from stored amounts
      const newSubtotal = order.totalAmount + additionalAmount;

      // Back-calculate original rates from what was stored at order creation
      const originalServiceChargeRate =
         order.totalAmount > 0
            ? (order.serviceCharge / order.totalAmount) * 100
            : 0;
      const originalCgstRate =
         order.totalAmount > 0 ? (order.cgst / order.totalAmount) * 100 : 0;
      const originalSgstRate =
         order.totalAmount > 0 ? (order.sgst / order.totalAmount) * 100 : 0;
      const originalPackagingRate =
         order.totalAmount > 0
            ? (order.packagingCharges / order.totalAmount) * 100
            : 0;

      // Reapply original rates to new subtotal
      const newCgst = parseFloat(
         ((newSubtotal * originalCgstRate) / 100).toFixed(2),
      );
      const newSgst = parseFloat(
         ((newSubtotal * originalSgstRate) / 100).toFixed(2),
      );
      const newServiceCharge = parseFloat(
         ((newSubtotal * originalServiceChargeRate) / 100).toFixed(2),
      );
      const newPackagingCharges = parseFloat(
         ((newSubtotal * originalPackagingRate) / 100).toFixed(2),
      );
      const newTotalTax = newCgst + newSgst;

      // Recalculate grand total
      let newTotal =
         newSubtotal +
         newTotalTax +
         newServiceCharge +
         newPackagingCharges -
         (order.discountAmount || 0);

      // Preserve original round-off behavior
      const roundedTotal = Math.round(newTotal);
      const newRoundOff = parseFloat((roundedTotal - newTotal).toFixed(2));
      newTotal = roundedTotal;

      order.totalAmount = newSubtotal;
      order.taxes = newTotalTax;
      order.cgst = newCgst;
      order.sgst = newSgst;
      order.igst = order.igst || 0; // IGST doesn't change
      order.serviceCharge = newServiceCharge;
      order.packagingCharges = newPackagingCharges;
      order.roundOff = newRoundOff;
      order.finalAmount = newTotal;

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
      const itemName = item.name || item.menuItem?.name || "Item";
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

// PUT /api/admin/inhouse/orders/:id/payment-status
router.put("/orders/:id/payment-status", async (req, res) => {
   try {
      const { paymentStatus } = req.body;
      const order = await Order.findById(req.params.id);
      if (!order)
         return res
            .status(404)
            .json({ success: false, error: "Order not found" });

      // Only allow refund on completed payments
      if (paymentStatus === "refunded" && order.paymentStatus !== "completed") {
         return res.status(400).json({
            success: false,
            error: "Can only refund a completed payment",
         });
      }

      order.paymentStatus = paymentStatus;
      order.statusHistory.push({
         status: `payment_${paymentStatus}`,
         timestamp: new Date(),
         note: `Payment status updated to ${paymentStatus}`,
         updatedBy: req.admin._id,
      });

      await order.save();
      console.log(
         `[PAYMENT_STATUS] Order ${order.orderNumber} payment → ${paymentStatus}`,
      );

      res.json({
         success: true,
         message: `Payment status updated to ${paymentStatus}`,
         data: order,
      });
   } catch (error) {
      console.error(`[PAYMENT_STATUS] ❌ ${error.message}`);
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
            itemsMarkedReady.push(item.name || item.menuItem?.name || "Item");
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

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/admin/inhouse/:id/waive-service-charge
// Toggle service charge waiver on an unpaid order.
// Recalculates finalAmount immediately.
// ═════════════════════════════════════════════════════════════════════════════
router.post("/:id/waive-service-charge", async (req, res) => {
   try {
      const order = await Order.findById(req.params.id);
      if (!order) {
         return res
            .status(404)
            .json({ success: false, error: "Order not found" });
      }

      if (order.paymentStatus === "completed") {
         return res.status(400).json({
            success: false,
            error: "Cannot modify a completed order",
         });
      }
      if (
         order.paymentStatus === "refunded" ||
         order.orderStatus === "cancelled" ||
         order.orderStatus === "refunded"
      ) {
         return res
            .status(400)
            .json({ success: false, error: "Cannot modify this order" });
      }
      if (order.orderSource !== "in-house") {
         return res.status(400).json({
            success: false,
            error: "Service charge waiver is only for in-house orders",
         });
      }

      const waiving = !order.serviceChargeWaived; // toggle

      if (waiving) {
         // Remove service charge: subtract it from finalAmount and zero it out
         order.finalAmount = parseFloat(
            (order.finalAmount - order.serviceCharge).toFixed(2),
         );
         // Re-apply round off on new total
         const reRounded = Math.round(order.finalAmount - order.roundOff);
         const newRoundOff = parseFloat(
            (reRounded - (order.finalAmount - order.roundOff)).toFixed(2),
         );
         order.roundOff = newRoundOff;
         order.finalAmount = reRounded;
         order.serviceCharge = 0;
         order.serviceChargeWaived = true;
      } else {
         // Restore service charge: back-calculate original rate from serviceChargeRate
         // We can't recover the original % after it was zeroed unless we stored it.
         // So fetch current TaxConfig rate as the "restore" value.
         // (This edge case — toggling back on after waiving — is rare in practice)
         const { TaxCalculator } = require("../utils/taxCalculator");
         const breakdown = await TaxCalculator.calculateCharges(
            order.totalAmount,
            "in-house",
            { itemCount: order.items.length },
         );
         order.serviceCharge = breakdown.serviceCharge || 0;
         order.serviceChargeWaived = false;

         // Recalculate finalAmount cleanly
         let newTotal =
            order.totalAmount +
            order.taxes +
            order.serviceCharge +
            order.packagingCharges +
            order.deliveryCharges -
            (order.discountAmount || 0);

         const rounded = Math.round(newTotal);
         order.roundOff = parseFloat((rounded - newTotal).toFixed(2));
         order.finalAmount = rounded;
      }

      // If bill was already generated, it needs to be regenerated
      if (order.billGenerated) {
         order.billGenerated = false;
         order.billGeneratedAt = null;
      }

      order.statusHistory.push({
         status: order.orderStatus,
         timestamp: new Date(),
         note: waiving
            ? "Service charge waived by cashier"
            : "Service charge restored by cashier",
         updatedBy: req.admin._id,
      });

      await order.save();

      res.json({
         success: true,
         message: waiving
            ? `Service charge waived. New total: ₹${order.finalAmount}`
            : `Service charge restored. New total: ₹${order.finalAmount}`,
         data: {
            serviceChargeWaived: order.serviceChargeWaived,
            serviceCharge: order.serviceCharge,
            finalAmount: order.finalAmount,
            roundOff: order.roundOff,
         },
      });
   } catch (error) {
      console.error("Waive service charge error:", error);
      res.status(500).json({ success: false, error: error.message });
   }
});
// POST /api/admin/inhouse/:id/generate-bill
// Creates/replaces a Bill snapshot. Does NOT lock it yet.
// ═════════════════════════════════════════════════════════════════════════════
router.post("/:id/generate-bill", async (req, res) => {
   try {
      const order = await Order.findById(req.params.id).populate(
         "items.menuItem",
         "name price",
      );

      if (!order) {
         return res
            .status(404)
            .json({ success: false, error: "Order not found" });
      }

      const isRegeneration = order.billGenerated;
      let previousBillId = null;

      // If regenerating, void the previous Bill document
      if (isRegeneration) {
         const prevBill = await Bill.findOne({
            orderId: order._id,
            paymentStatus: "generated",
         });
         if (prevBill) {
            prevBill.paymentStatus = "voided";
            // voiding is allowed because prevBill.isLocked is still false
            await prevBill.save();
            previousBillId = prevBill._id;
         }
      }

      // Create new Bill snapshot
      const billNumber = await generateBillNumber();
      const snapshot = buildBillSnapshot(
         order,
         billNumber,
         req.admin._id,
         previousBillId,
      );
      const bill = await Bill.create(snapshot);

      // Update order
      order.billGenerated = true;
      order.billGeneratedAt = new Date();
      order.orderStatus = "billing";

      order.statusHistory.push({
         status: "billing",
         timestamp: new Date(),
         note: isRegeneration
            ? `Bill regenerated (${billNumber}) — previous bill voided`
            : `Bill generated (${billNumber})`,
         updatedBy: req.admin._id,
      });

      await order.save();

      res.json({
         success: true,
         message: isRegeneration
            ? "Bill regenerated — please void previous printed copy"
            : "Bill generated successfully",
         data: { order, bill },
      });
   } catch (error) {
      console.error("Generate bill error:", error);
      res.status(500).json({ success: false, error: error.message });
   }
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/admin/inhouse/:id/complete-payment   (REPLACE existing route)
// Locks the Bill snapshot forever. Updates order to completed.
// ═════════════════════════════════════════════════════════════════════════════
router.post("/:id/complete-payment", async (req, res) => {
   try {
      const { paymentMethod, paymentDetails } = req.body;

      console.log(
         `[PAYMENT] Request for order: ${req.params.id}, method: ${paymentMethod}`,
      );

      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
         return res
            .status(400)
            .json({ success: false, error: "Invalid order ID" });
      }

      const order = await Order.findById(req.params.id);
      if (!order)
         return res
            .status(404)
            .json({ success: false, error: "Order not found" });

      console.log(
         `[PAYMENT] Order found: ${order.orderNumber}, billGenerated: ${order.billGenerated}, paymentStatus: ${order.paymentStatus}`,
      );

      if (order.paymentStatus === "completed") {
         return res
            .status(400)
            .json({ success: false, error: "Payment already completed" });
      }
      if (order.paymentStatus === "refunded") {
         return res
            .status(400)
            .json({ success: false, error: "Cannot re-pay a refunded order" });
      }
      if (order.orderStatus === "cancelled") {
         return res
            .status(400)
            .json({ success: false, error: "Cannot pay a cancelled order" });
      }
      if (order.orderStatus === "refunded") {
         return res
            .status(400)
            .json({ success: false, error: "Cannot re-pay a refunded order" });
      }

      // Find the Bill snapshot
      const bill = await Bill.findOne({
         orderId: order._id,
         paymentStatus: "generated",
      });

      if (!bill) {
         const anyBill = await Bill.findOne({ orderId: order._id });
         console.log(
            `[PAYMENT] ❌ No generated bill found. anyBill exists: ${!!anyBill}, status: ${anyBill?.paymentStatus}`,
         );
         return res.status(400).json({
            success: false,
            error: "No generated bill found. Please generate bill first.",
            debug: {
               orderBillGeneratedFlag: order.billGenerated,
               anyBillExists: !!anyBill,
               anyBillStatus: anyBill?.paymentStatus || "none",
            },
         });
      }

      console.log(`[PAYMENT] Bill found: ${bill.billNumber}, locking now...`);

      bill.paymentMethod = paymentMethod;
      bill.paymentCompletedAt = new Date();
      bill.paymentStatus = "paid";
      bill.isLocked = true;
      bill.lockedAt = new Date();
      await bill.save();
      console.log(`[PAYMENT] ✅ Bill ${bill.billNumber} locked forever`);

      order.paymentMethod = paymentMethod;
      order.paymentStatus = "completed";
      order.orderStatus = "completed";
      if (paymentDetails)
         order.paymentDetails = { ...paymentDetails, timestamp: new Date() };
      order.statusHistory.push({
         status: "completed",
         timestamp: new Date(),
         note: `Payment completed via ${paymentMethod} — Bill ${bill.billNumber} locked`,
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

      console.log(`[PAYMENT] ✅ Done. Table ${order.tableNumber} freed.`);

      res.json({
         success: true,
         message: `Payment completed. Bill ${bill.billNumber} locked. Table ${order.tableNumber} is now free.`,
         data: { order, bill },
      });
   } catch (error) {
      console.error(`[PAYMENT] ❌ Error: ${error.message}`);
      console.error(error.stack);
      res.status(500).json({ success: false, error: error.message });
   }
});

// GET /:id/bill - fetch bill snapshot for printing
router.get("/:id/bill", async (req, res) => {
   try {
      console.log(`[GET_BILL] Request for order: ${req.params.id}`);
      const bill = await Bill.findOne({
         orderId: req.params.id,
         paymentStatus: { $ne: "voided" },
      }).sort({ generatedAt: -1 });

      if (!bill) {
         console.log(`[GET_BILL] ❌ No bill found`);
         return res
            .status(404)
            .json({ success: false, error: "No bill found for this order" });
      }

      console.log(
         `[GET_BILL] ✅ Found: ${bill.billNumber}, locked: ${bill.isLocked}`,
      );
      res.json({ success: true, data: bill });
   } catch (error) {
      console.error(`[GET_BILL] ❌ ${error.message}`);
      res.status(500).json({ success: false, error: error.message });
   }
});

// DELETE /api/admin/inhouse/orders/:id
router.delete("/orders/:id", async (req, res) => {
   try {
      console.log(`[DELETE_ORDER] Request for order: ${req.params.id}`);

      const order = await Order.findById(req.params.id);
      if (!order) {
         return res
            .status(404)
            .json({ success: false, error: "Order not found" });
      }

      console.log(
         `[DELETE_ORDER] Found: ${order.orderNumber}, status: ${order.orderStatus}, payment: ${order.paymentStatus}`,
      );

      // 1. Void and delete any associated Bill documents
      const bills = await Bill.find({ orderId: order._id });
      if (bills.length > 0) {
         // Force delete even locked bills — admin decision
         await Bill.deleteMany({ orderId: order._id });
         console.log(
            `[DELETE_ORDER] Deleted ${bills.length} bill(s) for this order`,
         );
      }

      // 2. Free the table if this order was occupying it
      if (
         order.tableNumber &&
         order.orderStatus !== "completed" &&
         order.orderStatus !== "cancelled"
      ) {
         await Table.findOneAndUpdate(
            { tableNumber: order.tableNumber, currentOrderId: order._id },
            {
               status: "available",
               currentOrderId: null,
               lastClearedAt: new Date(),
            },
         );
         console.log(`[DELETE_ORDER] Table ${order.tableNumber} freed`);
      }

      // 3. Hard delete the order
      await Order.findByIdAndDelete(order._id);
      console.log(`[DELETE_ORDER] ✅ Order ${order.orderNumber} deleted`);

      res.json({
         success: true,
         message: `Order ${order.orderNumber} deleted permanently`,
      });
   } catch (error) {
      console.error(`[DELETE_ORDER] ❌ ${error.message}`);
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
            // ✅ Use snapshot name first, fallback to populated, fallback to "Deleted Item"
            name: item.name || item.menuItem?.name || "Deleted Item",
            quantity: item.quantity,
            status: item.status,
            specialInstructions: item.specialInstructions,
            preparationTime: item.menuItem?.preparationTime || 0,
            selectedAddons: item.selectedAddons || [],
         })),
      }));

      res.json({
         success: true,
         count: activeOrders.length,
         data: kitchenView,
      });
   } catch (error) {
      console.error("Kitchen display error:", error);
      res.status(500).json({ success: false, error: error.message });
   }
});

module.exports = router;
