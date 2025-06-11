"use client";

import { storage } from "./config";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";

// Dosya yükleme fonksiyonu
export const uploadFile = async (file: File, path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const storageRef = ref(storage, `${path}/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          // Yükleme durumunu izle (istenirse progress bar için kullanılabilir)
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log("Upload is " + progress + "% done");
        },
        (error) => {
          // Hata durumunda
          reject(error);
        },
        () => {
          // Başarılı yükleme sonrası
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            resolve(downloadURL);
          });
        }
      );
    } catch (error) {
      reject(error);
    }
  });
};

// Dosya silme fonksiyonu
export const deleteFile = async (url: string): Promise<boolean> => {
  try {
    // URL'den storage path'ini elde et
    const fileRef = ref(storage, url);
    await deleteObject(fileRef);
    return true;
  } catch (error) {
    console.error("Dosya silme hatası:", error);
    return false;
  }
};

// Birden fazla dosya yükleme fonksiyonu
export const uploadMultipleFiles = async (
  files: File[],
  path: string
): Promise<string[]> => {
  const uploadPromises = files.map((file) => uploadFile(file, path));
  return Promise.all(uploadPromises);
};
