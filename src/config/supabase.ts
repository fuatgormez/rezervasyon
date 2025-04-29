import { createClient } from "@supabase/supabase-js";

// Çevre değişkenleri yoksa varsayılan değerleri kullan
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://zslbxshcixikqigszqdj.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzbGJ4c2hjaXhpa3FpZ3N6cWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDc0ODkwMDEsImV4cCI6MjAyMzA2NTAwMX0.XKerIJ65Wud0jzswA9pNpAFQvNnfV4cV6Og3ox0owFM";

// Supabase istemcisini oluştur
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});

// Servis rolü istemcisi
export const getServiceSupabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  );
