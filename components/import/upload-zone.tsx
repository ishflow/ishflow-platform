'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { UploadCloud } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

export function UploadZone({ onFile }: { onFile: (file: File) => void }) {
  const t = useTranslations('admin.import');
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (files?.[0]) onFile(files[0]);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-input p-10 text-center transition-colors',
        dragOver && 'border-ring bg-accent/30',
      )}
    >
      <UploadCloud className="h-10 w-10 text-muted-foreground" aria-hidden />
      <p className="text-sm text-muted-foreground">{t('dropHint')}</p>
      <p className="text-xs text-muted-foreground">{t('fileLimits')}</p>
      <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
        {t('browse')}
      </Button>
      <Input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
