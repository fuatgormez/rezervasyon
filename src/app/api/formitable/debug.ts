/*
Bu dosya, Formitable API'sine bağlanma sorunlarını gidermek için cURL komut örnekleri ve test yöntemleri içerir.

1. cURL ile Test
Aşağıdaki komutları gerçek bir terminal üzerinden deneyebilirsiniz. <RESTAURANT_KEY> ve <RESTAURANT_UUID> değerlerini kendi değerlerinizle değiştirin:

```bash
# Formitable API'sine GET isteği gönderme 
curl -i -X GET "https://api.formitable.com/v1/restaurants/<RESTAURANT_UUID>/tables" \
  -H "Authorization: Bearer <RESTAURANT_KEY>" \
  -H "Accept: application/json"

# Formitable API'si hakkında bilgi alma
curl -i -X GET "https://api.formitable.com/v1/restaurants" \
  -H "Authorization: Bearer <RESTAURANT_KEY>" \
  -H "Accept: application/json"

# Alternatif API sürümü ile deneme
curl -i -X GET "https://api.formitable.com/api/v1.2/restaurants/<RESTAURANT_UUID>" \
  -H "Authorization: Bearer <RESTAURANT_KEY>" \
  -H "Accept: application/json"

# Sadece restoran bilgilerini alma
curl -i -X GET "https://api.formitable.com/v1/restaurant" \
  -H "Authorization: Bearer <RESTAURANT_KEY>" \
  -H "Accept: application/json"
```

2. Sorun Giderme Adımları

a) API anahtarınızın doğru olduğundan emin olun
   - Formitable yönetim panelinden API anahtarınızı kontrol edin
   - API anahtarının tam formatta olduğunu doğrulayın (boşluk veya ekstra karakter olmadığından emin olun)

b) Restaurant UUID'sinin doğru olduğunu kontrol edin
   - UUID'nin tam formatta olduğunu doğrulayın (8-4-4-4-12 formatında olmalı)
   - UUID'yi Formitable panelinden tekrar kontrol edin

c) API'ye erişim izinlerinizi kontrol edin
   - API anahtarınızın gereken tüm izinlere sahip olduğundan emin olun
   - Formitable yönetimine, API anahtarınızın "tables" ve "customers" için yetkilendirildiğini doğrulayın

d) Formitable desteğe başvurun
   - Tüm yanıtların 500 hatası vermesi, muhtemelen Formitable API sunucusunda bir sorun olduğunu gösterir
   - Formitable desteğine başvurun ve API anahtarınız ve restaurant UUID'niz ile yaptığınız isteklerin 500 hatası aldığını belirtin
*/

import { NextRequest, NextResponse } from "next/server";

// Bu endpoint, test ve debug amaçlı kullanılabilir
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message:
      "Bu endpoint, Formitable API debug yardımcısıdır. Yukarıdaki cURL komutlarını kullanarak API'yi test edin.",
    documentation: "https://docs.formitable.com/api",
  });
}
