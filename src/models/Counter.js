// models/Counter.js
const mongoose = require("mongoose");

const counterSchema = new mongoose.Schema({
   _id: { type: String, required: true }, // e.g. "IH-20260306"
   seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

/**
 * Get next sequence number atomically.
 * counterId should be date-scoped e.g. "IH-20260306"
 */
async function getNextSequence(counterId) {
   const result = await Counter.findOneAndUpdate(
      { _id: counterId },
      { $inc: { seq: 1 } },
      { new: true, upsert: true },
   );
   return result.seq;
}

module.exports = { Counter, getNextSequence };
