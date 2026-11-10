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

interface MinVersionsFormProps {
  current: { ios: string | null; android: string | null };
  onSubmit: (formData: FormData) => Promise<void>;
  labels: {
    title: string;
    description: string;
    iosLabel: string;
    androidLabel: string;
    placeholder: string;
    save: string;
    saved: string;
    clear: string;
  };
}

export function MinVersionsForm({ current, onSubmit, labels }: MinVersionsFormProps) {
  const [ios, setIos] = useState(current.ios ?? '');
  const [android, setAndroid] = useState(current.android ?? '');
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    const fd = new FormData();
    fd.set('ios', ios);
    fd.set('android', android);
    startTransition(async () => {
      await onSubmit(fd);
      setSavedAt(Date.now());
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{labels.title}</CardTitle>
        <CardDescription>{labels.description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="min-version-ios">{labels.iosLabel}</Label>
          <Input
            id="min-version-ios"
            value={ios}
            onChange={(e) => setIos(e.target.value)}
            placeholder={labels.placeholder}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="min-version-android">{labels.androidLabel}</Label>
          <Input
            id="min-version-android"
            value={android}
            onChange={(e) => setAndroid(e.target.value)}
            placeholder={labels.placeholder}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="ghost"
          type="button"
          onClick={() => {
            setIos('');
            setAndroid('');
          }}
          disabled={pending}
        >
          {labels.clear}
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          {savedAt ? labels.saved : labels.save}
        </Button>
      </CardFooter>
    </Card>
  );
}
