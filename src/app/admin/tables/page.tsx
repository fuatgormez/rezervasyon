"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/config";
import { ref, get, set, push, remove, update } from "firebase/database";
import Link from "next/link";
import toast from "react-hot-toast";

// Türler
interface TableType {
  id: string;
  number: number;
  capacity: number;
  category_id: string;
  status: string;
}

interface CategoryType {
  id: string;
  name: string;
  color: string;
}

export default function TablesPage() {
  const [tables, setTables] = useState<TableType[]>([]);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [newTable, setNewTable] = useState({
    number: "",
    capacity: "2",
    category_id: "",
    status: "active",
  });

  const [newCategory, setNewCategory] = useState({
    name: "",
    color: "#3B82F6",
  });

  const [editTableId, setEditTableId] = useState<string | null>(null);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);

  // Masaları yükle
  const loadTables = async () => {
    try {
      setIsLoading(true);
      const tablesRef = ref(db, "tables");
      const snapshot = await get(tablesRef);

      if (snapshot.exists()) {
        const tablesData = snapshot.val();
        const loadedTables = Object.entries(tablesData).map(
          ([id, data]: [string, any]) => ({
            id,
            number: data.number || 0,
            capacity: data.capacity || 2,
            category_id: data.category_id || "",
            status: data.status || "active",
          })
        );

        loadedTables.sort((a, b) => a.number - b.number);
        setTables(loadedTables);
      } else {
        console.log("Masalar bulunamadı");
        setTables([]);
      }
    } catch (error) {
      console.error("Masaları yükleme hatası:", error);
      toast.error("Masalar yüklenirken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  // Kategorileri yükle
  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const categoriesRef = ref(db, "table_categories");
      const snapshot = await get(categoriesRef);

      if (snapshot.exists()) {
        const categoriesData = snapshot.val();
        const loadedCategories = Object.entries(categoriesData).map(
          ([id, data]: [string, any]) => ({
            id,
            name: data.name || "",
            color: data.color || "#3B82F6",
          })
        );

        loadedCategories.sort((a, b) => a.name.localeCompare(b.name));
        setCategories(loadedCategories);
      } else {
        console.log("Kategoriler bulunamadı");
        setCategories([]);
      }
    } catch (error) {
      console.error("Kategorileri yükleme hatası:", error);
      toast.error("Kategoriler yüklenirken bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  // Yeni masa ekleme
  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!newTable.number || !newTable.capacity || !newTable.category_id) {
        toast.error("Lütfen tüm masa bilgilerini girin");
        return;
      }

      const tableExists = tables.some(
        (table) => Number(table.number) === Number(newTable.number)
      );

      if (tableExists) {
        toast.error(`Masa ${newTable.number} zaten mevcut`);
        return;
      }

      const tableData = {
        number: Number(newTable.number),
        capacity: Number(newTable.capacity),
        category_id: newTable.category_id,
        status: newTable.status,
        created_at: new Date().toISOString(),
      };

      const newTableRef = push(ref(db, "tables"));
      await set(newTableRef, tableData);

      setNewTable({
        number: "",
        capacity: "2",
        category_id: "",
        status: "active",
      });

      toast.success("Masa başarıyla eklendi");
      loadTables();
    } catch (error) {
      console.error("Masa ekleme hatası:", error);
      toast.error("Masa eklenirken bir hata oluştu");
    }
  };

  // Yeni kategori ekleme
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!newCategory.name) {
        toast.error("Lütfen kategori adını girin");
        return;
      }

      const categoryData = {
        name: newCategory.name,
        color: newCategory.color,
        created_at: new Date().toISOString(),
      };

      const newCategoryRef = push(ref(db, "table_categories"));
      await set(newCategoryRef, categoryData);

      setNewCategory({
        name: "",
        color: "#3B82F6",
      });

      toast.success("Kategori başarıyla eklendi");
      loadCategories();
    } catch (error) {
      console.error("Kategori ekleme hatası:", error);
      toast.error("Kategori eklenirken bir hata oluştu");
    }
  };

  // Masa silme
  const handleDeleteTable = async (id: string) => {
    if (confirm("Bu masayı silmek istediğinize emin misiniz?")) {
      try {
        const tableRef = ref(db, `tables/${id}`);
        await remove(tableRef);
        toast.success("Masa başarıyla silindi");
        loadTables();
      } catch (error) {
        console.error("Masa silme hatası:", error);
        toast.error("Masa silinirken bir hata oluştu");
      }
    }
  };

  // Kategori silme
  const handleDeleteCategory = async (id: string) => {
    const tablesWithCategory = tables.filter(
      (table) => table.category_id === id
    );

    if (tablesWithCategory.length > 0) {
      toast.error(
        `Bu kategoriye ait ${tablesWithCategory.length} masa var. Önce masaları silmelisiniz.`
      );
      return;
    }

    if (confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) {
      try {
        const categoryRef = ref(db, `table_categories/${id}`);
        await remove(categoryRef);
        toast.success("Kategori başarıyla silindi");
        loadCategories();
      } catch (error) {
        console.error("Kategori silme hatası:", error);
        toast.error("Kategori silinirken bir hata oluştu");
      }
    }
  };

  // Masa durumunu güncelleme
  const handleUpdateTableStatus = async (id: string, newStatus: string) => {
    try {
      const tableRef = ref(db, `tables/${id}`);
      await update(tableRef, {
        status: newStatus,
        updated_at: new Date().toISOString(),
      });
      toast.success("Masa durumu güncellendi");
      loadTables();
    } catch (error) {
      console.error("Durum güncelleme hatası:", error);
      toast.error("Durum güncellenirken bir hata oluştu");
    }
  };

  // Masa düzenleme
  const handleEditTable = (table: TableType) => {
    setEditTableId(table.id);
    setNewTable({
      number: String(table.number),
      capacity: String(table.capacity),
      category_id: table.category_id,
      status: table.status,
    });
  };

  // Kategori düzenleme
  const handleEditCategory = (category: CategoryType) => {
    setEditCategoryId(category.id);
    setNewCategory({
      name: category.name,
      color: category.color,
    });
  };

  // Masa güncelleme
  const handleUpdateTable = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editTableId) return;

    try {
      if (!newTable.number || !newTable.capacity || !newTable.category_id) {
        toast.error("Lütfen tüm masa bilgilerini girin");
        return;
      }

      const tableExists = tables.some(
        (table) =>
          Number(table.number) === Number(newTable.number) &&
          table.id !== editTableId
      );

      if (tableExists) {
        toast.error(`Masa ${newTable.number} zaten mevcut`);
        return;
      }

      const tableData = {
        number: Number(newTable.number),
        capacity: Number(newTable.capacity),
        category_id: newTable.category_id,
        status: newTable.status,
        updated_at: new Date().toISOString(),
      };

      const tableRef = ref(db, `tables/${editTableId}`);
      await update(tableRef, tableData);

      setEditTableId(null);
      setNewTable({
        number: "",
        capacity: "2",
        category_id: "",
        status: "active",
      });

      toast.success("Masa başarıyla güncellendi");
      loadTables();
    } catch (error) {
      console.error("Masa güncelleme hatası:", error);
      toast.error("Masa güncellenirken bir hata oluştu");
    }
  };

  // Kategori güncelleme
  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editCategoryId) return;

    try {
      if (!newCategory.name) {
        toast.error("Lütfen kategori adını girin");
        return;
      }

      const categoryData = {
        name: newCategory.name,
        color: newCategory.color,
        updated_at: new Date().toISOString(),
      };

      const categoryRef = ref(db, `table_categories/${editCategoryId}`);
      await update(categoryRef, categoryData);

      setEditCategoryId(null);
      setNewCategory({
        name: "",
        color: "#3B82F6",
      });

      toast.success("Kategori başarıyla güncellendi");
      loadCategories();
    } catch (error) {
      console.error("Kategori güncelleme hatası:", error);
      toast.error("Kategori güncellenirken bir hata oluştu");
    }
  };

  const handleTableInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setNewTable((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCategoryInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { name, value } = e.target;
    setNewCategory((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    loadTables();
    loadCategories();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Masa ve Kategori Yönetimi</h1>
        <div className="flex space-x-2">
          <Link href="/admin/simple-dashboard">
            <button className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded">
              Rezervasyon Paneli
            </button>
          </Link>
          <Link href="/admin">
            <button className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded">
              Ana Panel
            </button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sol panel - Kategoriler */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">
            {editCategoryId ? "Kategori Düzenle" : "Yeni Kategori Ekle"}
          </h2>

          <form
            onSubmit={editCategoryId ? handleUpdateCategory : handleAddCategory}
            className="mb-4"
          >
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Kategori Adı
              </label>
              <input
                type="text"
                name="name"
                value={newCategory.name}
                onChange={handleCategoryInputChange}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Renk
              </label>
              <input
                type="color"
                name="color"
                value={newCategory.color}
                onChange={handleCategoryInputChange}
                className="mt-1 block w-full h-10 rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
              >
                {editCategoryId ? "Güncelle" : "Ekle"}
              </button>

              {editCategoryId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditCategoryId(null);
                    setNewCategory({ name: "", color: "#3B82F6" });
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
                >
                  İptal
                </button>
              )}
            </div>
          </form>

          <h3 className="font-medium text-lg mt-6 mb-2">Kategoriler</h3>

          {isLoading ? (
            <div className="text-center py-4">Yükleniyor...</div>
          ) : categories.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              Henüz kategori bulunmuyor
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Renk
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {categories.map((category) => (
                    <tr key={category.id}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div
                          className="w-6 h-6 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {category.name}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditCategory(category)}
                          className="text-blue-600 hover:text-blue-900 mr-2"
                        >
                          Düzenle
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(category.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Sil
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sağ panel - Masalar */}
        <div className="bg-white p-4 rounded shadow">
          <h2 className="text-lg font-semibold mb-4">
            {editTableId ? "Masa Düzenle" : "Yeni Masa Ekle"}
          </h2>

          <form
            onSubmit={editTableId ? handleUpdateTable : handleAddTable}
            className="mb-4"
          >
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Masa Numarası
              </label>
              <input
                type="number"
                name="number"
                value={newTable.number}
                onChange={handleTableInputChange}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                min="1"
                required
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Kapasite
              </label>
              <input
                type="number"
                name="capacity"
                value={newTable.capacity}
                onChange={handleTableInputChange}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                min="1"
                required
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Kategori
              </label>
              <select
                name="category_id"
                value={newTable.category_id}
                onChange={handleTableInputChange}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              >
                <option value="">Kategori Seçin</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Durum
              </label>
              <select
                name="status"
                value={newTable.status}
                onChange={handleTableInputChange}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="active">Aktif</option>
                <option value="inactive">Pasif</option>
              </select>
            </div>

            <div className="flex space-x-2">
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded"
              >
                {editTableId ? "Güncelle" : "Ekle"}
              </button>

              {editTableId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditTableId(null);
                    setNewTable({
                      number: "",
                      capacity: "2",
                      category_id: "",
                      status: "active",
                    });
                  }}
                  className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded"
                >
                  İptal
                </button>
              )}
            </div>
          </form>

          <h3 className="font-medium text-lg mt-6 mb-2">Masalar</h3>

          {isLoading ? (
            <div className="text-center py-4">Yükleniyor...</div>
          ) : tables.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              Henüz masa bulunmuyor
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Masa No
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kapasite
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Kategori
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Durum
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      İşlemler
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tables.map((table) => {
                    const category = categories.find(
                      (c) => c.id === table.category_id
                    );
                    return (
                      <tr key={table.id}>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {table.number}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          {table.capacity} kişilik
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <div className="flex items-center">
                            {category && (
                              <>
                                <div
                                  className="w-4 h-4 rounded-full mr-2"
                                  style={{ backgroundColor: category.color }}
                                />
                                {category.name}
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              table.status === "active"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {table.status === "active" ? "Aktif" : "Pasif"}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEditTable(table)}
                            className="text-blue-600 hover:text-blue-900 mr-2"
                          >
                            Düzenle
                          </button>
                          <button
                            onClick={() => handleDeleteTable(table.id)}
                            className="text-red-600 hover:text-red-900 mr-2"
                          >
                            Sil
                          </button>
                          <button
                            onClick={() =>
                              handleUpdateTableStatus(
                                table.id,
                                table.status === "active"
                                  ? "inactive"
                                  : "active"
                              )
                            }
                            className={`${
                              table.status === "active"
                                ? "text-gray-600 hover:text-gray-900"
                                : "text-green-600 hover:text-green-900"
                            }`}
                          >
                            {table.status === "active"
                              ? "Pasif Yap"
                              : "Aktif Yap"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
