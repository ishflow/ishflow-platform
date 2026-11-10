'use client';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { SuperAdminDict } from '@/platform/super-admin/dict';
import { Upload } from 'lucide-react';
import { useRef, useState, useTransition } from 'react';

import { uploadMediaFile } from '@/app/super-admin/marketing/_actions/media';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/svg+xml';

export function MediaUploader({
  dict,
  action = uploadMediaFile,
}: {
  dict: SuperAdminDict['marketing']['media'];
  /** Override the server action (V2 CMS passes its own). Defaults to the locale-free action. */
  action?: (formData: FormData) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    setError(null);
    startTransition(async () => {
      try {
        await action(fd);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg === 'too_large') setError(dict.errors.tooLarge);
        else if (msg === 'bad_mime') setError(dict.errors.badMime);
        else if (msg.includes('R2_ACCOUNT_ID')) setError(dict.errors.notConfigured);
        else setError(msg);
      } finally {
        if (inputRef.current) inputRef.current.value = '';
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Label htmlFor="media-file" className="sr-only">
          {dict.upload}
        </Label>
        <input
          ref={inputRef}
          id="media-file"
          type="file"
          accept={ACCEPT}
          onChange={handleChange}
          disabled={isPending}
          className="hidden"
        />
        <Button type="button" onClick={() => inputRef.current?.click()} disabled={isPending}>
          <Upload className="mr-2 h-4 w-4" />
          {isPending ? dict.uploading : dict.upload}
        </Button>
        <span className="text-xs text-muted-foreground">{dict.limits}</span>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
