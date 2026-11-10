/**
 * Super Admin dictionary — strictly typed string catalog for all 8 locales.
 *
 * Scope: ONLY the super-admin console (`/super-admin/*`). User-facing tenant
 * routes use `next-intl` + `messages/<locale>.json`; this dict is an isolated,
 * lighter-weight system because the super-admin is operator-only and lives
 * outside the `[locale]` segment.
 *
 * Locale fallback policy: `en`, `ru`, `tr` carry hand-written translations.
 * `uz`, `ky`, `de`, `fr`, `zh` mirror `en` initially.
 */

import type { SuperAdminLocale } from './i18n';

type LabelHint = { label: string; hint: string };

export interface SuperAdminDict {
  common: {
    apply: string;
    clear: string;
    reset: string;
    save: string;
    cancel: string;
    search: string;
    view: string;
    delete: string;
    close: string;
    back: string;
    loadMore: string;
    applying: string;
    none: string;
    configured: string;
    missing: string;
    all: string;
    currently: string;
    dash: string;
    pass: string;
    fail: string;
    info: string;
    empty: string;
    error: string;
  };
  nav: {
    brand: string;
    subtitle: string;
    footer: string;
    items: {
      dashboard: string;
      tenants: string;
      users: string;
      billing: string;
      revenue: string;
      audit: string;
      analytics: string;
      communications: string;
      marketing: string;
      system: string;
      support: string;
    };
  };
  breadcrumb: {
    superAdmin: string;
  };
  shell: {
    breadcrumb: {
      root: string;
      separator: string;
      home: string;
    };
    palette: {
      trigger: string;
      placeholder: string;
      empty: string;
      hint: string;
      loading: string;
      typeMore: string;
      groups: {
        tenants: string;
        users: string;
        audit: string;
        addons: string;
        navigation: string;
      };
      shortcuts: {
        open: string;
        close: string;
      };
    };
  };
  dashboard: {
    title: string;
    subtitle: string;
    kpis: {
      tenants: LabelHint;
      active: LabelHint;
      mrr: LabelHint;
      activeUsers: LabelHint;
      churn: LabelHint;
      planMix: LabelHint;
    };
    trialingHint: string;
    planMixValue: string;
    quickLinks: {
      title: string;
      description: string;
      items: {
        tenants: { label: string; description: string };
        revenue: { label: string; description: string };
        audit: { label: string; description: string };
        billing: { label: string; description: string };
      };
    };
    health: {
      title: string;
      description: string;
      stripeSecret: string;
      stripeWebhook: string;
      resendApi: string;
    };
  };
  tenants: {
    title: string;
    subtitleEmpty: string;
    subtitleCountOne: string;
    subtitleCountMany: string;
    subtitleMoreAvailable: string;
    filters: {
      searchPlaceholder: string;
      allPlans: string;
      allStatuses: string;
    };
    columns: {
      name: string;
      plan: string;
      status: string;
      currency: string;
      members: string;
      mrr: string;
      lastActivity: string;
      createdAt: string;
    };
    empty: string;
  };
  tenantDetail: {
    impersonate: string;
    manageSubscription: string;
    createdLabel: string;
    tabs: {
      overview: string;
      users: string;
      documents: string;
      activity: string;
      subscription: string;
      addons: string;
      debug: string;
    };
    overview: {
      created: string;
      currency: string;
      locale: string;
      owners: string;
      totalDocuments: string;
      mrr: string;
      mrrHintActive: string;
      mrrHintNonActive: string;
    };
    users: {
      title: string;
      empty: string;
      columns: { user: string; roles: string; joined: string };
    };
    documents: {
      title: string;
      filterAll: string;
      apply: string;
      empty: string;
      columns: {
        type: string;
        code: string;
        date: string;
        total: string;
        status: string;
      };
      types: {
        salesInvoice: string;
        purchasesInvoice: string;
        salesPaymentReceived: string;
        purchasesPaymentSent: string;
      };
    };
    activity: {
      title: string;
      empty: string;
      columns: {
        when: string;
        actor: string;
        entity: string;
        action: string;
        inspect: string;
      };
      inspector: {
        title: string;
        descriptionEmpty: string;
        entityLabel: string;
        beforeLabel: string;
        afterLabel: string;
      };
    };
    subscription: {
      title: string;
      currentState: {
        title: string;
        description: string;
        plan: string;
        status: string;
        currency: string;
        trialEnds: string;
        stripeCustomer: string;
        stripeSubscription: string;
      };
    };
    debug: {
      tablesTitle: string;
      tablesEmpty: string;
      tableColumns: { table: string; rows: string; size: string };
      healthTitle: string;
      healthColumns: { check: string; result: string; details: string };
      membershipsCheck: string;
      totalFootprint: string;
      rlsCheck: string;
    };
  };
  addons: {
    pageTitle: string;
    pageDescription: string;
    statusLabels: { ga: string; beta: string; planned: string };
    enable: string;
    disable: string;
    enabledOn: string;
    enabledBy: string;
    expiresAt: string;
    expiresNever: string;
    notesLabel: string;
    notesPlaceholder: string;
    expiresAtLabel: string;
    enableConfirmTitle: string;
    disableConfirmTitle: string;
    disableConfirmDescription: string;
    submitting: string;
    enabledBadge: string;
    disabledBadge: string;
  };
  subscription: {
    manualUpgrade: {
      title: string;
      description: string;
      planLabel: string;
      statusLabel: string;
      reasonLabel: string;
      reasonPlaceholder: string;
      reasonHint: string;
      currentLabel: string;
      apply: string;
      confirmTitle: string;
      confirmPlanLine: string;
      confirmStatusLine: string;
      confirmFooter: string;
    };
    planOptions: {
      free: string;
      starter: string;
      pro: string;
      business: string;
      enterprise: string;
    };
    statusOptions: {
      active: string;
      trialing: string;
      past_due: string;
      suspended: string;
      cancelled: string;
      deleted: string;
    };
    timeline: {
      title: string;
      description: string;
      empty: string;
      payload: string;
      errorBadge: string;
    };
    overrides: {
      title: string;
      description: string;
      empty: string;
      keyHeader: string;
      valueHeader: string;
      expiresHeader: string;
      keyLabel: string;
      keyPlaceholder: string;
      valueLabel: string;
      valuePlaceholder: string;
      expiresLabel: string;
      addButton: string;
    };
  };
  billing: {
    title: string;
    subtitle: string;
    cardTitle: string;
    cardDescription: string;
    currentLabel: string;
    currentTag: string;
    states: {
      enabled: { label: string; description: string };
      disabled: { label: string; description: string };
      hidden: { label: string; description: string };
    };
    apply: string;
  };
  audit: {
    title: string;
    subtitle: string;
    filters: {
      title: string;
      description: string;
      actionLabel: string;
      actorLabel: string;
      actorPlaceholder: string;
      tenantLabel: string;
      tenantPlaceholder: string;
      allActions: string;
      apply: string;
      reset: string;
    };
    columns: {
      when: string;
      actor: string;
      action: string;
      tenant: string;
    };
    emptyTitle: string;
    emptyDescription: string;
    loadMore: string;
    detail: {
      back: string;
      heading: string;
      metadataTitle: string;
      metadataDescription: string;
      rows: {
        when: string;
        actor: string;
        action: string;
        tenant: string;
        targetUser: string;
        ip: string;
        userAgent: string;
      };
      beforeTitle: string;
      beforeDescription: string;
      afterTitle: string;
      afterDescription: string;
    };
  };
  users: {
    title: string;
    subtitle: string;
    searchTitle: string;
    searchDescription: string;
    queryLabel: string;
    queryPlaceholder: string;
    apply: string;
    states: {
      tooShortTitle: string;
      tooShortDescription: string;
      noQueryTitle: string;
      noQueryDescriptionPrefix: string;
      noQueryDescriptionAction: string;
      noMatchesTitle: string;
      noMatchesDescriptionPrefix: string;
    };
    columns: {
      user: string;
      memberships: string;
      firstTenant: string;
      clerkId: string;
    };
    deletedBadge: string;
    noneText: string;
  };
  revenue: {
    title: string;
    subtitle: string;
    kpis: {
      totalMrr: LabelHint;
      churn30d: LabelHint;
      trialConversion30d: LabelHint;
    };
    planDistribution: {
      title: string;
      description: string;
    };
    planLabels: {
      free: string;
      starter: string;
      pro: string;
      business: string;
      enterprise: string;
    };
  };
  communications: {
    title: string;
    subtitle: string;
    actions: {
      new: string;
      publish: string;
      recall: string;
      saveDraft: string;
      preview: string;
    };
    filters: {
      allStatuses: string;
      statusLabel: string;
    };
    columns: {
      internalKey: string;
      surface: string;
      status: string;
      startAt: string;
      endAt: string;
      createdAt: string;
    };
    surfaces: {
      banner: string;
      popup: string;
      feed_only: string;
    };
    statuses: {
      draft: string;
      scheduled: string;
      live: string;
      archived: string;
    };
    form: {
      sectionMeta: string;
      sectionTranslations: string;
      sectionTargeting: string;
      sectionPreview: string;
      internalKey: string;
      internalKeyHint: string;
      surface: string;
      status: string;
      startAt: string;
      endAt: string;
      dismissible: string;
      ctaLabel: string;
      ctaUrl: string;
      title: string;
      body: string;
      bodyHint: string;
      plans: string;
      addons: string;
      roles: string;
      locales: string;
      tenantIds: string;
      tenantIdsHint: string;
      targetingEmpty: string;
    };
    list: {
      empty: string;
      emptyDescription: string;
    };
    detail: {
      back: string;
      analyticsLink: string;
    };
    analytics: {
      title: string;
      description: string;
      impressions: string;
      uniqueViewers: string;
      dismissalRate: string;
      ctr: string;
      perTenantTitle: string;
      perTenantDescription: string;
      perTenantEmpty: string;
      columns: {
        tenant: string;
        impressions: string;
        viewed: string;
        clicked: string;
      };
    };
  };
  marketing: {
    landing: {
      title: string;
      subtitle: string;
      tiles: {
        sections: { title: string; description: string };
        blog: { title: string; description: string };
        media: { title: string; description: string };
        leads: { title: string; description: string };
        newsletter: { title: string; description: string };
      };
    };
    common: {
      addRow: string;
      removeRow: string;
      saveSection: string;
      saving: string;
      lastSaved: string;
      neverSaved: string;
      defaultsNotice: string;
    };
    sections: {
      title: string;
      subtitle: string;
      columns: {
        page: string;
        section: string;
        type: string;
        locales: string;
        updatedAt: string;
      };
      noLocales: string;
      typeLabels: {
        hero: string;
        featureCards: string;
        socialProof: string;
        testimonials: string;
        faq: string;
        footerColumns: string;
      };
      edit: {
        backToList: string;
        history: string;
        localeTabsLabel: string;
        savedSuccess: string;
        saveError: string;
      };
      versions: {
        title: string;
        empty: string;
        columns: {
          createdAt: string;
          actor: string;
          actions: string;
        };
        restore: string;
        restoreConfirm: string;
      };
      forms: {
        hero: {
          headline: string;
          subhead: string;
          primaryCta: string;
          secondaryCta: string;
          label: string;
          href: string;
          heroImageUrl: string;
        };
        featureCards: {
          iconKey: string;
          title: string;
          body: string;
          href: string;
          addCard: string;
        };
        socialProof: {
          value: string;
          label: string;
          addStat: string;
        };
        testimonials: {
          quote: string;
          authorName: string;
          authorRole: string;
          authorCompany: string;
          avatarUrl: string;
          addItem: string;
        };
        faq: {
          question: string;
          answer: string;
          addItem: string;
        };
        footerColumns: {
          title: string;
          links: string;
          label: string;
          href: string;
          addColumn: string;
          addLink: string;
        };
      };
    };
    pageLabels: {
      home: string;
      pricing: string;
      features: string;
      addons: string;
      about: string;
      contact: string;
      global: string;
    };
    blog: {
      title: string;
      subtitle: string;
      newButton: string;
      columns: {
        slug: string;
        status: string;
        author: string;
        updatedAt: string;
        publishedAt: string;
      };
      statusLabels: {
        draft: string;
        published: string;
        archived: string;
      };
      empty: string;
      new: {
        title: string;
        subtitle: string;
        slug: string;
        slugHint: string;
        authorName: string;
        tags: string;
        tagsHint: string;
        heroImageUrl: string;
        create: string;
        slugConflict: string;
      };
      edit: {
        backToList: string;
        preview: string;
        publish: string;
        archive: string;
        saved: string;
        publishedAt: string;
        translations: string;
        body: string;
        bodyHint: string;
        excerpt: string;
        postTitle: string;
        publishConfirm: string;
        archiveConfirm: string;
      };
      preview: {
        title: string;
        empty: string;
      };
    };
    media: {
      title: string;
      subtitle: string;
      upload: string;
      uploading: string;
      limits: string;
      empty: string;
      columns: {
        preview: string;
        key: string;
        size: string;
        uploadedAt: string;
        actions: string;
      };
      copyUrl: string;
      copied: string;
      delete: string;
      deleteConfirm: string;
      errors: {
        tooLarge: string;
        badMime: string;
        notConfigured: string;
      };
    };
    leads: {
      title: string;
      subtitle: string;
      empty: string;
      filterAll: string;
      columns: {
        when: string;
        name: string;
        email: string;
        company: string;
        source: string;
        message: string;
        status: string;
      };
      statusLabels: {
        new: string;
        contacted: string;
        qualified: string;
        won: string;
        lost: string;
      };
    };
    newsletter: {
      title: string;
      subtitle: string;
      empty: string;
      exportCsv: string;
      unsubscribe: string;
      unsubscribeConfirm: string;
      unsubscribed: string;
      columns: {
        email: string;
        confirmedAt: string;
        unsubscribedAt: string;
        source: string;
        createdAt: string;
        actions: string;
      };
    };
  };
  languageSwitcher: {
    label: string;
    languages: Record<SuperAdminLocale, string>;
  };
}

const LANGUAGES: Record<SuperAdminLocale, string> = {
  en: 'English',
  ru: 'Русский',
  tr: 'Türkçe',
  uz: "O'zbekcha",
  ky: 'Кыргызча',
  de: 'Deutsch',
  fr: 'Français',
  zh: '中文',
};

const PLAN_BRAND = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
};

const en: SuperAdminDict = {
  common: {
    apply: 'Apply',
    clear: 'Clear',
    reset: 'Reset',
    save: 'Save',
    cancel: 'Cancel',
    search: 'Search',
    view: 'View',
    delete: 'Delete',
    close: 'Close',
    back: 'Back',
    loadMore: 'Load more',
    applying: 'Applying…',
    none: 'None',
    configured: 'Configured',
    missing: 'Missing',
    all: 'All',
    currently: 'Currently',
    dash: '—',
    pass: 'pass',
    fail: 'fail',
    info: 'info',
    empty: 'empty',
    error: 'error',
  },
  nav: {
    brand: 'ishflow Operator',
    subtitle: 'Platform console',
    footer: 'Platform console — operator only',
    items: {
      dashboard: 'Dashboard',
      tenants: 'Tenants',
      users: 'Users',
      billing: 'Billing',
      revenue: 'Revenue',
      audit: 'Audit',
      analytics: 'Analytics',
      communications: 'Communications',
      marketing: 'Marketing',
      system: 'System',
      support: 'Support',
    },
  },
  breadcrumb: { superAdmin: 'Super Admin' },
  shell: {
    breadcrumb: {
      root: 'Super Admin',
      separator: '/',
      home: 'Dashboard',
    },
    palette: {
      trigger: 'Search platform…',
      placeholder: 'Search tenants, users, audit, addons…',
      empty: 'No results.',
      hint: 'Press ⌘K · Ctrl+K · /',
      loading: 'Searching…',
      typeMore: 'Type at least 2 characters to search.',
      groups: {
        tenants: 'Tenants',
        users: 'Users',
        audit: 'Audit',
        addons: 'Addons',
        navigation: 'Navigation',
      },
      shortcuts: {
        open: 'Open palette',
        close: 'Close',
      },
    },
  },
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Cross-tenant overview · refreshes on every load',
    kpis: {
      tenants: { label: 'Tenants', hint: 'Total workspaces' },
      active: { label: 'Active', hint: 'Active / total tenants' },
      mrr: { label: 'MRR', hint: 'Monthly recurring (USD)' },
      activeUsers: { label: 'Active users (30d)', hint: 'Audit-log activity' },
      churn: { label: 'Churn (30d)', hint: 'Tenant cancellations' },
      planMix: { label: 'Plan mix', hint: 'free / starter / pro / business / enterprise' },
    },
    trialingHint: '{count} trialing',
    planMixValue: '{count} paid',
    quickLinks: {
      title: 'Quick links',
      description: 'Jump into the most-used console sections.',
      items: {
        tenants: { label: 'Tenants', description: 'Workspace registry' },
        revenue: { label: 'Revenue', description: 'MRR & churn' },
        audit: { label: 'Audit', description: 'Platform activity log' },
        billing: { label: 'Billing', description: 'Plans & pricing' },
      },
    },
    health: {
      title: 'Console health',
      description: 'Integration credentials derived from env.',
      stripeSecret: 'Stripe secret key',
      stripeWebhook: 'Stripe webhook secret',
      resendApi: 'Resend API key',
    },
  },
  tenants: {
    title: 'Tenants',
    subtitleEmpty: 'No tenants match the current filters.',
    subtitleCountOne: 'Showing {count} tenant',
    subtitleCountMany: 'Showing {count} tenants',
    subtitleMoreAvailable: ' (more available)',
    filters: {
      searchPlaceholder: 'Search name or slug',
      allPlans: 'All plans',
      allStatuses: 'All statuses',
    },
    columns: {
      name: 'Name',
      plan: 'Plan',
      status: 'Status',
      currency: 'Currency',
      members: 'Members',
      mrr: 'MRR (USD)',
      lastActivity: 'Last activity',
      createdAt: 'Created',
    },
    empty: 'No tenants match these filters.',
  },
  tenantDetail: {
    impersonate: 'Impersonate (read-only)',
    manageSubscription: 'Manage subscription',
    createdLabel: 'created',
    tabs: {
      overview: 'Overview',
      users: 'Users',
      documents: 'Documents',
      activity: 'Activity',
      subscription: 'Subscription',
      addons: 'Add-ons',
      debug: 'Debug',
    },
    overview: {
      created: 'Created',
      currency: 'Currency',
      locale: 'Locale',
      owners: 'Owners',
      totalDocuments: 'Total documents',
      mrr: 'MRR (USD)',
      mrrHintActive: 'Active subscription',
      mrrHintNonActive: 'Status: {status}',
    },
    users: {
      title: 'Members ({count})',
      empty: 'No members yet.',
      columns: { user: 'User', roles: 'Roles', joined: 'Joined' },
    },
    documents: {
      title: 'Documents ({count})',
      filterAll: 'All types',
      apply: 'Apply',
      empty: 'No documents.',
      columns: {
        type: 'Type',
        code: 'Code',
        date: 'Date',
        total: 'Total',
        status: 'Status',
      },
      types: {
        salesInvoice: 'Sales invoice',
        purchasesInvoice: 'Purchase invoice',
        salesPaymentReceived: 'Payment received',
        purchasesPaymentSent: 'Payment sent',
      },
    },
    activity: {
      title: 'Activity ({count})',
      empty: 'No audit log entries yet.',
      columns: {
        when: 'When',
        actor: 'Actor',
        entity: 'Entity',
        action: 'Action',
        inspect: 'Inspect',
      },
      inspector: {
        title: 'Audit entry',
        descriptionEmpty: 'Select a row to inspect.',
        entityLabel: 'Entity',
        beforeLabel: 'Before',
        afterLabel: 'After',
      },
    },
    subscription: {
      title: 'Subscription',
      currentState: {
        title: 'Current state',
        description: 'Live values from the tenant row.',
        plan: 'Plan',
        status: 'Status',
        currency: 'Currency',
        trialEnds: 'Trial ends',
        stripeCustomer: 'Stripe customer',
        stripeSubscription: 'Stripe subscription',
      },
    },
    debug: {
      tablesTitle: 'Per-table footprint ({count})',
      tablesEmpty: 'No matching tables.',
      tableColumns: { table: 'Table', rows: 'Rows', size: 'Size' },
      healthTitle: 'Health checks',
      healthColumns: { check: 'Check', result: 'Result', details: 'Details' },
      membershipsCheck: 'Memberships in DB',
      totalFootprint: 'Total DB footprint',
      rlsCheck: 'RLS probe (withTenant)',
    },
  },
  addons: {
    pageTitle: 'Premium add-ons',
    pageDescription:
      'Toggle premium features for this tenant. Changes take effect on the next request.',
    statusLabels: { ga: 'Live', beta: 'Beta', planned: 'Planned' },
    enable: 'Enable',
    disable: 'Disable',
    enabledOn: 'Enabled on {date}',
    enabledBy: 'by {actor}',
    expiresAt: 'Expires {date}',
    expiresNever: 'No expiry',
    notesLabel: 'Notes (optional)',
    notesPlaceholder: 'e.g. Q3 pilot for ACME Ltd',
    expiresAtLabel: 'Expires at (optional)',
    enableConfirmTitle: 'Enable add-on?',
    disableConfirmTitle: 'Disable add-on?',
    disableConfirmDescription:
      'The tenant will lose access immediately. Re-enabling later will keep their existing data.',
    submitting: 'Applying…',
    enabledBadge: 'Enabled',
    disabledBadge: 'Disabled',
  },
  subscription: {
    manualUpgrade: {
      title: 'Change plan',
      description: 'Manual update (no Stripe customer needed — bank transfer / wire flow)',
      planLabel: 'Plan',
      statusLabel: 'Status',
      reasonLabel: 'Reason',
      reasonPlaceholder: 'e.g. bank transfer received 2026-05-13, invoice INV-001',
      reasonHint: 'Stored in BillingEvent payload + audit log',
      currentLabel: 'Current:',
      apply: 'Apply manual change',
      confirmTitle: 'Apply manual change?',
      confirmPlanLine: '  plan:   {from} → {to}',
      confirmStatusLine: '  status: {from} → {to}',
      confirmFooter: 'This bypasses Stripe and is recorded in the platform audit log.',
    },
    planOptions: { ...PLAN_BRAND },
    statusOptions: {
      active: 'Active',
      trialing: 'Trialing',
      past_due: 'Past due',
      suspended: 'Suspended',
      cancelled: 'Cancelled',
      deleted: 'Deleted',
    },
    timeline: {
      title: 'Billing events',
      description: 'Stripe webhooks + manual changes',
      empty: 'No billing events recorded for this tenant.',
      payload: 'Payload',
      errorBadge: 'error',
    },
    overrides: {
      title: 'Plan limit overrides',
      description: 'Per-tenant adjustments applied on top of the published plan matrix.',
      empty: 'No overrides — tenant uses its plan defaults.',
      keyHeader: 'Key',
      valueHeader: 'Value',
      expiresHeader: 'Expires',
      keyLabel: 'Key',
      keyPlaceholder: 'maxUsers',
      valueLabel: 'Value',
      valuePlaceholder: '25',
      expiresLabel: 'Expires (optional)',
      addButton: 'Add override',
    },
  },
  billing: {
    title: 'Billing',
    subtitle: 'Global subscription feature gate. Changes take effect within 60 seconds.',
    cardTitle: 'Subscription feature gate',
    cardDescription: 'Controls whether all tenants see paid plan UI.',
    currentLabel: 'Currently:',
    currentTag: 'current',
    states: {
      enabled: {
        label: 'Enabled',
        description: 'Stripe Checkout active, plan picker interactive.',
      },
      disabled: {
        label: 'Disabled',
        description: 'UI visible, payment CTAs replaced with “Contact admin” copy.',
      },
      hidden: {
        label: 'Hidden',
        description: 'Billing UI removed entirely (mobile + web).',
      },
    },
    apply: 'Apply',
  },
  audit: {
    title: 'Platform audit',
    subtitle:
      'Operator-level audit trail across all tenants — plan changes, gate flips, impersonation sessions.',
    filters: {
      title: 'Filters',
      description: 'Narrow down the audit log by action, actor, or tenant.',
      actionLabel: 'Action',
      actorLabel: 'Actor (clerkId)',
      actorPlaceholder: 'user_…',
      tenantLabel: 'Tenant ID',
      tenantPlaceholder: 'uuid…',
      allActions: 'All actions',
      apply: 'Apply',
      reset: 'Reset',
    },
    columns: {
      when: 'When',
      actor: 'Actor',
      action: 'Action',
      tenant: 'Tenant',
    },
    emptyTitle: 'No matches',
    emptyDescription:
      'No audit entries match the current filters. Try widening the criteria or resetting filters.',
    loadMore: 'Load more',
    detail: {
      back: '← Back to audit',
      heading: 'Audit entry',
      metadataTitle: 'Metadata',
      metadataDescription: 'Actor, target tenant, and request context.',
      rows: {
        when: 'When',
        actor: 'Actor',
        action: 'Action',
        tenant: 'Tenant',
        targetUser: 'Target user',
        ip: 'IP',
        userAgent: 'UserAgent',
      },
      beforeTitle: 'Before',
      beforeDescription: 'State prior to the change.',
      afterTitle: 'After',
      afterDescription: 'State after the change applied.',
    },
  },
  users: {
    title: 'Users',
    subtitle: 'Search across every tenant by email, name, or Clerk ID.',
    searchTitle: 'Search',
    searchDescription: 'Minimum 2 characters. Matches up to 50 results.',
    queryLabel: 'Query',
    queryPlaceholder: 'Email, first/last name, or user_…',
    apply: 'Apply',
    states: {
      tooShortTitle: 'Query too short',
      tooShortDescription: 'Enter at least 2 characters to search.',
      noQueryTitle: 'No query yet',
      noQueryDescriptionPrefix: 'Type at least 2 characters and press ',
      noQueryDescriptionAction: 'Apply',
      noMatchesTitle: 'No matches',
      noMatchesDescriptionPrefix: 'No users matched',
    },
    columns: {
      user: 'User',
      memberships: 'Memberships',
      firstTenant: 'First tenant',
      clerkId: 'Clerk ID',
    },
    deletedBadge: 'deleted',
    noneText: 'none',
  },
  revenue: {
    title: 'Revenue',
    subtitle: 'MRR breakdown, plan distribution, churn and trial conversion (last 30 days).',
    kpis: {
      totalMrr: { label: 'Total MRR', hint: 'USD equivalent across active tenants' },
      churn30d: { label: 'Churn (30d)', hint: 'Tenant cancellations' },
      trialConversion30d: {
        label: 'Trial conversion (30d)',
        hint: 'Ended trials that became active',
      },
    },
    planDistribution: {
      title: 'Plan distribution',
      description: 'Tenants per plan',
    },
    planLabels: { ...PLAN_BRAND },
  },
  communications: {
    title: 'Communications',
    subtitle: 'In-app announcements — banner, popup, and feed entries.',
    actions: {
      new: 'New announcement',
      publish: 'Publish',
      recall: 'Recall',
      saveDraft: 'Save draft',
      preview: 'Preview',
    },
    filters: {
      allStatuses: 'All statuses',
      statusLabel: 'Status',
    },
    columns: {
      internalKey: 'Key',
      surface: 'Surface',
      status: 'Status',
      startAt: 'Starts',
      endAt: 'Ends',
      createdAt: 'Created',
    },
    surfaces: {
      banner: 'Banner',
      popup: 'Popup',
      feed_only: 'Feed only',
    },
    statuses: {
      draft: 'Draft',
      scheduled: 'Scheduled',
      live: 'Live',
      archived: 'Archived',
    },
    form: {
      sectionMeta: 'Metadata',
      sectionTranslations: 'Translations',
      sectionTargeting: 'Targeting',
      sectionPreview: 'Preview',
      internalKey: 'Internal key',
      internalKeyHint: 'Operator-only slug used in URLs and audit log.',
      surface: 'Surface',
      status: 'Status',
      startAt: 'Start at',
      endAt: 'End at',
      dismissible: 'Dismissible',
      ctaLabel: 'CTA label',
      ctaUrl: 'CTA URL',
      title: 'Title',
      body: 'Body (Markdown)',
      bodyHint: 'Plain text or Markdown. Each locale is independent.',
      plans: 'Plans (comma-separated)',
      addons: 'Add-ons (comma-separated)',
      roles: 'Roles (comma-separated)',
      locales: 'Locales (comma-separated)',
      tenantIds: 'Tenant IDs (comma-separated)',
      tenantIdsHint: 'Empty = no filter on this axis.',
      targetingEmpty: 'No filters — visible to every tenant + user.',
    },
    list: {
      empty: 'No announcements yet.',
      emptyDescription: 'Create one to surface news to tenants in-app.',
    },
    detail: {
      back: '← Back to communications',
      analyticsLink: 'View analytics',
    },
    analytics: {
      title: 'Analytics',
      description: 'Impressions, viewers, dismissal rate, and click-through.',
      impressions: 'Total impressions',
      uniqueViewers: 'Unique viewers',
      dismissalRate: 'Dismissal rate',
      ctr: 'Click-through rate',
      perTenantTitle: 'Per-tenant breakdown',
      perTenantDescription: 'Top 20 tenants by impressions.',
      perTenantEmpty: 'No impressions recorded yet.',
      columns: {
        tenant: 'Tenant',
        impressions: 'Impressions',
        viewed: 'Viewed',
        clicked: 'Clicked',
      },
    },
  },
  marketing: {
    landing: {
      title: 'Marketing CMS',
      subtitle: 'Edit landing sections, blog posts, media, and inbound leads.',
      tiles: {
        sections: {
          title: 'Sections',
          description: 'Hero, features, FAQ, footer copy per page',
        },
        blog: { title: 'Blog', description: 'Posts with per-locale title, excerpt, body' },
        media: { title: 'Media', description: 'Upload + manage marketing images' },
        leads: { title: 'Leads', description: 'Inbound contact + demo requests' },
        newsletter: { title: 'Newsletter', description: 'Subscribers + CSV export' },
      },
    },
    common: {
      addRow: 'Add row',
      removeRow: 'Remove',
      saveSection: 'Save section',
      saving: 'Saving…',
      lastSaved: 'Last saved',
      neverSaved: 'Never saved — defaults shown',
      defaultsNotice: 'No content stored yet — editing the built-in defaults.',
    },
    sections: {
      title: 'Sections',
      subtitle: 'Marketing page sections, grouped by page.',
      columns: {
        page: 'Page',
        section: 'Section',
        type: 'Type',
        locales: 'Locales',
        updatedAt: 'Last updated',
      },
      noLocales: 'Not yet saved',
      typeLabels: {
        hero: 'Hero',
        featureCards: 'Feature cards',
        socialProof: 'Social proof',
        testimonials: 'Testimonials',
        faq: 'FAQ',
        footerColumns: 'Footer columns',
      },
      edit: {
        backToList: '← Back to sections',
        history: 'History',
        localeTabsLabel: 'Locale',
        savedSuccess: 'Saved.',
        saveError: 'Save failed — check the form values.',
      },
      versions: {
        title: 'Version history',
        empty: 'No previous versions.',
        columns: {
          createdAt: 'When',
          actor: 'Actor',
          actions: 'Actions',
        },
        restore: 'Restore',
        restoreConfirm: 'Restore this version? Current content becomes a new history entry.',
      },
      forms: {
        hero: {
          headline: 'Headline',
          subhead: 'Subhead',
          primaryCta: 'Primary CTA',
          secondaryCta: 'Secondary CTA (optional)',
          label: 'Label',
          href: 'Link',
          heroImageUrl: 'Hero image URL (optional)',
        },
        featureCards: {
          iconKey: 'Icon key',
          title: 'Title',
          body: 'Body',
          href: 'Link (optional)',
          addCard: 'Add card',
        },
        socialProof: {
          value: 'Value',
          label: 'Label',
          addStat: 'Add stat',
        },
        testimonials: {
          quote: 'Quote',
          authorName: 'Author name',
          authorRole: 'Author role',
          authorCompany: 'Author company',
          avatarUrl: 'Avatar URL (optional)',
          addItem: 'Add testimonial',
        },
        faq: {
          question: 'Question',
          answer: 'Answer',
          addItem: 'Add Q&A',
        },
        footerColumns: {
          title: 'Column title',
          links: 'Links',
          label: 'Label',
          href: 'Link',
          addColumn: 'Add column',
          addLink: 'Add link',
        },
      },
    },
    pageLabels: {
      home: 'Home',
      pricing: 'Pricing',
      features: 'Features',
      addons: 'Add-ons',
      about: 'About',
      contact: 'Contact',
      global: 'Global (footer, nav)',
    },
    blog: {
      title: 'Blog',
      subtitle: 'Manage posts and translations.',
      newButton: 'New post',
      columns: {
        slug: 'Slug',
        status: 'Status',
        author: 'Author',
        updatedAt: 'Updated',
        publishedAt: 'Published',
      },
      statusLabels: {
        draft: 'Draft',
        published: 'Published',
        archived: 'Archived',
      },
      empty: 'No posts yet.',
      new: {
        title: 'New blog post',
        subtitle: 'Create a draft. Translations go in next.',
        slug: 'Slug',
        slugHint: 'URL fragment — lowercase, dashes only.',
        authorName: 'Author name',
        tags: 'Tags',
        tagsHint: 'Comma-separated.',
        heroImageUrl: 'Hero image URL (optional)',
        create: 'Create draft',
        slugConflict: 'A post with this slug already exists.',
      },
      edit: {
        backToList: '← Back to posts',
        preview: 'Preview',
        publish: 'Publish',
        archive: 'Archive',
        saved: 'Saved.',
        publishedAt: 'Published at',
        translations: 'Translations',
        body: 'Body (MDX)',
        bodyHint: 'Markdown with HTML allowed.',
        excerpt: 'Excerpt',
        postTitle: 'Title',
        publishConfirm: 'Publish this post? It will be visible on the public site.',
        archiveConfirm: 'Archive this post? It will be hidden from the public site.',
      },
      preview: {
        title: 'Preview',
        empty: 'No content to preview yet.',
      },
    },
    media: {
      title: 'Media',
      subtitle: 'Marketing image library on R2.',
      upload: 'Upload',
      uploading: 'Uploading…',
      limits: 'PNG, JPEG, WebP, SVG · max 5MB.',
      empty: 'No files uploaded yet.',
      columns: {
        preview: 'Preview',
        key: 'Key',
        size: 'Size',
        uploadedAt: 'Uploaded',
        actions: 'Actions',
      },
      copyUrl: 'Copy URL',
      copied: 'Copied',
      delete: 'Delete',
      deleteConfirm: 'Delete this file? This cannot be undone.',
      errors: {
        tooLarge: 'File exceeds the 5MB limit.',
        badMime: 'Unsupported file type. Allowed: PNG, JPEG, WebP, SVG.',
        notConfigured: 'R2 is not configured for this environment.',
      },
    },
    leads: {
      title: 'Leads',
      subtitle: 'Inbound contact + demo form submissions.',
      empty: 'No leads yet.',
      filterAll: 'All statuses',
      columns: {
        when: 'When',
        name: 'Name',
        email: 'Email',
        company: 'Company',
        source: 'Source',
        message: 'Message',
        status: 'Status',
      },
      statusLabels: {
        new: 'New',
        contacted: 'Contacted',
        qualified: 'Qualified',
        won: 'Won',
        lost: 'Lost',
      },
    },
    newsletter: {
      title: 'Newsletter',
      subtitle: 'Confirmed + pending subscribers.',
      empty: 'No subscribers yet.',
      exportCsv: 'Export CSV',
      unsubscribe: 'Unsubscribe',
      unsubscribeConfirm: 'Unsubscribe this email? They will stop receiving newsletters.',
      unsubscribed: 'Unsubscribed',
      columns: {
        email: 'Email',
        confirmedAt: 'Confirmed',
        unsubscribedAt: 'Unsubscribed',
        source: 'Source',
        createdAt: 'Joined',
        actions: 'Actions',
      },
    },
  },
  languageSwitcher: {
    label: 'Language',
    languages: LANGUAGES,
  },
};

const ru: SuperAdminDict = {
  common: {
    apply: 'Применить',
    clear: 'Очистить',
    reset: 'Сбросить',
    save: 'Сохранить',
    cancel: 'Отмена',
    search: 'Поиск',
    view: 'Открыть',
    delete: 'Удалить',
    close: 'Закрыть',
    back: 'Назад',
    loadMore: 'Загрузить ещё',
    applying: 'Применяем…',
    none: 'Нет',
    configured: 'Настроено',
    missing: 'Не задано',
    all: 'Все',
    currently: 'Сейчас',
    dash: '—',
    pass: 'ok',
    fail: 'ошибка',
    info: 'инфо',
    empty: 'пусто',
    error: 'ошибка',
  },
  nav: {
    brand: 'ishflow Оператор',
    subtitle: 'Консоль платформы',
    footer: 'Консоль платформы — только для оператора',
    items: {
      dashboard: 'Обзор',
      tenants: 'Клиенты',
      users: 'Пользователи',
      billing: 'Биллинг',
      revenue: 'Выручка',
      audit: 'Журнал',
      analytics: 'Аналитика',
      communications: 'Коммуникации',
      marketing: 'Маркетинг',
      system: 'Система',
      support: 'Поддержка',
    },
  },
  breadcrumb: { superAdmin: 'Супер-админ' },
  shell: {
    breadcrumb: {
      root: 'Супер-админ',
      separator: '/',
      home: 'Обзор',
    },
    palette: {
      trigger: 'Поиск по платформе…',
      placeholder: 'Поиск клиентов, пользователей, журнала, дополнений…',
      empty: 'Ничего не найдено.',
      hint: 'Нажмите ⌘K · Ctrl+K · /',
      loading: 'Поиск…',
      typeMore: 'Введите минимум 2 символа.',
      groups: {
        tenants: 'Клиенты',
        users: 'Пользователи',
        audit: 'Журнал',
        addons: 'Дополнения',
        navigation: 'Навигация',
      },
      shortcuts: {
        open: 'Открыть палитру',
        close: 'Закрыть',
      },
    },
  },
  dashboard: {
    title: 'Обзор',
    subtitle: 'Кросс-арендная сводка · обновляется при каждой загрузке',
    kpis: {
      tenants: { label: 'Клиенты', hint: 'Всего рабочих пространств' },
      active: { label: 'Активные', hint: 'Активные / всего' },
      mrr: { label: 'MRR', hint: 'Ежемесячный доход (USD)' },
      activeUsers: { label: 'Активные (30д)', hint: 'Активность журнала' },
      churn: { label: 'Отток (30д)', hint: 'Отмены клиентов' },
      planMix: { label: 'Тарифы', hint: 'free / starter / pro / business / enterprise' },
    },
    trialingHint: '{count} в пробном периоде',
    planMixValue: '{count} платных',
    quickLinks: {
      title: 'Быстрые ссылки',
      description: 'Переход к самым используемым разделам.',
      items: {
        tenants: { label: 'Клиенты', description: 'Реестр клиентов' },
        revenue: { label: 'Выручка', description: 'MRR и отток' },
        audit: { label: 'Аудит', description: 'Журнал активности' },
        billing: { label: 'Биллинг', description: 'Тарифы и цены' },
      },
    },
    health: {
      title: 'Состояние сервисов',
      description: 'Учётные данные интеграций из переменных среды.',
      stripeSecret: 'Stripe — секретный ключ',
      stripeWebhook: 'Stripe — секрет вебхука',
      resendApi: 'Resend — API-ключ',
    },
  },
  tenants: {
    title: 'Клиенты',
    subtitleEmpty: 'По текущим фильтрам клиенты не найдены.',
    subtitleCountOne: 'Показан {count} клиент',
    subtitleCountMany: 'Показано {count} клиентов',
    subtitleMoreAvailable: ' (доступно ещё)',
    filters: {
      searchPlaceholder: 'Поиск по названию или slug',
      allPlans: 'Все тарифы',
      allStatuses: 'Все статусы',
    },
    columns: {
      name: 'Название',
      plan: 'Тариф',
      status: 'Статус',
      currency: 'Валюта',
      members: 'Участники',
      mrr: 'MRR (USD)',
      lastActivity: 'Последняя активность',
      createdAt: 'Создано',
    },
    empty: 'По этим фильтрам клиенты не найдены.',
  },
  tenantDetail: {
    impersonate: 'Войти как клиент (read-only)',
    manageSubscription: 'Управление подпиской',
    createdLabel: 'создан',
    tabs: {
      overview: 'Обзор',
      users: 'Пользователи',
      documents: 'Документы',
      activity: 'Активность',
      subscription: 'Подписка',
      addons: 'Аддоны',
      debug: 'Отладка',
    },
    overview: {
      created: 'Создан',
      currency: 'Валюта',
      locale: 'Локаль',
      owners: 'Владельцы',
      totalDocuments: 'Всего документов',
      mrr: 'MRR (USD)',
      mrrHintActive: 'Активная подписка',
      mrrHintNonActive: 'Статус: {status}',
    },
    users: {
      title: 'Участники ({count})',
      empty: 'Участников пока нет.',
      columns: { user: 'Пользователь', roles: 'Роли', joined: 'Присоединился' },
    },
    documents: {
      title: 'Документы ({count})',
      filterAll: 'Все типы',
      apply: 'Применить',
      empty: 'Документов нет.',
      columns: {
        type: 'Тип',
        code: 'Код',
        date: 'Дата',
        total: 'Сумма',
        status: 'Статус',
      },
      types: {
        salesInvoice: 'Счёт-фактура (продажа)',
        purchasesInvoice: 'Счёт-фактура (закупка)',
        salesPaymentReceived: 'Поступление оплаты',
        purchasesPaymentSent: 'Списание оплаты',
      },
    },
    activity: {
      title: 'Активность ({count})',
      empty: 'Записей журнала пока нет.',
      columns: {
        when: 'Когда',
        actor: 'Кто',
        entity: 'Объект',
        action: 'Действие',
        inspect: 'Открыть',
      },
      inspector: {
        title: 'Запись аудита',
        descriptionEmpty: 'Выберите строку для просмотра.',
        entityLabel: 'Объект',
        beforeLabel: 'До',
        afterLabel: 'После',
      },
    },
    subscription: {
      title: 'Подписка',
      currentState: {
        title: 'Текущее состояние',
        description: 'Актуальные значения из записи клиента.',
        plan: 'Тариф',
        status: 'Статус',
        currency: 'Валюта',
        trialEnds: 'Конец пробного периода',
        stripeCustomer: 'Stripe customer',
        stripeSubscription: 'Stripe subscription',
      },
    },
    debug: {
      tablesTitle: 'Размер таблиц ({count})',
      tablesEmpty: 'Подходящих таблиц нет.',
      tableColumns: { table: 'Таблица', rows: 'Строки', size: 'Размер' },
      healthTitle: 'Проверки',
      healthColumns: { check: 'Проверка', result: 'Результат', details: 'Детали' },
      membershipsCheck: 'Участники в БД',
      totalFootprint: 'Размер БД (всего)',
      rlsCheck: 'RLS-проверка (withTenant)',
    },
  },
  addons: {
    pageTitle: 'Премиум-аддоны',
    pageDescription:
      'Переключайте премиум-функции для этого клиента. Изменения вступают в силу со следующего запроса.',
    statusLabels: { ga: 'Доступен', beta: 'Бета', planned: 'В планах' },
    enable: 'Включить',
    disable: 'Выключить',
    enabledOn: 'Включён {date}',
    enabledBy: 'пользователем {actor}',
    expiresAt: 'Истекает {date}',
    expiresNever: 'Без срока',
    notesLabel: 'Заметки (опционально)',
    notesPlaceholder: 'например, пилот Q3 для ООО «Ромашка»',
    expiresAtLabel: 'Истекает (опционально)',
    enableConfirmTitle: 'Включить аддон?',
    disableConfirmTitle: 'Выключить аддон?',
    disableConfirmDescription:
      'Клиент потеряет доступ немедленно. При повторном включении его данные сохранятся.',
    submitting: 'Применяем…',
    enabledBadge: 'Включён',
    disabledBadge: 'Выключен',
  },
  subscription: {
    manualUpgrade: {
      title: 'Сменить тариф',
      description: 'Ручное обновление (без Stripe — банковский перевод).',
      planLabel: 'Тариф',
      statusLabel: 'Статус',
      reasonLabel: 'Причина',
      reasonPlaceholder: 'напр. банковский перевод от 2026-05-13, счёт INV-001',
      reasonHint: 'Сохраняется в BillingEvent и в журнале аудита.',
      currentLabel: 'Сейчас:',
      apply: 'Применить изменения',
      confirmTitle: 'Применить ручное изменение?',
      confirmPlanLine: '  тариф:   {from} → {to}',
      confirmStatusLine: '  статус:  {from} → {to}',
      confirmFooter: 'Stripe пропускается, запись будет в журнале платформы.',
    },
    planOptions: { ...PLAN_BRAND },
    statusOptions: {
      active: 'Активна',
      trialing: 'Пробный период',
      past_due: 'Просрочена',
      suspended: 'Приостановлена',
      cancelled: 'Отменена',
      deleted: 'Удалена',
    },
    timeline: {
      title: 'События биллинга',
      description: 'Stripe-вебхуки и ручные изменения',
      empty: 'Событий биллинга по этому клиенту нет.',
      payload: 'Payload',
      errorBadge: 'ошибка',
    },
    overrides: {
      title: 'Переопределения лимитов',
      description: 'Поверх опубликованной матрицы тарифов для этого клиента.',
      empty: 'Переопределений нет — клиент использует дефолты своего тарифа.',
      keyHeader: 'Ключ',
      valueHeader: 'Значение',
      expiresHeader: 'Истекает',
      keyLabel: 'Ключ',
      keyPlaceholder: 'maxUsers',
      valueLabel: 'Значение',
      valuePlaceholder: '25',
      expiresLabel: 'Истекает (опционально)',
      addButton: 'Добавить',
    },
  },
  billing: {
    title: 'Биллинг',
    subtitle: 'Глобальный переключатель платных подписок. Применяется в течение 60 секунд.',
    cardTitle: 'Шлюз подписок',
    cardDescription: 'Определяет, видят ли клиенты UI платных тарифов.',
    currentLabel: 'Сейчас:',
    currentTag: 'текущее',
    states: {
      enabled: {
        label: 'Включено',
        description: 'Stripe Checkout активен, выбор тарифа интерактивен.',
      },
      disabled: {
        label: 'Выключено',
        description: 'UI виден, CTA оплаты заменены на «Обратитесь к админу».',
      },
      hidden: {
        label: 'Скрыто',
        description: 'UI биллинга полностью убран (web + mobile).',
      },
    },
    apply: 'Применить',
  },
  audit: {
    title: 'Аудит платформы',
    subtitle:
      'Журнал действий оператора по всем клиентам — смены тарифов, переключатели, импесонация.',
    filters: {
      title: 'Фильтры',
      description: 'Сузьте журнал по действию, инициатору или клиенту.',
      actionLabel: 'Действие',
      actorLabel: 'Инициатор (clerkId)',
      actorPlaceholder: 'user_…',
      tenantLabel: 'ID клиента',
      tenantPlaceholder: 'uuid…',
      allActions: 'Все действия',
      apply: 'Применить',
      reset: 'Сбросить',
    },
    columns: {
      when: 'Когда',
      actor: 'Инициатор',
      action: 'Действие',
      tenant: 'Клиент',
    },
    emptyTitle: 'Совпадений нет',
    emptyDescription: 'По этим фильтрам записей нет. Расширьте критерии или сбросьте фильтры.',
    loadMore: 'Загрузить ещё',
    detail: {
      back: '← К журналу',
      heading: 'Запись аудита',
      metadataTitle: 'Метаданные',
      metadataDescription: 'Инициатор, целевой клиент и контекст запроса.',
      rows: {
        when: 'Когда',
        actor: 'Инициатор',
        action: 'Действие',
        tenant: 'Клиент',
        targetUser: 'Целевой пользователь',
        ip: 'IP',
        userAgent: 'UserAgent',
      },
      beforeTitle: 'До',
      beforeDescription: 'Состояние до изменения.',
      afterTitle: 'После',
      afterDescription: 'Состояние после изменения.',
    },
  },
  users: {
    title: 'Пользователи',
    subtitle: 'Поиск по всем клиентам — по email, имени или Clerk ID.',
    searchTitle: 'Поиск',
    searchDescription: 'Минимум 2 символа. До 50 результатов.',
    queryLabel: 'Запрос',
    queryPlaceholder: 'Email, имя/фамилия или user_…',
    apply: 'Применить',
    states: {
      tooShortTitle: 'Запрос слишком короткий',
      tooShortDescription: 'Введите минимум 2 символа.',
      noQueryTitle: 'Запрос не задан',
      noQueryDescriptionPrefix: 'Введите минимум 2 символа и нажмите ',
      noQueryDescriptionAction: 'Применить',
      noMatchesTitle: 'Ничего не найдено',
      noMatchesDescriptionPrefix: 'Никто не соответствует запросу',
    },
    columns: {
      user: 'Пользователь',
      memberships: 'Членства',
      firstTenant: 'Первый клиент',
      clerkId: 'Clerk ID',
    },
    deletedBadge: 'удалён',
    noneText: 'нет',
  },
  revenue: {
    title: 'Выручка',
    subtitle: 'MRR, распределение тарифов, отток и конверсия пробных (30 дней).',
    kpis: {
      totalMrr: { label: 'Общая MRR', hint: 'Эквивалент в USD по активным клиентам' },
      churn30d: { label: 'Отток (30д)', hint: 'Отмены клиентов' },
      trialConversion30d: {
        label: 'Конверсия пробных (30д)',
        hint: 'Завершённые пробные, ставшие активными',
      },
    },
    planDistribution: {
      title: 'Распределение по тарифам',
      description: 'Клиенты по каждому тарифу',
    },
    planLabels: { ...PLAN_BRAND },
  },
  communications: {
    title: 'Объявления',
    subtitle: 'Внутри-продуктовые объявления — баннер, поп-ап и лента.',
    actions: {
      new: 'Новое объявление',
      publish: 'Опубликовать',
      recall: 'Отозвать',
      saveDraft: 'Сохранить черновик',
      preview: 'Предпросмотр',
    },
    filters: {
      allStatuses: 'Все статусы',
      statusLabel: 'Статус',
    },
    columns: {
      internalKey: 'Ключ',
      surface: 'Поверхность',
      status: 'Статус',
      startAt: 'Начало',
      endAt: 'Окончание',
      createdAt: 'Создано',
    },
    surfaces: {
      banner: 'Баннер',
      popup: 'Поп-ап',
      feed_only: 'Только лента',
    },
    statuses: {
      draft: 'Черновик',
      scheduled: 'Запланировано',
      live: 'Активно',
      archived: 'Архив',
    },
    form: {
      sectionMeta: 'Метаданные',
      sectionTranslations: 'Переводы',
      sectionTargeting: 'Таргетинг',
      sectionPreview: 'Предпросмотр',
      internalKey: 'Внутренний ключ',
      internalKeyHint: 'Используется в URL и журнале аудита.',
      surface: 'Поверхность',
      status: 'Статус',
      startAt: 'Начало',
      endAt: 'Окончание',
      dismissible: 'Можно закрыть',
      ctaLabel: 'Текст кнопки',
      ctaUrl: 'URL кнопки',
      title: 'Заголовок',
      body: 'Тело (Markdown)',
      bodyHint: 'Простой текст или Markdown. Каждая локаль независима.',
      plans: 'Тарифы (через запятую)',
      addons: 'Аддоны (через запятую)',
      roles: 'Роли (через запятую)',
      locales: 'Локали (через запятую)',
      tenantIds: 'ID клиентов (через запятую)',
      tenantIdsHint: 'Пусто = без фильтра по этому измерению.',
      targetingEmpty: 'Фильтры не заданы — видно всем клиентам и пользователям.',
    },
    list: {
      empty: 'Объявлений пока нет.',
      emptyDescription: 'Создайте объявление, чтобы донести новости до клиентов внутри продукта.',
    },
    detail: {
      back: '← К списку объявлений',
      analyticsLink: 'Аналитика',
    },
    analytics: {
      title: 'Аналитика',
      description: 'Показы, зрители, доля закрытий и переходов по CTA.',
      impressions: 'Всего показов',
      uniqueViewers: 'Уникальных зрителей',
      dismissalRate: 'Доля закрытий',
      ctr: 'CTR',
      perTenantTitle: 'По клиентам',
      perTenantDescription: 'Топ-20 клиентов по показам.',
      perTenantEmpty: 'Показов пока нет.',
      columns: {
        tenant: 'Клиент',
        impressions: 'Показы',
        viewed: 'Просмотры',
        clicked: 'Клики',
      },
    },
  },
  marketing: {
    landing: {
      title: 'Маркетинговая CMS',
      subtitle: 'Редактирование секций, статей блога, медиа и входящих заявок.',
      tiles: {
        sections: {
          title: 'Секции',
          description: 'Hero, фичи, FAQ, футер — по страницам',
        },
        blog: { title: 'Блог', description: 'Статьи с переводами' },
        media: { title: 'Медиа', description: 'Изображения для маркетинга' },
        leads: { title: 'Заявки', description: 'Входящие контакты и запросы демо' },
        newsletter: { title: 'Рассылка', description: 'Подписчики + экспорт CSV' },
      },
    },
    common: {
      addRow: 'Добавить',
      removeRow: 'Удалить',
      saveSection: 'Сохранить секцию',
      saving: 'Сохраняем…',
      lastSaved: 'Сохранено',
      neverSaved: 'Ещё не сохранено — показаны дефолты',
      defaultsNotice: 'Содержимое ещё не сохранено — редактируете встроенные дефолты.',
    },
    sections: {
      title: 'Секции',
      subtitle: 'Секции маркетинговых страниц, сгруппированы по странице.',
      columns: {
        page: 'Страница',
        section: 'Секция',
        type: 'Тип',
        locales: 'Локали',
        updatedAt: 'Обновлено',
      },
      noLocales: 'Не сохранено',
      typeLabels: {
        hero: 'Hero',
        featureCards: 'Карточки фич',
        socialProof: 'Социальное доказательство',
        testimonials: 'Отзывы',
        faq: 'FAQ',
        footerColumns: 'Колонки футера',
      },
      edit: {
        backToList: '← К списку секций',
        history: 'История',
        localeTabsLabel: 'Локаль',
        savedSuccess: 'Сохранено.',
        saveError: 'Не удалось сохранить — проверьте значения формы.',
      },
      versions: {
        title: 'История версий',
        empty: 'Предыдущих версий нет.',
        columns: {
          createdAt: 'Когда',
          actor: 'Кто',
          actions: 'Действия',
        },
        restore: 'Восстановить',
        restoreConfirm:
          'Восстановить эту версию? Текущее содержимое уйдёт в историю как новая запись.',
      },
      forms: {
        hero: {
          headline: 'Заголовок',
          subhead: 'Подзаголовок',
          primaryCta: 'Главный CTA',
          secondaryCta: 'Второй CTA (опционально)',
          label: 'Подпись',
          href: 'Ссылка',
          heroImageUrl: 'URL изображения (опционально)',
        },
        featureCards: {
          iconKey: 'Ключ иконки',
          title: 'Заголовок',
          body: 'Текст',
          href: 'Ссылка (опционально)',
          addCard: 'Добавить карточку',
        },
        socialProof: {
          value: 'Значение',
          label: 'Подпись',
          addStat: 'Добавить показатель',
        },
        testimonials: {
          quote: 'Цитата',
          authorName: 'Имя автора',
          authorRole: 'Роль',
          authorCompany: 'Компания',
          avatarUrl: 'URL аватара (опционально)',
          addItem: 'Добавить отзыв',
        },
        faq: {
          question: 'Вопрос',
          answer: 'Ответ',
          addItem: 'Добавить Q&A',
        },
        footerColumns: {
          title: 'Заголовок колонки',
          links: 'Ссылки',
          label: 'Подпись',
          href: 'Ссылка',
          addColumn: 'Добавить колонку',
          addLink: 'Добавить ссылку',
        },
      },
    },
    pageLabels: {
      home: 'Главная',
      pricing: 'Тарифы',
      features: 'Возможности',
      addons: 'Аддоны',
      about: 'О нас',
      contact: 'Контакты',
      global: 'Глобальное (футер, навигация)',
    },
    blog: {
      title: 'Блог',
      subtitle: 'Управление статьями и переводами.',
      newButton: 'Новая статья',
      columns: {
        slug: 'Slug',
        status: 'Статус',
        author: 'Автор',
        updatedAt: 'Обновлено',
        publishedAt: 'Опубликовано',
      },
      statusLabels: {
        draft: 'Черновик',
        published: 'Опубликовано',
        archived: 'В архиве',
      },
      empty: 'Статей пока нет.',
      new: {
        title: 'Новая статья',
        subtitle: 'Создайте черновик. Переводы добавите следом.',
        slug: 'Slug',
        slugHint: 'Фрагмент URL — только латиница и дефисы.',
        authorName: 'Имя автора',
        tags: 'Теги',
        tagsHint: 'Через запятую.',
        heroImageUrl: 'URL обложки (опционально)',
        create: 'Создать черновик',
        slugConflict: 'Статья с таким slug уже существует.',
      },
      edit: {
        backToList: '← К списку статей',
        preview: 'Превью',
        publish: 'Опубликовать',
        archive: 'В архив',
        saved: 'Сохранено.',
        publishedAt: 'Опубликовано',
        translations: 'Переводы',
        body: 'Тело (MDX)',
        bodyHint: 'Markdown с разрешённым HTML.',
        excerpt: 'Краткое описание',
        postTitle: 'Заголовок',
        publishConfirm: 'Опубликовать статью? Она появится на публичном сайте.',
        archiveConfirm: 'Перенести в архив? Статья будет скрыта с публичного сайта.',
      },
      preview: {
        title: 'Превью',
        empty: 'Контента для превью пока нет.',
      },
    },
    media: {
      title: 'Медиа',
      subtitle: 'Библиотека маркетинговых изображений на R2.',
      upload: 'Загрузить',
      uploading: 'Загружаем…',
      limits: 'PNG, JPEG, WebP, SVG · до 5 МБ.',
      empty: 'Файлов пока нет.',
      columns: {
        preview: 'Превью',
        key: 'Ключ',
        size: 'Размер',
        uploadedAt: 'Загружено',
        actions: 'Действия',
      },
      copyUrl: 'Скопировать URL',
      copied: 'Скопировано',
      delete: 'Удалить',
      deleteConfirm: 'Удалить файл? Действие необратимо.',
      errors: {
        tooLarge: 'Файл превышает лимит 5 МБ.',
        badMime: 'Неподдерживаемый тип файла. Допустимо: PNG, JPEG, WebP, SVG.',
        notConfigured: 'R2 не настроен для этой среды.',
      },
    },
    leads: {
      title: 'Заявки',
      subtitle: 'Входящие сообщения форм контакта и демо.',
      empty: 'Заявок пока нет.',
      filterAll: 'Все статусы',
      columns: {
        when: 'Когда',
        name: 'Имя',
        email: 'Email',
        company: 'Компания',
        source: 'Источник',
        message: 'Сообщение',
        status: 'Статус',
      },
      statusLabels: {
        new: 'Новая',
        contacted: 'В работе',
        qualified: 'Квалифицирована',
        won: 'Выиграна',
        lost: 'Проиграна',
      },
    },
    newsletter: {
      title: 'Рассылка',
      subtitle: 'Подтверждённые и ожидающие подписчики.',
      empty: 'Подписчиков пока нет.',
      exportCsv: 'Экспорт CSV',
      unsubscribe: 'Отписать',
      unsubscribeConfirm: 'Отписать этот email? Рассылки прекратятся.',
      unsubscribed: 'Отписан',
      columns: {
        email: 'Email',
        confirmedAt: 'Подтверждён',
        unsubscribedAt: 'Отписан',
        source: 'Источник',
        createdAt: 'Подписался',
        actions: 'Действия',
      },
    },
  },
  languageSwitcher: {
    label: 'Язык',
    languages: LANGUAGES,
  },
};

const tr: SuperAdminDict = {
  common: {
    apply: 'Uygula',
    clear: 'Temizle',
    reset: 'Sıfırla',
    save: 'Kaydet',
    cancel: 'İptal',
    search: 'Ara',
    view: 'Görüntüle',
    delete: 'Sil',
    close: 'Kapat',
    back: 'Geri',
    loadMore: 'Daha fazla',
    applying: 'Uygulanıyor…',
    none: 'Yok',
    configured: 'Yapılandırıldı',
    missing: 'Eksik',
    all: 'Tümü',
    currently: 'Şu an',
    dash: '—',
    pass: 'ok',
    fail: 'hata',
    info: 'bilgi',
    empty: 'boş',
    error: 'hata',
  },
  nav: {
    brand: 'ishflow Operatör',
    subtitle: 'Platform konsolu',
    footer: 'Platform konsolu — yalnızca operatör',
    items: {
      dashboard: 'Genel bakış',
      tenants: 'Kiracılar',
      users: 'Kullanıcılar',
      billing: 'Faturalandırma',
      revenue: 'Gelir',
      audit: 'Denetim',
      analytics: 'Analitik',
      communications: 'İletişim',
      marketing: 'Pazarlama',
      system: 'Sistem',
      support: 'Destek',
    },
  },
  breadcrumb: { superAdmin: 'Süper Yönetici' },
  shell: {
    breadcrumb: {
      root: 'Süper Yönetici',
      separator: '/',
      home: 'Genel bakış',
    },
    palette: {
      trigger: 'Platformda ara…',
      placeholder: 'Kiracı, kullanıcı, denetim, eklenti ara…',
      empty: 'Sonuç bulunamadı.',
      hint: '⌘K · Ctrl+K · / ile aç',
      loading: 'Aranıyor…',
      typeMore: 'En az 2 karakter yazın.',
      groups: {
        tenants: 'Kiracılar',
        users: 'Kullanıcılar',
        audit: 'Denetim',
        addons: 'Eklentiler',
        navigation: 'Navigasyon',
      },
      shortcuts: {
        open: 'Paleti aç',
        close: 'Kapat',
      },
    },
  },
  dashboard: {
    title: 'Genel bakış',
    subtitle: 'Kiracılar arası özet · her yüklemede yenilenir',
    kpis: {
      tenants: { label: 'Kiracılar', hint: 'Toplam çalışma alanı' },
      active: { label: 'Aktif', hint: 'Aktif / toplam' },
      mrr: { label: 'MRR', hint: 'Aylık tekrarlayan (USD)' },
      activeUsers: { label: 'Aktif kullanıcı (30g)', hint: 'Denetim günlüğü aktivitesi' },
      churn: { label: 'Kayıp (30g)', hint: 'Kiracı iptalleri' },
      planMix: { label: 'Plan dağılımı', hint: 'free / starter / pro / business / enterprise' },
    },
    trialingHint: '{count} deneme',
    planMixValue: '{count} ücretli',
    quickLinks: {
      title: 'Hızlı bağlantılar',
      description: 'En çok kullanılan bölümlere atla.',
      items: {
        tenants: { label: 'Kiracılar', description: 'Çalışma alanı kaydı' },
        revenue: { label: 'Gelir', description: 'MRR & kayıp' },
        audit: { label: 'Denetim', description: 'Platform etkinlik günlüğü' },
        billing: { label: 'Faturalandırma', description: 'Planlar ve fiyatlar' },
      },
    },
    health: {
      title: 'Entegrasyon sağlığı',
      description: 'Ortam değişkenlerinden türeyen kimlik bilgileri.',
      stripeSecret: 'Stripe gizli anahtarı',
      stripeWebhook: 'Stripe webhook gizi',
      resendApi: 'Resend API anahtarı',
    },
  },
  tenants: {
    title: 'Kiracılar',
    subtitleEmpty: 'Mevcut filtrelere uyan kiracı yok.',
    subtitleCountOne: '{count} kiracı gösteriliyor',
    subtitleCountMany: '{count} kiracı gösteriliyor',
    subtitleMoreAvailable: ' (daha var)',
    filters: {
      searchPlaceholder: 'Ad veya slug ara',
      allPlans: 'Tüm planlar',
      allStatuses: 'Tüm durumlar',
    },
    columns: {
      name: 'Ad',
      plan: 'Plan',
      status: 'Durum',
      currency: 'Para birimi',
      members: 'Üyeler',
      mrr: 'MRR (USD)',
      lastActivity: 'Son aktivite',
      createdAt: 'Oluşturulma',
    },
    empty: 'Bu filtrelere uyan kiracı yok.',
  },
  tenantDetail: {
    impersonate: 'Kiracı olarak gir (read-only)',
    manageSubscription: 'Aboneliği yönet',
    createdLabel: 'oluşturuldu',
    tabs: {
      overview: 'Genel bakış',
      users: 'Kullanıcılar',
      documents: 'Belgeler',
      activity: 'Aktivite',
      subscription: 'Abonelik',
      addons: 'Eklentiler',
      debug: 'Hata ayıklama',
    },
    overview: {
      created: 'Oluşturuldu',
      currency: 'Para birimi',
      locale: 'Dil',
      owners: 'Sahipler',
      totalDocuments: 'Toplam belge',
      mrr: 'MRR (USD)',
      mrrHintActive: 'Aktif abonelik',
      mrrHintNonActive: 'Durum: {status}',
    },
    users: {
      title: 'Üyeler ({count})',
      empty: 'Henüz üye yok.',
      columns: { user: 'Kullanıcı', roles: 'Roller', joined: 'Katıldı' },
    },
    documents: {
      title: 'Belgeler ({count})',
      filterAll: 'Tüm tipler',
      apply: 'Uygula',
      empty: 'Belge yok.',
      columns: {
        type: 'Tip',
        code: 'Kod',
        date: 'Tarih',
        total: 'Toplam',
        status: 'Durum',
      },
      types: {
        salesInvoice: 'Satış faturası',
        purchasesInvoice: 'Alım faturası',
        salesPaymentReceived: 'Tahsilat',
        purchasesPaymentSent: 'Ödeme',
      },
    },
    activity: {
      title: 'Aktivite ({count})',
      empty: 'Henüz denetim kaydı yok.',
      columns: {
        when: 'Ne zaman',
        actor: 'Kim',
        entity: 'Varlık',
        action: 'Eylem',
        inspect: 'İncele',
      },
      inspector: {
        title: 'Denetim kaydı',
        descriptionEmpty: 'İncelemek için satır seçin.',
        entityLabel: 'Varlık',
        beforeLabel: 'Önce',
        afterLabel: 'Sonra',
      },
    },
    subscription: {
      title: 'Abonelik',
      currentState: {
        title: 'Mevcut durum',
        description: 'Kiracı kaydından canlı değerler.',
        plan: 'Plan',
        status: 'Durum',
        currency: 'Para birimi',
        trialEnds: 'Deneme bitişi',
        stripeCustomer: 'Stripe customer',
        stripeSubscription: 'Stripe subscription',
      },
    },
    debug: {
      tablesTitle: 'Tablo başına ayak izi ({count})',
      tablesEmpty: 'Eşleşen tablo yok.',
      tableColumns: { table: 'Tablo', rows: 'Satır', size: 'Boyut' },
      healthTitle: 'Sağlık kontrolleri',
      healthColumns: { check: 'Kontrol', result: 'Sonuç', details: 'Detay' },
      membershipsCheck: 'DB üyelikleri',
      totalFootprint: 'Toplam DB boyutu',
      rlsCheck: 'RLS testi (withTenant)',
    },
  },
  addons: {
    pageTitle: 'Premium eklentiler',
    pageDescription:
      'Bu kiracı için premium özellikleri aç/kapa. Değişiklikler sonraki istekte etkili olur.',
    statusLabels: { ga: 'Aktif', beta: 'Beta', planned: 'Planlı' },
    enable: 'Aç',
    disable: 'Kapat',
    enabledOn: '{date} tarihinde açıldı',
    enabledBy: '{actor} tarafından',
    expiresAt: 'Bitiş {date}',
    expiresNever: 'Süresiz',
    notesLabel: 'Notlar (opsiyonel)',
    notesPlaceholder: 'örn. Q3 pilot — ABC Ltd.',
    expiresAtLabel: 'Bitiş tarihi (opsiyonel)',
    enableConfirmTitle: 'Eklentiyi aç?',
    disableConfirmTitle: 'Eklentiyi kapat?',
    disableConfirmDescription:
      'Kiracı erişimi anında kaybeder. Daha sonra tekrar açılırsa verileri korunur.',
    submitting: 'Uygulanıyor…',
    enabledBadge: 'Açık',
    disabledBadge: 'Kapalı',
  },
  subscription: {
    manualUpgrade: {
      title: 'Plan değiştir',
      description: 'Manuel güncelleme (Stripe gerekmez — banka havalesi akışı).',
      planLabel: 'Plan',
      statusLabel: 'Durum',
      reasonLabel: 'Sebep',
      reasonPlaceholder: 'örn. banka havalesi 2026-05-13, fatura INV-001',
      reasonHint: 'BillingEvent payload ve denetim günlüğüne kaydedilir.',
      currentLabel: 'Şu an:',
      apply: 'Manuel değişikliği uygula',
      confirmTitle: 'Manuel değişikliği uygula?',
      confirmPlanLine: '  plan:   {from} → {to}',
      confirmStatusLine: '  durum:  {from} → {to}',
      confirmFooter: 'Stripe atlanır ve platform denetim günlüğüne yazılır.',
    },
    planOptions: { ...PLAN_BRAND },
    statusOptions: {
      active: 'Aktif',
      trialing: 'Deneme',
      past_due: 'Vadesi geçti',
      suspended: 'Askıda',
      cancelled: 'İptal edildi',
      deleted: 'Silindi',
    },
    timeline: {
      title: 'Faturalandırma olayları',
      description: 'Stripe webhookları + manuel değişiklikler',
      empty: 'Bu kiracı için faturalandırma olayı yok.',
      payload: 'Payload',
      errorBadge: 'hata',
    },
    overrides: {
      title: 'Plan limit istisnaları',
      description: 'Yayınlanmış plan matrisinin üzerinde kiracıya özel ayarlamalar.',
      empty: 'İstisna yok — kiracı plan varsayılanlarını kullanıyor.',
      keyHeader: 'Anahtar',
      valueHeader: 'Değer',
      expiresHeader: 'Bitiş',
      keyLabel: 'Anahtar',
      keyPlaceholder: 'maxUsers',
      valueLabel: 'Değer',
      valuePlaceholder: '25',
      expiresLabel: 'Bitiş (opsiyonel)',
      addButton: 'İstisna ekle',
    },
  },
  billing: {
    title: 'Faturalandırma',
    subtitle: 'Global abonelik özellik anahtarı. 60 saniye içinde devreye girer.',
    cardTitle: 'Abonelik özellik anahtarı',
    cardDescription: 'Tüm kiracıların ücretli plan UI’ını görüp görmeyeceğini belirler.',
    currentLabel: 'Şu an:',
    currentTag: 'mevcut',
    states: {
      enabled: {
        label: 'Açık',
        description: 'Stripe Checkout aktif, plan seçici etkileşimli.',
      },
      disabled: {
        label: 'Kapalı',
        description: 'UI görünür ama ödeme CTA’ları "Yöneticiye danışın" ile değiştirildi.',
      },
      hidden: {
        label: 'Gizli',
        description: 'Faturalandırma UI’ı tamamen kaldırıldı (web + mobil).',
      },
    },
    apply: 'Uygula',
  },
  audit: {
    title: 'Platform denetimi',
    subtitle:
      'Tüm kiracılar arası operatör denetim izi — plan değişiklikleri, anahtarlar, impersonasyon oturumları.',
    filters: {
      title: 'Filtreler',
      description: 'Eylem, kim veya kiracıya göre filtreleyin.',
      actionLabel: 'Eylem',
      actorLabel: 'Kim (clerkId)',
      actorPlaceholder: 'user_…',
      tenantLabel: 'Kiracı ID',
      tenantPlaceholder: 'uuid…',
      allActions: 'Tüm eylemler',
      apply: 'Uygula',
      reset: 'Sıfırla',
    },
    columns: {
      when: 'Ne zaman',
      actor: 'Kim',
      action: 'Eylem',
      tenant: 'Kiracı',
    },
    emptyTitle: 'Eşleşme yok',
    emptyDescription:
      'Mevcut filtrelere uyan kayıt yok. Kriterleri genişletin veya filtreleri sıfırlayın.',
    loadMore: 'Daha fazla',
    detail: {
      back: '← Denetime dön',
      heading: 'Denetim kaydı',
      metadataTitle: 'Metadata',
      metadataDescription: 'Kim, hedef kiracı ve istek bağlamı.',
      rows: {
        when: 'Ne zaman',
        actor: 'Kim',
        action: 'Eylem',
        tenant: 'Kiracı',
        targetUser: 'Hedef kullanıcı',
        ip: 'IP',
        userAgent: 'UserAgent',
      },
      beforeTitle: 'Önce',
      beforeDescription: 'Değişiklikten önceki durum.',
      afterTitle: 'Sonra',
      afterDescription: 'Değişiklikten sonraki durum.',
    },
  },
  users: {
    title: 'Kullanıcılar',
    subtitle: 'Tüm kiracılar genelinde email, ad veya Clerk ID ile ara.',
    searchTitle: 'Ara',
    searchDescription: 'Minimum 2 karakter. En fazla 50 sonuç.',
    queryLabel: 'Sorgu',
    queryPlaceholder: 'Email, ad/soyad veya user_…',
    apply: 'Uygula',
    states: {
      tooShortTitle: 'Sorgu çok kısa',
      tooShortDescription: 'Aramak için en az 2 karakter girin.',
      noQueryTitle: 'Sorgu henüz yok',
      noQueryDescriptionPrefix: 'En az 2 karakter girin ve ',
      noQueryDescriptionAction: 'Uygula',
      noMatchesTitle: 'Eşleşme yok',
      noMatchesDescriptionPrefix: 'Sorguyla eşleşen kullanıcı yok',
    },
    columns: {
      user: 'Kullanıcı',
      memberships: 'Üyelikler',
      firstTenant: 'İlk kiracı',
      clerkId: 'Clerk ID',
    },
    deletedBadge: 'silindi',
    noneText: 'yok',
  },
  revenue: {
    title: 'Gelir',
    subtitle: 'MRR dağılımı, plan dağılımı, kayıp ve deneme dönüşümü (son 30 gün).',
    kpis: {
      totalMrr: { label: 'Toplam MRR', hint: 'Aktif kiracılar arası USD karşılığı' },
      churn30d: { label: 'Kayıp (30g)', hint: 'Kiracı iptalleri' },
      trialConversion30d: {
        label: 'Deneme dönüşümü (30g)',
        hint: 'Aktive olan biten denemeler',
      },
    },
    planDistribution: {
      title: 'Plan dağılımı',
      description: 'Plan başına kiracı',
    },
    planLabels: { ...PLAN_BRAND },
  },
  communications: {
    title: 'Duyurular',
    subtitle: 'Uygulama içi duyurular — banner, popup ve akış girdileri.',
    actions: {
      new: 'Yeni duyuru',
      publish: 'Yayınla',
      recall: 'Geri çek',
      saveDraft: 'Taslağı kaydet',
      preview: 'Önizleme',
    },
    filters: {
      allStatuses: 'Tüm durumlar',
      statusLabel: 'Durum',
    },
    columns: {
      internalKey: 'Anahtar',
      surface: 'Yüzey',
      status: 'Durum',
      startAt: 'Başlangıç',
      endAt: 'Bitiş',
      createdAt: 'Oluşturulma',
    },
    surfaces: {
      banner: 'Banner',
      popup: 'Popup',
      feed_only: 'Yalnızca akış',
    },
    statuses: {
      draft: 'Taslak',
      scheduled: 'Planlanmış',
      live: 'Canlı',
      archived: 'Arşivlenmiş',
    },
    form: {
      sectionMeta: 'Üst veriler',
      sectionTranslations: 'Çeviriler',
      sectionTargeting: 'Hedefleme',
      sectionPreview: 'Önizleme',
      internalKey: 'İç anahtar',
      internalKeyHint: 'Operatör için URL ve denetim kaydında kullanılır.',
      surface: 'Yüzey',
      status: 'Durum',
      startAt: 'Başlangıç',
      endAt: 'Bitiş',
      dismissible: 'Kapatılabilir',
      ctaLabel: 'CTA etiketi',
      ctaUrl: 'CTA URL',
      title: 'Başlık',
      body: 'Gövde (Markdown)',
      bodyHint: 'Düz metin veya Markdown. Her dil bağımsızdır.',
      plans: 'Planlar (virgülle ayır)',
      addons: 'Eklentiler (virgülle ayır)',
      roles: 'Roller (virgülle ayır)',
      locales: 'Diller (virgülle ayır)',
      tenantIds: 'Kiracı ID’leri (virgülle ayır)',
      tenantIdsHint: 'Boş = bu eksende filtre yok.',
      targetingEmpty: 'Filtre yok — tüm kiracı ve kullanıcılarda görünür.',
    },
    list: {
      empty: 'Henüz duyuru yok.',
      emptyDescription: 'Uygulama içinde kiracılara haber vermek için bir duyuru oluşturun.',
    },
    detail: {
      back: '← Duyurulara dön',
      analyticsLink: 'Analitik',
    },
    analytics: {
      title: 'Analitik',
      description: 'Gösterim, izleyici, kapatma oranı ve tıklama oranı.',
      impressions: 'Toplam gösterim',
      uniqueViewers: 'Tekil izleyici',
      dismissalRate: 'Kapatma oranı',
      ctr: 'Tıklama oranı',
      perTenantTitle: 'Kiracı bazında dağılım',
      perTenantDescription: 'Gösterim açısından ilk 20 kiracı.',
      perTenantEmpty: 'Henüz kaydedilen gösterim yok.',
      columns: {
        tenant: 'Kiracı',
        impressions: 'Gösterim',
        viewed: 'Görüntüleyen',
        clicked: 'Tıklayan',
      },
    },
  },
  marketing: {
    landing: {
      title: 'Pazarlama CMS',
      subtitle: 'Landing bölümlerini, blog yazılarını, medyayı ve gelen başvuruları düzenleyin.',
      tiles: {
        sections: {
          title: 'Bölümler',
          description: 'Hero, özellikler, FAQ, footer — sayfa başına',
        },
        blog: { title: 'Blog', description: 'Yerel başlık, özet, gövde ile yazılar' },
        media: { title: 'Medya', description: 'Pazarlama görselleri kütüphanesi' },
        leads: { title: 'Başvurular', description: 'Gelen iletişim + demo talepleri' },
        newsletter: { title: 'Bülten', description: 'Aboneler + CSV dışa aktarımı' },
      },
    },
    common: {
      addRow: 'Ekle',
      removeRow: 'Kaldır',
      saveSection: 'Bölümü kaydet',
      saving: 'Kaydediliyor…',
      lastSaved: 'Son kaydetme',
      neverSaved: 'Henüz kaydedilmedi — varsayılanlar gösteriliyor',
      defaultsNotice: 'İçerik henüz kaydedilmedi — yerleşik varsayılanları düzenliyorsunuz.',
    },
    sections: {
      title: 'Bölümler',
      subtitle: 'Pazarlama sayfası bölümleri, sayfaya göre gruplanmış.',
      columns: {
        page: 'Sayfa',
        section: 'Bölüm',
        type: 'Tip',
        locales: 'Diller',
        updatedAt: 'Güncellendi',
      },
      noLocales: 'Henüz kaydedilmedi',
      typeLabels: {
        hero: 'Hero',
        featureCards: 'Özellik kartları',
        socialProof: 'Sosyal kanıt',
        testimonials: 'Yorumlar',
        faq: 'SSS',
        footerColumns: 'Footer kolonları',
      },
      edit: {
        backToList: '← Bölümlere dön',
        history: 'Geçmiş',
        localeTabsLabel: 'Dil',
        savedSuccess: 'Kaydedildi.',
        saveError: 'Kaydetme başarısız — form değerlerini kontrol edin.',
      },
      versions: {
        title: 'Sürüm geçmişi',
        empty: 'Önceki sürüm yok.',
        columns: {
          createdAt: 'Ne zaman',
          actor: 'Kim',
          actions: 'Eylemler',
        },
        restore: 'Geri yükle',
        restoreConfirm:
          'Bu sürümü geri yükle? Mevcut içerik yeni bir geçmiş kaydı olarak saklanır.',
      },
      forms: {
        hero: {
          headline: 'Başlık',
          subhead: 'Alt başlık',
          primaryCta: 'Birincil CTA',
          secondaryCta: 'İkincil CTA (opsiyonel)',
          label: 'Etiket',
          href: 'Bağlantı',
          heroImageUrl: 'Hero görsel URL (opsiyonel)',
        },
        featureCards: {
          iconKey: 'İkon anahtarı',
          title: 'Başlık',
          body: 'Gövde',
          href: 'Bağlantı (opsiyonel)',
          addCard: 'Kart ekle',
        },
        socialProof: {
          value: 'Değer',
          label: 'Etiket',
          addStat: 'İstatistik ekle',
        },
        testimonials: {
          quote: 'Alıntı',
          authorName: 'Yazar adı',
          authorRole: 'Rol',
          authorCompany: 'Şirket',
          avatarUrl: 'Avatar URL (opsiyonel)',
          addItem: 'Yorum ekle',
        },
        faq: {
          question: 'Soru',
          answer: 'Yanıt',
          addItem: 'Soru-yanıt ekle',
        },
        footerColumns: {
          title: 'Kolon başlığı',
          links: 'Bağlantılar',
          label: 'Etiket',
          href: 'Bağlantı',
          addColumn: 'Kolon ekle',
          addLink: 'Bağlantı ekle',
        },
      },
    },
    pageLabels: {
      home: 'Ana sayfa',
      pricing: 'Fiyatlandırma',
      features: 'Özellikler',
      addons: 'Eklentiler',
      about: 'Hakkımızda',
      contact: 'İletişim',
      global: 'Genel (footer, nav)',
    },
    blog: {
      title: 'Blog',
      subtitle: 'Yazılar ve çeviriler.',
      newButton: 'Yeni yazı',
      columns: {
        slug: 'Slug',
        status: 'Durum',
        author: 'Yazar',
        updatedAt: 'Güncellendi',
        publishedAt: 'Yayınlandı',
      },
      statusLabels: {
        draft: 'Taslak',
        published: 'Yayında',
        archived: 'Arşiv',
      },
      empty: 'Henüz yazı yok.',
      new: {
        title: 'Yeni blog yazısı',
        subtitle: 'Taslak oluşturun. Çeviriler sonraki adımda.',
        slug: 'Slug',
        slugHint: 'URL parçası — küçük harf, sadece tire.',
        authorName: 'Yazar adı',
        tags: 'Etiketler',
        tagsHint: 'Virgülle ayırın.',
        heroImageUrl: 'Hero görsel URL (opsiyonel)',
        create: 'Taslak oluştur',
        slugConflict: 'Bu slug ile bir yazı zaten var.',
      },
      edit: {
        backToList: '← Yazılara dön',
        preview: 'Önizleme',
        publish: 'Yayınla',
        archive: 'Arşivle',
        saved: 'Kaydedildi.',
        publishedAt: 'Yayın tarihi',
        translations: 'Çeviriler',
        body: 'Gövde (MDX)',
        bodyHint: 'HTML izinli Markdown.',
        excerpt: 'Özet',
        postTitle: 'Başlık',
        publishConfirm: 'Bu yazıyı yayınla? Halka açık sitede görünecek.',
        archiveConfirm: 'Bu yazıyı arşivle? Halka açık siteden gizlenecek.',
      },
      preview: {
        title: 'Önizleme',
        empty: 'Önizlenecek içerik yok.',
      },
    },
    media: {
      title: 'Medya',
      subtitle: 'R2 üzerinde pazarlama görsel kütüphanesi.',
      upload: 'Yükle',
      uploading: 'Yükleniyor…',
      limits: 'PNG, JPEG, WebP, SVG · maks 5MB.',
      empty: 'Henüz dosya yok.',
      columns: {
        preview: 'Önizleme',
        key: 'Anahtar',
        size: 'Boyut',
        uploadedAt: 'Yüklendi',
        actions: 'Eylemler',
      },
      copyUrl: 'URL kopyala',
      copied: 'Kopyalandı',
      delete: 'Sil',
      deleteConfirm: 'Bu dosyayı sil? Geri alınamaz.',
      errors: {
        tooLarge: 'Dosya 5MB sınırını aşıyor.',
        badMime: 'Desteklenmeyen dosya tipi. İzinli: PNG, JPEG, WebP, SVG.',
        notConfigured: 'Bu ortamda R2 yapılandırılmamış.',
      },
    },
    leads: {
      title: 'Başvurular',
      subtitle: 'Gelen iletişim ve demo form gönderimleri.',
      empty: 'Henüz başvuru yok.',
      filterAll: 'Tüm durumlar',
      columns: {
        when: 'Ne zaman',
        name: 'Ad',
        email: 'Email',
        company: 'Şirket',
        source: 'Kaynak',
        message: 'Mesaj',
        status: 'Durum',
      },
      statusLabels: {
        new: 'Yeni',
        contacted: 'İletişim kuruldu',
        qualified: 'Nitelikli',
        won: 'Kazanıldı',
        lost: 'Kaybedildi',
      },
    },
    newsletter: {
      title: 'Bülten',
      subtitle: 'Onaylı ve bekleyen aboneler.',
      empty: 'Henüz abone yok.',
      exportCsv: 'CSV dışa aktar',
      unsubscribe: 'Abonelikten çıkar',
      unsubscribeConfirm: 'Bu email aboneliği iptal edilsin mi? Bülten almayı bırakır.',
      unsubscribed: 'Aboneliği iptal edildi',
      columns: {
        email: 'Email',
        confirmedAt: 'Onaylandı',
        unsubscribedAt: 'İptal edildi',
        source: 'Kaynak',
        createdAt: 'Katıldı',
        actions: 'Eylemler',
      },
    },
  },
  languageSwitcher: {
    label: 'Dil',
    languages: LANGUAGES,
  },
};

/**
 * Resolve a locale to its dictionary. Unknown locales fall back to `en`.
 * `uz`, `ky`, `de`, `fr`, `zh` intentionally mirror `en` until native
 * translations are added.
 */
export function getDictForLocale(locale: SuperAdminLocale): SuperAdminDict {
  switch (locale) {
    case 'ru':
      return ru;
    case 'tr':
      return tr;
    default:
      return en;
  }
}
