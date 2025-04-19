# Rezervasyon Sistemi

Bu proje, restoran ve kafeler için kullanılabilecek kapsamlı bir rezervasyon sistemi sunar.

## Özellikler

- Gerçek zamanlı masa rezervasyonu
- Admin paneli ve müşteri portalı
- Çakışma kontrolü ve bildirim sistemi
- Ödeme entegrasyonu
- Kullanıcı yönetimi

## Kurulum

```bash
# Depoyu klonlayın
git clone https://github.com/kullaniciadi/rezervasyon.git
cd rezervasyon

# Bağımlılıkları yükleyin
npm install

# .env dosyasını kurun
cp .env.example .env
# .env dosyasını kendi bilgilerinizle düzenleyin

# Geliştirme sunucusunu başlatın
npm run dev
```

## Redis Kurulumu

Bu projede veritabanı olarak Redis kullanılmaktadır. Redis'i yerel olarak kurmanız gerekecektir:

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install redis-server
sudo systemctl enable redis-server
```

### macOS

```bash
brew install redis
brew services start redis
```

### Windows

Redis Desktop Manager veya Windows için Redis'in diğer sürümlerini kurabilirsiniz.

## Kullanım

Proje http://localhost:3000 adresinde çalışacaktır.

- Admin paneli: http://localhost:3000/admin
- Müşteri portalı: http://localhost:3000

## Lisans

MIT
