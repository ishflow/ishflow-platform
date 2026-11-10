import type { MetadataRoute } from 'next';

/**
 * PWA manifest — lets users install ishflow as a standalone mobile app
 * from Safari/Chrome "Add to Home Screen". Mobile layout is the same
 * responsive web UI; shadcn primitives + Tailwind breakpoints already
 * handle phone/tablet sizes.
 *
 * For a richer native feel, a Sprint 16+ task can layer a Capacitor
 * wrapper or a separate React Native Expo codebase on top of the same
 * backend API.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ishflow',
    short_name: 'ishflow',
    description: 'Metadata-driven ERP platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    orientation: 'portrait-primary',
    categories: ['business', 'finance', 'productivity'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
      },
    ],
  };
}
