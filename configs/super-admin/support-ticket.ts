import { assignToMe, closeTicket } from '@/lib/v2-super-admin/support-ticket-actions';
import { defineSuperAdminCatalog } from '@/platform/metadata';

const STATUS_VALUES = ['open', 'in_progress', 'resolved', 'wont_fix'] as const;

defineSuperAdminCatalog({
  module: 'super_admin',
  name: 'support_ticket',
  label: {
    ru: 'Тикет поддержки',
    en: 'Support ticket',
    tr: 'Destek talebi',
    ky: 'Колдоо тикети',
    uz: 'Yordam yozuvi',
    de: 'Support-Ticket',
    fr: 'Ticket de support',
    zh: '支持工单',
  },
  pluralLabel: {
    ru: 'Тикеты поддержки',
    en: 'Support tickets',
    tr: 'Destek talepleri',
    ky: 'Колдоо тикеттери',
    uz: 'Yordam yozuvlari',
    de: 'Support-Tickets',
    fr: 'Tickets de support',
    zh: '支持工单列表',
  },
  displayField: 'subject',
  requiredPermission: 'super_admin.support_ticket:read',
  fields: {
    subject: { type: 'string', label: { ru: 'Тема', en: 'Subject', tr: 'Konu' } },
    tenantName: { type: 'string', label: { ru: 'Тенант', en: 'Tenant', tr: 'Kiracı' } },
    status: {
      type: 'string',
      label: { ru: 'Статус', en: 'Status', tr: 'Durum' },
      enumValues: STATUS_VALUES,
    },
    assignedToEmail: { type: 'string', label: { ru: 'Назначен', en: 'Assignee', tr: 'Atanan' } },
    createdAt: { type: 'datetime', label: { ru: 'Создан', en: 'Created', tr: 'Oluşturuldu' } },
    resolvedAt: {
      type: 'datetime',
      label: { ru: 'Решён', en: 'Resolved', tr: 'Çözüldü' },
    },
  },
  list: {
    layout: 'table',
    searchable: true,
    listOnly: true,
    columns: [
      { key: 'createdAt', label: { ru: 'Создан', en: 'Created', tr: 'Oluşturuldu' } },
      { key: 'subject', label: { ru: 'Тема', en: 'Subject', tr: 'Konu' } },
      { key: 'tenantName', label: { ru: 'Тенант', en: 'Tenant', tr: 'Kiracı' } },
      { key: 'status', label: { ru: 'Статус', en: 'Status', tr: 'Durum' } },
      { key: 'assignedToEmail', label: { ru: 'Назначен', en: 'Assignee', tr: 'Atanan' } },
      { key: 'resolvedAt', label: { ru: 'Решён', en: 'Resolved', tr: 'Çözüldü' } },
    ],
    chips: [
      { key: 'all', label: { ru: 'Все', en: 'All', tr: 'Tümü' } },
      { key: 'open', label: { ru: 'Открыто', en: 'Open', tr: 'Açık' } },
      { key: 'in_progress', label: { ru: 'В работе', en: 'In progress', tr: 'Süren' } },
      { key: 'resolved', label: { ru: 'Решено', en: 'Resolved', tr: 'Çözüldü' } },
      { key: 'wont_fix', label: { ru: 'Не решено', en: "Won't fix", tr: 'Düzelt.' } },
    ],
    rowActions: [
      {
        key: 'assignToMe',
        label: { ru: 'На себя', en: 'Assign me', tr: 'Bana ata' },
        icon: 'UserPlus',
        action: assignToMe,
        visibleWhen: (r) => r.status === 'open' || r.status === 'in_progress',
        hiddenFieldsFromRow: { ticketId: (r) => r.id as string },
        dialog: {
          type: 'confirm',
          title: { ru: 'Назначить себе?', en: 'Assign to yourself?', tr: 'Kendine ata?' },
          description: {
            ru: 'Тикет будет назначен вашему аккаунту.',
            en: 'The ticket will be assigned to your account.',
            tr: 'Talep hesabınıza atanacak.',
          },
          confirm: { ru: 'Назначить', en: 'Assign', tr: 'Ata' },
          pending: { ru: 'Назначаем…', en: 'Assigning…', tr: 'Atanıyor…' },
        },
      },
      {
        key: 'close',
        label: { ru: 'Закрыть', en: 'Close', tr: 'Kapat' },
        icon: 'CheckCircle2',
        action: closeTicket,
        visibleWhen: (r) => r.status === 'open' || r.status === 'in_progress',
        hiddenFieldsFromRow: { ticketId: (r) => r.id as string },
        dialog: {
          type: 'confirm',
          title: { ru: 'Закрыть тикет?', en: 'Close ticket?', tr: 'Talep kapatılsın mı?' },
          description: {
            ru: 'Статус сменится на «решено», resolvedAt установится текущим временем.',
            en: 'Status flips to resolved, resolvedAt is stamped now.',
            tr: 'Durum çözüldü olur, resolvedAt şu an damgalanır.',
          },
          confirm: { ru: 'Закрыть', en: 'Close', tr: 'Kapat' },
          pending: { ru: 'Закрываем…', en: 'Closing…', tr: 'Kapatılıyor…' },
        },
      },
    ],
  },
  source: {
    source: 'supportTicket',
    searchFields: ['subject'],
    chipFilters: Object.fromEntries(STATUS_VALUES.map((s) => [s, { status: s }])),
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    postFetch: async (tickets, tx) => {
      const txTyped = tx as {
        tenant: {
          findMany: (args: unknown) => Promise<Array<{ id: string; name: string }>>;
        };
        user: {
          findMany: (args: unknown) => Promise<Array<{ id: string; email: string }>>;
        };
      };

      const tenantIds = Array.from(
        new Set(
          tickets.map((t) => t.tenantId as string | null).filter((x): x is string => x !== null),
        ),
      );
      const assigneeIds = Array.from(
        new Set(
          tickets.map((t) => t.assignedTo as string | null).filter((x): x is string => x !== null),
        ),
      );

      const [tenants, assignees] = await Promise.all([
        tenantIds.length
          ? txTyped.tenant.findMany({
              where: { id: { in: tenantIds } },
              select: { id: true, name: true },
            })
          : Promise.resolve([]),
        assigneeIds.length
          ? txTyped.user.findMany({
              where: { id: { in: assigneeIds } },
              select: { id: true, email: true },
            })
          : Promise.resolve([]),
      ]);
      const tenantName = new Map(tenants.map((t) => [t.id, t.name]));
      const assigneeEmail = new Map(assignees.map((u) => [u.id, u.email]));

      return tickets.map((t) => {
        const tid = t.tenantId as string | null;
        const aid = t.assignedTo as string | null;
        return {
          id: t.id as string,
          createdAt: t.createdAt,
          subject: t.subject,
          tenantName: tid ? (tenantName.get(tid) ?? '—') : '—',
          status: t.status,
          assignedToEmail: aid ? (assigneeEmail.get(aid) ?? '—') : '—',
          resolvedAt: t.resolvedAt,
        };
      });
    },
  },
});
