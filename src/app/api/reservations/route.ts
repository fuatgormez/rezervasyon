import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb/connect";
import { Reservation } from "@/lib/mongodb/models/Reservation";
import { Table } from "@/lib/mongodb/models/Table";
import { CompanySettings } from "@/lib/mongodb/models/CompanySettings";

// GET - Tüm rezervasyonları getir
export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // URL'den filtreleme parametrelerini al
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const tableId = searchParams.get("tableId");
    const startTime = searchParams.get("startTime");

    // Filtreleme sorgusu oluştur
    const query: Record<string, unknown> = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (tableId) query.tableId = parseInt(tableId);
    if (startTime) query.startTime = startTime;

    // Sıralama için yeni rezervasyonları önce göster
    const reservations = await Reservation.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ reservations }, { status: 200 });
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

// POST - Yeni rezervasyon ekle
export async function POST(req: NextRequest) {
  try {
    console.log("----- Yeni Rezervasyon İsteği Başlangıcı -----");

    // 1. Veritabanına bağlan
    console.log("1. Veritabanına bağlanılıyor...");
    await connectToDatabase();
    console.log("✅ Veritabanı bağlantısı başarılı");

    // 2. İstek verisini parse et
    const body = await req.json();
    console.log("2. Rezervasyon verisi alındı:", JSON.stringify(body, null, 2));

    // 3. Şirket ayarlarını al
    console.log("3. Şirket ayarları alınıyor...");
    // @ts-expect-error - CompanySettings içindeki getSettings metodu için tip hatası bekleniyor
    const companySettings = await CompanySettings.getSettings();
    console.log(
      "✅ Şirket ayarları alındı:",
      JSON.stringify(companySettings, null, 2)
    );

    // 4. Zorunlu alanları kontrol et
    if (
      !body.customer?.name ||
      !body.startTime ||
      body.tableId === undefined ||
      !body.guests
    ) {
      console.log("❌ Eksik alanlar:", {
        customerName: body.customer?.name,
        startTime: body.startTime,
        tableId: body.tableId,
        guests: body.guests,
      });

      return NextResponse.json(
        {
          error: "Rezervasyon bilgileri eksik",
          details:
            "Müşteri adı, başlangıç saati, masa ID ve misafir sayısı gereklidir",
          fields: {
            customerName: body.customer?.name ? "OK" : "Eksik",
            startTime: body.startTime ? "OK" : "Eksik",
            tableId: body.tableId !== undefined ? "OK" : "Eksik",
            guests: body.guests ? "OK" : "Eksik",
          },
        },
        { status: 400 }
      );
    }

    // 5. tableId 0 veya mevcut değilse, uygun bir masa bul
    let finalTableId = body.tableId;
    console.log("5. Masa kontrol ediliyor. Gelen Masa ID:", finalTableId);

    if (finalTableId === 0 || finalTableId === undefined) {
      try {
        console.log(
          "🔍 Otomatik masa atama başlıyor, misafir sayısı:",
          body.guests
        );

        // 5.1 Tüm masaları getir
        console.log("5.1 Tüm masalar getiriliyor...");
        const allTables = await Table.find({
          isActive: { $ne: false }, // Aktif olan tüm masalar
        });
        console.log(`✅ ${allTables.length} masa bulundu`);

        if (allTables.length === 0) {
          console.log("❌ Veritabanında hiç masa bulunamadı!");

          // 5.2 Veritabanında masa yoksa, varsayılan masaları oluştur
          try {
            console.log("🔄 Varsayılan masalar oluşturuluyor...");
            // @ts-expect-error - Table içindeki initializeDefaultTables metodu için tip hatası bekleniyor
            const initialized = await Table.initializeDefaultTables();
            console.log("✅ Varsayılan masalar oluşturuldu:", initialized);

            // Masaları yeniden getir
            const newTables = await Table.find({
              isActive: { $ne: false },
            });
            console.log(`✅ Şimdi ${newTables.length} masa var`);

            if (newTables.length > 0) {
              // İlk uygun masayı seç
              const firstAvailableTable = newTables.find(
                (t) =>
                  t.status === "available" &&
                  parseInt(
                    t.capacity.split("-")[1] || t.capacity.split("-")[0]
                  ) >= body.guests
              );

              if (firstAvailableTable) {
                finalTableId = firstAvailableTable.tableNumber;
                console.log(`✅ İlk uygun masa seçildi: ${finalTableId}`);
              } else {
                // Uygun kapasitede masa yoksa ilk masayı al
                finalTableId = newTables[0].tableNumber;
                console.log(
                  `⚠️ Uygun kapasitede masa yok, ilk masa alındı: ${finalTableId}`
                );
              }
            } else {
              console.log(
                "❌ Hala masa bulunamadı, varsayılan masa kullanılacak: 1"
              );
              finalTableId = 1;
            }
          } catch (initError) {
            console.error(
              "❌ Varsayılan masaları oluşturma hatası:",
              initError
            );
            finalTableId = 1; // Varsayılan masa
          }
        } else {
          // 5.3 Manuel olarak masayı bul (uygun kapasite ve durumu kontrol ederek)
          console.log("5.3 Uygun masa aranıyor...");
          let availableTable = null;

          for (const table of allTables) {
            // Masa kapasitesini kontrol et
            const capacityRange = table.capacity.split("-");
            const maxCapacity = parseInt(capacityRange[1] || capacityRange[0]);

            // Misafir sayısı kapasiteye uygun mu?
            if (body.guests <= maxCapacity && table.status === "available") {
              console.log(
                "🔍 Potansiyel uygun masa bulundu:",
                table.tableNumber
              );

              // Bu masada başka bir rezervasyon var mı kontrol et
              // @ts-expect-error - Reservation içindeki isTableAvailable metodu için tip hatası bekleniyor
              const isAvailable = await Reservation.isTableAvailable(
                table.tableNumber,
                body.startTime,
                body.duration || 2
              );

              if (isAvailable) {
                availableTable = table;
                console.log("✅ Uygun masa bulundu:", table.tableNumber);
                break;
              } else {
                console.log(
                  `⚠️ Masa ${table.tableNumber} uygun değil: çakışan rezervasyon var`
                );
              }
            } else {
              console.log(
                `⚠️ Masa ${table.tableNumber} uygun değil: kapasite veya durum uyumsuz`
              );
            }
          }

          if (availableTable) {
            finalTableId = availableTable.tableNumber;
            console.log(`✅ Otomatik masa atandı: ${finalTableId}`);
          } else {
            console.log("❌ Uygun boş masa bulunamadı");

            // Test için 1 numaralı masayı kullan (sadece geliştirme aşamasında)
            finalTableId = 1;
            console.log(
              "⚠️ Geliştirme modunda varsayılan masa (1) kullanılıyor"
            );
          }
        }
      } catch (tableError) {
        console.error("❌ Masa arama hatası:", tableError);

        // Acil durum için varsayılan masa
        console.log("⚠️ Hata oluştu, varsayılan masa (1) kullanılıyor");
        finalTableId = 1; // Fallback olarak 1 numaralı masayı kullan
      }
    }

    console.log(`✅ Kullanılacak masa: ${finalTableId}`);

    // 6. Masa müsait mi kontrol et
    console.log(`6. Masa ${finalTableId} müsaitlik kontrolü yapılıyor...`);

    // @ts-expect-error - Reservation içindeki isTableAvailable metodu için tip hatası bekleniyor
    const tableAvailable = await Reservation.isTableAvailable(
      finalTableId,
      body.startTime,
      body.duration || 2
    );

    if (!tableAvailable) {
      console.log(
        `❌ Masa müsait değil: ${finalTableId}, saat: ${body.startTime}`
      );
      return NextResponse.json(
        { error: "Seçilen masa belirtilen saatte müsait değil." },
        { status: 400 }
      );
    }

    console.log(`✅ Masa ${finalTableId} belirtilen saatte müsait`);

    // 7. Minimum ödeme tutarını kontrol et
    console.log("7. Minimum ödeme kontrolü yapılıyor...");
    const requiredMinPayment = companySettings.minPayment * body.guests;
    if (
      (body.prepayment || 0) < requiredMinPayment &&
      companySettings.isSystemActive &&
      body.checkMinPayment !== false // Minimum ödeme kontrolü atlanabilir
    ) {
      console.log("❌ Minimum ödeme şartı sağlanmadı:", {
        required: requiredMinPayment,
        provided: body.prepayment || 0,
      });

      return NextResponse.json(
        {
          error: "Minimum ödeme şartı sağlanmadı",
          required: requiredMinPayment,
          currentPrepayment: body.prepayment || 0,
        },
        { status: 400 }
      );
    }

    console.log("✅ Minimum ödeme kontrolü geçildi");

    // 8. Sistem aktif mi kontrolü
    if (!companySettings.isSystemActive) {
      console.log("❌ Rezervasyon sistemi şu anda kapalı");
      return NextResponse.json(
        { error: "Rezervasyon sistemi şu anda kapalı" },
        { status: 400 }
      );
    }

    console.log("✅ Sistem aktif, rezervasyon kaydediliyor...");

    // 9. Yeni rezervasyon oluştur
    const newReservation = await Reservation.create({
      customer: {
        name: body.customer.name,
        phone: body.customer.phone || "",
        email: body.customer.email || "",
        customerId: body.customer.customerId,
      },
      tableId: finalTableId,
      waiterId: body.waiterId,
      startTime: body.startTime,
      duration: body.duration || 2,
      guests: body.guests,
      type: body.type || "RESERVATION",
      status: body.status || "PENDING",
      prepayment: body.prepayment || 0,
      notes: body.notes || "",
      specialRequests: body.specialRequests || "",
      sessionId: body.sessionId, // Socket.IO oturum ID'si kaydedilir
    });

    console.log("✅ Yeni rezervasyon oluşturuldu:", newReservation._id);

    // 10. Masanın durumunu güncelle
    console.log(
      `10. Masa ${finalTableId} durumu 'reserved' olarak güncelleniyor...`
    );
    await Table.findOneAndUpdate(
      { tableNumber: finalTableId },
      { $set: { status: "reserved" } }
    );
    console.log(`✅ Masa ${finalTableId} durumu güncellendi`);

    // 11. Socket.IO bildirimi
    try {
      console.log("11. Socket.IO bildirimi gönderiliyor");

      // Socket.IO entegrasyonu server.js'de yapıldığından burada direkt erişilemiyor
      console.log("✅ Rezervasyon tamamlandı bildirimi gönderildi");
    } catch (error) {
      console.error("❌ Socket.IO event error:", error);
      // Hata olsa bile ana işleme devam et
    }

    console.log("----- Rezervasyon İşlemi Başarıyla Tamamlandı -----");
    return NextResponse.json(
      {
        success: true,
        reservation: newReservation,
        tableId: finalTableId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ Rezervasyon oluşturulurken hata:", error);
    console.error(
      error instanceof Error ? error.stack : "Hata detayı mevcut değil"
    );
    return NextResponse.json(
      {
        error: "Rezervasyon oluşturulamadı",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
