"use client";

import { auth } from "@/lib/firebase/config";
import { getFirestore } from "firebase/firestore";
import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  setDoc,
  enableNetwork,
  disableNetwork,
} from "firebase/firestore";
import { User } from "firebase/auth";
import { db as realtimeDb } from "@/lib/firebase/config";
import { ref, get, set, push, update } from "firebase/database";

// Firestore'u başlat
const db = getFirestore();

export class FirebaseService {
  static async createReservation(reservationData: any): Promise<any> {
    try {
      console.log("Firebase: Rezervasyon oluşturuluyor", reservationData);

      // Önce müşteri kaydı yap (eğer email veya telefon varsa)
      if (reservationData.email || reservationData.phone) {
        await this.createOrUpdateCustomer({
          name: reservationData.customer_name,
          email: reservationData.email,
          phone: reservationData.phone,
          companyId: reservationData.company_id,
        });
      }

      // Firestore'da rezervasyon oluştur
      const docRef = await addDoc(collection(db, "reservations"), {
        userId: reservationData.user_id,
        companyId: reservationData.company_id,
        date: reservationData.date,
        time: reservationData.time,
        customerName: reservationData.customer_name || "",
        guestCount: reservationData.guest_count || 1,
        phone: reservationData.phone || "",
        email: reservationData.email || "",
        tableId: reservationData.table_id || null,
        startTime:
          reservationData.start_time ||
          `${reservationData.date}T${reservationData.time}:00`,
        endTime: reservationData.end_time || null,
        notes: reservationData.notes || "",
        status: reservationData.status || "pending",
        createdAt: Timestamp.now(),
      });

      // Oluşturulan rezervasyonu getir
      const reservationSnap = await getDoc(docRef);

      return {
        id: docRef.id,
        ...reservationSnap.data(),
      };
    } catch (error) {
      console.error("Firebase: Rezervasyon oluşturma hatası", error);
      throw error;
    }
  }

  static async getCompanyReservations(
    companyId: string,
    date?: string
  ): Promise<any[]> {
    try {
      let q;

      if (date) {
        // Belirli bir tarihe göre filtrele
        q = query(
          collection(db, "reservations"),
          where("companyId", "==", companyId),
          where("date", "==", date)
        );
      } else {
        // Tüm şirket rezervasyonlarını getir
        q = query(
          collection(db, "reservations"),
          where("companyId", "==", companyId)
        );
      }

      const querySnapshot = await getDocs(q);
      const reservations: any[] = [];

      querySnapshot.forEach((doc) => {
        reservations.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      return reservations;
    } catch (error) {
      console.error("Firebase: Rezervasyon getirme hatası", error);
      return [];
    }
  }

  static async getReservationsByDateRange(
    companyId: string,
    startDate: string,
    endDate: string
  ): Promise<any[]> {
    try {
      // Tüm şirket rezervasyonlarını getir
      const q = query(
        collection(db, "reservations"),
        where("companyId", "==", companyId)
      );

      const querySnapshot = await getDocs(q);
      const reservations: any[] = [];

      // Tarih aralığını manuel filtrele
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date >= startDate && data.date <= endDate) {
          reservations.push({
            id: doc.id,
            ...data,
          });
        }
      });

      return reservations;
    } catch (error) {
      console.error("Firebase: Rezervasyon getirme hatası", error);
      return [];
    }
  }

  static async updateReservationStatus(
    reservationId: string,
    status: string
  ): Promise<boolean> {
    try {
      const reservationRef = doc(db, "reservations", reservationId);
      await updateDoc(reservationRef, {
        status: status,
        updatedAt: Timestamp.now(),
      });

      return true;
    } catch (error) {
      console.error("Firebase: Rezervasyon durumu güncelleme hatası", error);
      throw error;
    }
  }

  static async getReservationById(reservationId: string): Promise<any | null> {
    try {
      const reservationRef = doc(db, "reservations", reservationId);
      const reservationSnap = await getDoc(reservationRef);

      if (reservationSnap.exists()) {
        return {
          id: reservationSnap.id,
          ...reservationSnap.data(),
        };
      }

      return null;
    } catch (error) {
      console.error("Firebase: Rezervasyon getirme hatası", error);
      return null;
    }
  }

  static async updateReservation(
    reservationId: string,
    updateData: any
  ): Promise<any> {
    try {
      const reservationRef = doc(db, "reservations", reservationId);

      // Güncellenecek verileri hazırla
      const updates: any = {
        updatedAt: Timestamp.now(),
      };

      // Gelen verileri Firebase formatına çevir
      if (updateData.customer_name)
        updates.customerName = updateData.customer_name;
      if (updateData.guest_count) updates.guestCount = updateData.guest_count;
      if (updateData.phone) updates.phone = updateData.phone;
      if (updateData.email) updates.email = updateData.email;
      if (updateData.date) updates.date = updateData.date;
      if (updateData.time) updates.time = updateData.time;
      if (updateData.status) updates.status = updateData.status;
      if (updateData.notes) updates.notes = updateData.notes;
      if (updateData.table_id) updates.tableId = updateData.table_id;

      // Eğer başlangıç zamanı verilmişse güncelle
      if (updateData.start_time) {
        updates.startTime = updateData.start_time;
      }
      // Yoksa ama tarih ve saat verilmişse oluştur
      else if (updateData.date && updateData.time) {
        updates.startTime = `${updateData.date}T${updateData.time}:00`;
      }

      // Bitiş zamanını güncelle
      if (updateData.end_time) {
        updates.endTime = updateData.end_time;
      }

      await updateDoc(reservationRef, updates);

      // Güncellenmiş rezervasyonu getir
      const updatedReservation = await getDoc(reservationRef);

      return {
        id: updatedReservation.id,
        ...updatedReservation.data(),
      };
    } catch (error) {
      console.error("Firebase: Rezervasyon güncelleme hatası", error);
      throw error;
    }
  }

  static async deleteReservation(reservationId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, "reservations", reservationId));
      return true;
    } catch (error) {
      console.error("Firebase: Rezervasyon silme hatası", error);
      throw error;
    }
  }

  // Müşteri yönetimi fonksiyonları
  static async createOrUpdateCustomer(customerData: {
    name: string;
    email?: string;
    phone?: string;
    companyId?: string;
  }): Promise<string | null> {
    try {
      if (!customerData.email && !customerData.phone) {
        return null; // Email veya telefon yoksa müşteri kaydetme
      }

      // Mevcut müşteriyi ara
      const existingCustomer = await this.findCustomerByEmailOrPhone(
        customerData.email,
        customerData.phone
      );

      if (existingCustomer) {
        // Mevcut müşteri varsa rezervasyon sayısını artır
        const updates: any = {
          reservationCount: (existingCustomer.reservationCount || 0) + 1,
          lastReservationDate: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // İsim güncelle (eğer boşsa)
        if (!existingCustomer.name && customerData.name) {
          updates.name = customerData.name;
        }

        // Email güncelle (eğer boşsa)
        if (!existingCustomer.email && customerData.email) {
          updates.email = customerData.email;
        }

        // Telefon güncelle (eğer boşsa)
        if (!existingCustomer.phone && customerData.phone) {
          updates.phone = customerData.phone;
        }

        await update(
          ref(realtimeDb, `customers/${existingCustomer.id}`),
          updates
        );
        return existingCustomer.id;
      } else {
        // Yeni müşteri oluştur
        const newCustomerRef = push(ref(realtimeDb, "customers"));
        const newCustomer = {
          name: customerData.name || "",
          email: customerData.email || "",
          phone: customerData.phone || "",
          companyId: customerData.companyId || "",
          reservationCount: 1,
          loyaltyPoints: 10, // İlk rezervasyon için 10 puan
          firstReservationDate: new Date().toISOString(),
          lastReservationDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

        await set(newCustomerRef, newCustomer);
        return newCustomerRef.key;
      }
    } catch (error) {
      console.error("Müşteri kaydetme hatası:", error);
      return null;
    }
  }

  static async findCustomerByEmailOrPhone(
    email?: string,
    phone?: string
  ): Promise<any | null> {
    try {
      const customersRef = ref(realtimeDb, "customers");
      const snapshot = await get(customersRef);

      if (snapshot.exists()) {
        const customers = snapshot.val();

        // Email veya telefon ile eşleşen müşteriyi bul
        for (const [id, customer] of Object.entries(customers)) {
          const customerData = customer as any;

          if (
            (email && customerData.email === email) ||
            (phone && customerData.phone === phone)
          ) {
            return { id, ...customerData };
          }
        }
      }

      return null;
    } catch (error) {
      console.error("Müşteri arama hatası:", error);
      return null;
    }
  }

  static async updateCustomerLoyalty(
    customerId: string,
    points: number
  ): Promise<void> {
    try {
      const customerRef = ref(realtimeDb, `customers/${customerId}`);
      const snapshot = await get(customerRef);

      if (snapshot.exists()) {
        const currentData = snapshot.val();
        const updates = {
          loyaltyPoints: (currentData.loyaltyPoints || 0) + points,
          updatedAt: new Date().toISOString(),
        };

        await update(customerRef, updates);
      }
    } catch (error) {
      console.error("Müşteri puanı güncelleme hatası:", error);
    }
  }
}

// Kullanıcı tercihleri yardımcı fonksiyonları
export const UserPreferences = {
  /**
   * Kullanıcı tercihlerini kaydet
   * @param userId - Kullanıcı ID'si
   * @param key - Tercih anahtarı
   * @param value - Tercih değeri
   */
  async set(userId: string, key: string, value: any): Promise<void> {
    try {
      // Kullanıcı tercihleri belgesini kontrol et
      const userPrefsRef = doc(db, "user_preferences", userId);
      const userPrefsSnap = await getDoc(userPrefsRef);

      if (userPrefsSnap.exists()) {
        // Varolan tercihleri güncelle
        await updateDoc(userPrefsRef, {
          [key]: value,
          updatedAt: Timestamp.now(),
        });
      } else {
        // Yeni tercihler belgesi oluştur
        await setDoc(userPrefsRef, {
          userId,
          [key]: value,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error(`Kullanıcı tercihi kaydedilirken hata (${key}):`, error);
      throw error;
    }
  },

  /**
   * Kullanıcı tercihini getir
   * @param userId - Kullanıcı ID'si
   * @param key - Tercih anahtarı
   * @param defaultValue - Varsayılan değer
   */
  async get<T>(userId: string, key: string, defaultValue: T): Promise<T> {
    try {
      const userPrefsRef = doc(db, "user_preferences", userId);
      const userPrefsSnap = await getDoc(userPrefsRef);

      if (userPrefsSnap.exists()) {
        const data = userPrefsSnap.data();
        return key in data ? data[key] : defaultValue;
      }

      return defaultValue;
    } catch (error) {
      console.error(`Kullanıcı tercihi getirilirken hata (${key}):`, error);
      return defaultValue;
    }
  },

  /**
   * Kullanıcıya özgü olmayan sistem tercihlerini kaydet (genel ayarlar)
   * @param key - Ayar anahtarı
   * @param value - Ayar değeri
   */
  async setSystemPreference(key: string, value: any): Promise<void> {
    try {
      const settingsRef = doc(db, "settings", "system_settings");
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        await updateDoc(settingsRef, {
          [key]: value,
          updatedAt: Timestamp.now(),
        });
      } else {
        await setDoc(settingsRef, {
          [key]: value,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error(`Sistem ayarı kaydedilirken hata (${key}):`, error);
      throw error;
    }
  },

  /**
   * Kullanıcıya özgü olmayan sistem tercihlerini getir
   * @param key - Ayar anahtarı
   * @param defaultValue - Varsayılan değer
   */
  async getSystemPreference<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const settingsRef = doc(db, "settings", "system_settings");
      const settingsSnap = await getDoc(settingsRef);

      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        return key in data ? data[key] : defaultValue;
      }

      return defaultValue;
    } catch (error) {
      console.error(`Sistem ayarı getirilirken hata (${key}):`, error);
      return defaultValue;
    }
  },

  /**
   * Geçerli kullanıcı için tercihleri ayarla
   * @param key - Tercih anahtarı
   * @param value - Tercih değeri
   */
  async setForCurrentUser(key: string, value: any): Promise<void> {
    const user = auth.currentUser;
    if (!user) {
      // Kullanıcı oturum açmamışsa, sistem ayarı olarak kaydet
      await this.setSystemPreference(key, value);
      return;
    }

    await this.set(user.uid, key, value);
  },

  /**
   * Geçerli kullanıcı için tercihleri getir
   * @param key - Tercih anahtarı
   * @param defaultValue - Varsayılan değer
   */
  async getForCurrentUser<T>(key: string, defaultValue: T): Promise<T> {
    const user = auth.currentUser;
    if (!user) {
      // Kullanıcı oturum açmamışsa, sistem ayarlarından getir
      return await this.getSystemPreference(key, defaultValue);
    }

    return await this.get(user.uid, key, defaultValue);
  },
};

// Kullanıcı tercihleri arayüzü
export interface UserPreferences {
  theme?: string;
  language?: string;
  notifications?: boolean;
  [key: string]: any;
}

// Ayarlar arayüzü
interface Settings {
  company?: {
    name: string;
    logo: string;
    phone: string;
    address: string;
    email: string;
    [key: string]: any;
  };
  table_categories?: Array<{
    id: string;
    name: string;
    color: string;
    borderColor: string;
    backgroundColor: string;
    [key: string]: any;
  }>;
  working_hours?: {
    opening: string;
    closing: string;
    [key: string]: any;
  };
  reservation_duration?: number;
  [key: string]: any;
}

// Firestore service için sınıf
export class SettingsService {
  // Ayarları getir
  static async getSettings(): Promise<Settings> {
    try {
      const settingsDocRef = doc(db, "settings", "app_settings");
      const settingsDoc = await getDoc(settingsDocRef);

      if (settingsDoc.exists()) {
        return settingsDoc.data() as Settings;
      } else {
        console.log("Ayarlar bulunamadı, varsayılan değerler oluşturuluyor");
        // Varsayılan ayarları oluştur
        const defaultSettings: Settings = {
          company: {
            name: "Rezervasyon Sistemi",
            logo: "/logo.png",
            phone: "+90 555 123 45 67",
            address: "İstanbul, Türkiye",
            email: "info@rezervasyon.com",
          },
          working_hours: {
            opening: "07:00",
            closing: "02:00",
          },
          reservation_duration: 120,
        };

        // Varsayılan ayarları kaydet
        try {
          await setDoc(settingsDocRef, {
            ...defaultSettings,
            created_at: Timestamp.now(),
            updated_at: Timestamp.now(),
          });
          console.log("Varsayılan ayarlar oluşturuldu");
          return defaultSettings;
        } catch (saveError) {
          console.error("Varsayılan ayarlar kaydedilirken hata:", saveError);
          return defaultSettings; // Kaydedilemese bile varsayılan ayarları döndür
        }
      }
    } catch (error) {
      console.error("Ayarlar getirilirken hata:", error);
      // Hata durumunda varsayılan ayarları döndür
      return {
        company: {
          name: "Rezervasyon Sistemi",
          logo: "/logo.png",
          phone: "+90 555 123 45 67",
          address: "İstanbul, Türkiye",
          email: "info@rezervasyon.com",
        },
        working_hours: {
          opening: "07:00",
          closing: "02:00",
        },
        reservation_duration: 120,
      };
    }
  }

  // Ayarları güncelle
  static async updateSettings(settings: Partial<Settings>): Promise<void> {
    try {
      const settingsDocRef = doc(db, "settings", "app_settings");
      const settingsDoc = await getDoc(settingsDocRef);

      if (settingsDoc.exists()) {
        // Mevcut dokümanı güncelle
        await updateDoc(settingsDocRef, {
          ...settings,
          updated_at: Timestamp.now(),
        });
      } else {
        // Yeni doküman oluştur
        await setDoc(settingsDocRef, {
          ...settings,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error("Ayarlar güncellenirken hata:", error);
      throw new Error(
        `Ayarlar güncellenirken bir hata oluştu: ${
          error instanceof Error ? error.message : "Bilinmeyen hata"
        }`
      );
    }
  }

  // Yeni koleksiyon oluştur (koleksiyon yoksa)
  static async createCollectionIfNotExists(
    collectionName: string,
    sampleDoc: any
  ): Promise<void> {
    try {
      // Örnek doküman ekleyerek koleksiyonu oluştur
      await addDoc(collection(db, collectionName), {
        ...sampleDoc,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      });
      console.log(`${collectionName} koleksiyonu oluşturuldu`);
    } catch (error) {
      console.error(
        `${collectionName} koleksiyonu oluşturulurken hata:`,
        error
      );
      throw new Error(
        `Koleksiyon oluşturulurken bir hata oluştu: ${
          error instanceof Error ? error.message : "Bilinmeyen hata"
        }`
      );
    }
  }

  // Kullanıcı tercihlerini getir
  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    try {
      const preferencesDocRef = doc(db, "user_preferences", userId);
      const preferencesDoc = await getDoc(preferencesDocRef);

      if (preferencesDoc.exists()) {
        return preferencesDoc.data() as UserPreferences;
      } else {
        console.log(
          "Kullanıcı tercihleri bulunamadı, varsayılan değerler kullanılacak"
        );
        return {};
      }
    } catch (error) {
      console.error("Kullanıcı tercihleri getirilirken hata:", error);
      return {}; // Hata durumunda boş obje döndür
    }
  }

  // Kullanıcı tercihlerini güncelle
  static async updateUserPreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<void> {
    try {
      const preferencesDocRef = doc(db, "user_preferences", userId);
      const preferencesDoc = await getDoc(preferencesDocRef);

      if (preferencesDoc.exists()) {
        // Mevcut dokümanı güncelle
        await updateDoc(preferencesDocRef, {
          ...preferences,
          updated_at: Timestamp.now(),
        });
      } else {
        // Yeni doküman oluştur
        await setDoc(preferencesDocRef, {
          ...preferences,
          created_at: Timestamp.now(),
          updated_at: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error("Kullanıcı tercihleri güncellenirken hata:", error);
      throw new Error(
        `Kullanıcı tercihleri güncellenirken bir hata oluştu: ${
          error instanceof Error ? error.message : "Bilinmeyen hata"
        }`
      );
    }
  }
}

// İnternet bağlantısını kontrol eden yardımcı fonksiyon
export const checkInternetConnection = async (): Promise<boolean> => {
  if (typeof navigator !== "undefined" && "onLine" in navigator) {
    if (!navigator.onLine) {
      return false;
    }
  }

  try {
    // Bir ping testi yapalım
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      "https://firebase.googleapis.com/v1/projects",
      {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);
    return true;
  } catch (error) {
    console.error("İnternet bağlantı kontrolü hatası:", error);
    return false;
  }
};

// Firebase ağını yeniden bağla
export const reconnectFirebase = async (): Promise<boolean> => {
  try {
    console.log("Firebase ağı yeniden bağlanmaya çalışıyor...");

    // Önce internet bağlantısını kontrol et
    const isOnline = await checkInternetConnection();
    if (!isOnline) {
      console.error(
        "İnternet bağlantısı olmadan Firebase bağlantısı kurulamaz"
      );
      return false;
    }

    try {
      // Önce ağı devre dışı bırakalım
      await disableNetwork(db);
      console.log("Firebase ağı devre dışı bırakıldı, yeniden bağlanılacak");

      // Kısa bir bekleme süresi
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Şimdi yeniden bağlanalım
      await enableNetwork(db);
      console.log("Firebase ağı yeniden bağlandı");

      // Firebase'in bağlantı kurması için biraz zaman tanıyalım
      await new Promise((resolve) => setTimeout(resolve, 2000));

      return true;
    } catch (networkError) {
      console.error("Firebase ağ yönetimi hatası:", networkError);

      // Son bir deneme daha yapalım
      try {
        await enableNetwork(db);
        console.log("İkinci deneme: Firebase ağı yeniden bağlandı");
        return true;
      } catch (retryError) {
        console.error("İkinci deneme başarısız:", retryError);
        return false;
      }
    }
  } catch (error) {
    console.error("Firebase yeniden bağlantı hatası:", error);
    return false;
  }
};

// Firebase ağını devre dışı bırak
export const disableFirebaseNetwork = async (): Promise<boolean> => {
  try {
    await disableNetwork(db);
    console.log("Firebase ağı devre dışı bırakıldı");
    return true;
  } catch (error) {
    console.error("Firebase ağını devre dışı bırakma hatası:", error);
    return false;
  }
};
