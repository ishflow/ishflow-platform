// Security theater fields removed: twoFactorRequired, passwordMinLength,
// sessionTimeoutMinutes, ipAllowlistCidr were saved to tenant_settings but
// enforced nowhere (no middleware/platform consumers). Account security
// (2FA, password, active sessions) is Clerk-managed and surfaced on the
// per-user Profile + Sessions pages instead.
//
// The settings registry entry is kept (empty fields) so the slug
// 'admin.security' remains resolvable; the page itself is replaced by an
// honest informational card that links to the real surfaces.
