import admin from "firebase-admin";

// Firebase Admin SDK'yı başlat
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "reservation-4d834",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    databaseURL: "https://reservation-4d834-default-rtdb.firebaseio.com/",
  });
}

export const adminDb = admin.database();
export const adminAuth = admin.auth();
export default admin;
