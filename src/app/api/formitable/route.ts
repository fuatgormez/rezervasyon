import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { endpoint, restaurantKey, restaurantId } = await request.json();

    if (!endpoint || !restaurantKey || !restaurantId) {
      return NextResponse.json(
        { error: "Endpoint, restaurant key, and restaurant ID are required" },
        { status: 400 }
      );
    }

    // Birkaç olası API yapısını deneyelim
    const possibleUrls = [
      `https://api.formitable.com/api/v1.2/${endpoint}`,
      `https://api.formitable.com/api/v1.2/restaurants/${restaurantId}/${endpoint}`,
      `https://api.formitable.com/v1/restaurants/${restaurantId}/${endpoint}`,
      `https://api.formitable.com/v1.2/restaurants/${restaurantId}/${endpoint}`,
    ];

    let successResponse = null;
    const errors = [];

    // Tüm olası URL'leri deneyelim
    for (const url of possibleUrls) {
      try {
        console.log(`Trying URL: ${url}`);

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${restaurantKey}`,
            Accept: "application/json",
          },
        });

        console.log(`Response from ${url}: ${response.status}`);

        if (response.ok) {
          // Başarılı bir cevap aldık
          const data = await response.json();
          successResponse = data;
          console.log(`Successful response from ${url}`);
          break;
        } else {
          // Bu URL başarısız oldu, hatayı kaydet
          try {
            const errorText = await response.text();
            errors.push({
              url,
              status: response.status,
              statusText: response.statusText,
              error: errorText,
            });
          } catch (e) {
            errors.push({
              url,
              status: response.status,
              statusText: response.statusText,
              error: "Could not read error response",
            });
          }
        }
      } catch (e) {
        errors.push({
          url,
          error: (e as Error).message,
        });
      }
    }

    // Eğer başarılı bir cevap aldıysak, onu döndür
    if (successResponse) {
      return NextResponse.json(successResponse);
    }

    // Hiçbir URL başarılı olmadıysa, hata döndür
    console.error("All Formitable API attempts failed:", errors);

    return NextResponse.json(
      {
        error: "All Formitable API attempts failed",
        attempts: errors,
      },
      { status: 500 }
    );
  } catch (error) {
    console.error("Formitable API proxy error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}
