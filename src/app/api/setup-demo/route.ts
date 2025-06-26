import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    console.log("Demo setup başlatılıyor...");

    // Demo veriler
    const demoData = {
      // Tamer Restoran Grubu
      company: {
        id: "tamer-restoran-grubu",
        name: "Tamer Restoran Grubu",
        slug: "tamer-restoran",
        email: "info@tamerrestoran.com",
        phone: "+90 212 555 0100",
        address: "Nişantaşı, İstanbul",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
      },

      // 3 Restoran
      restaurants: [
        {
          id: "merkez-nisantasi",
          companyId: "tamer-restoran-grubu",
          name: "Tamer Merkez",
          slug: "merkez",
          location: "Nişantaşı",
          address: "Teşvikiye Mah. Şakayık Sok. No:15, Şişli/İstanbul",
          phone: "+90 212 555 0101",
          email: "merkez@tamerrestoran.com",
          capacity: 120,
          openingHours: {
            monday: { open: "09:00", close: "23:00" },
            tuesday: { open: "09:00", close: "23:00" },
            wednesday: { open: "09:00", close: "23:00" },
            thursday: { open: "09:00", close: "23:00" },
            friday: { open: "09:00", close: "24:00" },
            saturday: { open: "10:00", close: "24:00" },
            sunday: { open: "10:00", close: "22:00" },
          },
          settings: {
            reservationDuration: 120,
            maxAdvanceBooking: 30,
            minAdvanceBooking: 2,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
        },
        {
          id: "kadikoy-moda",
          companyId: "tamer-restoran-grubu",
          name: "Tamer Kadıköy",
          slug: "kadikoy",
          location: "Moda, Kadıköy",
          address: "Moda Cad. No:45, Kadıköy/İstanbul",
          phone: "+90 216 555 0102",
          email: "kadikoy@tamerrestoran.com",
          capacity: 80,
          openingHours: {
            monday: { open: "09:00", close: "23:00" },
            tuesday: { open: "09:00", close: "23:00" },
            wednesday: { open: "09:00", close: "23:00" },
            thursday: { open: "09:00", close: "23:00" },
            friday: { open: "09:00", close: "24:00" },
            saturday: { open: "10:00", close: "24:00" },
            sunday: { open: "10:00", close: "22:00" },
          },
          settings: {
            reservationDuration: 120,
            maxAdvanceBooking: 30,
            minAdvanceBooking: 2,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
        },
        {
          id: "bebek-bogazici",
          companyId: "tamer-restoran-grubu",
          name: "Tamer Bebek",
          slug: "bebek",
          location: "Bebek, Beşiktaş",
          address: "Bebek Cad. No:123, Beşiktaş/İstanbul",
          phone: "+90 212 555 0103",
          email: "bebek@tamerrestoran.com",
          capacity: 150,
          openingHours: {
            monday: { open: "09:00", close: "23:00" },
            tuesday: { open: "09:00", close: "23:00" },
            wednesday: { open: "09:00", close: "23:00" },
            thursday: { open: "09:00", close: "23:00" },
            friday: { open: "09:00", close: "24:00" },
            saturday: { open: "10:00", close: "24:00" },
            sunday: { open: "10:00", close: "22:00" },
          },
          settings: {
            reservationDuration: 120,
            maxAdvanceBooking: 30,
            minAdvanceBooking: 2,
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isActive: true,
        },
      ],

      // 5 Kullanıcı
      users: [
        {
          uid: "super-admin-001",
          email: "admin@zonekult.com",
          displayName: "Super Admin",
          role: "SUPER_ADMIN",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          isActive: true,
        },
        {
          uid: "tamer-admin-001",
          email: "tamer@tamerrestoran.com",
          displayName: "Tamer Bey",
          role: "COMPANY_ADMIN",
          companyId: "tamer-restoran-grubu",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          isActive: true,
        },
        {
          uid: "merkez-manager-001",
          email: "manager.merkez@tamerrestoran.com",
          displayName: "Merkez Müdürü",
          role: "RESTAURANT_ADMIN",
          companyId: "tamer-restoran-grubu",
          restaurantIds: ["merkez-nisantasi"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          isActive: true,
        },
        {
          uid: "kadikoy-manager-001",
          email: "manager.kadikoy@tamerrestoran.com",
          displayName: "Kadıköy Müdürü",
          role: "RESTAURANT_ADMIN",
          companyId: "tamer-restoran-grubu",
          restaurantIds: ["kadikoy-moda"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          isActive: true,
        },
        {
          uid: "bebek-manager-001",
          email: "manager.bebek@tamerrestoran.com",
          displayName: "Bebek Müdürü",
          role: "RESTAURANT_ADMIN",
          companyId: "tamer-restoran-grubu",
          restaurantIds: ["bebek-bogazici"],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          isActive: true,
        },
      ],
    };

    // Firebase'e veri yükleme işlemi client-side yapılacak
    // Bu API sadece demo verilerini döndürüyor
    return new NextResponse(
      JSON.stringify({
        success: true,
        message: "Demo verileri hazırlandı! Client-side Firebase'e yüklenecek.",
        demoData: demoData,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Demo data setup error:", error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: "Demo veriler hazırlanırken hata oluştu",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
