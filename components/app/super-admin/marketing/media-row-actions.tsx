'use client';

import { Button } from '@/components/ui/button';
import type { SuperAdminDict } from '@/platform/super-admin/dict';
import { Check, Copy, Trash2 } from 'lucide-react';
import { useState, useTransition } from 'react';

import { deleteMediaFileAction } from '@/app/super-admin/marketing/_actions/media';

interface Props {
  objectKey: string;
  url: string;
  dict: SuperAdminDict['marketing']['media'];
  /** Override the delete action (V2 CMS passes its own). Defaults to the locale-free action. */
  deleteAction?: (formData: FormData) => Promise<void>;
}

export function MediaRowActions({
  objectKey,
  url,
  dict,
  deleteAction = deleteMediaFileAction,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const onDelete = () => {
    if (!window.confirm(dict.deleteConfirm)) return;
    const fd = new FormData();
    fd.append('key', objectKey);
    startTransition(async () => {
      await deleteAction(fd);
    });
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Button type="button" variant="ghost" size="sm" onClick={onCopy}>
        {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
        {copied ? dict.copied : dict.copyUrl}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDelete}
        disabled={isPending}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {dict.delete}
      </Button>
    </div>
  );
}
