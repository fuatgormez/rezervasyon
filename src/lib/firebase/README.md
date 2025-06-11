# Firebase Entegrasyonu

Bu proje Firebase ile oturum yönetimi ve veritabanı işlemleri yapmaktadır.

## Kurulum

1. Firebase konsolundan bir proje oluşturun: https://console.firebase.google.com/
2. Web uygulaması olarak ekleyin ve yapılandırma bilgilerini alın
3. Proje ana dizininde `.env.local` dosyası oluşturun ve aşağıdaki bilgileri ekleyin:

```
# Firebase Konfigürasyonu
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

## Kullanım

### Auth İşlemleri

Firebase ile kimlik doğrulama işlemleri için `useAuthContext` hook'unu kullanabilirsiniz:

```tsx
import { useAuthContext } from "@/lib/firebase";

function ExampleComponent() {
  const { user, login, register, logout, loading } = useAuthContext();

  // Kullanım örnekleri...
}
```

### Korumalı Sayfalar

Sayfaları korumak için `AuthGuard` bileşenini kullanabilirsiniz:

```tsx
import AuthGuard from "@/components/AuthGuard";

export default function ProtectedPage() {
  return <AuthGuard>{/* Korumalı içerik */}</AuthGuard>;
}
```

Admin sayfaları için:

```tsx
<AuthGuard adminOnly={true}>
  {/* Sadece adminlerin erişebileceği içerik */}
</AuthGuard>
```

### Firestore İşlemleri

Veritabanı işlemleri için `useFirestore` hook'unu kullanabilirsiniz:

```tsx
import { useFirestore } from "@/lib/firebase";

function ExampleComponent() {
  // Tip güvenli kullanım için interface tanımlayabilirsiniz
  interface User {
    id: string;
    name: string;
    email: string;
  }

  const { documents, loading, error, getAll, getById, add, update, remove } =
    useFirestore<User>("users");

  // Kullanım örnekleri...
}
```

### Storage İşlemleri

Dosya yükleme ve silme işlemleri için storage yardımcılarını kullanabilirsiniz:

```tsx
import { uploadFile, deleteFile, uploadMultipleFiles } from "@/lib/firebase";

// Tek dosya yükleme
const fileUrl = await uploadFile(file, "users/avatars");

// Birden fazla dosya yükleme
const fileUrls = await uploadMultipleFiles(files, "products/images");

// Dosya silme
await deleteFile(fileUrl);
```
