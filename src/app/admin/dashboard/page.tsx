"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get, push, set, query, orderByChild } from "firebase/database";

interface Company {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface Branch {
  id: string;
  name: string;
  company_id: string;
  status: string;
  address: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [newCompany, setNewCompany] = useState({ name: "" });
  const [newBranch, setNewBranch] = useState({
    name: "",
    company_id: "",
    address: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    loadCompanies();
    loadBranches();
  }, []);

  const checkAuth = async () => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/admin/login");
        return;
      }

      // Kullanıcının admin olup olmadığını kontrol et
      const userRef = ref(db, `users/${user.uid}`);
      const userSnapshot = await get(userRef);

      if (!userSnapshot.exists() || !userSnapshot.val().is_super_admin) {
        router.push("/admin/login");
      }
    });
  };

  const loadCompanies = async () => {
    try {
      const companiesRef = ref(db, "companies");
      const companiesSnapshot = await get(companiesRef);

      if (companiesSnapshot.exists()) {
        const companiesData = companiesSnapshot.val();
        const companiesArray = Object.keys(companiesData).map((key) => ({
          id: key,
          ...companiesData[key],
        }));

        // Oluşturulma tarihine göre sırala (yeniden eskiye)
        companiesArray.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setCompanies(companiesArray);
      } else {
        setCompanies([]);
      }
    } catch (error) {
      console.error("Firmalar yüklenirken hata:", error);
      setError("Firmalar yüklenirken bir hata oluştu");
    }
  };

  const loadBranches = async () => {
    try {
      const branchesRef = ref(db, "branches");
      const branchesSnapshot = await get(branchesRef);

      if (branchesSnapshot.exists()) {
        const branchesData = branchesSnapshot.val();
        const branchesArray = Object.keys(branchesData).map((key) => ({
          id: key,
          ...branchesData[key],
        }));

        // Oluşturulma tarihine göre sırala (yeniden eskiye)
        branchesArray.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime()
        );

        setBranches(branchesArray);
      } else {
        setBranches([]);
      }
    } catch (error) {
      console.error("Şubeler yüklenirken hata:", error);
      setError("Şubeler yüklenirken bir hata oluştu");
    }
  };

  const handleAddCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const companiesRef = ref(db, "companies");
      const newCompanyRef = push(companiesRef);

      const companyData = {
        name: newCompany.name,
        status: "active",
        created_at: new Date().toISOString(),
      };

      await set(newCompanyRef, companyData);

      setSuccess("Firma başarıyla eklendi");
      setNewCompany({ name: "" });
      loadCompanies();
    } catch (error: any) {
      console.error("Firma eklenirken hata:", error);
      setError(error.message || "Firma eklenirken bir hata oluştu");
    }
  };

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const branchesRef = ref(db, "branches");
      const newBranchRef = push(branchesRef);

      const branchData = {
        name: newBranch.name,
        company_id: newBranch.company_id,
        address: newBranch.address,
        status: "active",
        created_at: new Date().toISOString(),
      };

      await set(newBranchRef, branchData);

      setSuccess("Şube başarıyla eklendi");
      setNewBranch({ name: "", company_id: "", address: "" });
      loadBranches();
    } catch (error: any) {
      console.error("Şube eklenirken hata:", error);
      setError(error.message || "Şube eklenirken bir hata oluştu");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Süper Admin Paneli
        </h1>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Firma Ekleme Formu */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Yeni Firma Ekle</h2>
            <form onSubmit={handleAddCompany}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Firma Adı
                </label>
                <input
                  type="text"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ name: e.target.value })}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Firma Ekle
              </button>
            </form>
          </div>

          {/* Şube Ekleme Formu */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Yeni Şube Ekle</h2>
            <form onSubmit={handleAddBranch}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Firma Seçin
                </label>
                <select
                  value={newBranch.company_id}
                  onChange={(e) =>
                    setNewBranch({ ...newBranch, company_id: e.target.value })
                  }
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="">Firma Seçin</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Şube Adı
                </label>
                <input
                  type="text"
                  value={newBranch.name}
                  onChange={(e) =>
                    setNewBranch({ ...newBranch, name: e.target.value })
                  }
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2">
                  Adres
                </label>
                <textarea
                  value={newBranch.address}
                  onChange={(e) =>
                    setNewBranch({ ...newBranch, address: e.target.value })
                  }
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <button
                type="submit"
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Şube Ekle
              </button>
            </form>
          </div>

          {/* Firma Listesi */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Firmalar</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Firma Adı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Oluşturulma Tarihi
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {companies.map((company) => (
                    <tr key={company.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {company.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            company.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {company.status === "active" ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(company.created_at).toLocaleDateString(
                          "tr-TR"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Şube Listesi */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Şubeler</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Şube Adı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Firma
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {branches.map((branch) => (
                    <tr key={branch.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {branch.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {
                          companies.find((c) => c.id === branch.company_id)
                            ?.name
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            branch.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {branch.status === "active" ? "Aktif" : "Pasif"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
