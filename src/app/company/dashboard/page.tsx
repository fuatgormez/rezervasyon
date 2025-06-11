"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase/config";
import { onAuthStateChanged } from "firebase/auth";
import {
  ref,
  get,
  push,
  set,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";

interface Branch {
  id: string;
  name: string;
  address: string;
  status: string;
}

interface Company {
  id: string;
  name: string;
  status: string;
}

export default function CompanyDashboard() {
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [newBranch, setNewBranch] = useState({
    name: "",
    address: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push("/company/login");
        return;
      }

      // Kullanıcı bilgilerini al
      const userRef = ref(db, `users/${user.uid}`);
      const userSnapshot = await get(userRef);

      if (!userSnapshot.exists() || !userSnapshot.val().company_id) {
        router.push("/company/login");
        return;
      }

      const companyId = userSnapshot.val().company_id;

      // Firma bilgilerini al
      const companyRef = ref(db, `companies/${companyId}`);
      const companySnapshot = await get(companyRef);

      if (!companySnapshot.exists()) {
        router.push("/company/login");
        return;
      }

      const companyData = {
        id: companyId,
        ...companySnapshot.val(),
      };

      setCompany(companyData);
      loadBranches(companyId);
    });
  };

  const loadBranches = async (companyId: string) => {
    try {
      const branchesRef = ref(db, "branches");
      const branchesSnapshot = await get(branchesRef);

      if (branchesSnapshot.exists()) {
        const branchesData = branchesSnapshot.val();
        const branchesArray = Object.keys(branchesData)
          .map((key) => ({
            id: key,
            ...branchesData[key],
          }))
          .filter((branch) => branch.company_id === companyId);

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

  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    try {
      const branchesRef = ref(db, "branches");
      const newBranchRef = push(branchesRef);

      const branchData = {
        name: newBranch.name,
        address: newBranch.address,
        company_id: company.id,
        status: "active",
        created_at: new Date().toISOString(),
      };

      await set(newBranchRef, branchData);

      setSuccess("Şube başarıyla eklendi");
      setNewBranch({ name: "", address: "" });
      loadBranches(company.id);
    } catch (error: any) {
      console.error("Şube eklenirken hata:", error);
      setError(error.message || "Şube eklenirken bir hata oluştu");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            {company?.name} - Firma Yönetim Paneli
          </h1>
        </div>

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
          {/* Şube Ekleme Formu */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Yeni Şube Ekle</h2>
            <form onSubmit={handleAddBranch}>
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
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              >
                Şube Ekle
              </button>
            </form>
          </div>

          {/* Şube Listesi */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Şubeleriniz</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Şube Adı
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Adres
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
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
                        {branch.address}
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() =>
                            router.push(`/company/branches/${branch.id}`)
                          }
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Yönet
                        </button>
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
