import { deleteMediaV2, uploadMediaV2 } from '@/app/[locale]/(app)/super-admin/cms/_actions';
import { getSaMarketingDict } from '@/app/[locale]/(app)/super-admin/cms/_sa-dict';
import { MediaRowActions } from '@/components/app/super-admin/marketing/media-row-actions';
import { MediaUploader } from '@/components/app/super-admin/marketing/media-uploader';
import { SaCmsPageShell } from '@/components/v2/super-admin/cms/sa-cms-card';
import { SaTopbar } from '@/components/v2/super-admin/shell/sa-topbar';
import { SaTenantSection } from '@/components/v2/super-admin/tenants/sa-tenant-section';
import { listMarketingMedia, marketingMediaUrl } from '@/platform/marketing/media-upload';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default async function SaCmsMediaPage() {
  const t = await getTranslations('v2_super_admin.cms.media');
  const dict = await getSaMarketingDict();
  const m = dict.marketing.media;

  let files: Awaited<ReturnType<typeof listMarketingMedia>> = [];
  let listError: string | null = null;
  try {
    files = await listMarketingMedia();
  } catch (err) {
    listError = err instanceof Error ? err.message : String(err);
  }

  const filesWithUrl = await Promise.all(
    files.map(async (f) => ({
      ...f,
      url: await marketingMediaUrl(f.key).catch(() => f.key),
    })),
  );

  return (
    <SaCmsPageShell
      topbar={
        <SaTopbar
          breadcrumb={t('breadcrumb')}
          title={t('title')}
          subtitle={t('subtitle', { count: filesWithUrl.length })}
        />
      }
    >
      <SaTenantSection title={m.upload}>
        <MediaUploader dict={m} action={uploadMediaV2} />
        {listError ? (
          <p className="text-destructive" style={{ fontSize: 12, marginTop: 8 }}>
            {listError.includes('R2_ACCOUNT_ID') ? m.errors.notConfigured : listError}
          </p>
        ) : null}
      </SaTenantSection>

      <div className="spacer" />

      <SaTenantSection title={t('card.title')}>
        {filesWithUrl.length === 0 ? (
          <p className="dim" style={{ padding: '8px 0' }}>
            {m.empty}
          </p>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th style={{ width: 64 }}>{m.columns.preview}</th>
                <th>{m.columns.key}</th>
                <th>{m.columns.size}</th>
                <th>{m.columns.uploadedAt}</th>
                <th>{m.columns.actions}</th>
              </tr>
            </thead>
            <tbody>
              {filesWithUrl.map((file) => (
                <tr key={file.key}>
                  <td>
                    <a href={file.url} target="_blank" rel="noreferrer">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={file.url}
                        alt={file.key}
                        style={{
                          height: 40,
                          width: 40,
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          objectFit: 'cover',
                        }}
                      />
                    </a>
                  </td>
                  <td
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11.5,
                      wordBreak: 'break-all',
                    }}
                  >
                    {file.key}
                  </td>
                  <td style={{ fontSize: 12 }}>{formatBytes(file.size)}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                    {file.uploadedAt.toISOString().slice(0, 16).replace('T', ' ')}
                  </td>
                  <td>
                    <MediaRowActions
                      objectKey={file.key}
                      url={file.url}
                      dict={m}
                      deleteAction={deleteMediaV2}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SaTenantSection>
    </SaCmsPageShell>
  );
}
