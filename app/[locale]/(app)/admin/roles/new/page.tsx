import { V2NewRoleForm } from '@/components/v2/admin/roles/new-form';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { resolveContext } from '@/platform/auth/current-context';
import { withTenant } from '@/platform/db/tenant-context';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const ROLE_KEY_MAP: Record<string, string> = {
  owner: 'owner',
  admin: 'admin',
  chief_accountant: 'chiefAccountant',
  bookkeeper: 'accountant',
  cashier: 'cashier',
  sales: 'salesManager',
  buyer: 'salesManager',
  warehouse: 'warehouse',
  viewer: 'viewer',
};

export default async function V2NewRolePage() {
  const t = await getTranslations('v2_admin.roles.new');
  const tNames = await getTranslations('v2_admin.members.role');

  const ctx = await resolveContext();
  type CloneOption = { value: string; label: string };
  let cloneOptions: CloneOption[] = [];
  if (ctx?.tenant) {
    const tenantId = ctx.tenant.id;
    const roles = await withTenant(tenantId, (tx) =>
      tx.role.findMany({
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
        select: { id: true, name: true, isSystem: true },
      }),
    );
    cloneOptions = roles.map((r) => {
      const key = ROLE_KEY_MAP[r.name];
      const label = key ? tNames(key) : r.name;
      return { value: r.id, label };
    });
  }

  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2NewRoleForm
          cloneOptions={cloneOptions}
          labels={{
            saveCta: t('saveCta'),
            cancel: t('cancel'),
            cancelHref: '/admin/roles',
            counter: t('counter', { selected: 0, total: 86 }),
            sectionTitle: t('sectionTitle'),
            fields: {
              name: t('fields.name'),
              namePh: t('fields.namePh'),
              nameHint: t('fields.nameHint'),
              description: t('fields.description'),
              descriptionPh: t('fields.descriptionPh'),
              template: t('fields.template'),
              templateHint: t('fields.templateHint'),
              templateBlank: t('fields.templateBlank'),
              tags: t('fields.tags'),
              tagsHint: t('fields.tagsHint'),
            },
            sampleTags: [t('sampleTag.field'), t('sampleTag.sales')],
            addTag: t('addTag'),
          }}
        />
      </div>
    </>
  );
}
