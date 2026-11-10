import { type SystemRoleOption, V2InviteForm } from '@/components/v2/admin/members/invite-form';
import { V2Topbar } from '@/components/v2/shell/topbar';
import { getTranslations } from 'next-intl/server';

export default async function V2InvitePage() {
  const t = await getTranslations('v2_admin.members.invite');
  const tRoles = await getTranslations('v2_admin.members.role');

  const rolesOptions: SystemRoleOption[] = [
    { value: 'viewer', label: tRoles('viewer') },
    { value: 'cashier', label: tRoles('cashier') },
    { value: 'bookkeeper', label: tRoles('accountant') },
    { value: 'sales', label: tRoles('salesManager') },
    { value: 'warehouse', label: tRoles('warehouse') },
    { value: 'chief_accountant', label: tRoles('chiefAccountant') },
    { value: 'admin', label: tRoles('admin') },
  ];

  return (
    <>
      <V2Topbar breadcrumb={t('breadcrumb')} title={t('title')} subtitle={t('subtitle')} />
      <div className="content">
        <V2InviteForm
          labels={{
            sendCta: t('sendCta'),
            copyLink: t('copyLink'),
            cancel: t('cancel'),
            cancelHref: '/admin/members',
            validityHint: t('validityHint'),
            sectionTitle: t('sectionTitle'),
            fields: {
              email: t('fields.email'),
              emailPh: t('fields.emailPh'),
              emailHint: t('fields.emailHint'),
              name: t('fields.name'),
              namePh: t('fields.namePh'),
              role: t('fields.role'),
              roleHint: t('fields.roleHint'),
              roleHintLinkLabel: t('fields.roleHintLinkLabel'),
              scope: t('fields.scope'),
              scopeOptions: [t('fields.scopeAll'), t('fields.scopeMain'), t('fields.scopeBranch1')],
              message: t('fields.message'),
              messageHint: t('fields.messageHint'),
              twoFactor: t('fields.twoFactor'),
              twoFactorYes: t('fields.twoFactorYes'),
              twoFactorNo: t('fields.twoFactorNo'),
              twoFactorHint: t('fields.twoFactorHint'),
              inviteLink: t('fields.inviteLink'),
            },
            previewTitle: t('previewTitle'),
            previewLocale: t('previewLocale'),
            previewHeadFrom: t('previewHeadFrom'),
            previewHeadDate: t('previewHeadDate'),
            previewHeadline: t('previewHeadline'),
            previewIntro: t('previewIntro'),
            previewMessage: t('previewMessage'),
            previewCta: t('previewCta'),
            previewLinkLabel: t('previewLinkLabel'),
            previewFoot: t('previewFoot'),
          }}
          defaults={{
            email: 'zeynep@sample-trading.com',
            name: 'Jane Doe',
            message: t('defaultMessage'),
            inviteLink: 'https://ishflow.com/invite/8a4f2c0d-1234-4abc-9988-1b7e92aac7d3',
          }}
          rolesOptions={rolesOptions}
        />
      </div>
    </>
  );
}
