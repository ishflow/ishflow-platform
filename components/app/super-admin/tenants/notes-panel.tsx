import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { TenantProDict } from '@/platform/super-admin/tenants/dict';
import type { TenantNoteRow } from '@/platform/super-admin/tenants/notes';

interface Props {
  tenantId: string;
  notes: ReadonlyArray<TenantNoteRow>;
  dict: TenantProDict['notes'];
  addAction: (formData: FormData) => Promise<void>;
  removeAction: (formData: FormData) => Promise<void>;
}

function formatDateTime(d: Date): string {
  return d.toISOString().slice(0, 16).replace('T', ' ');
}

export function NotesPanel({ tenantId, notes, dict, addAction, removeAction }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{dict.newTitle}</CardTitle>
          <CardDescription>{dict.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addAction} className="flex flex-col gap-3">
            <input type="hidden" name="tenantId" value={tenantId} />
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="note-body" className="sr-only">
                {dict.newTitle}
              </Label>
              <Textarea
                id="note-body"
                name="body"
                rows={6}
                required
                placeholder={dict.newPlaceholder}
                className="font-mono text-sm"
              />
            </div>
            <div className="flex justify-end">
              <Button type="submit" size="sm">
                {dict.addButton}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dict.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{dict.empty}</p>
          ) : (
            <ol className="flex flex-col gap-4">
              {notes.map((n) => (
                <li
                  key={n.id}
                  className="rounded-md border bg-card/50 p-4 text-sm flex flex-col gap-2"
                >
                  <header className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatDateTime(n.createdAt)} · {dict.authorPrefix}{' '}
                      <span className="font-mono">{n.authorEmail ?? n.createdBy}</span>
                    </span>
                    <form action={removeAction}>
                      <input type="hidden" name="tenantId" value={tenantId} />
                      <input type="hidden" name="noteId" value={n.id} />
                      <Button type="submit" variant="ghost" size="sm">
                        {dict.removeButton}
                      </Button>
                    </form>
                  </header>
                  <pre className="whitespace-pre-wrap text-sm leading-relaxed">{n.body}</pre>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
