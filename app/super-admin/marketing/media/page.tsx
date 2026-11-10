import { MediaRowActions } from '@/components/app/super-admin/marketing/media-row-actions';
import { MediaUploader } from '@/components/app/super-admin/marketing/media-uploader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listMarketingMedia, marketingMediaUrl } from '@/platform/marketing/media-upload';
import { getSuperAdminDict } from '@/platform/super-admin/i18n-server';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default async function MarketingMediaPage() {
  const dict = await getSuperAdminDict();
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
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{m.title}</h1>
        <p className="text-sm text-muted-foreground">{m.subtitle}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{m.upload}</CardTitle>
        </CardHeader>
        <CardContent>
          <MediaUploader dict={m} />
        </CardContent>
      </Card>

      {listError && (
        <p className="text-xs text-destructive">
          {listError.includes('R2_ACCOUNT_ID') ? m.errors.notConfigured : listError}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{m.title}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">{m.columns.preview}</TableHead>
                <TableHead>{m.columns.key}</TableHead>
                <TableHead>{m.columns.size}</TableHead>
                <TableHead>{m.columns.uploadedAt}</TableHead>
                <TableHead className="text-right">{m.columns.actions}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filesWithUrl.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-sm text-muted-foreground">
                    {m.empty}
                  </TableCell>
                </TableRow>
              ) : (
                filesWithUrl.map((file) => (
                  <TableRow key={file.key}>
                    <TableCell>
                      <a href={file.url} target="_blank" rel="noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={file.url}
                          alt={file.key}
                          className="h-12 w-12 rounded border border-border object-cover"
                        />
                      </a>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <span className="break-all">{file.key}</span>
                    </TableCell>
                    <TableCell className="text-xs">{formatBytes(file.size)}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {file.uploadedAt.toISOString().slice(0, 19).replace('T', ' ')}
                    </TableCell>
                    <TableCell>
                      <MediaRowActions objectKey={file.key} url={file.url} dict={m} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
