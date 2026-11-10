import '@/components/v2/settings/_settings.css';
import type { ReactNode } from 'react';

// Onboarding pages render as a full-screen wizard overlay above the V2 shell
// (rail/panel still mount in the DOM but are visually masked by .onb).
export default function V2OnboardingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
