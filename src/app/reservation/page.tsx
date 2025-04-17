"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import toast, { Toaster } from "react-hot-toast";

// Framer Motion animasyonları
const AnimatePresence = ({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode?: string;
}) => {
  // mode parametresi şu anda kullanılmıyor ama ileride kullanılabilir
  console.log("AnimatePresence mode:", mode);
  return <>{children}</>;
};

const motion = {
  div: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    key?: string | number;
    initial?: Record<string, unknown>;
    animate?: Record<string, unknown>;
    exit?: Record<string, unknown>;
    transition?: Record<string, unknown>;
    className?: string;
    style?: React.CSSProperties;
  }) => {
    return <div {...props}>{children}</div>;
  },
};

// Rezervasyon tipi
interface ReservationFormData {
  customerName: string;
  email: string;
  phone: string;
  date: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  specialRequests?: string;
  tablePreference?: string;
}

export default function ReservationPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formActive, setFormActive] = useState(false);
  const [formData, setFormData] = useState<ReservationFormData>({
    customerName: "",
    email: "",
    phone: "",
    date: format(new Date(), "yyyy-MM-dd"),
    startTime: "19:00",
    endTime: "21:00",
    guestCount: 2,
    specialRequests: "",
    tablePreference: "",
  });

  const [availableTables, setAvailableTables] = useState<
    {
      id: string;
      number: number;
      capacity: number;
      location: string;
    }[]
  >([]);

  // Benzersiz oturum ID'si
  const [formSessionId] = useState(
    `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  );

  // Mock veri yükleme
  useEffect(() => {
    // Gerçek uygulamada burada API'den veri çekilir
    setTimeout(() => {
      setAvailableTables([
        { id: "t1", number: 1, capacity: 2, location: "TERAS" },
        { id: "t2", number: 2, capacity: 4, location: "TERAS" },
        { id: "b1", number: 6, capacity: 2, location: "BAHÇE" },
        { id: "b2", number: 7, capacity: 4, location: "BAHÇE" },
        { id: "i1", number: 10, capacity: 2, location: "İÇ SALON" },
        { id: "i4", number: 13, capacity: 8, location: "İÇ SALON" },
      ]);
    }, 1000);
  }, []);

  useEffect(() => {
    // Form etkinleştirildiğinde WebSocket üzerinden admin paneline bildirim gönder
    if (formActive) {
      sendFormActivity();
    }

    return () => {
      // Sayfa kapatıldığında veya form terk edildiğinde bildirim gönder
      if (formActive) {
        sendFormAbandoned();
      }
    };
  }, [formActive, formData]);

  // Form alanı değiştiğinde admin paneline bildirim gönder (gerçekte WebSocket kullanılır)
  const sendFormActivity = () => {
    // Burada WebSocket bağlantısı yapılır ve veri gönderilir
    console.log("Form aktivitesi bildiriliyor:", {
      sessionId: formSessionId,
      customerData: {
        name: formData.customerName || "İsimsiz müşteri",
        guests: formData.guestCount,
        time: formData.startTime,
        date: formData.date,
      },
      status: "form_active",
      timestamp: new Date().toISOString(),
    });

    // Admin panelinde gösterilecek animasyon için
    // Burada normalde WebSocket mesajı gönderilir
  };

  // Form terk edildiğinde veya iptal edildiğinde bildirim
  const sendFormAbandoned = () => {
    console.log("Form terk edildi:", formSessionId);
    // WebSocket bildirimi gönderilir
  };

  // Form verileri değiştiğinde
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;

    // Form artık etkin olarak işaretlenir
    if (!formActive) {
      setFormActive(true);
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Misafir sayısı değiştiğinde
  const handleGuestChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const guestCount = parseInt(e.target.value);
    setFormData((prev) => ({
      ...prev,
      guestCount,
    }));

    // Admin paneline canlı güncelleme
    console.log("Misafir sayısı güncellendi:", guestCount);
  };

  // Rezervasyon gönderimi
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Admin paneline rezervasyon başlatıldı bildirimi
      console.log("Rezervasyon başlatılıyor...");

      // API isteği simülasyonu
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Başarılı rezervasyon
      toast.success("Rezervasyonunuz başarıyla oluşturuldu!");

      // Sonraki adıma geç
      setCurrentStep(3); // Son adım: Onay
      setFormActive(false);
    } catch (error) {
      toast.error("Rezervasyon oluşturulurken bir hata oluştu!");
      console.error("Rezervasyon hatası:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // İleri adıma geç
  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  // Önceki adıma dön
  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-blue-600">
            Restaurant Rezervasyon
          </Link>
          <nav className="flex space-x-4">
            <Link href="/" className="text-gray-600 hover:text-blue-600">
              Ana Sayfa
            </Link>
            <Link href="/menu" className="text-gray-600 hover:text-blue-600">
              Menü
            </Link>
            <Link href="/contact" className="text-gray-600 hover:text-blue-600">
              İletişim
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Online Rezervasyon
          </h1>
          <p className="mt-3 text-xl text-gray-500">
            Kolayca masa rezervasyonu yapın
          </p>
        </div>

        {/* Adım göstergesi */}
        <div className="w-full py-4 mb-8">
          <div className="flex justify-between">
            <div
              className={`flex-1 text-center ${
                currentStep >= 1 ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  currentStep >= 1 ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                1
              </div>
              <div className="text-sm mt-1">Bilgiler</div>
            </div>
            <div
              className={`flex-1 text-center ${
                currentStep >= 2 ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  currentStep >= 2 ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                2
              </div>
              <div className="text-sm mt-1">Masa Seçimi</div>
            </div>
            <div
              className={`flex-1 text-center ${
                currentStep >= 3 ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                  currentStep >= 3 ? "bg-blue-600 text-white" : "bg-gray-200"
                }`}
              >
                3
              </div>
              <div className="text-sm mt-1">Onay</div>
            </div>
          </div>
          <div className="relative mt-2">
            <div className="absolute top-0 h-1 w-full bg-gray-200"></div>
            <div
              className="absolute top-0 h-1 bg-blue-600 transition-all duration-500 ease-in-out"
              style={{ width: `${((currentStep - 1) / 2) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form bölümü */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white shadow-xl rounded-lg overflow-hidden"
          >
            {currentStep === 1 && (
              <div className="p-6 md:p-8">
                <h2 className="text-xl font-semibold mb-6">Kişisel Bilgiler</h2>
                <form className="space-y-4">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="customerName"
                        className="block text-sm font-medium text-gray-700"
                      >
                        İsim Soyisim
                      </label>
                      <input
                        type="text"
                        id="customerName"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-gray-700"
                      >
                        E-posta
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="phone"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Telefon
                      </label>
                      <input
                        type="tel"
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="date"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Tarih
                      </label>
                      <input
                        type="date"
                        id="date"
                        name="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        min={format(new Date(), "yyyy-MM-dd")}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="startTime"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Başlangıç Saati
                      </label>
                      <select
                        id="startTime"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {Array.from({ length: 15 }, (_, i) => {
                          const hour = i + 10; // 10:00'dan başla
                          return (
                            <option key={`${hour}:00`} value={`${hour}:00`}>
                              {`${hour}:00`}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label
                        htmlFor="guestCount"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Kişi Sayısı
                      </label>
                      <select
                        id="guestCount"
                        name="guestCount"
                        value={formData.guestCount}
                        onChange={handleGuestChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        {Array.from({ length: 10 }, (_, i) => (
                          <option key={i + 1} value={i + 1}>
                            {i + 1} Kişi
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="specialRequests"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Özel İstekler (Opsiyonel)
                    </label>
                    <textarea
                      id="specialRequests"
                      name="specialRequests"
                      value={formData.specialRequests}
                      onChange={handleInputChange}
                      rows={3}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Özel istekleriniz varsa belirtiniz..."
                    ></textarea>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={
                        !formData.customerName ||
                        !formData.email ||
                        !formData.phone
                      }
                      className="ml-3 inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      Devam Et
                    </button>
                  </div>
                </form>
              </div>
            )}

            {currentStep === 2 && (
              <div className="p-6 md:p-8">
                <h2 className="text-xl font-semibold mb-6">Masa Seçimi</h2>

                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-4">
                    {formData.date} tarihinde {formData.guestCount} kişi için{" "}
                    {formData.startTime} - {formData.endTime} saatleri arasında
                    aşağıdaki masalarda uygun yerler bulunmaktadır:
                  </p>

                  {/* Tablo kategorileri */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                      <h3 className="font-medium text-blue-800 mb-2">TERAS</h3>
                      <div className="space-y-2">
                        {availableTables
                          .filter((table) => table.location === "TERAS")
                          .map((table) => (
                            <div
                              key={table.id}
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  tablePreference: table.id,
                                }))
                              }
                              className={`p-3 rounded-md cursor-pointer transition-colors ${
                                formData.tablePreference === table.id
                                  ? "bg-blue-600 text-white"
                                  : "bg-white hover:bg-blue-100"
                              }`}
                            >
                              <div className="flex justify-between">
                                <span>Masa {table.number}</span>
                                <span>{table.capacity} Kişilik</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-100 rounded-lg p-4">
                      <h3 className="font-medium text-green-800 mb-2">BAHÇE</h3>
                      <div className="space-y-2">
                        {availableTables
                          .filter((table) => table.location === "BAHÇE")
                          .map((table) => (
                            <div
                              key={table.id}
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  tablePreference: table.id,
                                }))
                              }
                              className={`p-3 rounded-md cursor-pointer transition-colors ${
                                formData.tablePreference === table.id
                                  ? "bg-green-600 text-white"
                                  : "bg-white hover:bg-green-100"
                              }`}
                            >
                              <div className="flex justify-between">
                                <span>Masa {table.number}</span>
                                <span>{table.capacity} Kişilik</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                      <h3 className="font-medium text-red-800 mb-2">
                        İÇ SALON
                      </h3>
                      <div className="space-y-2">
                        {availableTables
                          .filter((table) => table.location === "İÇ SALON")
                          .map((table) => (
                            <div
                              key={table.id}
                              onClick={() =>
                                setFormData((prev) => ({
                                  ...prev,
                                  tablePreference: table.id,
                                }))
                              }
                              className={`p-3 rounded-md cursor-pointer transition-colors ${
                                formData.tablePreference === table.id
                                  ? "bg-red-600 text-white"
                                  : "bg-white hover:bg-red-100"
                              }`}
                            >
                              <div className="flex justify-between">
                                <span>Masa {table.number}</span>
                                <span>{table.capacity} Kişilik</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-gray-500 italic">
                    Not: Masa tercihiniz kesin rezervasyon anlamına gelmez.
                    Müsaitlik durumuna göre sistem en uygun masayı otomatik
                    atayacaktır.
                  </p>
                </div>

                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Geri
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="ml-3 inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Rezervasyon Yapılıyor...
                      </>
                    ) : (
                      "Rezervasyonu Tamamla"
                    )}
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="p-6 md:p-8 text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                  <svg
                    className="h-10 w-10 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    ></path>
                  </svg>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Rezervasyonunuz Alındı!
                </h2>

                <div className="text-left bg-gray-50 rounded-lg p-4 mb-6">
                  <h3 className="text-lg font-semibold mb-2">
                    Rezervasyon Bilgileri
                  </h3>
                  <ul className="space-y-2 text-gray-700">
                    <li className="flex justify-between">
                      <span className="font-medium">İsim:</span>
                      <span>{formData.customerName}</span>
                    </li>
                    <li className="flex justify-between">
                      <span className="font-medium">Tarih:</span>
                      <span>
                        {format(new Date(formData.date), "d MMMM yyyy", {
                          locale: tr,
                        })}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="font-medium">Saat:</span>
                      <span>
                        {formData.startTime} - {formData.endTime}
                      </span>
                    </li>
                    <li className="flex justify-between">
                      <span className="font-medium">Kişi Sayısı:</span>
                      <span>{formData.guestCount} Kişi</span>
                    </li>
                    {formData.tablePreference && (
                      <li className="flex justify-between">
                        <span className="font-medium">Masa Tercihi:</span>
                        <span>
                          {availableTables.find(
                            (t) => t.id === formData.tablePreference
                          )?.number || ""}
                          {availableTables.find(
                            (t) => t.id === formData.tablePreference
                          )?.location
                            ? ` (${
                                availableTables.find(
                                  (t) => t.id === formData.tablePreference
                                )?.location
                              })`
                            : ""}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>

                <p className="text-gray-600 mb-6">
                  Rezervasyon bilgileriniz e-posta adresinize gönderilmiştir.
                  Değişiklik yapmak isterseniz lütfen bizimle iletişime geçin.
                </p>

                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 justify-center">
                  <Link
                    href="/"
                    className="inline-flex justify-center py-2 px-6 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Ana Sayfaya Dön
                  </Link>
                  <Link
                    href="/reservation/view"
                    className="inline-flex justify-center py-2 px-6 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Rezervasyonlarımı Görüntüle
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-6 md:mb-0">
              <h3 className="text-xl font-bold mb-2">Restaurant Rezervasyon</h3>
              <p className="text-gray-300">Rezervasyon ve iletişim için</p>
            </div>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider mb-3">
                  İletişim
                </h4>
                <ul className="space-y-2">
                  <li>Telefon: (555) 123-4567</li>
                  <li>E-posta: info@restaurant.com</li>
                  <li>Adres: Örnek Caddesi No: 123</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-bold uppercase tracking-wider mb-3">
                  Çalışma Saatleri
                </h4>
                <ul className="space-y-2">
                  <li>Pazartesi - Cuma: 10:00 - 23:00</li>
                  <li>Cumartesi - Pazar: 10:00 - 00:00</li>
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-700 text-sm text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} Restaurant Rezervasyon. Tüm
              hakları saklıdır.
            </p>
          </div>
        </div>
      </footer>

      <Toaster position="top-right" />
    </div>
  );
}
