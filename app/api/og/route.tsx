import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const SIZE = { width: 1200, height: 630 };

export async function GET(req: Request): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const title = (searchParams.get('title') ?? 'ishflow').slice(0, 180);
  const subtitle =
    searchParams.get('subtitle') ??
    'Metadata-driven ERP for SMBs — modern alternative to 1C:Enterprise.';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: 80,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #4338ca 100%)',
        color: '#f1f5f9',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #818cf8 0%, #6366f1 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 800,
            color: '#fff',
          }}
        >
          ish
        </div>
        <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: -0.5 }}>ishflow</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <h1
          style={{
            fontSize: title.length > 60 ? 56 : 72,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -1.5,
            margin: 0,
            maxWidth: 1040,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 24,
            color: '#cbd5e1',
            margin: 0,
            maxWidth: 900,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </p>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#94a3b8',
          fontSize: 18,
        }}
      >
        <span>ishflow.com</span>
        <span>Built for Russian & CIS SMBs</span>
      </div>
    </div>,
    {
      ...SIZE,
    },
  );
}
