// config/orderSources.js - Single source of truth for all order source codes
const ORDER_SOURCE_CODES = {
   "in-house": "888",
   online: "999",
   takeaway: "666",
   swiggy: "777",
   zomato: "777",
};

function getSourceCode(orderSource) {
   return ORDER_SOURCE_CODES[orderSource] || "000";
}

module.exports = { getSourceCode };
