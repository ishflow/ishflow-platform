import { CurlBlock } from '@/components/api-keys/curl-block';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

type Platform = {
  id: 'wildberries' | 'ozon' | 'kaspi';
  envVars: Array<{ name: string; required: boolean }>;
  mockCommand: string;
  liveCommand: string;
  sourceUrl: string;
};

const REPO_URL = 'https://github.com/ishflow/ishflow';
const SOURCE_BASE = `${REPO_URL}/blob/main/scripts/integrations`;

const PLATFORMS: Platform[] = [
  {
    id: 'wildberries',
    envVars: [
      { name: 'CANALOG_API_KEY', required: true },
      { name: 'WILDBERRIES_API_KEY', required: true },
      { name: 'CANALOG_BASE_URL', required: false },
    ],
    mockCommand: 'pnpm tsx scripts/integrations/wildberries/sync.ts --mock',
    liveCommand: `CANALOG_API_KEY=1ca_live_… \\
WILDBERRIES_API_KEY=… \\
pnpm tsx scripts/integrations/wildberries/sync.ts`,
    sourceUrl: `${SOURCE_BASE}/wildberries/sync.ts`,
  },
  {
    id: 'ozon',
    envVars: [
      { name: 'CANALOG_API_KEY', required: true },
      { name: 'OZON_CLIENT_ID', required: true },
      { name: 'OZON_API_KEY', required: true },
      { name: 'CANALOG_BASE_URL', required: false },
    ],
    mockCommand: 'pnpm tsx scripts/integrations/ozon/sync.ts --mock',
    liveCommand: `CANALOG_API_KEY=1ca_live_… \\
OZON_CLIENT_ID=… \\
OZON_API_KEY=… \\
pnpm tsx scripts/integrations/ozon/sync.ts`,
    sourceUrl: `${SOURCE_BASE}/ozon/sync.ts`,
  },
  {
    id: 'kaspi',
    envVars: [
      { name: 'CANALOG_API_KEY', required: true },
      { name: 'KASPI_API_TOKEN', required: true },
      { name: 'CANALOG_BASE_URL', required: false },
    ],
    mockCommand: 'pnpm tsx scripts/integrations/kaspi/sync.ts --mock',
    liveCommand: `CANALOG_API_KEY=1ca_live_… \\
KASPI_API_TOKEN=… \\
pnpm tsx scripts/integrations/kaspi/sync.ts`,
    sourceUrl: `${SOURCE_BASE}/kaspi/sync.ts`,
  },
];

export async function RecipesPanel() {
  const t = await getTranslations('admin.apiKeys.recipes');

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="wildberries">
          <TabsList>
            {PLATFORMS.map((p) => (
              <TabsTrigger key={p.id} value={p.id}>
                {t(`${p.id}.tabLabel`)}
              </TabsTrigger>
            ))}
          </TabsList>

          {PLATFORMS.map((p) => (
            <TabsContent key={p.id} value={p.id} className="flex flex-col gap-4 pt-4">
              <p className="text-sm text-muted-foreground">{t(`${p.id}.summary`)}</p>

              <section className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-foreground">{t('envVarsHeading')}</h4>
                <ul className="flex flex-wrap gap-2">
                  {p.envVars.map((v) => (
                    <li key={v.name}>
                      <Badge variant={v.required ? 'default' : 'outline'} className="font-mono">
                        {v.name}
                        {!v.required && (
                          <span className="ml-1 text-[10px] opacity-70">{t('optionalShort')}</span>
                        )}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-foreground">{t('runMockHeading')}</h4>
                <CurlBlock code={p.mockCommand} />
              </section>

              <section className="flex flex-col gap-2">
                <h4 className="text-sm font-semibold text-foreground">{t('runLiveHeading')}</h4>
                <CurlBlock code={p.liveCommand} />
              </section>

              <div>
                <a
                  href={p.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {t('githubLink')}
                </a>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
