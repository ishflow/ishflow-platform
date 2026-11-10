import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { TenantProDict } from '@/platform/super-admin/tenants/dict';
import type { TenantTag } from '@prisma/client';

interface ColorOption {
  value: string;
  bg: string;
  text: string;
}

const FALLBACK_COLOR: ColorOption = {
  value: 'zinc',
  bg: 'bg-muted',
  text: 'text-muted-foreground',
};

const COLOR_OPTIONS: ReadonlyArray<ColorOption> = [
  FALLBACK_COLOR,
  { value: 'red', bg: 'bg-destructive/15', text: 'text-destructive' },
  { value: 'amber', bg: 'bg-yellow-500/15', text: 'text-yellow-700 dark:text-yellow-300' },
  { value: 'green', bg: 'bg-emerald-500/15', text: 'text-emerald-700 dark:text-emerald-300' },
  { value: 'blue', bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-300' },
  { value: 'violet', bg: 'bg-violet-500/15', text: 'text-violet-700 dark:text-violet-300' },
];

function colorClasses(value: string): ColorOption {
  return COLOR_OPTIONS.find((c) => c.value === value) ?? FALLBACK_COLOR;
}

interface Props {
  tenantId: string;
  tags: ReadonlyArray<TenantTag>;
  dict: TenantProDict['tags'];
  addAction: (formData: FormData) => Promise<void>;
  removeAction: (formData: FormData) => Promise<void>;
}

export function TagsPanel({ tenantId, tags, dict, addAction, removeAction }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{dict.title}</CardTitle>
        <CardDescription>{dict.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {tags.length === 0 ? (
          <p className="text-sm text-muted-foreground">{dict.empty}</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => {
              const c = colorClasses(tag.color);
              return (
                <form key={tag.id} action={removeAction}>
                  <input type="hidden" name="tenantId" value={tenantId} />
                  <input type="hidden" name="tagId" value={tag.id} />
                  <button
                    type="submit"
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs ${c.bg} ${c.text} hover:opacity-80`}
                    title={dict.removeButton}
                  >
                    <span className="font-medium">{tag.label}</span>
                    <span aria-hidden>×</span>
                  </button>
                </form>
              );
            })}
          </div>
        )}

        <form action={addAction} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <input type="hidden" name="tenantId" value={tenantId} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tag-label">{dict.labelLabel}</Label>
            <Input id="tag-label" name="label" placeholder={dict.labelPlaceholder} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tag-color">{dict.colorLabel}</Label>
            <select
              id="tag-color"
              name="color"
              className="h-9 rounded-md border bg-background px-2 text-sm"
              defaultValue="zinc"
            >
              {COLOR_OPTIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.value}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" size="sm">
            {dict.addButton}
          </Button>
        </form>

        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>preview:</span>
            {COLOR_OPTIONS.map((c) => (
              <Badge key={c.value} className={`${c.bg} ${c.text} border-0`}>
                {c.value}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
