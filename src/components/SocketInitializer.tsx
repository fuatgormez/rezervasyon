"use client";

import { useEffect } from "react";
import { io } from "socket.io-client";

export default function SocketInitializer() {
  useEffect(() => {
    // Sadece tarayıcı tarafında çalışacak
    if (typeof window === "undefined") return;

    // Socket.IO istemcisini oluştur
    const socket = io();

    // Bağlantı dinleyiciler
    socket.on("connect", () => {
      console.log("Socket.IO bağlantısı kuruldu");
    });

    socket.on("disconnect", () => {
      console.log("Socket.IO bağlantısı kesildi");
    });

    // admin:reservation-started olay dinleyici
    socket.on("admin:reservation-started", (data) => {
      console.log("Yeni rezervasyon bildirimi:", data);
      // CustomEvent oluşturup window'a gönder
      const event = new CustomEvent("new-reservation", { detail: data });
      window.dispatchEvent(event);
    });

    // admin:reservation-typing olay dinleyici
    socket.on("admin:reservation-typing", (data) => {
      console.log("Rezervasyon form doldurma bildirimi:", data);
      // CustomEvent oluşturup window'a gönder
      const event = new CustomEvent("reservation-typing", { detail: data });
      window.dispatchEvent(event);
    });

    // admin:reservation-completed olay dinleyici
    socket.on("admin:reservation-completed", (data) => {
      console.log("Rezervasyon tamamlandı bildirimi:", data);
      // CustomEvent oluşturup window'a gönder
      const event = new CustomEvent("reservation-completed", { detail: data });
      window.dispatchEvent(event);
    });

    // admin:reservation-cancelled olay dinleyici
    socket.on("admin:reservation-cancelled", (data) => {
      console.log("Rezervasyon iptal edildi bildirimi:", data);
      // CustomEvent oluşturup window'a gönder
      const event = new CustomEvent("reservation-cancelled", { detail: data });
      window.dispatchEvent(event);
    });

    // admin:reservation-expired olay dinleyici
    socket.on("admin:reservation-expired", (data) => {
      console.log("Rezervasyon süresi doldu bildirimi:", data);
      // CustomEvent oluşturup window'a gönder
      const event = new CustomEvent("reservation-expired", { detail: data });
      window.dispatchEvent(event);
    });

    // Temizlik işlemi
    return () => {
      socket.disconnect();
    };
  }, []);

  // Bu bileşen görsel bir öğe içermez
  return null;
}
