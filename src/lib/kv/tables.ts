import kvClient from "./client";

export interface Table {
  tableNumber: string | number;
  capacity: string;
  status: string;
  location: string;
  isActive: boolean;
}

// Yerel bellek kullanımı için
const localMemoryTables: Record<string, Table> = {};

export const getAllTables = async (): Promise<Table[]> => {
  try {
    const tables = await kvClient.hgetall<Table>("tables");
    return Object.values(tables || {});
  } catch (error) {
    console.error("Error getting all tables:", error);
    return Object.values(localMemoryTables);
  }
};

export const getTableById = async (
  tableNumber: string | number
): Promise<Table | null> => {
  try {
    return await kvClient.hget<Table>("tables", tableNumber.toString());
  } catch (error) {
    console.error(`Error getting table ${tableNumber}:`, error);
    return localMemoryTables[tableNumber.toString()] || null;
  }
};

export const createTable = async (table: Partial<Table>): Promise<Table> => {
  const tableNumber = table.tableNumber || Date.now();
  const newTable = {
    ...table,
    tableNumber,
    status: table.status || "available",
    isActive: typeof table.isActive !== "undefined" ? table.isActive : true,
  } as Table;

  try {
    await kvClient.hset("tables", { [tableNumber.toString()]: newTable });
    return newTable;
  } catch (error) {
    console.error("Error creating table:", error);
    // Yine de yerel bellekte saklayalım
    localMemoryTables[tableNumber.toString()] = newTable;
    return newTable;
  }
};

export const updateTable = async (
  tableNumber: string | number,
  updates: Partial<Table>
): Promise<Table> => {
  try {
    const table = await getTableById(tableNumber);
    if (!table) {
      throw new Error(`Table ${tableNumber} not found`);
    }

    const updatedTable = { ...table, ...updates };

    await kvClient.hset("tables", { [tableNumber.toString()]: updatedTable });

    return updatedTable;
  } catch (error) {
    console.error(`Error updating table ${tableNumber}:`, error);
    throw error;
  }
};

export const deleteTable = async (
  tableNumber: string | number
): Promise<boolean> => {
  try {
    await kvClient.hdel("tables", tableNumber.toString());
    delete localMemoryTables[tableNumber.toString()];
    return true;
  } catch (error) {
    console.error(`Error deleting table ${tableNumber}:`, error);
    delete localMemoryTables[tableNumber.toString()];
    return true;
  }
};

export const initializeDefaultTables = async (): Promise<Table[]> => {
  const tables = await getAllTables();

  if (tables.length > 0) {
    return tables;
  }

  const defaultTables: Partial<Table>[] = [
    {
      tableNumber: 1,
      capacity: "2-4",
      location: "window",
      status: "available",
    },
    { tableNumber: 2, capacity: "2", location: "window", status: "available" },
    {
      tableNumber: 3,
      capacity: "4-6",
      location: "center",
      status: "available",
    },
    { tableNumber: 4, capacity: "4", location: "center", status: "available" },
    {
      tableNumber: 5,
      capacity: "6-8",
      location: "corner",
      status: "available",
    },
    { tableNumber: 6, capacity: "2", location: "bar", status: "available" },
    { tableNumber: 7, capacity: "2", location: "bar", status: "available" },
    {
      tableNumber: 8,
      capacity: "4-6",
      location: "outdoor",
      status: "available",
    },
    { tableNumber: 9, capacity: "4", location: "outdoor", status: "available" },
    {
      tableNumber: 10,
      capacity: "8-10",
      location: "private",
      status: "available",
    },
  ];

  const createdTables: Table[] = [];

  for (const table of defaultTables) {
    const newTable = await createTable(table);
    createdTables.push(newTable);
  }

  return createdTables;
};
