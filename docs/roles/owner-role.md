# Владелец (Owner) — Web erişim haritası

> Decided 2026-05-05. Canonical role for tenant ownership. Auto-assigned to Clerk org owner. Exactly 1 per tenant.

## Tanım

Vladелец = SaaS tenant sahibi. Tüm yönetici (Администратор) yetkilerine sahiptir, **ek olarak** sadece kendisinin yapabildiği şeyler:

- Faturalama / abonelik yönetimi (plan, ödeme yöntemi, geçmiş faturalar)
- Tenant'ı silme / arşivleme
- Sahipliği başka bir kullanıcıya devretme
- Diğer Vladелец / Администратор kullanıcılarını silme
- Tenant adı + marka (logo, renk, letterhead) düzenleme
- Tam veri export (GDPR / platformdan ayrılma)

Otomatik atanır (Clerk organization owner), DB-enforced uniqueness: tenant başına **tam 1**. Kendisini silemez — önce sahipliği devretmesi gerekir.

---

## Erişim politikası özeti

| Kategori | Erişim |
|---|---|
| Tüm modüller (Sales / Purchases / Inventory / Finance / Reports) | ✅ tam CRUD + post/unpost/delete |
| Tüm admin sayfaları | ✅ |
| Vladелец-exclusive sayfalar (3 yeni) | ✅ — sadece bu rol görür |
| Sidebar | Tüm öğeler + Billing + Branding + Danger zone |
| API uç noktaları | Tüm `/api/*` + 5 Vladелец-only endpoint |

---

## Tüm web rotaları (72 sayfa)

`[locale]` = `ru / en / tr / uz / ky / de / fr / zh` (8 locale × 72 = 576 fiziksel URL).

### A. Marketing & Auth

| # | Rota | Açıklama |
|---|---|---|
| 1 | `/[locale]` | Marketing landing |
| 2 | `/[locale]/sign-in/[[...sign-in]]` | Clerk web giriş |
| 3 | `/[locale]/sign-up/[[...sign-up]]` | Clerk kayıt |
| 4 | `/[locale]/sign-in/mobile` | iOS bridge giriş başlangıcı |
| 5 | `/[locale]/sign-in/mobile/complete` | iOS bridge token tamamlama |

### B. Dashboard

| # | Rota | Açıklama |
|---|---|---|
| 6 | `/[locale]/dashboard` | KPI strip + recent docs + dönem-kapanma uyarısı |

### C. Kataloglar — Müşteriler (`sales.customer`)

| # | Rota | Açıklama |
|---|---|---|
| 7 | `/[locale]/catalogs/sales.customer` | Liste + arama + saved views + export |
| 8 | `/[locale]/catalogs/sales.customer/new` | Yeni müşteri |
| 9 | `/[locale]/catalogs/sales.customer/[id]` | Müşteri detay/düzenle/sil |

### D. Kataloglar — Tedarikçiler (`purchases.supplier`)

| # | Rota | Açıklama |
|---|---|---|
| 10 | `/[locale]/catalogs/purchases.supplier` | Liste |
| 11 | `/[locale]/catalogs/purchases.supplier/new` | Yeni tedarikçi |
| 12 | `/[locale]/catalogs/purchases.supplier/[id]` | Tedarikçi detay |

### E. Kataloglar — Ürünler (`inventory.product`)

| # | Rota | Açıklama |
|---|---|---|
| 13 | `/[locale]/catalogs/inventory.product` | Özel override liste (kategori/grup filtre) |
| 14 | `/[locale]/catalogs/inventory.product/new` | Yeni ürün |
| 15 | `/[locale]/catalogs/inventory.product/[id]` | Ürün detay |

### F. Kataloglar — Ürün kategorileri (`inventory.product_category`)

| # | Rota | Açıklama |
|---|---|---|
| 16 | `/[locale]/catalogs/inventory.product_category` | Liste |
| 17 | `/[locale]/catalogs/inventory.product_category/new` | Yeni kategori |
| 18 | `/[locale]/catalogs/inventory.product_category/[id]` | Kategori detay |

### G. Kataloglar — Ürün grupları (`inventory.product_group`)

| # | Rota | Açıklama |
|---|---|---|
| 19 | `/[locale]/catalogs/inventory.product_group` | Liste |
| 20 | `/[locale]/catalogs/inventory.product_group/new` | Yeni grup |
| 21 | `/[locale]/catalogs/inventory.product_group/[id]` | Grup detay |

### H. Kataloglar — Depolar (`inventory.warehouse`)

| # | Rota | Açıklama |
|---|---|---|
| 22 | `/[locale]/catalogs/inventory.warehouse` | Liste |
| 23 | `/[locale]/catalogs/inventory.warehouse/new` | Yeni depo |
| 24 | `/[locale]/catalogs/inventory.warehouse/[id]` | Depo detay |

### I. Kataloglar — Para birimleri (`platform.currency`)

| # | Rota | Açıklama |
|---|---|---|
| 25 | `/[locale]/catalogs/platform.currency` | Liste |
| 26 | `/[locale]/catalogs/platform.currency/new` | Multi-pick currency picker |
| 27 | `/[locale]/catalogs/platform.currency/[id]` | Currency detay |

### J. Kataloglar — Fiyat türleri (`sales.price_type`)

| # | Rota | Açıklama |
|---|---|---|
| 28 | `/[locale]/catalogs/sales.price_type` | Liste (static/dynamic kind) |
| 29 | `/[locale]/catalogs/sales.price_type/new` | Yeni fiyat türü (split-button) |
| 30 | `/[locale]/catalogs/sales.price_type/[id]` | Fiyat türü detay |

### K. Kataloglar — Fiyat anlaşmaları (`sales.price_agreement`)

| # | Rota | Açıklama |
|---|---|---|
| 31 | `/[locale]/catalogs/sales.price_agreement` | Liste |
| 32 | `/[locale]/catalogs/sales.price_agreement/new` | Yeni anlaşma |
| 33 | `/[locale]/catalogs/sales.price_agreement/[id]` | Anlaşma detay |

### L. Belgeler — Satış faturası (`sales.invoice`)

| # | Rota | Açıklama |
|---|---|---|
| 34 | `/[locale]/documents/sales.invoice` | Liste + bulk-post + bulk-delete + filtreler |
| 35 | `/[locale]/documents/sales.invoice/new` | Wizard (müşteri → satırlar → posta) |
| 36 | `/[locale]/documents/sales.invoice/[id]` | Birleşik detay (DRAFT/POSTED aynı layout) |

### M. Belgeler — Alış faturası (`purchases.invoice`)

| # | Rota | Açıklama |
|---|---|---|
| 37 | `/[locale]/documents/purchases.invoice` | Liste |
| 38 | `/[locale]/documents/purchases.invoice/new` | Yeni alış faturası |
| 39 | `/[locale]/documents/purchases.invoice/[id]` | Detay |

### N. Belgeler — Tahsilat (`sales.payment_received`)

| # | Rota | Açıklama |
|---|---|---|
| 40 | `/[locale]/documents/sales.payment_received` | Liste |
| 41 | `/[locale]/documents/sales.payment_received/new` | Yeni tahsilat |
| 42 | `/[locale]/documents/sales.payment_received/[id]` | Tahsilat detay |

### O. Belgeler — Ödeme (`purchases.payment_sent`)

| # | Rota | Açıklama |
|---|---|---|
| 43 | `/[locale]/documents/purchases.payment_sent` | Liste |
| 44 | `/[locale]/documents/purchases.payment_sent/new` | Yeni ödeme |
| 45 | `/[locale]/documents/purchases.payment_sent/[id]` | Ödeme detay |

### P. Belgeler — Fiyat oluşturma (`inventory.price_setting`)

| # | Rota | Açıklama |
|---|---|---|
| 46 | `/[locale]/documents/inventory.price_setting` | Liste |
| 47 | `/[locale]/documents/inventory.price_setting/new` | Yeni fiyat-set belgesi |
| 48 | `/[locale]/documents/inventory.price_setting/[id]` | Detay |

### Q. Register'lar

| # | Rota | Açıklama |
|---|---|---|
| 49 | `/[locale]/registers/sales.accounts_receivable` | A/R bakiyesi |
| 50 | `/[locale]/registers/purchases.accounts_payable` | A/P bakiyesi |
| 51 | `/[locale]/registers/sales.sale` | Satışlar (counterparty × ürün) |
| 52 | `/[locale]/registers/inventory.stock_balance` | Stok bakiyesi |
| 53 | `/[locale]/registers/inventory.product_price` | Fiyat matrisi |

### R. Raporlar

| # | Rota | Açıklama |
|---|---|---|
| 54 | `/[locale]/reports` | Rapor merkezi (tüm linkler) |
| 55 | `/[locale]/reports/gross-profit` | 5-boyutlu pivot (müşteri/ürün/depo/dönem/satışçı) |
| 56 | `/[locale]/reports/turnover/sales.accounts_receivable` | A/R turnover (xlsx export) |
| 57 | `/[locale]/reports/turnover/purchases.accounts_payable` | A/P turnover |
| 58 | `/[locale]/reports/turnover/sales.sale` | Satış turnover |
| 59 | `/[locale]/reports/turnover/inventory.stock_balance` | Stok turnover |

### S. Yönetim — Mevcut

| # | Rota | Açıklama |
|---|---|---|
| 60 | `/[locale]/admin/audit` | Audit log liste + arama + filtre |
| 61 | `/[locale]/admin/audit/[id]` | Audit kaydı detay |
| 62 | `/[locale]/admin/fx-rates` | FX kurları |
| 63 | `/[locale]/admin/members` | Üyeler + davet + rol atama + sahiplik devri |
| 64 | `/[locale]/admin/mobile-features` | iOS/Android feature flag matrisi |
| 65 | `/[locale]/admin/period-close` | Dönem kapatma/açma |
| 66 | `/[locale]/admin/roles` | Rol listesi (yerleşik + özel) |
| 67 | `/[locale]/admin/roles/new` | Özel rol yaratma |
| 68 | `/[locale]/admin/roles/[id]` | Rol düzenleme/silme |

### T. Yönetim — Vladелец-only 🆕 (yapılmadı)

| # | Rota | Açıklama |
|---|---|---|
| 69 | `/[locale]/admin/billing` | Plan, ödeme yöntemi, fatura geçmişi |
| 70 | `/[locale]/admin/branding` | Logo, ana renk, letterhead |
| 71 | `/[locale]/admin/danger` | Tenant sil + sahiplik devri + GDPR full export |

### U. Ayarlar

| # | Rota | Açıklama |
|---|---|---|
| 72 | `/[locale]/settings` | Profil + tema + dil + tenant adı (Vladелец düzenler) + varsayılanlar |

---

## Vladелец-exclusive yetkiler (özet)

| Permission key | Endpoint / sayfa | Не |
|---|---|---|
| `admin.billing:manage` | `/admin/billing`, `/api/admin/billing/*` | Plan + Stripe + faturalar |
| `owner:tenant_delete` | `/admin/danger` | Tenant sil/arşivle |
| `owner:tenant_transfer` | `/admin/members`, `/admin/danger` | Sahipliği devret |
| `owner:branding` | `/admin/branding` | Logo + renk |
| `owner:export_full` | `/admin/danger` | GDPR tam dump |
| `owner:remove_admin` | `/admin/members` | Diğer Администратор'u sil |
| `owner:settings_rename` | `/settings` (tenant adı) | Yasal isim değişikliği |

## API uç noktaları (Vladелец-only)

| Endpoint | Method | Не |
|---|---|---|
| `/api/admin/billing/*` | GET / POST / DELETE | Stripe webhook + plan |
| `/api/admin/tenant/delete` | DELETE | İki-aşamalı onay |
| `/api/admin/tenant/transfer-ownership` | POST | Atomic role swap |
| `/api/admin/tenant/branding` | PUT | Logo upload + renk |
| `/api/admin/export/full` | POST | GDPR full dump (zip) |

## Üyeler sayfasında ek düğmeler

- "Sahipliği devret" — her diğer Администратор satırında
- "Yöneticiyi sil" — diğer Администратор'lar için
- "Vladелец rolünü ata" — sadece Vladелец davet ederken seçebilir

---

## Değişiklik geçmişi

| Tarih | Не |
|---|---|
| 2026-05-05 | İlk sürüm — 72 sayfa enumeration + Vladелец-exclusive yetkiler |
