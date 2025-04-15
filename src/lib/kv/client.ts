import { kv } from "@vercel/kv";

// Ortam değişkenleri kontrolü için fallback mekanizması
class KVClient {
  private readonly client: typeof kv | null;
  private readonly memoryStore: Map<string, Map<string, unknown> | unknown>;

  constructor() {
    this.memoryStore = new Map();

    try {
      // Eğer ortam değişkenleri eksikse, kv null olabilir veya hata fırlatabilir
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        this.client = kv;
      } else {
        console.warn(
          "KV_REST_API_URL veya KV_REST_API_TOKEN eksik, bellek içi depolama kullanılacak"
        );
        this.client = null;
      }
    } catch (error) {
      console.error("Vercel KV istemcisi oluşturulamadı:", error);
      this.client = null;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.client) {
        return await this.client.get<T>(key);
      }
      return (this.memoryStore.get(key) as T) || null;
    } catch (error) {
      console.error(`KV get hatası (${key}):`, error);
      return (this.memoryStore.get(key) as T) || null;
    }
  }

  async set<T>(
    key: string,
    value: T,
    options?: Record<string, unknown>
  ): Promise<string> {
    try {
      if (this.client) {
        await this.client.set(key, value, options);
        return "OK";
      }
      this.memoryStore.set(key, value);
      return "OK";
    } catch (error) {
      console.error(`KV set hatası (${key}):`, error);
      this.memoryStore.set(key, value);
      return "OK";
    }
  }

  async hget<T>(hash: string, key: string): Promise<T | null> {
    try {
      if (this.client) {
        return await this.client.hget<T>(hash, key);
      }
      const hashMap =
        (this.memoryStore.get(hash) as Map<string, T>) || new Map<string, T>();
      return (hashMap.get(key) as T) || null;
    } catch (error) {
      console.error(`KV hget hatası (${hash}:${key}):`, error);
      const hashMap =
        (this.memoryStore.get(hash) as Map<string, T>) || new Map<string, T>();
      return (hashMap.get(key) as T) || null;
    }
  }

  async hset(
    hash: string,
    keyValueMap: Record<string, unknown>
  ): Promise<number> {
    try {
      if (this.client) {
        return await this.client.hset(hash, keyValueMap);
      }

      let hashMap = this.memoryStore.get(hash) as Map<string, unknown>;
      if (!hashMap) {
        hashMap = new Map<string, unknown>();
        this.memoryStore.set(hash, hashMap);
      }

      for (const [key, value] of Object.entries(keyValueMap)) {
        hashMap.set(key, value);
      }

      return Object.keys(keyValueMap).length;
    } catch (error) {
      console.error(`KV hset hatası (${hash}):`, error);

      let hashMap = this.memoryStore.get(hash) as Map<string, unknown>;
      if (!hashMap) {
        hashMap = new Map<string, unknown>();
        this.memoryStore.set(hash, hashMap);
      }

      for (const [key, value] of Object.entries(keyValueMap)) {
        hashMap.set(key, value);
      }

      return Object.keys(keyValueMap).length;
    }
  }

  async hgetall<T extends Record<string, unknown>>(
    hash: string
  ): Promise<Record<string, T[keyof T]> | null> {
    try {
      if (this.client) {
        // TypeScript hatası nedeniyle cast ediyoruz
        return (await this.client.hgetall(hash)) as unknown as Record<
          string,
          T[keyof T]
        > | null;
      }

      const hashMap = this.memoryStore.get(hash) as Map<string, T[keyof T]>;
      if (!hashMap) return null;

      const result: Record<string, T[keyof T]> = {};
      for (const [key, value] of hashMap.entries()) {
        result[key] = value;
      }

      return result;
    } catch (error) {
      console.error(`KV hgetall hatası (${hash}):`, error);

      const hashMap = this.memoryStore.get(hash) as Map<string, T[keyof T]>;
      if (!hashMap) return null;

      const result: Record<string, T[keyof T]> = {};
      for (const [key, value] of hashMap.entries()) {
        result[key] = value;
      }

      return result;
    }
  }

  async hdel(hash: string, ...keys: string[]): Promise<number> {
    try {
      if (this.client) {
        return await this.client.hdel(hash, ...keys);
      }

      const hashMap = this.memoryStore.get(hash) as Map<string, unknown>;
      if (!hashMap) return 0;

      let deletedCount = 0;
      for (const key of keys) {
        if (hashMap.has(key)) {
          hashMap.delete(key);
          deletedCount++;
        }
      }

      return deletedCount;
    } catch (error) {
      console.error(`KV hdel hatası (${hash}):`, error);

      const hashMap = this.memoryStore.get(hash) as Map<string, unknown>;
      if (!hashMap) return 0;

      let deletedCount = 0;
      for (const key of keys) {
        if (hashMap.has(key)) {
          hashMap.delete(key);
          deletedCount++;
        }
      }

      return deletedCount;
    }
  }
}

// Singleton örneği oluştur
const kvClient = new KVClient();

// Vercel KV client için arayüz
export default kvClient;
