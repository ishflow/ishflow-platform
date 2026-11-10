export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getBillingEnforcementMode } = await import('@/platform/billing/enforce');
    console.log('[billing] enforcement mode =', getBillingEnforcementMode());
  }
}
