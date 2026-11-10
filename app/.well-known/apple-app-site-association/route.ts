export const dynamic = 'force-static';

export async function GET() {
  return Response.json(
    {
      applinks: {
        apps: [],
        details: [
          {
            appID: 'dev.ishflow.ios.ishflow',
            paths: ['/invoice/*', '/customer/*', '/payment/*', 'NOT /api/*'],
          },
        ],
      },
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );
}
