import Link from 'next/link';
import { BLOG_FILTERS, BLOG_POSTS, FEATURED_POST } from './posts';

export function V2BlogList() {
  return (
    <>
      <div className="filter-row">
        {BLOG_FILTERS.map((f, idx) => (
          <span key={f} className={`filter-chip${idx === 0 ? ' is-active' : ''}`}>
            {f}
          </span>
        ))}
      </div>

      <Link className="featured-post" href={`/blog/${FEATURED_POST.slug}`}>
        <div className="cover">{FEATURED_POST.cover}</div>
        <div className="body">
          <div className="tag">{FEATURED_POST.tag}</div>
          <h2>{FEATURED_POST.title}</h2>
          <p>{FEATURED_POST.excerpt}</p>
          <div className="meta">
            {FEATURED_POST.date} · {FEATURED_POST.author}
          </div>
        </div>
      </Link>

      <div className="blog-list-grid">
        {BLOG_POSTS.map((p) => (
          <Link key={p.slug} className="blog-list-card" href={`/blog/${p.slug}`}>
            <div className="cover">{p.cover}</div>
            <div className="body">
              <div className="tag">{p.tag}</div>
              <h3>{p.title}</h3>
              <p>{p.excerpt}</p>
              <div className="meta">
                {p.date} · {p.author}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
