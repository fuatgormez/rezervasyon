import mongoose from "mongoose";

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  rating: {
    stars: { type: Number, default: 0 },
    reservationCount: { type: Number, default: 0 },
    isBlacklisted: { type: Boolean, default: false },
    badges: { type: [String], default: [] },
  },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export const Customer =
  mongoose.models.Customer || mongoose.model("Customer", customerSchema);
