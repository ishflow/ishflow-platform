type Section = { id?: string; heading?: string; level?: 2 | 3; body: React.ReactNode };

export type LongFormDoc = {
  title: string;
  lastUpdated: string;
  intro: React.ReactNode;
  sections: Section[];
};

export function V2LegalLongForm({ doc }: { doc: LongFormDoc }) {
  return (
    <article className="long-form">
      <h1>{doc.title}</h1>
      <div className="last-updated">{doc.lastUpdated}</div>
      <div>{doc.intro}</div>
      {doc.sections.map((s, idx) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: ordered sections
        <section key={idx}>
          {s.heading ? (
            s.level === 3 ? (
              <h3 id={s.id}>{s.heading}</h3>
            ) : (
              <h2 id={s.id}>{s.heading}</h2>
            )
          ) : null}
          {s.body}
        </section>
      ))}
    </article>
  );
}
