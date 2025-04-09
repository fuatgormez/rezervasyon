import mongoose, { Schema } from "mongoose";

const CompanySettingsSchema = new Schema({
  minPayment: { type: Number, default: 0 },
  isSystemActive: { type: Boolean, default: true },
  workingHours: {
    start: { type: String, default: "12:00" },
    end: { type: String, default: "22:00" },
  },
  reservationTimeSlots: { type: Number, default: 30 }, // 30 dakikalık slotlar
  maxReservationDaysAhead: { type: Number, default: 30 }, // 30 gün önceden rezervasyon
  autoConfirmReservations: { type: Boolean, default: false },
  notifyAdminOnNewReservation: { type: Boolean, default: true },
  notifyCustomerOnConfirmation: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Varsayılan ayarları getir veya oluştur
CompanySettingsSchema.statics.getSettings = async function () {
  // Şirket ayarlarını getir (her zaman tek bir döküman olmalı)
  let settings = await this.findOne();

  // Eğer ayarlar mevcut değilse, varsayılanları oluştur
  if (!settings) {
    console.log(
      "Şirket ayarları bulunamadı, varsayılan ayarlar oluşturuluyor..."
    );
    settings = await this.create({
      minPayment: 0, // Ön ödeme tutarı
      isSystemActive: true,
      workingHours: {
        start: "12:00",
        end: "22:00",
      },
      reservationTimeSlots: 30,
      maxReservationDaysAhead: 30,
      autoConfirmReservations: false,
      notifyAdminOnNewReservation: true,
      notifyCustomerOnConfirmation: true,
    });
    console.log("Varsayılan şirket ayarları oluşturuldu");
  }

  return settings;
};

// Model oluştur veya mevcut modeli kullan
export const CompanySettings =
  mongoose.models.CompanySettings ||
  mongoose.model("CompanySettings", CompanySettingsSchema);
