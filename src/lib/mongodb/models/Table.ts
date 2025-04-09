import mongoose from "mongoose";

const tableSchema = new mongoose.Schema({
  tableNumber: {
    type: Number,
    required: true,
    unique: true,
  },
  capacity: {
    type: String,
    required: true,
    enum: ["2-3", "4-5", "6-8"],
    default: "2-3",
  },
  section: {
    type: String,
    enum: ["RESTAURANT", "GRILL", "TERRACE"],
    required: true,
    default: "RESTAURANT",
  },
  status: {
    type: String,
    enum: ["available", "occupied", "reserved", "maintenance"],
    default: "available",
  },
  minimumSpend: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  position: {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Masaları otomatik olarak oluşturacak statik metot
tableSchema.statics.initializeDefaultTables = async function () {
  const count = await this.countDocuments();

  // Eğer veritabanında masa yoksa, varsayılan masaları oluştur
  if (count === 0) {
    console.log(
      "Veritabanında masa bulunamadı, varsayılan masalar oluşturuluyor..."
    );

    const defaultTables = [];

    // 20 tane 2-3 kişilik masa
    for (let i = 1; i <= 20; i++) {
      defaultTables.push({
        tableNumber: i,
        capacity: "2-3",
        section: "RESTAURANT",
        status: "available",
        isActive: true,
      });
    }

    // 20 tane 4-5 kişilik masa
    for (let i = 21; i <= 40; i++) {
      defaultTables.push({
        tableNumber: i,
        capacity: "4-5",
        section: i <= 30 ? "RESTAURANT" : "GRILL",
        status: "available",
        isActive: true,
      });
    }

    // 20 tane 6-8 kişilik masa
    for (let i = 41; i <= 60; i++) {
      defaultTables.push({
        tableNumber: i,
        capacity: "6-8",
        section: i <= 45 ? "GRILL" : "TERRACE",
        status: "available",
        isActive: true,
      });
    }

    await this.insertMany(defaultTables);
    console.log(`${defaultTables.length} masa başarıyla oluşturuldu.`);
    return true;
  }

  return false;
};

export const Table =
  mongoose.models.Table || mongoose.model("Table", tableSchema);
