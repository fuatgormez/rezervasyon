import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Edge API Routes veya serverless ortamda WebSocket desteklenmez
    // Bu sadece bir yanıt döndürür
    return NextResponse.json(
      {
        success: true,
        message:
          "Socket.IO kullanmak için /api/socket endpoint'ini ziyaret edin",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Socket API error:", error);
    return NextResponse.json(
      { success: false, message: "Socket API error" },
      { status: 500 }
    );
  }
}
