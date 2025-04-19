import { createServer } from "http";
import { Server } from "socket.io";
import { parse } from "url";
import next from "next";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

// Devam eden rezervasyon işlemlerini izlemek için
const activeReservationSessions = new Map();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Socket.IO server
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Socket.IO event listeners
  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Client disconnected
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });

    // Müşteri form doldurma aşamasında
    socket.on("reservation:typing", (data) => {
      console.log("Müşteri form dolduruyor:", data);

      // Aktif rezervasyon oturumlarını güncelle
      activeReservationSessions.set(data.sessionId, {
        ...data,
        socketId: socket.id,
        lastActivity: new Date(),
      });

      // Admin paneline gerçek zamanlı güncelleme gönder
      io.emit("admin:reservation-typing", data);
    });

    // Rezervasyon başlatma olayı
    socket.on("reservation:start", (data) => {
      console.log("Reservation started:", data);

      // Aktif rezervasyon oturumlarını güncelle
      activeReservationSessions.set(data.sessionId, {
        ...data,
        socketId: socket.id,
        lastActivity: new Date(),
      });

      // Admin paneline bildirim gönder
      io.emit("admin:reservation-started", data);
    });

    // Rezervasyon tamamlama olayı
    socket.on("reservation:complete", (data) => {
      console.log("Reservation completed:", data);

      // Aktif rezervasyon oturumundan kaldır
      activeReservationSessions.delete(data.sessionId);

      // Admin paneline bildirim gönder
      io.emit("admin:reservation-completed", data);
    });

    // Rezervasyon iptal olayı
    socket.on("reservation:cancel", (data) => {
      console.log("Reservation cancelled:", data);

      // Aktif rezervasyon oturumundan kaldır
      activeReservationSessions.delete(data.sessionId);

      // Admin paneline bildirim gönder
      io.emit("admin:reservation-cancelled", data);
    });
  });

  // 30 dakikadan uzun süre işlem yapılmayan rezervasyon oturumlarını temizle
  setInterval(() => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    activeReservationSessions.forEach((session, sessionId) => {
      if (session.lastActivity < thirtyMinutesAgo) {
        console.log(
          "Süresi dolmuş rezervasyon oturumu temizleniyor:",
          sessionId
        );
        activeReservationSessions.delete(sessionId);

        // Bilgilendirme mesajı gönder
        io.emit("admin:reservation-expired", {
          sessionId,
          customerName: session.formData?.customerName || "İsimsiz Müşteri",
          expiredAt: new Date(),
        });
      }
    });
  }, 5 * 60 * 1000); // 5 dakikada bir kontrol et

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
