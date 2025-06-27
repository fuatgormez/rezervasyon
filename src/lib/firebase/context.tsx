"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "./config";
import { ref, get, onValue } from "firebase/database";
import { User, Company, Restaurant, UserContext } from "@/types/user";

const AuthContext = createContext<UserContext | null>(null);

export const useAuthContext = (): UserContext => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Önce cookie'den token kontrolü yap
    const checkCookieAuth = async () => {
      const authToken = document.cookie
        .split("; ")
        .find((row) => row.startsWith("auth-token="))
        ?.split("=")[1];

      if (authToken) {
        try {
          // JWT token kontrolü
          const { verifyJWTToken, decodeJWTToken } = await import("@/lib/jwt");

          if (verifyJWTToken(authToken)) {
            const decoded = decodeJWTToken(authToken);
            if (decoded) {
              console.log("Found valid JWT token:", decoded);

              // Mock user data oluştur
              const mockUser: User = {
                uid: decoded.uid,
                email: decoded.email,
                displayName:
                  decoded.email === "admin" ? "Super Admin" : decoded.email,
                role: decoded.role,
                createdAt: new Date(),
                updatedAt: new Date(),
                lastLoginAt: new Date(),
                isActive: true,
                companyId:
                  (decoded.role as any) === "COMPANY_ADMIN"
                    ? "company-1"
                    : undefined,
              };

              setUser(mockUser);

              // JWT kullanıcısı için de company ve restaurant verilerini yükle
              if ((decoded.role as any) === "COMPANY_ADMIN") {
                // Önce tüm companies'i kontrol et
                const allCompaniesRef = ref(db, `companies`);
                const allCompaniesSnapshot = await get(allCompaniesRef);
                console.log("🔧 All companies:", allCompaniesSnapshot.val());

                // Firma bilgilerini yükle
                const companyRef = ref(db, `companies/company-1`);
                const companySnapshot = await get(companyRef);

                if (companySnapshot.exists()) {
                  const companyData = companySnapshot.val() as Company;
                  setCompany(companyData);
                  console.log("🏢 Company loaded:", companyData);
                } else {
                  console.log(
                    "🔧 Company company-1 not found, trying to find existing companies"
                  );

                  // Eğer company-1 yoksa, mevcut company'lerden birini kullan
                  if (allCompaniesSnapshot.exists()) {
                    const companiesData = allCompaniesSnapshot.val();
                    const firstCompany = Object.entries(companiesData)[0];
                    if (firstCompany) {
                      const [companyId, companyData] = firstCompany;
                      setCompany({
                        id: companyId,
                        ...(companyData as any),
                      } as Company);
                      console.log(
                        "🏢 Using first available company:",
                        companyId,
                        companyData
                      );
                    }
                  }
                }

                // Firmanın restoranlarını yükle
                const restaurantsRef = ref(db, `restaurants`);
                onValue(restaurantsRef, (snapshot) => {
                  if (snapshot.exists()) {
                    const restaurantsData = snapshot.val();
                    console.log("🔧 All restaurants data:", restaurantsData);

                    // Tüm restoranları listele (company filter olmadan şimdilik)
                    const allRestaurants = Object.entries(restaurantsData).map(
                      ([id, data]: [string, any]) => ({
                        id,
                        ...data,
                      })
                    ) as Restaurant[];

                    console.log("🏪 All restaurants:", allRestaurants);
                    setRestaurants(allRestaurants);

                    // İlk restoranı seç (eğer henüz seçilmemişse)
                    if (!selectedRestaurant && allRestaurants.length > 0) {
                      setSelectedRestaurant(allRestaurants[0]);
                      console.log("🎯 Selected restaurant:", allRestaurants[0]);
                    }
                  }
                });
              } else if ((decoded.role as any) === "SUPER_ADMIN") {
                // SUPER_ADMIN için tüm restoranları yükle
                console.log("🔧 Loading restaurants for SUPER_ADMIN");
                const restaurantsRef = ref(db, `restaurants`);
                onValue(restaurantsRef, (snapshot) => {
                  if (snapshot.exists()) {
                    const restaurantsData = snapshot.val();
                    console.log(
                      "🔧 All restaurants data for SUPER_ADMIN:",
                      restaurantsData
                    );

                    // Tüm restoranları listele
                    const allRestaurants = Object.entries(restaurantsData).map(
                      ([id, data]: [string, any]) => ({
                        id,
                        ...data,
                      })
                    ) as Restaurant[];

                    console.log(
                      "🏪 All restaurants for SUPER_ADMIN:",
                      allRestaurants
                    );
                    setRestaurants(allRestaurants);

                    // İlk restoranı seç (eğer henüz seçilmemişse)
                    if (!selectedRestaurant && allRestaurants.length > 0) {
                      setSelectedRestaurant(allRestaurants[0]);
                      console.log(
                        "🎯 Selected restaurant for SUPER_ADMIN:",
                        allRestaurants[0]
                      );
                    }
                  } else {
                    console.log("❌ No restaurants found in Firebase");
                  }
                });
              }

              setLoading(false);
              return true;
            }
          }
        } catch (e) {
          console.log("Cookie token decode error:", e);
        }
      }
      return false;
    };

    // Önce cookie kontrolü yap
    checkCookieAuth().then((isAuthenticated) => {
      if (isAuthenticated) {
        return;
      }

      // Firebase auth kontrolü
      const unsubscribe = onAuthStateChanged(
        auth,
        async (firebaseUser: FirebaseUser | null) => {
          if (firebaseUser) {
            try {
              // Kullanıcı bilgilerini getir
              const userRef = ref(db, `users/${firebaseUser.uid}`);
              const userSnapshot = await get(userRef);

              if (userSnapshot.exists()) {
                const userData = userSnapshot.val() as User;
                setUser(userData);

                // Eğer SUPER_ADMIN değilse, firma bilgilerini getir
                if (userData.role !== "SUPER_ADMIN" && userData.companyId) {
                  // Firma bilgilerini getir
                  const companyRef = ref(db, `companies/${userData.companyId}`);
                  const companySnapshot = await get(companyRef);

                  if (companySnapshot.exists()) {
                    const companyData = companySnapshot.val() as Company;
                    setCompany(companyData);

                    // Firmanın restoranlarını getir
                    const restaurantsRef = ref(db, `restaurants`);
                    onValue(restaurantsRef, (snapshot) => {
                      if (snapshot.exists()) {
                        const restaurantsData = snapshot.val();
                        const userRestaurants = Object.values(restaurantsData)
                          .filter(
                            (restaurant: any) =>
                              restaurant.companyId === userData.companyId
                          )
                          .filter(
                            (restaurant: any) =>
                              userData.role === "COMPANY_ADMIN" ||
                              (userData.restaurantIds &&
                                userData.restaurantIds.includes(restaurant.id))
                          ) as Restaurant[];

                        setRestaurants(userRestaurants);

                        // İlk restoranı seç (eğer henüz seçilmemişse)
                        if (!selectedRestaurant && userRestaurants.length > 0) {
                          setSelectedRestaurant(userRestaurants[0]);
                        }
                      }
                    });
                  }
                } else if (userData.role === "SUPER_ADMIN") {
                  // SUPER_ADMIN için tüm restoranları getir
                  console.log(
                    "🔧 Loading restaurants for Firebase SUPER_ADMIN"
                  );
                  const restaurantsRef = ref(db, `restaurants`);
                  onValue(restaurantsRef, (snapshot) => {
                    if (snapshot.exists()) {
                      const restaurantsData = snapshot.val();
                      console.log(
                        "🔧 All restaurants data for Firebase SUPER_ADMIN:",
                        restaurantsData
                      );

                      // Tüm restoranları listele
                      const allRestaurants = Object.entries(
                        restaurantsData
                      ).map(([id, data]: [string, any]) => ({
                        id,
                        ...data,
                      })) as Restaurant[];

                      console.log(
                        "🏪 All restaurants for Firebase SUPER_ADMIN:",
                        allRestaurants
                      );
                      setRestaurants(allRestaurants);

                      // İlk restoranı seç (eğer henüz seçilmemişse)
                      if (!selectedRestaurant && allRestaurants.length > 0) {
                        setSelectedRestaurant(allRestaurants[0]);
                        console.log(
                          "🎯 Selected restaurant for Firebase SUPER_ADMIN:",
                          allRestaurants[0]
                        );
                      }
                    } else {
                      console.log(
                        "❌ No restaurants found in Firebase for SUPER_ADMIN"
                      );
                    }
                  });
                }
              }
            } catch (error) {
              console.error("Error fetching user data:", error);
            }
          } else {
            setUser(null);
            setCompany(null);
            setRestaurants([]);
            setSelectedRestaurant(null);
          }
          setLoading(false);
        }
      );
    });
  }, [selectedRestaurant]);

  const contextValue: UserContext = {
    user,
    company,
    restaurants,
    selectedRestaurant,
    setSelectedRestaurant,
    loading,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};
