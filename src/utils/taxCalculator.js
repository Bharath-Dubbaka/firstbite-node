// utils/taxCalculator.js - Calculate taxes and charges based on configuration
const { TaxConfig } = require("../models/TaxConfig");

class TaxCalculator {
   /**
    * Calculate all charges for an order
    * @param {Number} subtotal - Base amount before any charges
    * @param {String} orderSource - 'in-house', 'takeaway', 'online', 'swiggy', 'zomato'
    * @param {Object} options - Additional options (itemCount, distance, etc.)
    * @returns {Object} Breakdown of all charges
    */
   static async calculateCharges(subtotal, orderSource, options = {}) {
      try {
         // Fetch tax config for this order source
         let config = await TaxConfig.findOne({
            orderSource,
            isActive: true,
         });

         // If no config found, use default
         if (!config) {
            config = await this.getDefaultConfig(orderSource);
         }

         const breakdown = {
            subtotal: parseFloat(subtotal.toFixed(2)),
            cgst: 0,
            sgst: 0,
            igst: 0,
            totalTax: 0,
            serviceCharge: 0,
            deliveryCharges: 0,
            packagingCharges: 0,
            platformCommission: 0,
            discount: 0,
            roundOff: 0,
            grandTotal: 0,
         };

         // 1. Calculate Taxes (GST)
         if (config.taxes.enabled) {
            if (config.taxes.igst > 0) {
               // Inter-state: IGST only
               breakdown.igst = parseFloat(
                  ((subtotal * config.taxes.igst) / 100).toFixed(2),
               );
            } else {
               // Intra-state: CGST + SGST
               breakdown.cgst = parseFloat(
                  ((subtotal * config.taxes.cgst) / 100).toFixed(2),
               );
               breakdown.sgst = parseFloat(
                  ((subtotal * config.taxes.sgst) / 100).toFixed(2),
               );
            }
            breakdown.totalTax =
               breakdown.cgst + breakdown.sgst + breakdown.igst;
         }

         // 2. Calculate Service Charge
         if (config.serviceCharge.enabled) {
            if (config.serviceCharge.type === "percentage") {
               breakdown.serviceCharge = parseFloat(
                  ((subtotal * config.serviceCharge.value) / 100).toFixed(2),
               );
            } else {
               breakdown.serviceCharge = config.serviceCharge.value;
            }
         }

         // 3. Calculate Delivery Charges
         if (config.deliveryCharges.enabled) {
            if (config.deliveryCharges.type === "flat") {
               breakdown.deliveryCharges = config.deliveryCharges.value;
            } else if (config.deliveryCharges.type === "percentage") {
               breakdown.deliveryCharges = parseFloat(
                  ((subtotal * config.deliveryCharges.value) / 100).toFixed(2),
               );
            } else if (config.deliveryCharges.type === "distance-based") {
               const distance = options.distance || 0;
               const calculated = distance * config.deliveryCharges.perKm;
               breakdown.deliveryCharges = Math.max(
                  calculated,
                  config.deliveryCharges.minimumCharge,
               );
            }
         }

         // 4. Calculate Packaging Charges
         if (config.packagingCharges.enabled) {
            if (config.packagingCharges.type === "flat") {
               breakdown.packagingCharges = config.packagingCharges.value;
            } else if (config.packagingCharges.type === "percentage") {
               breakdown.packagingCharges = parseFloat(
                  ((subtotal * config.packagingCharges.value) / 100).toFixed(2),
               );
            } else if (config.packagingCharges.type === "per-item") {
               const itemCount = options.itemCount || 0;
               breakdown.packagingCharges =
                  itemCount * config.packagingCharges.value;
            }
         }

         // 5. Apply Discount (if provided)
         if (options.discountAmount) {
            breakdown.discount = parseFloat(options.discountAmount.toFixed(2));
         } else if (options.discountPercent) {
            breakdown.discount = parseFloat(
               ((subtotal * options.discountPercent) / 100).toFixed(2),
            );
         }

         // 6. Calculate Grand Total
         let total =
            breakdown.subtotal +
            breakdown.totalTax +
            breakdown.serviceCharge +
            breakdown.deliveryCharges +
            breakdown.packagingCharges -
            breakdown.discount;

         // 7. Calculate Platform Commission (deducted from restaurant's share)
         if (config.platformCommission.enabled) {
            breakdown.platformCommission = parseFloat(
               ((total * config.platformCommission.percentage) / 100).toFixed(
                  2,
               ),
            );
            // Commission is informational - doesn't affect customer's bill
         }

         // 8. Round Off
         if (config.roundOff.enabled) {
            const rounded = this.applyRounding(total, config.roundOff.method);
            breakdown.roundOff = parseFloat((rounded - total).toFixed(2));
            total = rounded;
         }

         breakdown.grandTotal = parseFloat(total.toFixed(2));

         // Restaurant's actual revenue after commission
         breakdown.restaurantRevenue = parseFloat(
            (breakdown.grandTotal - breakdown.platformCommission).toFixed(2),
         );

         return breakdown;
      } catch (error) {
         console.error("Tax calculation error:", error);
         throw error;
      }
   }

   /**
    * Apply rounding based on method
    */
   static applyRounding(amount, method) {
      switch (method) {
         case "up":
            return Math.ceil(amount);
         case "down":
            return Math.floor(amount);
         case "nearest":
         default:
            return Math.round(amount);
      }
   }

   /**
    * Get default config if none exists
    */
   static async getDefaultConfig(orderSource) {
      return {
         taxes: {
            enabled: true,
            cgst: 2.5,
            sgst: 2.5,
            igst: 0,
         },
         serviceCharge: { enabled: false, type: "percentage", value: 0 },
         deliveryCharges: { enabled: false, type: "flat", value: 0 },
         packagingCharges: { enabled: false, type: "flat", value: 0 },
         platformCommission: { enabled: false, percentage: 0 },
         roundOff: { enabled: true, method: "nearest" },
      };
   }

   /**
    * Format breakdown for display
    */
   static formatBreakdown(breakdown) {
      return {
         Subtotal: `₹${breakdown.subtotal}`,
         ...(breakdown.cgst > 0 && { "CGST (2.5%)": `₹${breakdown.cgst}` }),
         ...(breakdown.sgst > 0 && { "SGST (2.5%)": `₹${breakdown.sgst}` }),
         ...(breakdown.igst > 0 && { "IGST (5%)": `₹${breakdown.igst}` }),
         ...(breakdown.serviceCharge > 0 && {
            "Service Charge": `₹${breakdown.serviceCharge}`,
         }),
         ...(breakdown.deliveryCharges > 0 && {
            "Delivery Charges": `₹${breakdown.deliveryCharges}`,
         }),
         ...(breakdown.packagingCharges > 0 && {
            Packaging: `₹${breakdown.packagingCharges}`,
         }),
         ...(breakdown.discount > 0 && {
            Discount: `-₹${breakdown.discount}`,
         }),
         ...(breakdown.roundOff !== 0 && {
            "Round Off": `₹${breakdown.roundOff}`,
         }),
         "Grand Total": `₹${breakdown.grandTotal}`,
      };
   }
}

module.exports = { TaxCalculator };
