// src/lib/log.ts
// Loglama fonksiyonu. Tüm önemli işlemler burada kaydedilir.

export interface LogEntry {
  timestamp: string;
  action: string;
  description: string;
}

export function addLog(action: string, description: string) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    action,
    description,
  };
  // Console'a yaz
  console.log(
    `[LOG] [${entry.timestamp}] [${entry.action}] ${entry.description}`
  );
  // localStorage'a ekle
  if (typeof window !== "undefined") {
    const logs = JSON.parse(localStorage.getItem("adminLogs") || "[]");
    logs.push(entry);
    localStorage.setItem("adminLogs", JSON.stringify(logs));
  }
}

export function getLogs(): LogEntry[] {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem("adminLogs") || "[]");
  }
  return [];
}
