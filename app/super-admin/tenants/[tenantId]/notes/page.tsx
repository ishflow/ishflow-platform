import { NotesPanel } from '@/components/app/super-admin/tenants/notes-panel';
import { getTenantOverview } from '@/platform/super-admin/tenant-detail';
import { getTenantProDict } from '@/platform/super-admin/tenants/dict';
import { listTenantNotes } from '@/platform/super-admin/tenants/notes';
import { notFound } from 'next/navigation';
import { addNoteAction, removeNoteAction } from '../_actions/notes';

export const dynamic = 'force-dynamic';

export default async function TenantNotesPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  const [overview, dict, notes] = await Promise.all([
    getTenantOverview(tenantId),
    getTenantProDict(),
    listTenantNotes(tenantId),
  ]);
  if (!overview) notFound();

  return (
    <NotesPanel
      tenantId={tenantId}
      notes={notes}
      dict={dict.notes}
      addAction={addNoteAction}
      removeAction={removeNoteAction}
    />
  );
}
