/**
 * Deploy info card. Reads VERCEL_DEPLOYMENT_ID + (optional) VERCEL_API_TOKEN
 * to fetch the current deployment metadata. Falls back to a "deploy info
 * unavailable" payload outside of Vercel.
 *
 * Note: VERCEL_API_TOKEN reads are server-only and never exposed to the
 * client — we only return the redacted summary below.
 */

export interface DeployInfo {
  available: boolean;
  deploymentId: string | null;
  url: string | null;
  state: string | null;
  createdAt: string | null;
  meta: Record<string, string> | null;
  gitSha: string | null;
  reason?: string;
}

interface VercelDeploymentResponse {
  id?: string;
  url?: string;
  readyState?: string;
  state?: string;
  createdAt?: number;
  meta?: Record<string, string>;
  gitSource?: { sha?: string };
}

export async function getDeployInfo(
  fetchImpl: typeof fetch = globalThis.fetch,
): Promise<DeployInfo> {
  const deploymentId = process.env.VERCEL_DEPLOYMENT_ID ?? null;
  const token = process.env.VERCEL_API_TOKEN ?? null;
  const teamId = process.env.VERCEL_TEAM_ID ?? null;
  const gitSha = process.env.VERCEL_GIT_COMMIT_SHA ?? null;
  const envUrl = process.env.VERCEL_URL ?? null;

  if (!deploymentId) {
    return {
      available: false,
      deploymentId: null,
      url: envUrl,
      state: null,
      createdAt: null,
      meta: null,
      gitSha,
      reason: 'VERCEL_DEPLOYMENT_ID not configured',
    };
  }

  if (!token) {
    // We have a deployment ID but no token — return what we know without an
    // API call. Still considered "available" because we surfaced something.
    return {
      available: true,
      deploymentId,
      url: envUrl,
      state: null,
      createdAt: null,
      meta: null,
      gitSha,
      reason: 'VERCEL_API_TOKEN not set; showing env-derived fields only',
    };
  }

  try {
    const qs = teamId ? `?teamId=${encodeURIComponent(teamId)}` : '';
    const res = await fetchImpl(
      `https://api.vercel.com/v13/deployments/${encodeURIComponent(deploymentId)}${qs}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) {
      return {
        available: false,
        deploymentId,
        url: envUrl,
        state: null,
        createdAt: null,
        meta: null,
        gitSha,
        reason: `Vercel API returned ${res.status}`,
      };
    }
    const body = (await res.json()) as VercelDeploymentResponse;
    return {
      available: true,
      deploymentId: body.id ?? deploymentId,
      url: body.url ? `https://${body.url}` : envUrl,
      state: body.readyState ?? body.state ?? null,
      createdAt: typeof body.createdAt === 'number' ? new Date(body.createdAt).toISOString() : null,
      meta: body.meta ?? null,
      gitSha: body.gitSource?.sha ?? gitSha,
    };
  } catch (e) {
    return {
      available: false,
      deploymentId,
      url: envUrl,
      state: null,
      createdAt: null,
      meta: null,
      gitSha,
      reason: (e as Error).message,
    };
  }
}
