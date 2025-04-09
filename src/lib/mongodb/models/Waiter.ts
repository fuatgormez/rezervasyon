import mongoose from "mongoose";

const waiterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  section: {
    type: String,
    enum: ["RESTAURANT", "GRILL", "TERRACE"],
    required: true,
  },
  phone: { type: String },
  email: { type: String },
  status: {
    type: String,
    enum: ["active", "inactive", "vacation"],
    default: "active",
  },
  assignedTables: {
    type: [Number],
    default: [],
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const Waiter =
  mongoose.models.Waiter || mongoose.model("Waiter", waiterSchema);
