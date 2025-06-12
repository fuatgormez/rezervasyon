"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAuthContext } from "@/lib/firebase";
import { useFirebase, UserProfile, UserRole } from "@/lib/firebase/hooks";
import { db } from "@/lib/firebase/config";
import { ref, get, update } from "firebase/database";

export default function UsersManagement() {
  const { userProfile, hasRole } = useAuthContext();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({
    email: "",
    name: "",
    password: "",
    role: "user" as UserRole,
  });
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  // Firebase hook
  const usersDb = useFirebase<UserProfile>("users");

  // Kullanıcı listesini yükle
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        const allUsers = await usersDb.getAll();
        setUsers(allUsers);
      } catch (error) {
        console.error("Kullanıcılar yüklenirken hata:", error);
        toast.error("Kullanıcılar yüklenirken bir hata oluştu");
      } finally {
        setLoading(false);
      }
    };

    if (hasRole("admin")) {
      loadUsers();
    } else {
      toast.error("Bu sayfaya erişim yetkiniz yok");
    }
  }, [hasRole]);

  // Yeni kullanıcı ekleme
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasRole("super_admin")) {
      toast.error("Yeni kullanıcı eklemek için süper admin yetkisi gereklidir");
      return;
    }

    try {
      // E-posta kontrolü
      if (!newUser.email || !newUser.email.includes("@")) {
        toast.error("Geçerli bir e-posta adresi girin");
        return;
      }

      // Şifre kontrolü
      if (!newUser.password || newUser.password.length < 6) {
        toast.error("Şifre en az 6 karakter olmalıdır");
        return;
      }

      // Firebase Auth ile kullanıcı kayıt işlemi
      const response = await fetch("/api/users/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          name: newUser.name,
          role: newUser.role,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Kullanıcı başarıyla oluşturuldu");
        // Kullanıcı listesini yenile
        const allUsers = await usersDb.getAll();
        setUsers(allUsers);
        // Formu temizle
        setNewUser({
          email: "",
          name: "",
          password: "",
          role: "user",
        });
      } else {
        toast.error(`Hata: ${data.message || "Kullanıcı oluşturulamadı"}`);
      }
    } catch (error: any) {
      console.error("Kullanıcı eklenirken hata:", error);
      toast.error(error.message || "Kullanıcı eklenirken bir hata oluştu");
    }
  };

  // Kullanıcı rolünü güncelleme
  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    if (!hasRole("super_admin")) {
      toast.error("Rol değiştirmek için süper admin yetkisi gereklidir");
      return;
    }

    try {
      // Kendi rolünü değiştirmeye çalışıyorsa engelle
      if (userId === userProfile?.id) {
        toast.error("Kendi rolünüzü değiştiremezsiniz");
        return;
      }

      const userRef = ref(db, `users/${userId}`);
      await update(userRef, {
        role: newRole,
        is_super_admin: newRole === "super_admin", // Geriye dönük uyumluluk
        updated_at: new Date().toISOString(),
      });

      toast.success("Kullanıcı rolü güncellendi");

      // Kullanıcı listesini yenile
      const allUsers = await usersDb.getAll();
      setUsers(allUsers);
    } catch (error: any) {
      console.error("Rol güncellenirken hata:", error);
      toast.error(error.message || "Rol güncellenirken bir hata oluştu");
    }
  };

  // Kullanıcıyı silme
  const handleDeleteUser = async (userId: string) => {
    if (!hasRole("super_admin")) {
      toast.error("Kullanıcı silmek için süper admin yetkisi gereklidir");
      return;
    }

    // Kendi hesabını silmeye çalışıyorsa engelle
    if (userId === userProfile?.id) {
      toast.error("Kendi hesabınızı silemezsiniz");
      return;
    }

    if (confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) {
      try {
        const response = await fetch(`/api/users/delete`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId }),
        });

        const data = await response.json();

        if (response.ok) {
          toast.success("Kullanıcı başarıyla silindi");
          // Kullanıcı listesini yenile
          const allUsers = await usersDb.getAll();
          setUsers(allUsers);
        } else {
          toast.error(`Hata: ${data.message || "Kullanıcı silinemedi"}`);
        }
      } catch (error: any) {
        console.error("Kullanıcı silinirken hata:", error);
        toast.error(error.message || "Kullanıcı silinirken bir hata oluştu");
      }
    }
  };

  // Süper admin yetki kontrolü
  if (!hasRole("admin")) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <h2 className="text-xl font-bold text-red-600 mb-2">
          Erişim Engellendi
        </h2>
        <p className="text-red-500">
          Bu sayfayı görüntülemek için admin yetkileri gereklidir.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Kullanıcı Yönetimi</h2>

      {/* Yeni Kullanıcı Formu */}
      {hasRole("super_admin") && (
        <div className="mb-8 border-b pb-6">
          <h3 className="text-lg font-semibold mb-4">Yeni Kullanıcı Ekle</h3>
          <form
            onSubmit={handleAddUser}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                E-posta
              </label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                İsim
              </label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) =>
                  setNewUser({ ...newUser, name: e.target.value })
                }
                className="w-full p-2 border rounded-md"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şifre
              </label>
              <input
                type="password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                className="w-full p-2 border rounded-md"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <select
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({ ...newUser, role: e.target.value as UserRole })
                }
                className="w-full p-2 border rounded-md"
              >
                <option value="user">Kullanıcı</option>
                <option value="admin">Admin</option>
                <option value="super_admin">Süper Admin</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Kullanıcı Ekle
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kullanıcı Listesi */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Kullanıcılar</h3>
        {loading ? (
          <p>Kullanıcılar yükleniyor...</p>
        ) : users.length === 0 ? (
          <p>Henüz kullanıcı bulunmuyor.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İsim
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-posta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Oluşturulma
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    İşlemler
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className={user.id === userProfile?.id ? "bg-blue-50" : ""}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                        {user.id === userProfile?.id && " (Siz)"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {hasRole("super_admin") && user.id !== userProfile?.id ? (
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(
                              user.id,
                              e.target.value as UserRole
                            )
                          }
                          className="text-sm p-1 border rounded"
                        >
                          <option value="user">Kullanıcı</option>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Süper Admin</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${
                            user.role === "super_admin"
                              ? "bg-purple-100 text-purple-800"
                              : user.role === "admin"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {user.role === "super_admin"
                            ? "Süper Admin"
                            : user.role === "admin"
                            ? "Admin"
                            : "Kullanıcı"}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString("tr-TR")
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {hasRole("super_admin") &&
                        user.id !== userProfile?.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900 ml-2"
                          >
                            Sil
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
