import kv from "../client";
import { z } from "zod";

// Firma ayarları şeması
export const CompanySettingsSchema = z.object({
  id: z.string().default("default"),
  name: z.string().default("Restaurant Name"),
  taxNumber: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  address: z.string().optional(),
  website: z.string().url().optional(),
  socialMedia: z.string().url().optional(),
  logo: z.string().optional(),
  businessHours: z
    .array(
      z.object({
        day: z.number().min(0).max(6),
        open: z.string(),
        close: z.string(),
        isClosed: z.boolean().default(false),
      })
    )
    .optional(),
  customTimeSlots: z.array(z.string()).optional(),
  minPayment: z.number().min(0).optional(),
  reservationsEnabled: z.boolean().default(true),
  requireDeposit: z.boolean().default(false),
  createdAt: z.date().or(z.string()).optional(),
  updatedAt: z.date().or(z.string()).optional(),
});

export type CompanySettingsType = z.infer<typeof CompanySettingsSchema>;

// Key prefix
const SETTINGS_KEY = "company:settings";

export const CompanySettingsModel = {
  // Ayarları getir
  async getSettings(): Promise<CompanySettingsType> {
    // KV store'dan ayarları al
    const settings = (await kv.get(SETTINGS_KEY)) as CompanySettingsType | null;

    // Eğer ayarlar yoksa, varsayılan değerleri oluştur
    if (!settings) {
      return this.initializeDefaultSettings();
    }

    return settings;
  },

  // Ayarları güncelle
  async updateSettings(
    data: Partial<CompanySettingsType>
  ): Promise<CompanySettingsType> {
    const existingSettings = await this.getSettings();

    const updatedSettings = {
      ...existingSettings,
      ...data,
      id: "default", // ID değiştirilemesin
      updatedAt: new Date().toISOString(),
    };

    // Şemayla doğrula
    CompanySettingsSchema.parse(updatedSettings);

    // KV'ye kaydet
    await kv.set(SETTINGS_KEY, updatedSettings);

    return updatedSettings;
  },

  // Varsayılan ayarları oluştur
  async initializeDefaultSettings(): Promise<CompanySettingsType> {
    const now = new Date().toISOString();

    const defaultSettings: CompanySettingsType = {
      id: "default",
      name: "Restaurant Name",
      email: "info@restaurant.com",
      phone: "+90 (555) 123-4567",
      address: "Restaurant Address, City",
      businessHours: [
        { day: 0, open: "09:00", close: "23:00", isClosed: false }, // Pazar
        { day: 1, open: "09:00", close: "23:00", isClosed: false }, // Pazartesi
        { day: 2, open: "09:00", close: "23:00", isClosed: false }, // Salı
        { day: 3, open: "09:00", close: "23:00", isClosed: false }, // Çarşamba
        { day: 4, open: "09:00", close: "23:00", isClosed: false }, // Perşembe
        { day: 5, open: "09:00", close: "23:00", isClosed: false }, // Cuma
        { day: 6, open: "09:00", close: "23:00", isClosed: false }, // Cumartesi
      ],
      customTimeSlots: [
        "09:00",
        "10:00",
        "11:00",
        "12:00",
        "13:00",
        "14:00",
        "15:00",
        "16:00",
        "17:00",
        "18:00",
        "19:00",
        "20:00",
        "21:00",
        "22:00",
      ],
      minPayment: 0,
      reservationsEnabled: true,
      requireDeposit: false,
      createdAt: now,
      updatedAt: now,
    };

    // Şemayla doğrula
    CompanySettingsSchema.parse(defaultSettings);

    // KV'ye kaydet
    await kv.set(SETTINGS_KEY, defaultSettings);

    return defaultSettings;
  },
};

export default CompanySettingsModel;
