/**
 * Shared Clerk `appearance.elements` for the embedded `<SignIn>` / `<SignUp>`
 * widgets on the Aurora-glass auth surface.
 *
 * Our `.auth-card` already supplies the frosted card, brand mark and title, so
 * the Clerk widget must render as a *bare form*: no nested card, no duplicate
 * header ("Sign in to ishflow"), no boxed footer. We deliberately map each
 * element to a plain hook class (NOT Tailwind utilities) styled in
 * `v2-public.css` under `.auth-card`: Tailwind v4 dropped the `!`-prefix
 * important syntax, and Clerk's own element styles win the cascade anyway, so
 * scoped CSS (higher specificity + `!important`) is the reliable override.
 */
export const auroraAuthElements = {
  rootBox: 'auth-clerk-bare',
  cardBox: 'auth-clerk-bare',
  card: 'auth-clerk-bare',
  header: 'auth-clerk-hidden',
  headerTitle: 'auth-clerk-hidden',
  headerSubtitle: 'auth-clerk-hidden',
  footer: 'auth-clerk-footer',
} as const;
