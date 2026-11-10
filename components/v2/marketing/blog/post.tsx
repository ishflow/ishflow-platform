import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export type BlogPostContent = {
  category: string;
  tag: string;
  title: string;
  lead: string;
  author: { name: string; initials: string; date: string };
  coverLabel: string;
  body: React.ReactNode;
  authorCard: { name: string; role: string; initials: string };
};

export function V2BlogPost({ post }: { post: BlogPostContent }) {
  return (
    <article className="post-article">
      <div className="crumb">
        <Link href="/blog">Blog</Link>
        <ChevronRight size={12} strokeWidth={2} />
        <span>{post.category}</span>
      </div>
      <header>
        <div className="tag">{post.tag}</div>
        <h1>{post.title}</h1>
        <p>{post.lead}</p>
        <div className="author-meta">
          <div className="avatar">{post.author.initials}</div>
          <div>
            <div className="name">{post.author.name}</div>
            <div>
              {post.author.date} · {post.category}
            </div>
          </div>
        </div>
      </header>
      <div className="cover-ph">{post.coverLabel}</div>
      <div className="prose">{post.body}</div>
      <div className="author-card">
        <div className="avatar">{post.authorCard.initials}</div>
        <div>
          <div className="name">{post.authorCard.name}</div>
          <div className="role">{post.authorCard.role}</div>
        </div>
      </div>
    </article>
  );
}

export const SAMPLE_POST: BlogPostContent = {
  category: 'Müşteri öyküleri',
  tag: 'Müşteri öyküleri · 8 dk okuma',
  title: "Vatan Bilgisayar: 1C'den ishflow'a 11 günde geçtik",
  lead: "İstanbul'un en eski bilgisayar zinciri, 6 mağazasını ishflow'a taşıma sürecini ve gün başına ne kazandığını anlatıyor. Stok bakiyesi şimdi 30 saniyede değil, anında güncelleniyor.",
  author: { name: 'Esra Kılıç', initials: 'EK', date: '17 Mayıs 2026' },
  coverLabel: 'cover — vatan bilgisayar mağaza fotoğrafı',
  body: (
    <>
      <p>
        Bu yazı, müşterimiz Vatan Bilgisayar muhasebe ekibinin geçiş notlarına dayanıyor. 11 günde 6
        mağaza, 318 ürün, 3 yıllık geçmiş veri — tek bir gün operasyonu durdurmadan ishflow'a
        taşındı.
      </p>
      <h2>Başlangıç noktası</h2>
      <p>
        Vatan, 2019'dan beri yerel 1C 8.3 ile çalışıyordu. Şubeler tek tek senkronize ediliyordu; ay
        sonu rapor için ortalama 3 gün kapanış süresi vardı. CFO Aydar bey'in tek isteği basitti:
        "Excel'siz, sürekli güncel bir merkezi sistem."
      </p>
      <blockquote>
        "Yıllarca 1C'de çalıştık. Yeni sistem değil, yeni bir hız istiyoruz. Kapanış için 3 gün
        değil 3 saat — bunu yapan her şeye bakarız."
      </blockquote>
      <h2>Geçiş adımları</h2>
      <p>
        1. Gün — 1C ihracı: 318 ürün, 82 müşteri, 2.418 fatura, 47 MB XML. 2–3. Gün — Eşleştirme: 11
        belirsiz birim manuel düzeltildi. 4–9. Gün — Paralel çalışma: iki sistem yan yana. 10–11.
        Gün — Tek sistem ishflow.
      </p>
      <ul>
        <li>İlk gün 4 tutarsızlık çıktı — hepsi insan hatası, ishflow değil.</li>
        <li>3. günden itibaren tutarsızlık sıfırlandı.</li>
        <li>Ekip, ishflow'un fatura formunu 1C'den daha hızlı kullanmaya başladı.</li>
      </ul>
      <h2>Sonuç</h2>
      <p>
        Bir önceki ay sonu kapanış 72 saat sürmüştü. ishflow'a geçişten sonraki ilk ay sonu:{' '}
        <strong>2 saat 14 dakika</strong>. Stok bakiyesi sorgusu, eski sistemde 30 saniyenin
        üzerindeyken ishflow'da anlık.
      </p>
    </>
  ),
  authorCard: {
    name: 'Esra Kılıç',
    role: 'Müşteri Başarı Lideri · ishflow',
    initials: 'EK',
  },
};
