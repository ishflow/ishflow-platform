'use client';

import { useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface AddSettingFormProps {
  onSubmit: (formData: FormData) => Promise<void>;
  labels: {
    addTitle: string;
    addDescription: string;
    keyLabel: string;
    valueLabel: string;
    keyPlaceholder: string;
    valuePlaceholder: string;
    create: string;
    errorInvalidJson: string;
    errorEmptyKey: string;
  };
}

export function AddSettingForm({ onSubmit, labels }: AddSettingFormProps) {
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!key.trim()) {
      setError(labels.errorEmptyKey);
      return;
    }
    try {
      JSON.parse(value);
    } catch (e) {
      setError(labels.errorInvalidJson.replace('{reason}', (e as Error).message));
      return;
    }
    setError(null);
    const fd = new FormData();
    fd.set('key', key);
    fd.set('value', value);
    startTransition(async () => {
      try {
        await onSubmit(fd);
        setKey('');
        setValue('');
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.addTitle}</CardTitle>
        <CardDescription>{labels.addDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-setting-key">{labels.keyLabel}</Label>
          <Input
            id="add-setting-key"
            value={key}
            placeholder={labels.keyPlaceholder}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="add-setting-value">{labels.valueLabel}</Label>
          <Textarea
            id="add-setting-value"
            value={value}
            placeholder={labels.valuePlaceholder}
            onChange={(e) => setValue(e.target.value)}
            rows={4}
            className="font-mono text-xs"
          />
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </CardContent>
      <CardFooter className="justify-end">
        <Button onClick={submit} disabled={pending}>
          {labels.create}
        </Button>
      </CardFooter>
    </Card>
  );
}
