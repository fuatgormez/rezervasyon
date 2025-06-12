import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import { User, UserRole, UserLog } from "@/types/user";

const USERS_COLLECTION = "users";
const LOGS_COLLECTION = "user_logs";

export const userService = {
  // Kullanıcı oluşturma
  async createUser(user: User): Promise<void> {
    try {
      const userRef = doc(db, USERS_COLLECTION, user.uid);
      await setDoc(userRef, {
        ...user,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      });
      console.log("Kullanıcı başarıyla oluşturuldu:", user.uid);
    } catch (error) {
      console.error("Kullanıcı oluşturma hatası:", error);
      throw new Error("Kullanıcı oluşturulamadı");
    }
  },

  // Kullanıcı bilgilerini getirme
  async getUser(uid: string): Promise<User | null> {
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        return {
          ...data,
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          lastLoginAt: data.lastLoginAt.toDate(),
        } as User;
      }
      return null;
    } catch (error) {
      console.error("Kullanıcı getirme hatası:", error);
      throw new Error("Kullanıcı bilgileri alınamadı");
    }
  },

  // Kullanıcı güncelleme
  async updateUser(uid: string, data: Partial<User>): Promise<void> {
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      await updateDoc(userRef, {
        ...data,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Kullanıcı güncelleme hatası:", error);
      throw new Error("Kullanıcı güncellenemedi");
    }
  },

  // Kullanıcı rolünü güncelleme
  async updateUserRole(uid: string, role: UserRole): Promise<void> {
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      await updateDoc(userRef, {
        role,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Kullanıcı rolü güncelleme hatası:", error);
      throw new Error("Kullanıcı rolü güncellenemedi");
    }
  },

  // Kullanıcı durumunu güncelleme (aktif/pasif)
  async updateUserStatus(uid: string, isActive: boolean): Promise<void> {
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      await updateDoc(userRef, {
        isActive,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Kullanıcı durumu güncelleme hatası:", error);
      throw new Error("Kullanıcı durumu güncellenemedi");
    }
  },

  // Kullanıcı giriş logunu güncelleme
  async updateLastLogin(uid: string): Promise<void> {
    try {
      const userRef = doc(db, USERS_COLLECTION, uid);
      await updateDoc(userRef, {
        lastLoginAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Son giriş güncelleme hatası:", error);
      throw new Error("Son giriş bilgisi güncellenemedi");
    }
  },

  // Log oluşturma
  async createLog(log: Omit<UserLog, "id">): Promise<void> {
    try {
      const logsRef = collection(db, LOGS_COLLECTION);
      await addDoc(logsRef, {
        ...log,
        timestamp: Timestamp.now(),
      });
    } catch (error) {
      console.error("Log oluşturma hatası:", error);
      throw new Error("Log kaydedilemedi");
    }
  },

  // Kullanıcı loglarını getirme
  async getUserLogs(userId: string): Promise<UserLog[]> {
    try {
      const logsRef = collection(db, LOGS_COLLECTION);
      const q = query(logsRef, where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(),
      })) as UserLog[];
    } catch (error) {
      console.error("Log getirme hatası:", error);
      throw new Error("Loglar alınamadı");
    }
  },

  // Belirli bir role sahip kullanıcıları getirme
  async getUsersByRole(role: UserRole): Promise<User[]> {
    try {
      const usersRef = collection(db, USERS_COLLECTION);
      const q = query(usersRef, where("role", "==", role));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
        lastLoginAt: doc.data().lastLoginAt.toDate(),
      })) as User[];
    } catch (error) {
      console.error("Rol bazlı kullanıcı getirme hatası:", error);
      throw new Error("Kullanıcılar alınamadı");
    }
  },
};
