"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "@/lib/firebase/context";
import { ChevronDown, MapPin, Phone } from "lucide-react";
import { ref, get } from "firebase/database";
import { db } from "@/lib/firebase/config";

export default function RestaurantSelector() {
  const { restaurants, selectedRestaurant, setSelectedRestaurant } =
    useAuthContext();
  const [isOpen, setIsOpen] = useState(false);
  const [companies, setCompanies] = useState<{ [key: string]: any }>({});

  // Company bilgilerini yükle
  useEffect(() => {
    const loadCompanies = async () => {
      try {
        const companiesRef = ref(db, "companies");
        const snapshot = await get(companiesRef);
        if (snapshot.exists()) {
          setCompanies(snapshot.val());
          console.log("🏢 Companies loaded:", snapshot.val());
        }
      } catch (error) {
        console.error("Companies yüklenirken hata:", error);
      }
    };

    loadCompanies();
  }, []);

  // Restaurant'ın company ismini getir
  const getCompanyName = (restaurant: any) => {
    if (restaurant.companyId && companies[restaurant.companyId]) {
      return companies[restaurant.companyId].name;
    }
    return "Bilinmeyen Firma";
  };

  console.log("🔧 RestaurantSelector Debug:", {
    restaurants: restaurants?.length || 0,
    selectedRestaurant: selectedRestaurant?.name || "null",
    companies: Object.keys(companies).length,
  });

  // Sadece Firebase restaurants'ları kullan
  const displayRestaurants = restaurants || [];
  const displaySelectedRestaurant =
    selectedRestaurant ||
    (restaurants && restaurants.length > 0 ? restaurants[0] : null);

  // İlk restaurant'ı seç eğer seçili değilse
  useEffect(() => {
    if (
      !selectedRestaurant &&
      restaurants &&
      restaurants.length > 0 &&
      setSelectedRestaurant
    ) {
      setSelectedRestaurant(restaurants[0]);
      console.log("🎯 Auto-selected first restaurant:", restaurants[0]);
    }
  }, [restaurants, selectedRestaurant, setSelectedRestaurant]);

  if (!displayRestaurants || displayRestaurants.length === 0) {
    return (
      <div className="px-4 py-2 bg-yellow-100 border border-yellow-300 rounded-lg text-yellow-800 text-sm">
        🔄 Restoranlar yükleniyor...
      </div>
    );
  }

  if (!displaySelectedRestaurant) {
    return (
      <div className="px-4 py-2 bg-red-100 border border-red-300 rounded-lg text-red-800 text-sm">
        ❌ Restoran seçilemedi
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-sm">
              {displaySelectedRestaurant.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="text-left">
            <div className="font-medium text-gray-900">
              {displaySelectedRestaurant.name}
            </div>
            <div className="text-xs text-gray-500">
              {getCompanyName(displaySelectedRestaurant)}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-[9999]">
            <div className="p-2">
              {displayRestaurants.map((restaurant: any) => (
                <button
                  key={restaurant.id}
                  onClick={() => {
                    if (setSelectedRestaurant) {
                      setSelectedRestaurant(restaurant);
                      console.log("🎯 Restaurant selected:", restaurant);
                    }
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-3 rounded-md hover:bg-gray-50 transition-colors ${
                    displaySelectedRestaurant?.id === restaurant.id
                      ? "bg-blue-50 border border-blue-200"
                      : ""
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold">
                        {restaurant.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {restaurant.name}
                      </div>

                      <div className="text-xs text-blue-600 font-medium mb-1">
                        {getCompanyName(restaurant)}
                      </div>

                      <div className="flex items-center space-x-1 mt-1">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500 truncate">
                          {restaurant.address}
                        </span>
                      </div>

                      {restaurant.phone && (
                        <div className="flex items-center space-x-1 mt-1">
                          <Phone className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            {restaurant.phone}
                          </span>
                        </div>
                      )}
                    </div>

                    {displaySelectedRestaurant?.id === restaurant.id && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
