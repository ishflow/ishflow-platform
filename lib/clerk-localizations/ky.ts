import type { LocalizationResource } from '@clerk/types';

// Auto-generated Clerk localization (ky). Base = enUS structure with translated leaves;
// untranslated keys fall back to the English source. Regenerate via /tmp/i18n/merge-clerk.js.
export const kyKG: LocalizationResource = {
  locale: 'ky-KG',
  apiKeys: {
    action__add: 'Жаңы ачкыч кошуу',
    action__search: 'Ачкычтарды издөө',
    copySecret: {
      formButtonPrimary__copyAndClose: 'Көчүрүп жабуу',
      formHint: 'Коопсуздук себептеринен улам, аны кийинчерек көрүүгө мүмкүнчүлүк берилбейт.',
      formTitle: '"{{name}}" API ачкычыңызды азыр көчүрүп алыңыз',
    },
    createdAndExpirationStatus__expiresOn:
      "Түзүлгөн {{ createdDate | shortDate('en-US') }} • Жарактуулук мөөнөтү {{ expiresDate | longDate('en-US') }}",
    createdAndExpirationStatus__never:
      "Түзүлгөн {{ createdDate | shortDate('en-US') }} • Мөөнөтсүз",
    detailsTitle__emptyRow: 'API ачкычтары табылган жок',
    formButtonPrimary__add: 'Ачкыч түзүү',
    formFieldCaption__expiration__expiresOn: 'Мөөнөтү {{ date }} күнү бүтөт',
    formFieldCaption__expiration__never: 'Бул ачкычтын мөөнөтү бүтпөйт',
    formFieldOption__expiration__180d: '180 күн',
    formFieldOption__expiration__1d: '1 күн',
    formFieldOption__expiration__1y: '1 жыл',
    formFieldOption__expiration__30d: '30 күн',
    formFieldOption__expiration__60d: '60 күн',
    formFieldOption__expiration__7d: '7 күн',
    formFieldOption__expiration__90d: '90 күн',
    formFieldOption__expiration__never: 'Эч качан',
    formHint: 'Жаңы ачкыч түзүү үчүн аталыш киргизиңиз. Аны каалаган убакта жокко чыгара аласыз.',
    formTitle: 'Жаңы API ачкычын кошуу',
    lastUsed__days: '{{days}} күн мурун',
    lastUsed__hours: '{{hours}} саат мурун',
    lastUsed__minutes: '{{minutes}} мүн. мурун',
    lastUsed__months: '{{months}} ай мурун',
    lastUsed__seconds: '{{seconds}} сек. мурун',
    lastUsed__years: '{{years}} жыл мурун',
    menuAction__revoke: 'Ачкычты жокко чыгаруу',
    revokeConfirmation: {
      confirmationText: 'Жокко чыгаруу',
      inputLabel: 'Ырастоо үчүн "Жокко чыгаруу" деп жазыңыз',
      formButtonPrimary__revoke: 'Ачкычты жокко чыгаруу',
      formHint: 'Бул Купуя ачкычты чындап өчүргүңүз келеби?',
      formTitle: '"{{apiKeyName}}" купуя ачкычын жокко чыгаруу?',
    },
    tableHeader__name: 'Аталышы',
    tableHeader__lastUsed: 'Акыркы колдонуу',
    tableHeader__actions: 'Аракеттер',
  },
  backButton: 'Артка',
  badge__activePlan: 'Жигердүү',
  badge__canceledEndsAt: "Жокко чыгарылган • Бүтөт {{ date | shortDate('en-US') }}",
  badge__currentPlan: 'Учурдагы тариф',
  badge__default: 'Демейки',
  badge__endsAt: "Бүтөт {{ date | shortDate('en-US') }}",
  badge__expired: 'Мөөнөтү өттү',
  badge__freeTrial: 'Акысыз сынак',
  badge__otherImpersonatorDevice: 'Башка туурагыч түзмөк',
  badge__pastDueAt: "Мөөнөтү өткөн {{ date | shortDate('en-US') }}",
  badge__pastDuePlan: 'Мөөнөтү өткөн',
  badge__primary: 'Негизги',
  badge__renewsAt: "Жаңырат {{ date | shortDate('en-US') }}",
  badge__requiresAction: 'Аракет талап кылынат',
  badge__startsAt: "Башталат {{ date | shortDate('en-US') }}",
  badge__thisDevice: 'Бул түзмөк',
  badge__trialEndsAt: "Сынак мөөнөтү бүтөт {{ date | shortDate('en-US') }}",
  badge__unverified: 'Тастыкталган жок',
  badge__upcomingPlan: 'Алдыдагы',
  badge__userDevice: 'Колдонуучунун түзмөгү',
  badge__you: 'Сиз',
  badge__banned: 'Бөгөттөлгөн',
  billing: {
    addPaymentMethod__label: 'Төлөм ыкмасын кошуу',
    alwaysFree: 'Дайыма акысыз',
    annually: 'Жылдык',
    availableFeatures: 'Жеткиликтүү мүмкүнчүлүктөр',
    billedAnnually: 'Жылдык эсептелет',
    billedMonthlyOnly: 'Айлык гана эсептелет',
    billedAnnuallyOnly: 'Жылдык гана эсептелет',
    cancelFreeTrial: 'Акысыз сынактан баш тартуу',
    cancelFreeTrialAccessUntil:
      "Сынагыңыз {{ date | longDate('en-US') }} күнүнө чейин активдүү болот. Андан кийин сынак мүмкүнчүлүктөрүнөн ажырайсыз. Акы алынбайт.",
    cancelFreeTrialTitle: '{{plan}} тарифи үчүн акысыз сынактан баш тартасызбы?',
    cancelSubscription: 'Жазылуудан баш тартуу',
    cancelSubscriptionAccessUntil:
      "{{plan}} мүмкүнчүлүктөрүн {{ date | longDate('en-US') }} күнүнө чейин колдоно аласыз, андан кийин кирүү мүмкүнчүлүгүңүз жок болот.",
    cancelSubscriptionNoCharge: 'Бул жазылуу үчүн акы алынбайт.',
    cancelSubscriptionPastDue:
      'Жазылууңуз дароо токтотулат жана тариф мүмкүнчүлүктөрүнөн ажырайсыз. Кийинки жазылууда өтпөй калган сумманы төлөшүңүз керек болот.',
    cancelSubscriptionTitle: '{{plan}} жазылуусунан баш тартасызбы?',
    cannotSubscribeMonthly:
      'Бул тарифке айлык төлөм менен жазыла албайсыз. Жазылуу үчүн жылдык төлөм режимин тандаңыз.',
    cannotSubscribeUnrecoverable:
      'Бул тарифке жазыла албайсыз. Учурдагы жазылуу бул тарифтен кымбатыраак.',
    checkout: {
      description__paymentSuccessful: 'Төлөмүңүз ийгиликтүү өттү.',
      description__subscriptionSuccessful: 'Жаңы жазылуу ийгиликтүү тариздетилди.',
      downgradeNotice:
        'Учурдагы жазылуу жана анын мүмкүнчүлүктөрү эсептөө мезгили аяктаганга чейин сакталат, андан кийин бул жазылуу активдүү болот.',
      emailForm: {
        subtitle: 'Сатып алууну аяктоо үчүн чектер жөнөтүлүүчү email дарегин кошуу зарыл.',
        title: 'Email дарегин кошуу',
      },
      lineItems: {
        title__freeTrialEndsAt: 'Сынак мөөнөтү бүтөт',
        title__paymentMethod: 'Төлөм ыкмасы',
        title__statementId: 'Билдирме ID',
        title__subscriptionBegins: 'Жазылуу башталат',
        title__totalPaid: 'Жалпы төлөнгөн',
      },
      pastDueNotice: 'Мурунку жазылуу мөөнөтү өтүп, төлөнгөн жок.',
      perMonth: 'айына',
      title: 'Төлөм',
      title__paymentSuccessful: 'Төлөм ийгиликтүү өттү!',
      title__subscriptionSuccessful: 'Ийгилик!',
      title__trialSuccess: 'Сынак мезгили ийгиликтүү башталды!',
      totalDueAfterTrial: 'Сынак {{days}} күндөн кийин бүткөндө төлөнүүчү жалпы сумма',
    },
    credit: 'Кредит',
    prorationCredit: 'Пропорционалдуу кредит',
    accountCredit: 'Эсеп кредити',
    creditRemainder: 'Учурдагы жазылуунун калган мезгили үчүн кредит.',
    payerCreditRemainder: 'Эсеп балансынан кредит.',
    defaultFreePlanActive: 'Сиз учурда Акысыз тарифтесиз',
    free: 'Акысыз',
    getStarted: 'Баштоо',
    keepFreeTrial: 'Акысыз сынакты сактоо',
    keepSubscription: 'Жазылууну сактоо',
    manage: 'Башкаруу',
    manageSubscription: 'Жазылууну башкаруу',
    month: 'Ай',
    monthAbbreviation: 'ай',
    monthPerUnit: '{{unitName}} үчүн айлык',
    monthly: 'Айлык',
    pastDue: 'Мөөнөтү өттү',
    pay: '{{amount}} төлөө',
    paymentMethod: {
      applePayDescription: {
        annual: 'Жылдык төлөм',
        monthly: 'Айлык төлөм',
      },
      dev: {
        anyNumbers: 'Каалаган сандар',
        cardNumber: 'Карта номери',
        cvcZip: 'CVC, ZIP',
        developmentMode: 'Иштеп чыгуу режими',
        expirationDate: 'Мөөнөтүнүн аяктоо күнү',
        testCardInfo: 'Тест карта маалыматы',
      },
    },
    paymentMethods__label: 'Төлөм ыкмалары',
    highlightedPlanBadge: 'Популярдуу',
    pricingTable: {
      billingCycle: 'Эсептөө мезгили',
      included: 'Камтылган',
      seatCost: {
        freeUpToSeats: '{{endsAfterBlock}} орунга чейин акысыз',
        upToSeats: '{{endsAfterBlock}} орунга чейин',
        perSeat: '{{feePerBlockAmount}}/{{periodAbbreviation}} ар бир орун үчүн',
        includedSeats: '{{includedSeats}} орун камтылган',
        additionalSeats:
          '({{additionalTierFeePerBlockAmount}}/{{periodAbbreviation}} кошумчасы үчүн)',
        unlimitedSeats: 'Чексиз орундар',
        tooltip: {
          freeForUpToSeats: '{{endsAfterBlock}} орунга чейин акысыз.',
          additionalSeatsEach: 'Кошумча орундар {{feePerBlockAmount}}/{{period}} ар бирине.',
          firstSeatsIncludedInPlan: 'Биринчи {{endsAfterBlock}} орун тарифке камтылган.',
        },
      },
    },
    reSubscribe: 'Кайра жазылуу',
    seats: 'Орундар',
    seeAllFeatures: 'Бардык мүмкүнчүлүктөрдү көрүү',
    startFreeTrial: 'Акысыз сынакты баштоо',
    startFreeTrial__days: '{{days}} күндүк акысыз сынакты баштоо',
    subscribe: 'Жазылуу',
    subscriptionDetails: {
      beginsOn: 'Башталат',
      currentBillingCycle: 'Учурдагы эсептөө мезгили',
      endsOn: 'Бүтөт',
      firstPaymentAmount: 'Биринчи төлөм суммасы',
      firstPaymentOn: 'Биринчи төлөм күнү',
      nextPaymentAmount: 'Кийинки төлөм суммасы',
      nextPaymentOn: 'Кийинки төлөм күнү',
      pastDueAt: 'Мөөнөтү өткөн',
      renewsAt: 'Жаңырат',
      subscribedOn: 'Жазылган күн',
      title: 'Жазылуу',
      trialEndsOn: 'Сынак мезгили бүтөт',
      trialStartedOn: 'Сынак мезгили башталган',
    },
    subtotal: 'Аралык жыйынтык',
    switchPlan: 'Ушул тарифке өтүү',
    switchToAnnual: 'Жылдыкка өтүү',
    switchToAnnualWithAnnualPrice: 'Жылдык {{currency}}{{price}} / жылга өтүү',
    switchToMonthly: 'Айлыкка өтүү',
    switchToMonthlyWithPrice: 'Айлык {{currency}}{{price}} / айга өтүү',
    totalDue: 'Төлөнүүчү жалпы сумма',
    totalDueToday: 'Бүгүн төлөнүүчү жалпы сумма',
    viewFeatures: 'Мүмкүнчүлүктөрдү көрүү',
    viewPayment: 'Төлөмдү көрүү',
    year: 'Жыл',
    yearAbbreviation: 'жыл',
    yearPerUnit: '{{unitName}} үчүн жылдык',
  },
  configureSSO: {
    confirmation: {
      configurationSection: {
        certificateLabel: 'Сертификат',
        configureAgainLink: 'Кайра конфигурациялоо',
        issuerLabel: 'Чыгаруучу',
        ssoUrlLabel: 'Кирүү URL',
        title: 'Конфигурация чоо-жайы',
      },
      domainSection: {
        title: 'Домен',
      },
      enableSection: {
        title: 'SSO иштетүү',
      },
      resetSection: {
        confirmationFieldLabel: 'Ырастоо үчүн "{{name}}" деп жазыңыз',
        submitButton: 'Туташууну баштапкы абалга келтирүү',
        title: 'Туташууну баштапкы абалга келтирүү',
        warning:
          'Бул SSO конфигурациясын түбөлүктүү жок кылат. Мүчөлөр SSO аркылуу кирүүнү токтотот.',
      },
      statusSection: {
        activeBadge: 'Жигердүү',
        inactiveBadge: 'Жигерсиз',
        title: 'SSO абалы',
      },
    },
    missingManageEnterpriseConnectionsPermission: {
      subtitle:
        'Корпоративдик туташууларды башкаруу уруксатын алуу үчүн уюмуңуздун администратору менен байланышыңыз.',
      title: 'Сизде корпоративдик туташууларды башкаруу уруксаты жок',
    },
    navbar: {
      title: 'Бирдиктүү Кирүү Системасын (SSO) конфигурациялоо',
    },
    selectProviderStep: {
      title: 'Провайдерди тандоо',
      subtitle: 'SSO орнотуучу провайдерди тандаңыз.',
      body: {
        title: 'Инсандыкты ырастоо провайдериңизди тандаңыз',
        description: 'Деталдуу орнотуу процессинде жетектеп барабыз.',
      },
      saml: {
        groupLabel: 'SAML',
        okta: 'Okta Workforce',
        customSaml: 'Ыңгайлаштырылган SAML провайдер',
      },
      warning: 'Провайдер тандалгандан кийин, конфигурация аяктаганга чейин аны өзгөртө албайсыз',
    },
    verifyEmailDomainStep: {
      title: 'Email дарегин тастыктоо',
      subtitle: 'Корпоративдик туташтыруу иштеткиңиз келген email дарегин тастыктаңыз.',
      addEmailAddress: {
        formTitle: 'Email дарегиңиз керек',
        formSubtitle: 'Баштоо үчүн email дарегиңиз керек',
        inputPlaceholder: 'name@company.com',
        inputLabel: 'Email дареги',
      },
      emailCode: {
        formTitle: 'Email дарегиңизди тастыктаңыз',
        formSubtitle: '{{identifier}} дарегине жөнөтүлгөн тастыктоо кодун киргизиңиз',
        resendButton: 'Код келген жокпу? Кайра жөнөтүү',
        verified: {
          title: 'Email дарегиңизди алдык',
          subtitle: 'Төмөнкү email менен дарегиңизди тастыктадыңыз',
          inputLabel: 'Тастыкталган email дареги',
        },
      },
      domainTaken: {
        title: 'Бул домен ({{domain}}) буга чейин SSO туташтыруусуна ээ',
        subtitle:
          'Учурдагы туташуу аркылуу кирүү үчүн тиркеменин администратору менен байланышыңыз.',
      },
    },
    testConfigurationStep: {
      title: 'SSO туташуусун сыноо',
      subtitle:
        'Туташууну туура конфигурацияланганын текшерүү үчүн сынак SSO URL аркылуу аутентификациядан өтүңүз.',
      error__noSuccessfulTestRun:
        'Улантуудан мурун жок дегенде бир ийгиликтүү сынак өткөрүлүшү керек. Сынак SSO URL түзүп, кирүү агымын аяктаңыз.',
      testUrl: {
        title: 'SSO URL сынаңыз',
        subtitle: 'Аутентификация үчүн сынак SSO URL түзүп, көчүрүп алыңыз.',
        actionLabel__copy: 'Сынак URL көчүрүү',
      },
      testResults: {
        title: 'Сынак натыйжалары',
        actionLabel__refresh: 'Журналдарды жаңылоо',
        polling: 'Сынак аяктоосун күтүп жатабыз…',
        status__success: 'Ийгиликтүү',
        status__failed: 'Ийгиликсиз',
        status__pending: 'Күтүүдө',
      },
      testRunDetails: {
        title: 'Сынак иши',
        runDetails: {
          sectionTitle: 'Иш чоо-жайы',
          timestamp: 'Убакыт белгиси',
          status: 'Абал',
          errorCode: 'Ката коду',
          fullMessage: 'Толук билдирүү',
          actionLabel__copy: 'Билдирүүнү көчүрүү',
          actionLabel__copied: 'Көчүрүлдү',
        },
        parsedUserInfo: {
          sectionTitle: 'Талдалган колдонуучу маалыматы',
          email: 'Email',
          firstName: 'Аты',
        },
        howToFix: {
          sectionTitle: 'Кантип оңдоо керек',
          actionLabel__viewDocumentation: 'Документацияны көрүү',
          saml_user_attribute_missing: {
            intro: 'Бул катаны оңдоо үчүн төмөнкү кадамдарды аткарыңыз:',
            step1: 'Инсандыкты ырастоо провайдериңиздин конфигурация башкаруу панелине кириңиз.',
            step2: 'Тиркемеңиздин SAML жөндөөлөрүнө же атрибут картасынын конфигурациясына өтүңүз.',
            step3:
              "'mail' атрибуту колдонуучунун email дарег талааны туура картаданганын текшериңиз.",
          },
          saml_response_relaystate_missing: {
            description:
              'Инсандыкты ырастоо провайдериңиз баштапкы сурамда жөнөтүлгөн RelayState параметрин туура кайтарып жатканын текшериңиз.',
          },
          saml_email_address_domain_mismatch: {
            description:
              'Колдонуучу бул туташуунун уруксат берилген домендеринин бирине дал келген email дареги менен кирип жатканын текшериңиз. Кошумча домендерди кошуу керек болсо, туташуу жөндөөлөрүндөгү уруксат берилген домендерди жаңылаңыз.',
          },
          oauth_access_denied: {
            description:
              'Бул ката колдонуучу OAuth провайдеринин авторизация экранында Жокко чыгаруу же Баш тартуу баскычын баскандыгынан же провайдер авторизация суранычын четке каккандыгынан келип чыгат. OAuth тиркемесинин маалымдарын (Client ID жана Client Secret) туура конфигурацияланганын текшериңиз.',
          },
          oauth_token_exchange_error: {
            description:
              'OAuth тиркемеңиздин Client ID жана Client Secret маалымдары туура конфигурацияланганын жана OAuth провайдериңиздин башкаруу панелиндеги маалымдарга дал келерин текшериңиз.',
          },
          oauth_fetch_user_error: {
            intro: 'Бул катаны оңдоо үчүн төмөнкү кадамдарды аткарыңыз:',
            step1:
              'Туташуу жөндөөлөрүндө конфигурацияланган OAuth чөйрөлөрү колдонуучу профили маалыматын окуу үчүн зарыл уруксаттарды камтыганын текшериңиз.',
            step2: 'Колдонуучу маалыматы аягы URLи туура конфигурацияланганын текшериңиз.',
          },
        },
      },
    },
    configureStep: {
      spFields: {
        acsUrl: {
          label: 'Бирдиктүү кирүү URL',
        },
        spEntityId: {
          label: 'Аудитория URI',
        },
      },
      attributeMapping: {
        title: 'SAML жоопторуңузда төмөнкү атрибуттардын болушун күтөбүз:',
        paragraph:
          'Булар демейки маанилер болуп, өзгөртүү талап кылынбашы мүмкүн. Бирок, SAML конфигурация каталарынын көбү туура эмес атрибут картасынан келип чыгат, ошондуктан текшерүү сунушталат. Кантип текшерүү керек:',
        columns: {
          attribute: 'Атрибут',
          claimName: 'Талап аты',
          claimValue: 'Талап мааниси',
        },
        badges: {
          required: 'Милдеттүү',
          optional: 'Каалоо боюнча',
        },
        rows: {
          email: {
            attribute: 'Email дареги',
            claim: 'mail',
          },
          firstName: {
            attribute: 'Аты',
            claim: 'firstName',
          },
          lastName: {
            attribute: 'Фамилиясы',
            claim: 'lastName',
          },
        },
      },
      samlOkta: {
        headerTitle: 'Okta Workforce конфигурациялоо',
        createApp: {
          headerSubtitle: 'Okta башкаруу панелинде жаңы корпоративдик тиркеме түзүңүз',
          title: "Okta'да жаңы корпоративдик тиркеме түзүү",
          step1: "Okta'га кирип <bold>Администратор → Тиркемелер</bold> бөлүмүнө өтүңүз.",
          step2: '<bold>Тиркеме интеграциясын түзүү</bold> баскычын басыңыз.',
          step3: '<bold>SAML 2.0</bold> тандаңыз.',
          step4: 'Жалпы жөндөөлөрдү толтуруңуз (Тиркеме аты милдеттүү).',
          step5: 'Тиркеме түзүүнү аяктоо үчүн <bold>Кийинки</bold> баскычын басыңыз.',
        },
        serviceProvider: {
          title: 'Кызмат провайдерин конфигурациялоо',
          paragraph1:
            'Жалпы жөндөөлөр нускамаларынан өткөндөн кийин, SAML конфигурациялоо баракчасы чыгат.',
          paragraph2:
            'Кызмат провайдериңизди (Clerk) конфигурациялоо үчүн Okta тиркемеңизге бул эки талааны кошуу зарыл:',
        },
        completeSamlIntegration: {
          title: 'SAML интеграциясын аяктоо',
          step1: 'Параметрлер менюсунан <bold>Бул биз түзгөн ички тиркеме</bold> тандаңыз.',
          step2: 'Формаға каалаган комментарийлерди кошуп, <bold>Бүттүм</bold> баскычын тандаңыз.',
        },
        configureAttributes: {
          headerSubtitle: "Okta'дан Clerk'ке колдонуучу атрибуттарын картага түшүрүү",
          step1: 'Okta башкаруу панелинде <bold>Атрибут билдирүүлөр</bold> бөлүмүн табыңыз.',
          step2:
            'Ар бир атрибут үчүн <bold>Туюнтма кошуу</bold> тандап, төмөнкү ат жана туюнтма жуптарын киргизиңиз:',
          pairs: {
            conjunction: ' жана ',
            email: {
              name: 'mail',
              expression: 'user.profile.mail',
            },
            firstName: {
              name: 'firstName',
              expression: 'user.profile.firstName',
            },
            lastName: {
              name: 'lastName',
              expression: 'user.profile.lastName',
            },
          },
        },
        assignUsers: {
          headerSubtitle: 'Корпоративдик тиркемеге колдонуучуларды дайындоо',
          title: "Okta'да тандалган колдонуучуну же топту дайындоо",
          paragraph:
            'Колдонуучулар же топтор тиркеме аркылуу кирүү үчүн аларды корпоративдик тиркемеге дайындоо зарыл.',
          step1: 'Okta башкаруу панелинде <bold>Дайындоолор</bold> өтмөгүн тандаңыз.',
          step2:
            '<bold>Дайындоо</bold> ачылмасын тандаңыз. <bold>Адамдарга дайындоо</bold> же <bold>Топторго дайындоо</bold> тандай аласыз.',
          step3:
            'Издөө талаасына тиркемеге дайындагыңыз келген колдонуучунун же колдонуучулар тобунун атын киргизиңиз.',
          step4:
            'Дайындагыңыз келген колдонуучу же топтун жанындагы <bold>Дайындоо</bold> баскычын тандаңыз.',
          step5: 'Дайындоону аяктоо үчүн <bold>Даяр</bold> баскычын тандаңыз.',
        },
        metadataUrl: {
          headerSubtitle: 'Инсандыкты ырастоо провайдери метадайындарын конфигурациялоо',
          label: 'Метадайындар URL',
          placeholder: "URL'ди бул жерге чаптаңыз...",
          description:
            "Okta SAML тиркемеңизде Sign On өтмөгүнө өтүп, метадайындар URL'ин алыңыз. Төмөнгө чаптаңыз.",
        },
        modes: {
          ariaLabel: 'Конфигурация режими',
          metadataUrl: 'Метадайындар аркылуу кошуу',
          manual: 'Кол менен конфигурациялоо',
        },
        submitSamlConfig: {
          title: 'Okta SAML тиркемеңиздин маалымдарын толтуруңуз',
        },
        manual: {
          description: 'Okta SAML тиркемеңизде Sign On өтмөгүнө өтүп, бул маанилерди алыңыз.',
          signOnUrl: {
            label: 'Кирүү URL',
            placeholder: "URL'ди бул жерге чаптаңыз...",
          },
          issuer: {
            label: 'Чыгаруучу',
            placeholder: "URL'ди бул жерге чаптаңыз...",
          },
          signingCertificate: {
            label: 'Кол коюу сертификаты',
            uploadFile: 'Файл жүктөө',
            replaceFile: 'Файлды алмаштыруу',
            removeFile: 'Файлды жок кылуу',
            fileUploaded: 'Файл жүктөлдү',
          },
        },
      },
      samlCustom: {
        headerTitle: 'Инсандыкты ырастоо провайдериңизди (IdP) конфигурациялоо',
        createApp: {
          headerSubtitle:
            "Clerk'ти IdP'ыңызда кызмат провайдери катары каттаңыз, анан инсандыкты ырастоо провайдери конфигурациясын кошуңуз.",
          title: 'Инсандыкты ырастоо провайдериңизде SAML тиркемесин түзүү',
          subtitle:
            'Инсандыкты ырастоо провайдериңиздин администратор башкаруу панелинде жаңы SAML 2.0 тиркемесин түзүп, төмөнкү кызмат провайдер маалымдарын колдонуңуз:',
        },
        configureAttributes: {
          headerSubtitle:
            "Инсандыкты ырастоо провайдериңизден Clerk'ке колдонуучу атрибуттарын картага түшүрүү.",
          title: 'SAML жоопторуңузда төмөнкү атрибуттардын болушун күтөбүз:',
        },
        assignUsers: {
          headerSubtitle: 'Корпоративдик тиркемеге колдонуучуларды дайындоо',
          title: 'Тандалган колдонуучуну же топту дайындоо',
          paragraph:
            'Колдонуучулар же топтор тиркеме аркылуу кирүү үчүн аларды корпоративдик тиркемеге дайындоо зарыл.',
        },
        metadataUrl: {
          headerSubtitle: 'Инсандыкты ырастоо провайдери метадайындарын конфигурациялоо',
          label: 'Метадайындар URL',
          placeholder: "URL'ди бул жерге чаптаңыз...",
          description: "Корпоративдик тиркемеңизде метадайындар URL'ин алыңыз. Төмөнгө чаптаңыз.",
        },
        modes: {
          ariaLabel: 'Конфигурация режими',
          metadataUrl: 'Метадайындар аркылуу кошуу',
          manual: 'Кол менен конфигурациялоо',
        },
        submitSamlConfig: {
          title: 'SAML тиркемеңиздин маалымдарын толтуруңуз',
        },
        manual: {
          description: 'SAML тиркемеңизде бул маанилерди алыңыз.',
          signOnUrl: {
            label: 'Кирүү URL',
            placeholder: "URL'ди бул жерге чаптаңыз...",
          },
          issuer: {
            label: 'Чыгаруучу',
            placeholder: "URL'ди бул жерге чаптаңыз...",
          },
          signingCertificate: {
            label: 'Кол коюу сертификаты',
            uploadFile: 'Файл жүктөө',
            replaceFile: 'Файлды алмаштыруу',
            removeFile: 'Файлды жок кылуу',
            fileUploaded: 'Файл жүктөлдү',
          },
        },
      },
    },
  },
  createOrganization: {
    formButtonSubmit: 'Уюм түзүү',
    invitePage: {
      formButtonReset: 'Өткөрүп жибер',
    },
    title: 'Уюм түзүү',
  },
  dates: {
    lastDay: "Кечээ {{ date | timeString('en-US') }} да",
    next6Days: "{{ date | weekday('en-US','long') }} {{ date | timeString('en-US') }} да",
    nextDay: "Эртеге {{ date | timeString('en-US') }} да",
    numeric: "{{ date | numeric('en-US') }}",
    previous6Days: "Өткөн {{ date | weekday('en-US','long') }} {{ date | timeString('en-US') }} да",
    sameDay: "Бүгүн {{ date | timeString('en-US') }} да",
  },
  dividerText: 'же',
  footerActionLink__alternativePhoneCodeProvider: 'Анын ордуна SMS аркылуу код жөнөтүү',
  footerActionLink__useAnotherMethod: 'Башка ыкманы колдонуу',
  footerPageLink__help: 'Жардам',
  footerPageLink__privacy: 'Купуялык',
  footerPageLink__terms: 'Шарттар',
  formButtonPrimary: 'Улантуу',
  formButtonPrimary__verify: 'Тастыктоо',
  formFieldAction__forgotPassword: 'Сырсөздү унуттуңузбу?',
  formFieldError__matchingPasswords: 'Сырсөздөр дал келет.',
  formFieldError__notMatchingPasswords: 'Сырсөздөр дал келбейт.',
  formFieldError__verificationLinkExpired:
    'Тастыктоо шилтемесинин мөөнөтү бүтүптүр. Жаңы шилтеме сураңыз.',
  formFieldHintText__optional: 'Каалоо боюнча',
  formFieldHintText__slug:
    'Slug — адамдар окуй ала турган, уникалдуу болуш керек болгон ID. Ал URLлерде колдонулат.',
  formFieldInputPlaceholder__apiKeyDescription:
    'Бул ачкычты эмне үчүн генерациялап жатканыңызды түшүндүрүңүз',
  formFieldInputPlaceholder__apiKeyExpirationDate: 'Күнүн тандаңыз',
  formFieldInputPlaceholder__apiKeyName: 'Купуя ачкычыңыздын атын киргизиңиз',
  formFieldInputPlaceholder__backupCode: 'Запастагы кодду киргизиңиз',
  formFieldInputPlaceholder__confirmDeletionUserAccount: 'Каттоо эсебин жок кылуу',
  formFieldInputPlaceholder__emailAddress: 'Email дарегиңизди киргизиңиз',
  formFieldInputPlaceholder__emailAddress_username: 'Email же колдонуучу атын киргизиңиз',
  formFieldInputPlaceholder__emailAddresses: 'example@email.com, example2@email.com',
  formFieldInputPlaceholder__firstName: 'Атыңыз',
  formFieldInputPlaceholder__lastName: 'Фамилияңыз',
  formFieldInputPlaceholder__organizationDomain: 'example.com',
  formFieldInputPlaceholder__organizationDomainEmailAddress: 'siz@example.com',
  formFieldInputPlaceholder__organizationName: 'Уюмдун аты',
  formFieldInputPlaceholder__organizationSlug: 'менин-уюмум',
  formFieldInputPlaceholder__password: 'Сырсөзүңүздү киргизиңиз',
  formFieldInputPlaceholder__signUpPassword: 'Сырсөз түзүңүз',
  formFieldInputPlaceholder__phoneNumber: 'Телефон номериңизди киргизиңиз',
  formFieldInputPlaceholder__username: 'Колдонуучу атыңызды киргизиңиз',
  formFieldInput__emailAddress_format: 'Үлгү формат: name@example.com',
  formFieldLabel__apiKey: 'API ачкычы',
  formFieldLabel__apiKeyDescription: 'Сүрөттөмө',
  formFieldLabel__apiKeyExpiration: 'Мөөнөтүнүн аяктоосу',
  formFieldLabel__apiKeyName: 'Купуя ачкычтын аты',
  formFieldLabel__automaticInvitations: 'Бул домен үчүн автоматтык чакырууларды иштетүү',
  formFieldLabel__backupCode: 'Запастагы код',
  formFieldLabel__confirmDeletion: 'Ырастоо',
  formFieldLabel__confirmPassword: 'Сырсөздү ырастоо',
  formFieldLabel__currentPassword: 'Учурдагы сырсөз',
  formFieldLabel__emailAddress: 'Email дареги',
  formFieldLabel__emailAddress_username: 'Email дареги же колдонуучу аты',
  formFieldLabel__emailAddresses: 'Email даректери',
  formFieldLabel__firstName: 'Аты',
  formFieldLabel__lastName: 'Фамилиясы',
  formFieldLabel__newPassword: 'Жаңы сырсөз',
  formFieldLabel__organizationDomain: 'Домен',
  formFieldLabel__organizationDomainDeletePending:
    'Күтүп турган чакыруулар менен сунуштарды өчүрүү',
  formFieldLabel__organizationDomainEmailAddress: 'Тастыктоо email дареги',
  formFieldLabel__organizationDomainEmailAddressDescription:
    'Бул доменди тастыктоо үчүн код алуу максатында ушул домен астындагы email дарегин киргизиңиз.',
  formFieldLabel__organizationName: 'Аталышы',
  formFieldLabel__organizationSlug: 'Slug',
  formFieldLabel__passkeyName: 'Өтмө ачкычтын аты',
  formFieldLabel__password: 'Сырсөз',
  formFieldLabel__phoneNumber: 'Телефон номери',
  formFieldLabel__role: 'Ролу',
  formFieldLabel__signOutOfOtherSessions: 'Бардык башка түзмөктөрдөн чыгуу',
  formFieldLabel__username: 'Колдонуучу аты',
  impersonationFab: {
    action__signOut: 'Чыгуу',
    title: '{{identifier}} катары кирдиңиз',
  },
  lastAuthenticationStrategy: 'Акыркы колдонулган',
  maintenanceMode:
    'Учурда техникалык тейлөө жүрүп жатат, бирок тынчсызданбаңыз — бир нече мүнөттөн ашпайт.',
  membershipRole__admin: 'Администратор',
  membershipRole__basicMember: 'Мүчө',
  membershipRole__guestMember: 'Конок',
  organizationList: {
    action__createOrganization: 'Уюм түзүү',
    action__invitationAccept: 'Кирүү',
    action__suggestionsAccept: 'Кирүү суранычы',
    createOrganization: 'Уюм түзүү',
    invitationAcceptedLabel: 'Кирди',
    subtitle: '{{applicationName}} колдонуу үчүн',
    suggestionsAcceptedLabel: 'Бекитүү күтүлүүдө',
    title: 'Каттоо эсебин тандаңыз',
    titleWithoutPersonal: 'Уюмду тандаңыз',
  },
  oauthConsent: {
    action__allow: 'Уруксат берүү',
    action__deny: 'Баш тартуу',
    offlineAccessNotice: ' Чыкканга же кирүүнү жокко чыгарганга чейин кирген бойдон каласыз.',
    redirectNotice: 'Уруксат берсеңиз, бул тиркеме сизди {{domainAction}} дарегине багыттайт.',
    redirectUriModal: {
      subtitle:
        '{{applicationName}} ишенгениңизди жана бул URL {{applicationName}} тиркемесине таандык экенин текшериңиз.',
      title: 'Багыттоо URL',
    },
    scopeList: {
      title: 'Бул {{applicationName}} тиркемесине төмөнкүлөргө кирүү уруксатын берет:',
    },
    subtitle: '{{identifier}} атынан {{applicationName}} тиркемесине кирүүнү суранат',
    viewFullUrl: 'Толук URLди көрүү',
    warning:
      '{{applicationName}} ({{domainAction}}) тиркемесине ишенгениңизди текшериңиз. Бул сайт же тиркемеге купуя маалыматтарыңызды бөлүшүп жатышыңыз мүмкүн.',
  },
  organizationProfile: {
    apiKeysPage: {
      title: 'API ачкычтары',
    },
    badge__automaticInvitation: 'Автоматтык чакыруулар',
    badge__automaticSuggestion: 'Автоматтык сунуштар',
    badge__manualInvitation: 'Автоматтык катталуу жок',
    badge__unverified: 'Тастыкталган жок',
    billingPage: {
      paymentHistorySection: {
        empty: 'Төлөм тарыхы жок',
        notFound: 'Төлөм аракети табылган жок',
        tableHeader__amount: 'Суммасы',
        tableHeader__date: 'Күнү',
        tableHeader__status: 'Абал',
      },
      paymentMethodsSection: {
        actionLabel__default: 'Демейки кылуу',
        actionLabel__remove: 'Жок кылуу',
        add: 'Жаңы төлөм ыкмасын кошуу',
        addSubtitle: 'Каттоо эсебиңизге жаңы төлөм ыкмасын кошуңуз.',
        cancelButton: 'Жокко чыгаруу',
        formButtonPrimary__add: 'Төлөм ыкмасын кошуу',
        formButtonPrimary__pay: '{{amount}} төлөө',
        payWithTestCardButton: 'Тест карта менен төлөө',
        removeMethod: {
          messageLine1: '{{identifier}} бул каттоо эсебинен алынып салынат.',
          messageLine2:
            'Бул төлөм ыкмасын андан ары колдоно албайсыз, ага байланышкан дайымдуу жазылуулар иштебей калат.',
          successMessage: '{{paymentMethod}} каттоо эсебиңизден жок кылынды.',
          title: 'Төлөм ыкмасын жок кылуу',
        },
        title: 'Төлөм ыкмалары',
      },
      start: {
        headerTitle__payments: 'Төлөмдөр',
        headerTitle__plans: 'Тарифтер',
        headerTitle__statements: 'Билдирмелер',
        headerTitle__subscriptions: 'Жазылуу',
      },
      statementsSection: {
        empty: 'Көрсөтүлө турган билдирме жок',
        itemCaption__paidForPlan: '{{plan}} {{period}} тарифи үчүн төлөндү',
        itemCaption__proratedCredit:
          'Мурунку жазылуунун жарым-жартылай колдонулушу үчүн пропорционалдуу кредит',
        itemCaption__payerCredit: 'Эсеп балансынан кредит',
        itemCaption__subscribedAndPaidForPlan: '{{plan}} {{period}} тарифине жазылып, төлөндү',
        notFound: 'Билдирме табылган жок',
        tableHeader__amount: 'Суммасы',
        tableHeader__date: 'Күнү',
        title: 'Билдирмелер',
        totalPaid: 'Жалпы төлөнгөн',
      },
      subscriptionsListSection: {
        actionLabel__manageSubscription: 'Башкаруу',
        actionLabel__newSubscription: 'Тарифке жазылуу',
        actionLabel__switchPlan: 'Тарифтерди алмаштыруу',
        tableHeader__edit: 'Түзөтүү',
        tableHeader__plan: 'Тариф',
        tableHeader__startDate: 'Башталган күн',
        title: 'Жазылуу',
      },
      subscriptionsSection: {
        actionLabel__default: 'Башкаруу',
      },
      switchPlansSection: {
        title: 'Тарифтерди алмаштыруу',
      },
      title: 'Эсептөө',
    },
    createDomainPage: {
      subtitle:
        'Тастыктала турган доменди кошуңуз. Ушул домендеги email дарегин колдонгон колдонуучулар уюмга автоматтык же суранач аркылуу кирүүгө мүмкүнчүлүк алат.',
      title: 'Домен кошуу',
    },
    invitePage: {
      detailsTitle__inviteFailed:
        'Чакыруулар жөнөтүлгөн жок. Төмөнкү email даректерге чакырулар буга чейин жөнөтүлүп коюлган: {{email_addresses}}.',
      formButtonPrimary__continue: 'Чакыруулар жөнөтүү',
      selectDropdown__role: 'Ролду тандаңыз',
      subtitle: 'Бир же бирнече email дарегин боштук же үтүр менен бөлүп киргизиңиз же чаптаңыз.',
      successMessage: 'Чакыруулар ийгиликтүү жөнөтүлдү',
      title: 'Жаңы мүчөлөрдү чакыруу',
    },
    membersPage: {
      action__invite: 'Чакыруу',
      action__search: 'Издөө',
      activeMembersTab: {
        menuAction__remove: 'Мүчөнү чыгаруу',
        tableHeader__actions: 'Аракеттер',
        tableHeader__joined: 'Кирген',
        tableHeader__role: 'Ролу',
        tableHeader__user: 'Колдонуучу',
      },
      alerts: {
        roleSetMigrationInProgress: {
          subtitle:
            'Жеткиликтүү ролдорду жаңылап жатабыз. Бул бүткөндөн кийин ролдорду өзгөртө аласыз.',
          title: 'Ролдор убактылуу кулпуланды',
        },
      },
      detailsTitle__emptyRow: 'Көрсөтүлө турган мүчө жок',
      invitationsTab: {
        autoInvitations: {
          headerSubtitle:
            'Уюмуңузга email домен туташтыруу аркылуу колдонуучуларды чакырыңыз. Дал келген email домени менен катталган ар бир адам уюмга каалаган убакта кире алат.',
          headerTitle: 'Автоматтык чакыруулар',
          primaryButton: 'Тастыкталган домендерди башкаруу',
        },
        table__emptyRow: 'Көрсөтүлө турган чакыруу жок',
      },
      invitedMembersTab: {
        menuAction__revoke: 'Чакырууну жокко чыгаруу',
        tableHeader__invited: 'Чакырылган',
      },
      requestsTab: {
        autoSuggestions: {
          headerSubtitle:
            'Дал келген email домени менен катталган колдонуучулар уюмуңузга кирүүнү суранууга сунуш ала алат.',
          headerTitle: 'Автоматтык сунуштар',
          primaryButton: 'Тастыкталган домендерди башкаруу',
        },
        menuAction__approve: 'Бекитүү',
        menuAction__reject: 'Четке кагуу',
        tableHeader__requested: 'Кирүү сурады',
        table__emptyRow: 'Көрсөтүлө турган суранач жок',
      },
      start: {
        headerTitle__invitations: 'Чакыруулар',
        headerTitle__members: 'Мүчөлөр',
        headerTitle__requests: 'Суранычтар',
      },
    },
    navbar: {
      apiKeys: 'API ачкычтары',
      billing: 'Эсептөө',
      description: 'Уюмуңузду башкарыңыз.',
      general: 'Жалпы',
      members: 'Мүчөлөр',
      title: 'Уюм',
    },
    plansPage: {
      alerts: {
        noPermissionsToManageBilling: 'Сизде бул уюм үчүн эсептөөнү башкаруу уруксаты жок.',
        planMembershipLimitExceeded:
          'Уюмуңузда {{count}} мүчө бар (күтүп турган чакыруулар менен). Бул тариф {{limit}} мүчөгө гана уруксат берет.',
      },
      title: 'Тарифтер',
    },
    profilePage: {
      dangerSection: {
        deleteOrganization: {
          actionDescription: 'Улантуу үчүн "{{organizationName}}" деп жазыңыз.',
          messageLine1: 'Бул уюмду чындап жок кылгыңыз келеби?',
          messageLine2: 'Бул аракет биротоло жана кайтарымсыз.',
          successMessage: 'Уюмду жок кылдыңыз.',
          title: 'Уюмду жок кылуу',
        },
        leaveOrganization: {
          actionDescription: 'Улантуу үчүн "{{organizationName}}" деп жазыңыз.',
          messageLine1:
            'Бул уюмду чындап таштагыңыз келеби? Уюмга жана анын тиркемелерине кирүү мүмкүнчүлүгүңүздөн ажырайсыз.',
          messageLine2: 'Бул аракет биротоло жана кайтарымсыз.',
          successMessage: 'Уюмдан чыктыңыз.',
          title: 'Уюмдан чыгуу',
        },
        title: 'Коркунуч',
      },
      domainSection: {
        menuAction__manage: 'Башкаруу',
        menuAction__remove: 'Өчүрүү',
        menuAction__verify: 'Тастыктоо',
        primaryButton: 'Домен кошуу',
        subtitle:
          'Тастыкталган email домени боюнча колдонуучуларга уюмга автоматтык же суранач аркылуу кирүүгө уруксат берүү.',
        title: 'Тастыкталган домендер',
      },
      successMessage: 'Уюм жаңыртылды.',
      title: 'Профилди жаңыртуу',
    },
    removeDomainPage: {
      messageLine1: '{{domain}} email домени жок кылынат.',
      messageLine2: 'Колдонуучулар мындан ары уюмга автоматтык кире алышпайт.',
      successMessage: '{{domain}} жок кылынды.',
      title: 'Доменди жок кылуу',
    },
    start: {
      headerTitle__general: 'Жалпы',
      headerTitle__members: 'Мүчөлөр',
      membershipSeatUsageLabel: '{{limit}} орундан {{count}} колдонулду',
      profileSection: {
        primaryButton: 'Профилди жаңыртуу',
        title: 'Уюм профили',
        uploadAction__title: 'Логотип',
      },
    },
    verifiedDomainPage: {
      dangerTab: {
        calloutInfoLabel: 'Бул доменди жок кылуу чакырылган колдонуучуларга таасир этет.',
        removeDomainActionLabel__remove: 'Доменди жок кылуу',
        removeDomainSubtitle: 'Бул доменди тастыкталган домендеринизден жок кылуу',
        removeDomainTitle: 'Доменди жок кылуу',
      },
      enrollmentTab: {
        automaticInvitationOption__description:
          'Катталганда колдонуучулар автоматтык уюмга кирүүгө чакырылат жана каалаган убакта кире алат.',
        automaticInvitationOption__label: 'Автоматтык чакыруулар',
        automaticSuggestionOption__description:
          'Колдонуучулар кирүүнү суранууга сунуш алат, бирок уюмга кирүүдөн мурун администратор тарабынан бекитилүүсү зарыл.',
        automaticSuggestionOption__label: 'Автоматтык сунуштар',
        calloutInfoLabel: 'Катталуу режимин өзгөртүү жаңы колдонуучуларга гана таасир этет.',
        calloutInvitationCountLabel:
          'Колдонуучуларга жөнөтүлгөн күтүп турган чакыруулар: {{count}}',
        calloutSuggestionCountLabel: 'Колдонуучуларга жөнөтүлгөн күтүп турган сунуштар: {{count}}',
        manualInvitationOption__description:
          'Колдонуучулар уюмга жалаң кол менен чакырылышы мүмкүн.',
        manualInvitationOption__label: 'Автоматтык катталуу жок',
        subtitle: 'Бул домендеги колдонуучулар уюмга кандай кирерин тандаңыз.',
      },
      start: {
        headerTitle__danger: 'Коркунуч',
        headerTitle__enrollment: 'Катталуу параметрлери',
      },
      subtitle: '{{domain}} домени тастыкталды. Катталуу режимин тандап улантыңыз.',
      title: '{{domain}} жаңыртуу',
    },
    verifyDomainPage: {
      formSubtitle: 'Email дарегиңизге жөнөтүлгөн тастыктоо кодун киргизиңиз',
      formTitle: 'Тастыктоо коду',
      resendButton: 'Код келген жокпу? Кайра жөнөтүү',
      subtitle: '{{domainName}} домени email аркылуу тастыкталышы керек.',
      subtitleVerificationCodeScreen:
        '{{emailAddress}} дарегине тастыктоо коду жөнөтүлдү. Улантуу үчүн кодду киргизиңиз.',
      title: 'Доменди тастыктоо',
    },
  },
  organizationSwitcher: {
    action__closeOrganizationSwitcher: 'Уюм алмаштыргычты жабуу',
    action__createOrganization: 'Уюм түзүү',
    action__invitationAccept: 'Кирүү',
    action__manageOrganization: 'Башкаруу',
    action__openOrganizationSwitcher: 'Уюм алмаштыргычты ачуу',
    action__suggestionsAccept: 'Кирүү суранычы',
    notSelected: 'Уюм тандалган жок',
    personalWorkspace: 'Жеке каттоо эсеби',
    suggestionsAcceptedLabel: 'Бекитүү күтүлүүдө',
  },
  paginationButton__next: 'Кийинки',
  paginationButton__previous: 'Мурунку',
  paginationRowText__displaying: 'Көрсөтүлүүдө',
  paginationRowText__of: 'дан',
  reverification: {
    alternativeMethods: {
      actionLink: 'Жардам алуу',
      actionText: 'Булардын бири жокпу?',
      blockButton__backupCode: 'Камдык кодду колдонуу',
      blockButton__emailCode: '{{identifier}} дарегине код жиберүү',
      blockButton__passkey: 'Өткөрмө ачкычыңызды колдонуу',
      blockButton__password: 'Сырсөзүңүз менен улантуу',
      blockButton__phoneCode: '{{identifier}} номерине SMS код жиберүү',
      blockButton__totp: 'Аутентификатор колдонмоңузду колдонуу',
      getHelp: {
        blockButton__emailSupport: 'Колдоо кызматына email жазуу',
        content:
          'Эсепти текшерүүдө кыйынчылык болсо, бизге email жазыңыз, жана биз мүмкүн болушунча тезирээк кирүүңүздү калыбына келтирүүгө жардам беребиз.',
        title: 'Жардам алуу',
      },
      subtitle: 'Кыйынчылык бар? Текшерүү үчүн ушул ыкмалардын каалаганын колдонсоңуз болот.',
      title: 'Башка ыкманы колдонуу',
    },
    backupCodeMfa: {
      subtitle: 'Эки баскычтуу аутентификацияны орнотуу учурунда алган камдык кодду киргизиңиз',
      title: 'Камдык кодду киргизүү',
    },
    emailCode: {
      formTitle: 'Текшерүү коду',
      resendButton: 'Код келген жокпу? Кайра жиберүү',
      subtitle: 'Улантуу үчүн emailиңизге жиберилген кодду киргизиңиз',
      title: 'Текшерүү талап кылынат',
    },
    noAvailableMethods: {
      message:
        'Текшерүүнү улантуу мүмкүн эмес. Колдонууга жарактуу аутентификация факторлору конфигурацияланган жок',
      subtitle: 'Ката кетти',
      title: 'Эсепти текшерүү мүмкүн эмес',
    },
    passkey: {
      blockButton__passkey: 'Өткөрмө ачкычыңызды колдонуу',
      subtitle:
        'Өткөрмө ачкычыңызды колдонуу сиздин инсандыгыңызды тастыктайт. Түзмөгүңүз манжа изин, жүздү же экран кулпусун сурашы мүмкүн.',
      title: 'Өткөрмө ачкычыңызды колдонуу',
    },
    password: {
      actionLink: 'Башка ыкманы колдонуу',
      subtitle: 'Улантуу үчүн учурдагы сырсөзүңүздү киргизиңиз',
      title: 'Текшерүү талап кылынат',
    },
    phoneCode: {
      formTitle: 'Текшерүү коду',
      resendButton: 'Код келген жокпу? Кайра жиберүү',
      subtitle: 'Улантуу үчүн телефонуңузга жиберилген кодду киргизиңиз',
      title: 'Текшерүү талап кылынат',
    },
    phoneCodeMfa: {
      formTitle: 'Текшерүү коду',
      resendButton: 'Код келген жокпу? Кайра жиберүү',
      subtitle: 'Улантуу үчүн телефонуңузга жиберилген кодду киргизиңиз',
      title: 'Текшерүү талап кылынат',
    },
    totpMfa: {
      formTitle: 'Текшерүү коду',
      subtitle: 'Улантуу үчүн аутентификатор колдонмоңуз тарабынан жаратылган кодду киргизиңиз',
      title: 'Текшерүү талап кылынат',
    },
  },
  signIn: {
    accountSwitcher: {
      action__addAccount: 'Эсеп кошуу',
      action__signOutAll: 'Бардык эсептерден чыгуу',
      subtitle: 'Улантуу үчүн каалаган эсепти тандаңыз.',
      title: 'Эсепти тандоо',
    },
    alternativeMethods: {
      actionLink: 'Жардам алуу',
      actionText: 'Булардын бири жокпу?',
      blockButton__backupCode: 'Камдык кодду колдонуу',
      blockButton__emailCode: '{{identifier}} дарегине код жиберүү',
      blockButton__emailLink: '{{identifier}} дарегине шилтеме жиберүү',
      blockButton__passkey: 'Өткөрмө ачкычыңыз менен кирүү',
      blockButton__password: 'Сырсөзүңүз менен кирүү',
      blockButton__phoneCode: '{{identifier}} номерине SMS код жиберүү',
      blockButton__totp: 'Аутентификатор колдонмоңузду колдонуу',
      getHelp: {
        blockButton__emailSupport: 'Колдоо кызматына email жазуу',
        content:
          'Эсепке кирүүдө кыйынчылык болсо, бизге email жазыңыз, жана биз мүмкүн болушунча тезирээк кирүүңүздү калыбына келтирүүгө жардам беребиз.',
        title: 'Жардам алуу',
      },
      subtitle: 'Кыйынчылык бар? Кирүү үчүн ушул ыкмалардын каалаганын колдонсоңуз болот.',
      title: 'Башка ыкманы колдонуу',
    },
    alternativePhoneCodeProvider: {
      formTitle: 'Текшерүү коду',
      resendButton: 'Код келген жокпу? Кайра жиберүү',
      subtitle: '{{applicationName}} колдонмосуна улантуу үчүн',
      title: '{{provider}} кызматыңызды текшериңиз',
    },
    backupCodeMfa: {
      subtitle: 'Камдык кодуңуз — эки баскычтуу аутентификацияны орнотуу учурунда алган код.',
      title: 'Камдык кодду киргизүү',
    },
    emailCode: {
      formTitle: 'Текшерүү коду',
      resendButton: 'Код келген жокпу? Кайра жиберүү',
      subtitle: '{{applicationName}} колдонмосуна улантуу үчүн',
      title: 'Emailиңизди текшериңиз',
    },
    emailCodeMfa: {
      formTitle: 'Emailиңизди текшериңиз',
      resendButton: 'Код келген жокпу? Кайра жиберүү',
      subtitle: '{{applicationName}} колдонмосуна улантуу үчүн',
      title: 'Emailиңизди текшериңиз',
    },
    emailLink: {
      clientMismatch: {
        subtitle: 'Улантуу үчүн кирүүнү баштаган түзмөк жана браузерде текшерүү шилтемесин ачыңыз',
        title: 'Текшерүү шилтемеси бул түзмөк үчүн жараксыз',
      },
      expired: {
        subtitle: 'Улантуу үчүн баштапкы өтмөккө кайтыңыз.',
        title: 'Бул текшерүү шилтемесинин мөөнөтү бүттү',
      },
      failed: {
        subtitle: 'Улантуу үчүн баштапкы өтмөккө кайтыңыз.',
        title: 'Бул текшерүү шилтемеси жараксыз',
      },
      formSubtitle: 'Emailиңизге жиберилген текшерүү шилтемесин колдонуңуз',
      formTitle: 'Текшерүү шилтемеси',
      loading: {
        subtitle: 'Жакында багытталасыз',
        title: 'Кирүүдө...',
      },
      resendButton: 'Шилтеме келген жокпу? Кайра жиберүү',
      subtitle: '{{applicationName}} колдонмосуна улантуу үчүн',
      title: 'Emailиңизди текшериңиз',
      unusedTab: {
        title: 'Бул өтмөктү жаба аласыз',
      },
      verified: {
        subtitle: 'Жакында багытталасыз',
        title: 'Ийгиликтүү кирилди',
      },
      verifiedSwitchTab: {
        subtitle: 'Улантуу үчүн баштапкы өтмөккө кайтыңыз',
        subtitleNewTab: 'Улантуу үчүн жаңы ачылган өтмөккө кайтыңыз',
        titleNewTab: 'Башка өтмөктө кирилди',
      },
    },
    emailLinkMfa: {
      formSubtitle: 'Emailиңизге жиберилген текшерүү шилтемесин колдонуңуз',
      resendButton: 'Шилтеме келген жокпу? Кайра жиберүү',
      subtitle: '{{applicationName}} колдонмосуна улантуу үчүн',
      title: 'Emailиңизди текшериңиз',
    },
    enterpriseConnections: {
      subtitle: 'Улантуу үчүн каалаган корпоративдик эсепти тандаңыз.',
      title: 'Корпоративдик эсебиңизди тандоо',
    },
    forgotPassword: {
      formTitle: 'Сырсөздү баштапкы калыбына келтирүү коду',
      resendButton: 'Код келген жокпу? Кайра жиберүү',
      subtitle: 'сырсөздү баштапкы калыбына келтирүү үчүн',
      subtitle_email: 'Алгач emailиңизге жиберилген кодду киргизиңиз',
      subtitle_phone: 'Алгач телефонуңузга жиберилген кодду киргизиңиз',
      title: 'Сырсөздү баштапкы калыбына келтирүү',
    },
    forgotPasswordAlternativeMethods: {
      blockButton__resetPassword: 'Сырсөздү баштапкы калыбына келтирүү',
      label__alternativeMethods: 'Же башка ыкма менен кирүү',
      title: 'Сырсөздү унуттуңузбу?',
    },
    newDeviceVerificationNotice:
      'Жаңы түзмөктөн кирүүдөсүз. Эсебиңиздин коопсуздугун камсыз кылуу үчүн текшерүү суралуда.',
    noAvailableMethods: {
      message: 'Кирүүнү улантуу мүмкүн эмес. Колдонууга жарактуу аутентификация факторлору жок.',
      subtitle: 'Ката кетти',
      title: 'Кирүү мүмкүн эмес',
    },
    passkey: {
      subtitle:
        'Өткөрмө ачкычыңызды колдонуу сиздин экениңизди тастыктайт. Түзмөгүңүз манжа изин, жүздү же экран кулпусун сурашы мүмкүн.',
      title: 'Өткөрмө ачкычыңызды колдонуу',
    },
    password: {
      actionLink: 'Башка ыкманы колдонуу',
      subtitle: 'Эсебиңиз менен байланышкан сырсөздү киргизиңиз',
      title: 'Сырсөзүңүздү киргизиңиз',
    },
    passwordCompromised: {
      title: 'Сырсөз бузулган',
    },
    passwordPwned: {
      title: 'Сырсөз бузулган',
    },
    passwordUntrusted: {
      title: 'Сырсөзгө ишенилбейт',
    },
    phoneCode: {
      formTitle: 'Текшерүү коду',
      resendButton: 'Код келген жокпу? Кайра жиберүү',
      subtitle: '{{applicationName}} колдонмосуна улантуу үчүн',
      title: 'Телефонуңузду текшериңиз',
    },
    phoneCodeMfa: {
      formTitle: 'Текшерүү коду',
      resendButton: 'Код келген жокпу? Кайра жиберүү',
      subtitle: 'Улантуу үчүн телефонуңузга жиберилген текшерүү кодун киргизиңиз',
      title: 'Телефонуңузду текшериңиз',
    },
    resetPassword: {
      formButtonPrimary: 'Сырсөздү баштапкы калыбына келтирүү',
      requiredMessage:
        'Коопсуздук себептеринен сырсөзүңүздү баштапкы калыбына келтирүү талап кылынат.',
      successMessage: 'Сырсөзүңүз ийгиликтүү өзгөртүлдү. Кирүүдө, бир момент күтүңүз.',
      title: 'Жаңы сырсөз орнотуу',
    },
    resetPasswordMfa: {
      detailsLabel:
        'Сырсөздү баштапкы калыбына келтирүүдөн мурун сиздин инсандыгыңызды текшерүү керек.',
    },
    start: {
      actionLink: 'Катталуу',
      actionLink__join_waitlist: 'Күтүү тизмесине кошулуу',
      actionLink__use_email: 'Email колдонуу',
      actionLink__use_email_username: 'Email же колдонуучу атын колдонуу',
      actionLink__use_passkey: 'Өткөрмө ачкыч колдонуу',
      actionLink__use_phone: 'Телефон колдонуу',
      actionLink__use_username: 'Колдонуучу атын колдонуу',
      actionText: 'Эсебиңиз жокпу?',
      actionText__join_waitlist: 'Эрте кирүүнү каалайсызбы?',
      alternativePhoneCodeProvider: {
        actionLink: 'Башка ыкманы колдонуу',
        label: '{{provider}} телефон номери',
        subtitle: '{{provider}} аркылуу текшерүү кодун алуу үчүн телефон номериңизди киргизиңиз.',
        title: '{{provider}} аркылуу {{applicationName}} колдонмосуна кирүү',
      },
      subtitle: 'Кош келиңиз! Улантуу үчүн кирүүңүздү сураналы',
      title: '{{applicationName}} колдонмосуна кирүү',
      titleCombined: '{{applicationName}} колдонмосуна улантуу',
    },
    totpMfa: {
      formTitle: 'Текшерүү коду',
      subtitle:
        'Улантуу үчүн аутентификатор колдонмоңуз тарабынан жаратылган текшерүү кодун киргизиңиз',
      title: 'Эки баскычтуу текшерүү',
    },
    web3Solana: {
      subtitle: 'Кирүү үчүн төмөндөн капчык тандаңыз',
      title: 'Solana аркылуу кирүү',
    },
  },
  signInEnterPasswordTitle: 'Сырсөзүңүздү киргизиңиз',
  signUp: {
    alternativePhoneCodeProvider: {
      resendButton: 'Код келген жокпу? Кайра жиберүү',
      subtitle: '{{provider}} кызматына жиберилген текшерүү кодун киргизиңиз',
      title: '{{provider}} кызматыңызды текшериңиз',
    },
    continue: {
      actionLink: 'Кирүү',
      actionText: 'Эсебиңиз барбы?',
      subtitle: 'Улантуу үчүн калган маалыматтарды толтуруңуз.',
      title: 'Жетишпеген маалыматтарды толтуруу',
    },
    emailCode: {
      formSubtitle: 'Email дарегиңизге жиберилген текшерүү кодун киргизиңиз',
      formTitle: 'Текшерүү коду',
      resendButton: 'Код келген жокпу? Кайра жиберүү',
      subtitle: 'Emailиңизге жиберилген текшерүү кодун киргизиңиз',
      title: 'Emailиңизди текшериңиз',
    },
    emailLink: {
      clientMismatch: {
        subtitle:
          'Улантуу үчүн катталууну баштаган түзмөк жана браузерде текшерүү шилтемесин ачыңыз',
        title: 'Текшерүү шилтемеси бул түзмөк үчүн жараксыз',
      },
      formSubtitle: 'Email дарегиңизге жиберилген текшерүү шилтемесин колдонуңуз',
      formTitle: 'Текшерүү шилтемеси',
      loading: {
        title: 'Катталууда...',
      },
      resendButton: 'Шилтеме келген жокпу? Кайра жиберүү',
      subtitle: '{{applicationName}} колдонмосуна улантуу үчүн',
      title: 'Emailиңизди текшериңиз',
      verified: {
        title: 'Ийгиликтүү катталды',
      },
      verifiedSwitchTab: {
        subtitle: 'Улантуу үчүн жаңы ачылган өтмөккө кайтыңыз',
        subtitleNewTab: 'Улантуу үчүн мурунку өтмөккө кайтыңыз',
        title: 'Email ийгиликтүү текшерилди',
      },
    },
    enterpriseConnections: {
      subtitle: 'Улантуу үчүн каалаган корпоративдик эсепти тандаңыз.',
      title: 'Корпоративдик эсебиңизди тандоо',
    },
    legalConsent: {
      checkbox: {
        label__onlyPrivacyPolicy: 'Мен {{ privacyPolicyLink || link("Privacy Policy") }} макулмун',
        label__onlyTermsOfService:
          'Мен {{ termsOfServiceLink || link("Terms of Service") }} макулмун',
        label__termsOfServiceAndPrivacyPolicy:
          'Мен {{ termsOfServiceLink || link("Terms of Service") }} жана {{ privacyPolicyLink || link("Privacy Policy") }} макулмун',
      },
      continue: {
        subtitle: 'Улантуу үчүн шарттарды окуп, кабыл алыңыз',
        title: 'Юридикалык макулдук',
      },
    },
    phoneCode: {
      formSubtitle: 'Телефон номериңизге жиберилген текшерүү кодун киргизиңиз',
      formTitle: 'Текшерүү коду',
      resendButton: 'Код келген жокпу? Кайра жиберүү',
      subtitle: 'Телефонуңузга жиберилген текшерүү кодун киргизиңиз',
      title: 'Телефонуңузду текшериңиз',
    },
    restrictedAccess: {
      actionLink: 'Кирүү',
      actionText: 'Эсебиңиз барбы?',
      blockButton__emailSupport: 'Колдоо кызматына email жазуу',
      blockButton__joinWaitlist: 'Күтүү тизмесине кошулуу',
      subtitle:
        'Катталуу учурда өчүрүлгөн. Кирүүгө укугуңуз болушу керек деп ойлосоңуз, колдоо кызматына кайрылыңыз.',
      subtitleWaitlist:
        'Катталуу учурда өчүрүлгөн. Ачылышы жөнүндө биринчи болуп билүү үчүн күтүү тизмесине кошулуңуз.',
      title: 'Кирүү чектелген',
    },
    start: {
      actionLink: 'Кирүү',
      actionLink__use_email: 'Анын ордуна email колдонуу',
      actionLink__use_phone: 'Анын ордуна телефон колдонуу',
      actionText: 'Эсебиңиз барбы?',
      alternativePhoneCodeProvider: {
        actionLink: 'Башка ыкманы колдонуу',
        label: '{{provider}} телефон номери',
        subtitle: '{{provider}} аркылуу текшерүү кодун алуу үчүн телефон номериңизди киргизиңиз.',
        title: '{{provider}} аркылуу {{applicationName}} колдонмосуна катталуу',
      },
      subtitle: 'Кош келиңиз! Баштоо үчүн маалыматтарды толтуруңуз.',
      subtitleCombined: 'Кош келиңиз! Баштоо үчүн маалыматтарды толтуруңуз.',
      title: 'Эсеп түзүү',
      titleCombined: 'Эсеп түзүү',
    },
    web3Solana: {
      subtitle: 'Катталуу үчүн төмөндөн капчык тандаңыз',
      title: 'Solana аркылуу катталуу',
    },
  },
  socialButtonsBlockButton: '{{provider|titleize}} аркылуу улантуу',
  socialButtonsBlockButtonManyInView: '{{provider|titleize}}',
  taskChooseOrganization: {
    alerts: {
      organizationAlreadyExists:
        'Аныкталган компания аты ({{organizationName}}) жана {{organizationDomain}} үчүн уюм мурунтан бар. Чакыруу аркылуу кошулуңуз.',
    },
    chooseOrganization: {
      action__createOrganization: 'Жаңы уюм түзүү',
      action__invitationAccept: 'Кошулуу',
      action__suggestionsAccept: 'Кошулуу суранычы',
      subtitle: 'Учурдагы уюмга кошулуу же жаңысын түзүү',
      subtitle__createOrganizationDisabled: 'Учурдагы уюмга кошулуу',
      suggestionsAcceptedLabel: 'Бекитилүүдө',
      title: 'Уюмду тандоо',
    },
    createOrganization: {
      formButtonReset: 'Жокко чыгаруу',
      formButtonSubmit: 'Улантуу',
      formFieldInputPlaceholder__name: 'Менин уюмум',
      formFieldInputPlaceholder__slug: 'менин-уюмум',
      formFieldLabel__name: 'Аталышы',
      formFieldLabel__slug: 'Slug',
      subtitle: 'Улантуу үчүн уюмуңуздун маалыматтарын киргизиңиз',
      title: 'Уюмуңузду орнотуу',
    },
    organizationCreationDisabled: {
      subtitle: 'Чакыруу үчүн уюмуңуздун администраторуна кайрылыңыз.',
      title: 'Сиз бир уюмга кириши керексиз',
    },
    signOut: {
      actionLink: 'Чыгуу',
      actionText: '{{identifier}} катары кирдиңиз',
    },
  },
  taskResetPassword: {
    formButtonPrimary: 'Сырсөздү баштапкы калыбына келтирүү',
    signOut: {
      actionLink: 'Чыгуу',
      actionText: '{{identifier}} катары кирдиңиз',
    },
    subtitle: 'Эсебиңиз улантуудан мурун жаңы сырсөздү талап кылат',
    title: 'Сырсөздү баштапкы калыбына келтирүү',
  },
  taskSetupMfa: {
    badge: 'Эки баскычтуу текшерүүнү орнотуу',
    signOut: {
      actionLink: 'Чыгуу',
      actionText: '{{identifier}} катары кирдиңиз',
    },
    smsCode: {
      addPhone: {
        formButtonPrimary: 'Улантуу',
        infoText:
          'Бул телефон номерине текшерүү коду камтылган SMS жиберилет. Кабар жана маалымат тарифтери колдонулушу мүмкүн.',
      },
      addPhoneNumber: 'Телефон номерин кошуу',
      cancel: 'Жокко чыгаруу',
      subtitle:
        'SMS кодунун эки баскычтуу текшерүүсү үчүн колдонгуңуз келген телефон номерин тандаңыз',
      success: {
        finishButton: 'Улантуу',
        message1:
          'Эки баскычтуу текшерүү азыр иштетилди. Кирүүдө кошумча кадам катары бул телефон номерине жиберилген текшерүү кодун киргизишиңиз керек болот.',
        message2:
          'Бул камдык кодуларды сактап, коопсуз жерде сактаңыз. Аутентификация түзмөгүңүзгө кирүүңүздү жоготсоңуз, камдык кодуларды колдонуп кире аласыз.',
        title: 'SMS коду аркылуу текшерүү иштетилди',
      },
      title: 'SMS коду аркылуу текшерүүнү кошуу',
      verifyPhone: {
        formButtonPrimary: 'Улантуу',
        formTitle: 'Текшерүү коду',
        resendButton: 'Код келген жокпу? Кайра жиберүү',
        subtitle: 'Жиберилген текшерүү кодун киргизиңиз',
        title: 'Телефон номериңизди текшериңиз',
      },
    },
    start: {
      methodSelection: {
        phoneCode: 'SMS коду',
        totp: 'Аутентификатор колдонмосу',
      },
      subtitle:
        'Эсебиңизди коргоо үчүн кошумча коопсуздук катмарын кандай ыкма менен колдонгуңуз келгенин тандаңыз',
      title: 'Эки баскычтуу текшерүүнү орнотуу',
    },
    totpCode: {
      addAuthenticatorApp: {
        buttonAbleToScan__nonPrimary: 'QR кодду сканерлөө',
        buttonUnableToScan__nonPrimary: 'QR кодду сканерлей албайсызбы?',
        formButtonPrimary: 'Улантуу',
        formButtonReset: 'Жокко чыгаруу',
        infoText__ableToScan:
          'Аутентификатор колдонмоңузда жаңы кирүү ыкмасын орнотуп, аны эсебиңизге байлоо үчүн төмөнкү QR кодду сканерлеңиз.',
        infoText__unableToScan:
          'Аутентификаторуңузда жаңы кирүү ыкмасын орнотуп, төмөндөгү Ачкычты киргизиңиз.',
        inputLabel__unableToScan1:
          'Убакытка негизделген же бир жолку сырсөздөр иштетилгенин текшерип, андан кийин эсебиңизди байлоону бүтүрүңүз.',
      },
      success: {
        finishButton: 'Улантуу',
        message1:
          'Эки баскычтуу текшерүү азыр иштетилди. Кирүүдө кошумча кадам катары бул аутентификатордон текшерүү кодун киргизишиңиз керек болот.',
        message2:
          'Бул камдык кодуларды сактап, коопсуз жерде сактаңыз. Аутентификация түзмөгүңүзгө кирүүңүздү жоготсоңуз, камдык кодуларды колдонуп кире аласыз.',
        title: 'Аутентификатор колдонмосу аркылуу текшерүү иштетилди',
      },
      title: 'Аутентификатор колдонмосун кошуу',
      verifyTotp: {
        formButtonPrimary: 'Улантуу',
        formButtonReset: 'Жокко чыгаруу',
        formTitle: 'Текшерүү коду',
        subtitle: 'Аутентификаторуңуз тарабынан жаратылган текшерүү кодун киргизиңиз',
        title: 'Аутентификатор колдонмосун кошуу',
      },
    },
  },
  unstable__errors: {
    already_a_member_in_organization: '{{email}} мурунтан бул уюмдун мүчөсү.',
    api_key_name_already_exists: 'API ачкычынын аты мурунтан бар.',
    api_key_usage_exceeded:
      'Колдонуу чегиңизге жеттиңиз. Акы төлөнүүчү тарифке өтүү менен чекти алып салсаңыз болот.',
    avatar_file_size_exceeded:
      'Файлдын өлчөмү 10МБ максималдуу чегинен ашат. Кичирээк файлды тандаңыз.',
    avatar_file_type_invalid:
      'Файл түрү колдоого алынбайт. JPG, PNG, GIF же WEBP сүрөтүн жүктөңүз.',
    captcha_unavailable:
      'Бот текшерүүсү ийгиликсиз болгондуктан катталуу аяктаган жок. Кайра аракет кылуу үчүн баракты жаңыртыңыз же колдоо кызматына кайрылыңыз.',
    form_new_password_matches_current: 'Жаңы сырсөз учурдагы сырсөз менен бирдей болбошу керек.',
    form_password_length_too_short: 'Сырсөзүңүз өтө кыска. Жок дегенде 8 белгиден турушу керек.',
    form_password_not_strong_enough: 'Сырсөзүңүз жетишерлик күчтүү эмес.',
    form_password_pwned:
      'Бул сырсөз маалымат агып чыгуунун бир бөлүгү катары табылган жана колдонуу мүмкүн эмес, башка сырсөздү колдонуп көрүңүз.',
    form_password_pwned__sign_in:
      'Бул сырсөз маалымат агып чыгуунун бир бөлүгү катары табылган жана колдонуу мүмкүн эмес, сырсөзүңүздү баштапкы калыбына келтириңиз.',
    form_password_untrusted__sign_in:
      'Сырсөзүңүз бузулган болушу мүмкүн. Эсебиңизди коргоо үчүн альтернативдүү кирүү ыкмасын колдонуңуз. Кирип болгондон кийин сырсөзүңүздү баштапкы калыбына келтирүү талап кылынат.',
    form_username_invalid_length:
      'Колдонуучу атыңыз {{min_length}} дан {{max_length}} белгиге чейин болушу керек.',
    form_username_needs_non_number_char:
      'Колдонуучу атыңыз жок дегенде бир санарып эмес белгиден турушу керек.',
    organization_membership_quota_exceeded:
      'Уюмдун мүчөлүгүнүн чегиңизге жеттиңиз, анын ичинде күтүүдөгү чакыруулар да кирет.',
    organization_not_found_or_unauthorized:
      'Сиз бул уюмдун мүчөсү эмессиз. Башкасын тандаңыз же жаңысын түзүңүз.',
    organization_not_found_or_unauthorized_with_create_organization_disabled:
      'Сиз бул уюмдун мүчөсү эмессиз. Башкасын тандаңыз.',
    passkey_already_exists: 'Бул түзмөктө өткөрмө ачкыч мурунтан катталган.',
    passkey_not_supported: 'Өткөрмө ачкычтар бул түзмөктө колдоого алынбайт.',
    passkey_pa_not_supported:
      'Катталуу платформа аутентификаторун талап кылат, бирок түзмөк аны колдобойт.',
    passkey_registration_cancelled: 'Өткөрмө ачкычты каттоо жокко чыгарылды же мөөнөтү бүттү.',
    passkey_retrieval_cancelled: 'Өткөрмө ачкычты текшерүү жокко чыгарылды же мөөнөтү бүттү.',
    passwordComplexity: {
      maximumLength: '{{length}} белгиден аз',
      minimumLength: '{{length}} же андан көп белги',
      requireLowercase: 'кичи тамга',
      requireNumbers: 'сан',
      requireSpecialCharacter: 'атайын белги',
      requireUppercase: 'баш тамга',
      sentencePrefix: 'Сырсөзүңүз камтышы керек',
    },
    web3_missing_identifier: 'Web3 Капчык кеңейтүүсү табылган жок. Улантуу үчүн бирин орнотуңуз.',
    web3_signature_request_rejected:
      'Кол тамга суранычын четке каккансыз. Улантуу үчүн кайра аракет кылыңыз.',
    web3_solana_signature_generation_failed:
      'Кол тамга жаратууда ката кетти. Улантуу үчүн кайра аракет кылыңыз.',
    zxcvbn: {
      couldBeStronger:
        'Сырсөзүңүз иштейт, бирок күчтүүрөөк болушу мүмкүн. Көбүрөөк белги кошуп көрүңүз.',
      goodPassword: 'Сырсөзүңүз бардык зарыл талаптарга жооп берет.',
      notEnough: 'Сырсөзүңүз жетишерлик күчтүү эмес.',
      suggestions: {
        allUppercase: 'Кээ бир тамгаларды баш тамгага айлантыңыз, бирок баарын эмес.',
        anotherWord: 'Азыраак кездешүүчү сөздөрдү кошуңуз.',
        associatedYears: 'Сиз менен байланышкан жылдардан качыңыз.',
        capitalization: 'Биринчи тамгадан башка да тамгаларды баш тамгага айлантыңыз.',
        dates: 'Сиз менен байланышкан күндөр жана жылдардан качыңыз.',
        l33t: "'a' ордуна '@' сыяктуу болжолдуу тамга алмаштырууларынан качыңыз.",
        longerKeyboardPattern:
          'Узунураак клавиатура үлгүлөрүн колдонуп, терүү багытын бир нече жолу өзгөртүңүз.',
        noNeed: 'Символдорсуз, сансыз же баш тамгасыз да күчтүү сырсөз түзүүгө болот.',
        pwned: 'Бул сырсөздү башка жерде колдонсоңуз, аны өзгөртүңүз.',
        recentYears: 'Акыркы жылдардан качыңыз.',
        repeated: 'Кайталануучу сөздөр жана белгилерден качыңыз.',
        reverseWords: 'Кеңири тараган сөздөрдүн тескери жазылышынан качыңыз.',
        sequences: 'Кеңири тараган белги ырааттуулуктарынан качыңыз.',
        useWords: 'Бир нече сөздү колдонуңуз, бирок кеңири тараган сөз айкаштарынан качыңыз.',
      },
      warnings: {
        common: 'Бул кеңири колдонулуучу сырсөз.',
        commonNames: 'Кеңири тараган ат жана фамилияларды табуу оңой.',
        dates: 'Күндөрдү табуу оңой.',
        extendedRepeat: '"abcabcabc" сыяктуу кайталануучу белги үлгүлөрүн табуу оңой.',
        keyPattern: 'Клавиатурадагы кыска үлгүлөрдү табуу оңой.',
        namesByThemselves: 'Жеке аттар же фамилияларды табуу оңой.',
        pwned: 'Сырсөзүңүз Интернеттеги маалымат агып чыгуусунда ачыкка чыккан.',
        recentYears: 'Акыркы жылдарды табуу оңой.',
        sequences: '"abc" сыяктуу кеңири тараган белги ырааттуулуктарын табуу оңой.',
        similarToCommon: 'Бул кеңири колдонулуучу сырсөзгө окшош.',
        simpleRepeat: '"aaa" сыяктуу кайталануучу белгилерди табуу оңой.',
        straightRow: 'Клавиатурадагы түз клавиша катарларын табуу оңой.',
        topHundred: 'Бул жыш колдонулуучу сырсөз.',
        topTen: 'Бул өтө жыш колдонулуучу сырсөз.',
        userInputs: 'Жеке же бет маалыматтары болбошу керек.',
        wordByItself: 'Жеке сөздөрдү табуу оңой.',
      },
    },
  },
  userButton: {
    action__addAccount: 'Эсеп кошуу',
    action__closeUserMenu: 'Колдонуучу менюсун жабуу',
    action__manageAccount: 'Эсепти башкаруу',
    action__openUserMenu: 'Колдонуучу менюсун ачуу',
    action__signOut: 'Чыгуу',
    action__signOutAll: 'Бардык эсептерден чыгуу',
  },
  userProfile: {
    apiKeysPage: {
      title: 'API ачкычтары',
    },
    backupCodePage: {
      actionLabel__copied: 'Көчүрүлдү!',
      actionLabel__copy: 'Баарын көчүрүү',
      actionLabel__download: '.txt жүктөп алуу',
      actionLabel__print: 'Басып чыгаруу',
      infoText1: 'Бул эсеп үчүн камдык кодулар иштетилет.',
      infoText2:
        'Камдык кодуларды купуя сактап, коопсуз жерде сактаңыз. Эгер алар бузулган деп шектенсеңиз, жаңыларын жаратсаңыз болот.',
      subtitle__codelist: 'Аларды коопсуз жерде сактаңыз жана купуя кылыңыз.',
      successMessage:
        'Камдык кодулар азыр иштетилди. Эгер аутентификация түзмөгүңүзгө кирүүңүздү жоготсоңуз, бул кодулардын бирин колдонуп эсебиңизге кире аласыз. Ар бир код бир жолу гана колдонулат.',
      successSubtitle:
        'Аутентификация түзмөгүңүзгө кирүүңүздү жоготсоңуз, бул кодулардын бирин колдонуп эсебиңизге кире аласыз.',
      title: 'Камдык коду аркылуу текшерүүнү кошуу',
      title__codelist: 'Камдык кодулар',
    },
    billingPage: {
      paymentHistorySection: {
        empty: 'Төлөм тарыхы жок',
        notFound: 'Төлөм аракети табылган жок',
        tableHeader__amount: 'Суммасы',
        tableHeader__date: 'Күнү',
        tableHeader__status: 'Абал',
      },
      paymentMethodsSection: {
        actionLabel__default: 'Негизги кылуу',
        actionLabel__remove: 'Өчүрүү',
        add: 'Жаңы төлөм ыкмасын кошуу',
        addSubtitle: 'Эсебиңизге жаңы төлөм ыкмасын кошуңуз.',
        cancelButton: 'Жокко чыгаруу',
        formButtonPrimary__add: 'Төлөм ыкмасын кошуу',
        formButtonPrimary__pay: '{{amount}} төлөө',
        payWithTestCardButton: 'Тест картасы менен төлөө',
        removeMethod: {
          messageLine1: '{{identifier}} бул эсептен алынып салынат.',
          messageLine2:
            'Сиз бул төлөм булагын колдона албай каласыз жана ага байланышкан кайталануучу жазылуулар иштебей калат.',
          successMessage: '{{paymentMethod}} эсебиңизден алынып салынды.',
          title: 'Төлөм ыкмасын алып салуу',
        },
        title: 'Төлөм ыкмалары',
      },
      start: {
        headerTitle__payments: 'Төлөмдөр',
        headerTitle__plans: 'Тарифтер',
        headerTitle__statements: 'Выпискалар',
        headerTitle__subscriptions: 'Жазылуу',
      },
      statementsSection: {
        empty: 'Көрсөтүлө турган выпискалар жок',
        itemCaption__paidForPlan: '{{plan}} {{period}} тарифи үчүн төлөндү',
        itemCaption__proratedCredit:
          'Мурунку жазылуунун жарым-жартылай колдонулушу үчүн пропорционалдуу кайтаруу',
        itemCaption__payerCredit: 'Эсеп балансынан кайтаруу',
        itemCaption__subscribedAndPaidForPlan: '{{plan}} {{period}} тарифине жазылуу жана төлөм',
        notFound: 'Выпискалар табылган жок',
        tableHeader__amount: 'Суммасы',
        tableHeader__date: 'Күнү',
        title: 'Выпискалар',
        totalPaid: 'Жалпы төлөнгөн',
      },
      subscriptionsListSection: {
        actionLabel__manageSubscription: 'Башкаруу',
        actionLabel__newSubscription: 'Тарифке жазылуу',
        actionLabel__switchPlan: 'Тарифти өзгөртүү',
        tableHeader__edit: 'Түзөтүү',
        tableHeader__plan: 'Тариф',
        tableHeader__startDate: 'Башталган күн',
        title: 'Жазылуу',
      },
      subscriptionsSection: {
        actionLabel__default: 'Башкаруу',
      },
      switchPlansSection: {
        title: 'Тарифти өзгөртүү',
      },
      title: 'Эсеп-фактура',
    },
    connectedAccountPage: {
      formHint: 'Эсебиңизди байлоо үчүн провайдерди тандаңыз.',
      formHint__noAccounts: 'Колдонууга жарактуу тышкы эсеп провайдерлери жок.',
      removeResource: {
        messageLine1: '{{identifier}} бул эсептен алынып салынат.',
        messageLine2:
          'Сиз бул байланышкан эсепти колдона албай каласыз жана ага байланышкан функциялар иштебей калат.',
        successMessage: '{{connectedAccount}} эсебиңизден алынып салынды.',
        title: 'Байланышкан эсепти алып салуу',
      },
      socialButtonsBlockButton: '{{provider|titleize}}',
      successMessage: 'Провайдер эсебиңизге кошулду',
      title: 'Байланышкан эсеп кошуу',
    },
    deletePage: {
      actionDescription: 'Улантуу үчүн төмөндө "Эсепти өчүрүү" деп жазыңыз.',
      confirm: 'Эсепти өчүрүү',
      messageLine1:
        'Эсебиңизди өчүрүүнү чындап каалайсызбы? Кээ бир байланышкан маалыматтар сакталышы мүмкүн. Маалыматтарды толук өчүрүүнү сурануу үчүн колдоо кызматына кайрылыңыз.',
      messageLine2: 'Бул аракет туруктуу жана кайтарылгыс.',
      title: 'Эсепти өчүрүү',
    },
    emailAddressPage: {
      emailCode: {
        formHint: 'Бул email дарегине текшерүү коду камтылган email жиберилет.',
        formSubtitle: '{{identifier}} дарегине жиберилген текшерүү кодун киргизиңиз',
        formTitle: 'Текшерүү коду',
        resendButton: 'Код келген жокпу? Кайра жиберүү',
        successMessage: '{{identifier}} email дареги эсебиңизге кошулду.',
      },
      emailLink: {
        formHint: 'Бул email дарегине текшерүү шилтемеси камтылган email жиберилет.',
        formSubtitle: '{{identifier}} дарегине жиберилген emailдеги текшерүү шилтемесин басыңыз',
        formTitle: 'Текшерүү шилтемеси',
        resendButton: 'Шилтеме келген жокпу? Кайра жиберүү',
        successMessage: '{{identifier}} email дареги эсебиңизге кошулду.',
      },
      enterpriseSSOLink: {
        formButton: 'Кирүү үчүн басыңыз',
        formSubtitle: '{{identifier}} менен кирүүнү аяктаңыз',
      },
      formHint: 'Эсебиңизге кошулуудан мурун бул email дарегин текшерүү керек болот.',
      removeResource: {
        messageLine1: '{{identifier}} бул эсептен алынып салынат.',
        messageLine2: 'Сиз бул email дареги аркылуу кире албай каласыз.',
        successMessage: '{{emailAddress}} эсебиңизден алынып салынды.',
        title: 'Email дарегин алып салуу',
      },
      title: 'Email дарегин кошуу',
      verifyTitle: 'Email дарегин текшерүү',
    },
    formButtonPrimary__add: 'Кошуу',
    formButtonPrimary__continue: 'Улантуу',
    formButtonPrimary__finish: 'Бүтүрүү',
    formButtonPrimary__remove: 'Алып салуу',
    formButtonPrimary__save: 'Сактоо',
    formButtonReset: 'Жокко чыгаруу',
    mfaPage: {
      formHint: 'Кошуу ыкмасын тандаңыз.',
      title: 'Эки баскычтуу текшерүүнү кошуу',
    },
    mfaPhoneCodePage: {
      backButton: 'Учурдагы номерди колдонуу',
      primaryButton__addPhoneNumber: 'Телефон номерин кошуу',
      removeResource: {
        messageLine1: '{{identifier}} кирүүдө текшерүү кодторун алуудан токтойт.',
        messageLine2: 'Эсебиңиз ошончолук коопсуз болбошу мүмкүн. Улантууну чындап каалайсызбы?',
        successMessage:
          '{{mfaPhoneCode}} үчүн SMS коду аркылуу эки баскычтуу текшерүү алынып салынды',
        title: 'Эки баскычтуу текшерүүнү алып салуу',
      },
      subtitle__availablePhoneNumbers:
        'SMS коду аркылуу эки баскычтуу текшерүүгө каттоо үчүн учурдагы телефон номерин тандаңыз же жаңысын кошуңуз.',
      subtitle__unavailablePhoneNumbers:
        'SMS коду аркылуу эки баскычтуу текшерүүгө каттоо үчүн колдонууга жарактуу телефон номерлери жок, жаңысын кошуңуз.',
      successMessage1:
        'Кирүүдө кошумча кадам катары бул телефон номерине жиберилген текшерүү кодун киргизишиңиз керек болот.',
      successMessage2:
        'Бул камдык кодуларды сактап, коопсуз жерде сактаңыз. Аутентификация түзмөгүңүзгө кирүүңүздү жоготсоңуз, камдык кодуларды колдонуп кире аласыз.',
      successTitle: 'SMS коду аркылуу текшерүү иштетилди',
      title: 'SMS коду аркылуу текшерүүнү кошуу',
    },
    mfaTOTPPage: {
      authenticatorApp: {
        buttonAbleToScan__nonPrimary: 'Анын ордуна QR кодду сканерлөө',
        buttonUnableToScan__nonPrimary: 'QR кодду сканерлей албайсызбы?',
        infoText__ableToScan:
          'Аутентификатор колдонмоңузда жаңы кирүү ыкмасын орнотуп, аны эсебиңизге байлоо үчүн төмөнкү QR кодду сканерлеңиз.',
        infoText__unableToScan:
          'Аутентификаторуңузда жаңы кирүү ыкмасын орнотуп, төмөндөгү Ачкычты киргизиңиз.',
        inputLabel__unableToScan1:
          'Убакытка негизделген же бир жолку сырсөздөр иштетилгенин текшерип, андан кийин эсебиңизди байлоону бүтүрүңүз.',
        inputLabel__unableToScan2:
          "Же болбосо, аутентификаторуңуз TOTP URI'ларды колдосо, толук URI'ны да көчүрсөңүз болот.",
      },
      removeResource: {
        messageLine1: 'Бул аутентификатордон текшерүү кодтору кирүүдө талап кылынбай калат.',
        messageLine2: 'Эсебиңиз ошончолук коопсуз болбошу мүмкүн. Улантууну чындап каалайсызбы?',
        successMessage: 'Аутентификатор колдонмосу аркылуу эки баскычтуу текшерүү алынып салынды.',
        title: 'Эки баскычтуу текшерүүнү алып салуу',
      },
      successMessage:
        'Эки баскычтуу текшерүү азыр иштетилди. Кирүүдө кошумча кадам катары бул аутентификатордон текшерүү кодун киргизишиңиз керек болот.',
      title: 'Аутентификатор колдонмосун кошуу',
      verifySubtitle: 'Аутентификаторуңуз тарабынан жаратылган текшерүү кодун киргизиңиз',
      verifyTitle: 'Текшерүү коду',
    },
    mobileButton__menu: 'Меню',
    navbar: {
      account: 'Профиль',
      apiKeys: 'API ачкычтары',
      billing: 'Эсеп-фактура',
      description: 'Эсебиңиздин маалыматтарын башкаруу.',
      security: 'Коопсуздук',
      title: 'Эсеп',
    },
    passkeyScreen: {
      removeResource: {
        messageLine1: '{{name}} бул эсептен алынып салынат.',
        title: 'Өткөрмө ачкычты алып салуу',
      },
      subtitle__rename: 'Өткөрмө ачкычты тезирээк табуу үчүн анын атын өзгөртсөңүз болот.',
      title__rename: 'Өткөрмө ачкычтын атын өзгөртүү',
    },
    passwordPage: {
      checkboxInfoText__signOutOfOtherSessions:
        'Эски сырсөзүңүздү колдонгон болушу мүмкүн болгон бардык башка түзмөктөрдөн чыгуу сунушталат.',
      readonly:
        'Сырсөзүңүздү учурда өзгөртүүгө болбойт, анткени сиз корпоративдик байланыш аркылуу гана кире аласыз.',
      successMessage__set: 'Сырсөзүңүз орнотулду.',
      successMessage__signOutOfOtherSessions: 'Бардык башка түзмөктөрдөн чыгылды.',
      successMessage__update: 'Сырсөзүңүз жаңыртылды.',
      title__set: 'Сырсөз орнотуу',
      title__update: 'Сырсөздү жаңыртуу',
    },
    phoneNumberPage: {
      infoText:
        'Бул телефон номерине текшерүү коду камтылган SMS жиберилет. Кабар жана маалымат тарифтери колдонулушу мүмкүн.',
      removeResource: {
        messageLine1: '{{identifier}} бул эсептен алынып салынат.',
        messageLine2: 'Сиз бул телефон номери аркылуу кире албай каласыз.',
        successMessage: '{{phoneNumber}} эсебиңизден алынып салынды.',
        title: 'Телефон номерин алып салуу',
      },
      successMessage: '{{identifier}} эсебиңизге кошулду.',
      title: 'Телефон номерин кошуу',
      verifySubtitle: '{{identifier}} дарегине жиберилген текшерүү кодун киргизиңиз',
      verifyTitle: 'Телефон номерин текшерүү',
    },
    plansPage: {
      title: 'Тарифтер',
    },
    profilePage: {
      fileDropAreaHint: 'Сунушталган өлчөм 1:1, 10МБга чейин.',
      imageFormDestructiveActionSubtitle: 'Алып салуу',
      imageFormSubtitle: 'Жүктөө',
      imageFormTitle: 'Профиль сүрөтү',
      readonly:
        'Профиль маалыматыңыз корпоративдик байланыш тарабынан берилген жана өзгөртүүгө болбойт.',
      successMessage: 'Профилиңиз жаңыртылды.',
      title: 'Профилди жаңыртуу',
    },
    start: {
      activeDevicesSection: {
        destructiveAction: 'Түзмөктөн чыгуу',
        title: 'Активдүү түзмөктөр',
      },
      connectedAccountsSection: {
        actionLabel__connectionFailed: 'Кайра байлоо',
        actionLabel__reauthorize: 'Азыр уруксат берүү',
        destructiveActionTitle: 'Алып салуу',
        primaryButton: 'Эсеп байлоо',
        subtitle__disconnected: 'Бул эсеп ажыратылган.',
        subtitle__reauthorize:
          'Талап кылынуучу уруксаттар жаңыртылды жана чектелген функционалдуулукту сезишиңиз мүмкүн. Кандайдыр бир маселеден качуу үчүн бул колдонмону кайра ырастаңыз',
        title: 'Байланышкан эсептер',
      },
      dangerSection: {
        deleteAccountButton: 'Эсепти өчүрүү',
        title: 'Эсепти өчүрүү',
      },
      emailAddressesSection: {
        destructiveAction: 'Emailди алып салуу',
        detailsAction__nonPrimary: 'Негизги кылуу',
        detailsAction__primary: 'Текшерүүнү аяктоо',
        detailsAction__unverified: 'Текшерүү',
        primaryButton: 'Email дарегин кошуу',
        title: 'Email дарегтер',
      },
      enterpriseAccountsSection: {
        primaryButton: 'Эсеп байлоо',
        title: 'Корпоративдик эсептер',
      },
      headerTitle__account: 'Профиль маалыматтары',
      headerTitle__security: 'Коопсуздук',
      mfaSection: {
        backupCodes: {
          actionLabel__regenerate: 'Кайра жаратуу',
          headerTitle: 'Камдык кодулар',
          subtitle__regenerate:
            'Жаңы коопсуз камдык кодулар алуу. Мурунку камдык кодулар өчүрүлүп, колдонуу мүмкүн болбойт.',
          title__regenerate: 'Камдык кодуларды кайра жаратуу',
        },
        phoneCode: {
          actionLabel__setDefault: 'Негизги кылуу',
          destructiveActionLabel: 'Алып салуу',
        },
        primaryButton: 'Эки баскычтуу текшерүүнү кошуу',
        title: 'Эки баскычтуу текшерүү',
        totp: {
          destructiveActionTitle: 'Алып салуу',
          headerTitle: 'Аутентификатор колдонмосу',
        },
      },
      passkeysSection: {
        menuAction__destructive: 'Алып салуу',
        menuAction__rename: 'Атын өзгөртүү',
        primaryButton: 'Өткөрмө ачкыч кошуу',
        title: 'Өткөрмө ачкычтар',
      },
      passwordSection: {
        primaryButton__setPassword: 'Сырсөз орнотуу',
        primaryButton__updatePassword: 'Сырсөздү жаңыртуу',
        title: 'Сырсөз',
      },
      phoneNumbersSection: {
        destructiveAction: 'Телефон номерин алып салуу',
        detailsAction__nonPrimary: 'Негизги кылуу',
        detailsAction__primary: 'Текшерүүнү аяктоо',
        detailsAction__unverified: 'Телефон номерин текшерүү',
        primaryButton: 'Телефон номерин кошуу',
        title: 'Телефон номерлери',
      },
      profileSection: {
        primaryButton: 'Профилди жаңыртуу',
        title: 'Профиль',
      },
      usernameSection: {
        primaryButton__setUsername: 'Колдонуучу атын орнотуу',
        primaryButton__updateUsername: 'Колдонуучу атын жаңыртуу',
        title: 'Колдонуучу аты',
      },
      web3WalletsSection: {
        destructiveAction: 'Капчыкты алып салуу',
        detailsAction__nonPrimary: 'Негизги кылуу',
        primaryButton: 'Капчык байлоо',
        title: 'Web3 капчыктары',
        web3SelectSolanaWalletScreen: {
          subtitle: 'Эсебиңизге байлоо үчүн Solana капчыгын тандаңыз.',
          title: 'Solana капчыгын кошуу',
        },
      },
    },
    usernamePage: {
      successMessage: 'Колдонуучу атыңыз жаңыртылды.',
      title__set: 'Колдонуучу атын орнотуу',
      title__update: 'Колдонуучу атын жаңыртуу',
    },
    web3WalletPage: {
      removeResource: {
        messageLine1: '{{identifier}} бул эсептен алынып салынат.',
        messageLine2: 'Сиз бул web3 капчыгы аркылуу кире албай каласыз.',
        successMessage: '{{web3Wallet}} эсебиңизден алынып салынды.',
        title: 'Web3 капчыгын алып салуу',
      },
      subtitle__availableWallets: 'Эсебиңизге байлоо үчүн web3 капчыгын тандаңыз.',
      subtitle__unavailableWallets: 'Колдонууга жарактуу web3 капчыктары жок.',
      successMessage: 'Капчык эсебиңизге кошулду.',
      title: 'Web3 капчыгын кошуу',
      web3WalletButtonsBlockButton: '{{provider|titleize}}',
    },
  },
  waitlist: {
    start: {
      actionLink: 'Кирүү',
      actionText: 'Мурунтан кирүүгө мүмкүнчүлүк барбы?',
      formButton: 'Күтүү тизмесине кошулуу',
      subtitle: 'Email дарегиңизди киргизиңиз, орун даяр болгондо сизге кабарлайбыз',
      title: 'Күтүү тизмесине кошулуу',
    },
    success: {
      message: 'Жакында багытталасыз...',
      subtitle: 'Орун даяр болгондо байланышабыз',
      title: 'Күтүү тизмесине кошулганыңыз үчүн рахмат!',
    },
  },
  web3SolanaWalletButtons: {
    connect: '{{walletName}} менен байлоо',
    continue: '{{walletName}} менен улантуу',
    noneAvailable:
      'Solana Web3 капчыктары табылган жок. Web3 колдоочу {{ solanaWalletsLink || link("wallet extension") }} орнотуңуз.',
  },
} as LocalizationResource;
