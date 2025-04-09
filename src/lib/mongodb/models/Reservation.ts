import mongoose, { Schema } from "mongoose";

const ReservationSchema = new Schema({
  customer: {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "Customer" },
  },
  tableId: { type: Number, required: true },
  waiterId: { type: Schema.Types.ObjectId, ref: "Waiter" },
  startTime: { type: String, required: true },
  duration: { type: Number, required: true, default: 2 },
  guests: { type: Number, required: true },
  type: {
    type: String,
    enum: ["WALK_IN", "RESERVATION", "SPECIAL"],
    default: "RESERVATION",
  },
  status: {
    type: String,
    enum: ["CONFIRMED", "PENDING", "CANCELLED"],
    default: "PENDING",
    required: true,
  },
  prepayment: { type: Number, default: 0 },
  payment: {
    status: {
      type: String,
      enum: ["pending", "partial", "completed"],
      default: "pending",
    },
    amount: { type: Number, default: 0 },
    method: { type: String, enum: ["cash", "card", "online"], default: "cash" },
    paymentId: { type: String },
  },
  notes: { type: String },
  specialRequests: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Özel bir metot: Belirli bir zaman diliminde masanın müsait olup olmadığını kontrol eder
ReservationSchema.statics.isTableAvailable = async function (
  tableId,
  startTime,
  duration,
  excludeReservationId = null
) {
  const startHour = parseInt(startTime.split(":")[0]);

  // Belirtilen zaman aralığında başka rezervasyon var mı kontrol et
  const query = {
    tableId,
    startTime: startTime,
    _id: { $ne: excludeReservationId }, // Belirtilen rezervasyon hariç
    status: { $ne: "CANCELLED" }, // İptal edilmiş rezervasyonları hariç tut
  };

  const existingReservation = await this.findOne(query);
  return !existingReservation; // Rezervasyon yoksa masa müsait demektir
};

export const Reservation =
  mongoose.models.Reservation ||
  mongoose.model("Reservation", ReservationSchema);
