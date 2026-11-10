# Администратор (Administrator) — Web erişim haritası

> Decided 2026-05-05. Yönetici rolü; tenant başına 0–N adet olabilir. Clerk org admin → otomatik bu role atanır.

## Tanım

Администратор = tenant'ın operasyonel yöneticisi. Tüm modüllere tam erişim (CRUD + post/unpost + delete), tüm yönetim sayfaları, üye davet/rol atama, dönem kapatma, FX/audit/period yönetimi.

**YAPAMAZ** (yalnızca Vladелец yapar):
- Faturalama / abonelik yönetimi
- Tenant silme / arşivleme
- Sahipliği devretme
- Diğer Администратор veya Vladелец'i silme
- Tenant adı (legal entity) düzenleme
- Marka (logo / renk / letterhead)
- GDPR tam veri export

Otomatik atanır: Clerk organization admin rolü (`org:admin`) bu role map edilir (`clerk-sync.ts mapRole`). Manuel olarak da Vladелец veya başka bir Администратор tarafından atanabilir.

---

## Erişim politikası özeti

| Kategori | Erişim |
|---|---|
| Tüm modüller (Sales / Purchases / Inventory / Finance / Reports) | ✅ tam CRUD + post/unpost/delete |
| Tüm admin sayfaları (audit, members, roles, period-close, fx-rates, mobile-features) | ✅ |
| Vladелец-exclusive sayfalar (billing / branding / danger) | ❌ — sidebar'da görünmez, doğrudan açarsa **403** |
| Sidebar | Billing + Branding + Danger zone HARİÇ tüm öğeler |
| API uç noktaları | Tüm `/api/*` HARİÇ 5 Vladелец-only endpoint |

---

## Tüm web rotaları (71 sayfa — Vladелец'in 72'sinden 3'ü hariç)

`[locale]` = `ru / en / tr / uz / ky / de / fr / zh`.

### A. Marketing & Auth

| # | Rota | Açıklama |
|---|---|---|
| 1 | `/[locale]` | Marketing landing |
| 2 | `/[locale]/sign-in/[[...sign-in]]` | Clerk web giriş |
| 3 | `/[locale]/sign-up/[[...sign-up]]` | Clerk kayıt |
| 4 | `/[locale]/sign-in/mobile` | iOS bridge giriş |
| 5 | `/[locale]/sign-in/mobile/complete` | iOS bridge token tamamlama |

### B. Dashboard

| # | Rota | Açıklama |
|---|---|---|
| 6 | `/[locale]/dashboard` | KPI strip + recent docs + dönem-kapanma uyarısı |

### C. Kataloglar — Müşteriler (`sales.customer`)

| # | Rota | Açıklama |
|---|---|---|
| 7 | `/[locale]/catalogs/sales.customer` | Liste |
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
| 35 | `/[locale]/documents/sales.invoice/new` | Wizard |
| 36 | `/[locale]/documents/sales.invoice/[id]` | Birleşik detay (DRAFT/POSTED) |

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
| 54 | `/[locale]/reports` | Rapor merkezi |
| 55 | `/[locale]/reports/gross-profit` | 5-boyutlu pivot |
| 56 | `/[locale]/reports/turnover/sales.accounts_receivable` | A/R turnover |
| 57 | `/[locale]/reports/turnover/purchases.accounts_payable` | A/P turnover |
| 58 | `/[locale]/reports/turnover/sales.sale` | Satış turnover |
| 59 | `/[locale]/reports/turnover/inventory.stock_balance` | Stok turnover |

### S. Yönetim — Tüm mevcut admin sayfaları

| # | Rota | Açıklama |
|---|---|---|
| 60 | `/[locale]/admin/audit` | Audit log liste + arama + filtre + export |
| 61 | `/[locale]/admin/audit/[id]` | Audit kaydı detay |
| 62 | `/[locale]/admin/fx-rates` | FX kurları (manuel + otomatik kaynak) |
| 63 | `/[locale]/admin/members` | Üyeler — davet + rol atama (Vladелец hariç) |
| 64 | `/[locale]/admin/mobile-features` | iOS/Android feature flag matrisi |
| 65 | `/[locale]/admin/period-close` | Dönem kapatma/açma |
| 66 | `/[locale]/admin/roles` | Rol listesi (yerleşik + özel) |
| 67 | `/[locale]/admin/roles/new` | Özel rol yaratma |
| 68 | `/[locale]/admin/roles/[id]` | Rol düzenleme/silme (Vladелец rolü hariç) |

### T. Yönetim — Vladелец-only ❌ ERİŞİM YOK

| # | Rota | Davranış |
|---|---|---|
| 69 | `/[locale]/admin/billing` | ❌ Sidebar'da görünmez, doğrudan açarsa 403 |
| 70 | `/[locale]/admin/branding` | ❌ 403 |
| 71 | `/[locale]/admin/danger` | ❌ 403 |

### U. Ayarlar (kısıtlı)

| # | Rota | Açıklama |
|---|---|---|
| 72 | `/[locale]/settings` | Profil + tema + dil + varsayılanlar (currency / depo / price type / saat dilimi) **+ Demo verisi içe aktar**. ❌ Tenant adı / yasal isim alanı **read-only** (sadece Vladелец düzenler) |

---

## Администратор yetkileri (permission key bazında)

| Bucket | Permissions |
|---|---|
| Catalogs | `catalog.*:read`, `catalog.*:write`, `catalog.*:delete` (tüm entity'ler) |
| Documents | `document.*:read`, `document.*:write`, `document.*:post`, `document.*:unpost`, `document.*:delete` |
| Registers | `register.*:read` (accumulation + information) |
| Reports | `reports.*:read`, `reports.*:export` (CSV / xlsx / PDF) |
| Members | `admin.members:manage`, `members:invite`, `members:role_assign` (**Vladелец rolü hariç**) |
| Roles | `admin.roles:manage` |
| Audit | `admin.audit:read`, `admin.audit:export`, `admin.audit:search` |
| FX | `admin.fx:manage` |
| Period close | `admin.period:manage` |
| Currency | `admin.currency:manage` |
| Mobile features | `admin.mobile:manage` |
| Org settings | `admin.settings:manage` (yasal isim hariç) |
| View-as-role | `admin.view_as_role` (impersonation testi) |
| Saved views | `saved_views:manage_global` |
| Attachments | `attachments:read|write|delete` |
| Demo import | `demo:import` |

## Администратор YAPAMAZ (Vladелец'e özel 7 yetki)

| Permission key | Hangi sayfa/eylem | Davranış |
|---|---|---|
| `admin.billing:manage` | `/admin/billing`, `/api/admin/billing/*` | Sidebar yok, 403 |
| `owner:tenant_delete` | `/admin/danger` | 403 |
| `owner:tenant_transfer` | `/admin/members` "Sahipliği devret" düğmesi | Düğme görünmez |
| `owner:branding` | `/admin/branding` | 403 |
| `owner:export_full` | `/admin/danger` "Tam export" düğmesi | 403 |
| `owner:remove_admin` | `/admin/members` diğer Администратор satır "Sil" | Sil düğmesi disabled |
| `owner:settings_rename` | `/settings` tenant adı alanı | Field read-only |

## Üyeler sayfasında sınırlamalar

| Eylem | Администратор |
|---|---|
| Üye davet et | ✅ |
| Rol ata: Бухгалтер / Кассир / Менеджер по продажам / Закупщик / Кладовщик / Только просмотр / Администратор | ✅ |
| Rol ata: **Vladелец** | ❌ — dropdown'da seçenek yok |
| Üye sil: Менеджер / Бухгалтер / vb. | ✅ |
| Üye sil: **Diğer Администратор** | ❌ — düğme disabled |
| Üye sil: **Vladелец** | ❌ — düğme disabled |
| Sahipliği devret | ❌ — düğme görünmez |

## API uç noktaları (Администратор'a kapalı)

| Endpoint | Method | Davranış |
|---|---|---|
| `/api/admin/billing/*` | * | 403 |
| `/api/admin/tenant/delete` | DELETE | 403 |
| `/api/admin/tenant/transfer-ownership` | POST | 403 |
| `/api/admin/tenant/branding` | PUT | 403 |
| `/api/admin/export/full` | POST | 403 |

Geri kalan tüm `/api/*` endpoint'lerine ✅ erişimi var.

---

## Особенности (Особое поведение)

| Durum | Администратор davranışı |
|---|---|
| Yeni Clerk org admin tenant'a katılırsa | Otomatik bu role atanır (`mapRole` Clerk `org:admin` → `Администратор`) |
| Dönem kapatma | ✅ açabilir/kapatabilir (FX rates ve currency yönetimi gibi tüm finansal idari işlemler dahil) |
| Vladелец yokken (silinmiş hesap senaryosu) | Engine senaryosu: Vladелец olmayan tenant blocked — Clerk org owner re-sync gerekir; Администратор bu durumda `tenant_recovery` flow'una yönlendirilir |
| View-as-role banner | ✅ kullanır; ancak Vladелец rolünü impersonate edemez (Vladелец'in billing sayfaları yine görünmez) |

---

## Değişiklik geçmişi

| Tarih | Не |
|---|---|
| 2026-05-05 | İlk sürüm — 71 sayfa enumeration + Администратор'un yapamadıkları + üye sayfası kısıtlamaları |
