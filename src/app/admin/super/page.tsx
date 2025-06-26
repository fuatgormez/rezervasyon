"use client";

import { useState, useEffect } from "react";
import { useAuthContext } from "@/lib/firebase/context";
import { Company, Restaurant, User } from "@/types/user";
import { db } from "@/lib/firebase/config";
import { ref, get, set, update, remove } from "firebase/database";
import toast from "react-hot-toast";
import { Plus, Edit, Trash, Building, Store, Users, Eye } from "lucide-react";

export default function SuperAdminPage() {
  const { user } = useAuthContext();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "companies" | "restaurants" | "users"
  >("companies");

  // Redirect if not super admin
  useEffect(() => {
    if (user && user.role !== "SUPER_ADMIN") {
      window.location.href = "/admin";
    }
  }, [user]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load companies
        const companiesRef = ref(db, "companies");
        const companiesSnapshot = await get(companiesRef);
        if (companiesSnapshot.exists()) {
          const companiesData = companiesSnapshot.val();
          const loadedCompanies = Object.entries(companiesData).map(
            ([id, data]: [string, any]) => ({ id, ...data })
          ) as Company[];
          setCompanies(loadedCompanies);
        }

        // Load restaurants
        const restaurantsRef = ref(db, "restaurants");
        const restaurantsSnapshot = await get(restaurantsRef);
        if (restaurantsSnapshot.exists()) {
          const restaurantsData = restaurantsSnapshot.val();
          const loadedRestaurants = Object.entries(restaurantsData).map(
            ([id, data]: [string, any]) => ({ id, ...data })
          ) as Restaurant[];
          setRestaurants(loadedRestaurants);
        }

        // Load users
        const usersRef = ref(db, "users");
        const usersSnapshot = await get(usersRef);
        if (usersSnapshot.exists()) {
          const usersData = usersSnapshot.val();
          const loadedUsers = Object.entries(usersData).map(
            ([id, data]: [string, any]) => ({ uid: id, ...data })
          ) as User[];
          setUsers(loadedUsers);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Veriler yüklenirken hata oluştu");
        setLoading(false);
      }
    };

    if (user?.role === "SUPER_ADMIN") {
      loadData();
    }
  }, [user]);

  const getCompanyName = (companyId: string) => {
    return (
      companies.find((c) => c.id === companyId)?.name || "Bilinmeyen Firma"
    );
  };

  const getRestaurantsByCompany = (companyId: string) => {
    return restaurants.filter((r) => r.companyId === companyId);
  };

  const getUsersByCompany = (companyId: string) => {
    return users.filter((u) => u.companyId === companyId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-blue-600">Zonekult</h1>
              <span className="text-sm text-gray-500">Super Admin Panel</span>
            </div>
            <div className="text-sm text-gray-600">
              Hoş geldin, {user?.displayName || user?.email}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("companies")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "companies"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Building className="w-4 h-4 inline mr-2" />
              Firmalar ({companies.length})
            </button>
            <button
              onClick={() => setActiveTab("restaurants")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "restaurants"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Store className="w-4 h-4 inline mr-2" />
              Restoranlar ({restaurants.length})
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "users"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Kullanıcılar ({users.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === "companies" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Firmalar</h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Yeni Firma</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="bg-white rounded-lg shadow-sm border p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {company.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {company.email}
                      </p>
                      <p className="text-sm text-gray-500">{company.phone}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-800">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Restoranlar:</span>
                      <span className="font-medium">
                        {getRestaurantsByCompany(company.id).length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-500">Kullanıcılar:</span>
                      <span className="font-medium">
                        {getUsersByCompany(company.id).length}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 flex items-center justify-center space-x-2">
                      <Eye className="w-4 h-4" />
                      <span>Detayları Görüntüle</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "restaurants" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Restoranlar
              </h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Yeni Restoran</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {restaurants.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="bg-white rounded-lg shadow-sm border p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {restaurant.name}
                      </h3>
                      <p className="text-sm text-blue-600 mt-1">
                        {getCompanyName(restaurant.companyId)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        {restaurant.address}
                      </p>
                      <p className="text-sm text-gray-500">
                        {restaurant.phone}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-800">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-800">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button className="w-full bg-gray-100 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-200 flex items-center justify-center space-x-2">
                      <Eye className="w-4 h-4" />
                      <span>Rezervasyonları Görüntüle</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "users" && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Kullanıcılar
              </h2>
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Yeni Kullanıcı</span>
              </button>
            </div>

            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kullanıcı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Firma
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.uid}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.displayName || user.email}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.companyId
                          ? getCompanyName(user.companyId)
                          : "Firma atanmamış"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === "SUPER_ADMIN"
                              ? "bg-purple-100 text-purple-800"
                              : user.role === "COMPANY_ADMIN"
                              ? "bg-blue-100 text-blue-800"
                              : user.role === "RESTAURANT_ADMIN"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.role === "SUPER_ADMIN" && "Süper Admin"}
                          {user.role === "COMPANY_ADMIN" && "Firma Admin"}
                          {user.role === "RESTAURANT_ADMIN" && "Restoran Admin"}
                          {user.role === "USER" && "Kullanıcı"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {user.isActive ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button className="text-blue-600 hover:text-blue-900">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="text-red-600 hover:text-red-900">
                          <Trash className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
