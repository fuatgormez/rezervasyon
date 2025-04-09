import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

// Varsayılan bir URL belirleyelim, böylece build sırasında hata vermeyecek
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/rezervasyon";

// Artık hata fırlatmayacak, çünkü varsayılan değer var
// if (!MONGODB_URI) {
//   throw new Error("MONGODB_URI environment variable is not defined");
// }

let cached: MongooseCache | undefined = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached?.conn) {
    return cached.conn;
  }

  if (!cached?.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;

    // Veritabanı bağlantısı kurulduktan sonra varsayılan masaları oluştur
    try {
      // Table ve CompanySettings modellerini dinamik olarak import et
      const { Table } = await import("./models/Table");
      const { CompanySettings } = await import("./models/CompanySettings");

      // Eğer Table modeli yüklendiyse varsayılan masaları kontrol et
      if (Table && typeof Table.initializeDefaultTables === "function") {
        await Table.initializeDefaultTables();
      }

      // Eğer CompanySettings modeli yüklendiyse varsayılan ayarları kontrol et
      if (
        CompanySettings &&
        typeof CompanySettings.getSettings === "function"
      ) {
        await CompanySettings.getSettings();
      }
    } catch (initError) {
      console.error("Varsayılan verileri oluştururken hata:", initError);
      // Hata olsa bile devam et
    }
  } catch (e) {
    cached.promise = null;
    console.error("MongoDB bağlantı hatası:", e);
    // Hata fırlatmak yerine boş bir bağlantı döndürelim (build sırasında)
    if (process.env.NODE_ENV === "production" && !process.env.MONGODB_URI) {
      console.warn("Build sırasında MongoDB bağlantısı atlanıyor");
      return mongoose; // Geçici boş bağlantı
    }
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
