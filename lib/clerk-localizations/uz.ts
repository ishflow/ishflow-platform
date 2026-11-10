import type { LocalizationResource } from '@clerk/types';

// Auto-generated Clerk localization (uz). Base = enUS structure with translated leaves;
// untranslated keys fall back to the English source. Regenerate via /tmp/i18n/merge-clerk.js.
export const uzUZ: LocalizationResource = {
  locale: 'uz-UZ',
  apiKeys: {
    action__add: "Yangi kalit qo'shish",
    action__search: 'Kalitlarni qidirish',
    copySecret: {
      formButtonPrimary__copyAndClose: 'Nusxa olish va yopish',
      formHint: "Xavfsizlik maqsadida uni keyinchalik ko'rish imkoni bo'lmaydi.",
      formTitle: '"{{name}}" API kalitingizni hozir nusxalab oling',
    },
    createdAndExpirationStatus__expiresOn:
      "Yaratilgan {{ createdDate | shortDate('en-US') }} • Muddati tugaydi {{ expiresDate | longDate('en-US') }}",
    createdAndExpirationStatus__never:
      "Yaratilgan {{ createdDate | shortDate('en-US') }} • Muddati tugamaydi",
    detailsTitle__emptyRow: 'API kalitlari topilmadi',
    formButtonPrimary__add: 'Kalit yaratish',
    formFieldCaption__expiration__expiresOn: 'Muddati tugaydi {{ date }}',
    formFieldCaption__expiration__never: 'Bu kalit hech qachon tugamaydi',
    formFieldOption__expiration__180d: '180 kun',
    formFieldOption__expiration__1d: '1 kun',
    formFieldOption__expiration__1y: '1 yil',
    formFieldOption__expiration__30d: '30 kun',
    formFieldOption__expiration__60d: '60 kun',
    formFieldOption__expiration__7d: '7 kun',
    formFieldOption__expiration__90d: '90 kun',
    formFieldOption__expiration__never: 'Hech qachon',
    formHint:
      'Yangi kalit yaratish uchun nom kiriting. Uni istalgan vaqt bekor qilishingiz mumkin.',
    formTitle: "Yangi API kaliti qo'shish",
    lastUsed__days: '{{days}} kun oldin',
    lastUsed__hours: '{{hours}} soat oldin',
    lastUsed__minutes: '{{minutes}} daqiqa oldin',
    lastUsed__months: '{{months}} oy oldin',
    lastUsed__seconds: '{{seconds}} soniya oldin',
    lastUsed__years: '{{years}} yil oldin',
    menuAction__revoke: 'Kalitni bekor qilish',
    revokeConfirmation: {
      confirmationText: 'Bekor qilish',
      inputLabel: 'Tasdiqlash uchun "Bekor qilish" deb yozing',
      formButtonPrimary__revoke: 'Kalitni bekor qilish',
      formHint: "Bu maxfiy kalitni o'chirishni xohlaysizmi?",
      formTitle: '"{{apiKeyName}}" maxfiy kalitini bekor qilish?',
    },
    tableHeader__name: 'Nomi',
    tableHeader__lastUsed: 'Oxirgi foydalanish',
    tableHeader__actions: 'Amallar',
  },
  backButton: 'Orqaga',
  badge__activePlan: 'Faol',
  badge__canceledEndsAt: "Bekor qilingan • Tugaydi {{ date | shortDate('en-US') }}",
  badge__currentPlan: 'Joriy tarif',
  badge__default: 'Standart',
  badge__endsAt: "Tugaydi {{ date | shortDate('en-US') }}",
  badge__expired: "Muddati o'tgan",
  badge__freeTrial: 'Bepul sinov',
  badge__otherImpersonatorDevice: 'Boshqa taqlid qurilmasi',
  badge__pastDueAt: "Muddati o'tgan {{ date | shortDate('en-US') }}",
  badge__pastDuePlan: "Muddati o'tgan",
  badge__primary: 'Asosiy',
  badge__renewsAt: "Yangilanadi {{ date | shortDate('en-US') }}",
  badge__requiresAction: 'Harakat talab qilinadi',
  badge__startsAt: "Boshlanadi {{ date | shortDate('en-US') }}",
  badge__thisDevice: 'Bu qurilma',
  badge__trialEndsAt: "Sinov tugaydi {{ date | shortDate('en-US') }}",
  badge__unverified: 'Tasdiqlanmagan',
  badge__upcomingPlan: 'Kelayotgan',
  badge__userDevice: 'Foydalanuvchi qurilmasi',
  badge__you: 'Siz',
  badge__banned: 'Bloklangan',
  billing: {
    addPaymentMethod__label: "To'lov usuli qo'shish",
    alwaysFree: 'Har doim bepul',
    annually: 'Yillik',
    availableFeatures: 'Mavjud imkoniyatlar',
    billedAnnually: 'Yillik hisob-kitob',
    billedMonthlyOnly: 'Faqat oylik hisob-kitob',
    billedAnnuallyOnly: 'Faqat yillik hisob-kitob',
    cancelFreeTrial: 'Bepul sinovni bekor qilish',
    cancelFreeTrialAccessUntil:
      "Sinovingiz {{ date | longDate('en-US') }} gacha faol qoladi. Undan keyin sinov imkoniyatlaridan foydalana olmaysiz. To'lov olinmaydi.",
    cancelFreeTrialTitle: '{{plan}} tarifi uchun bepul sinovni bekor qilishni xohlaysizmi?',
    cancelSubscription: 'Obunani bekor qilish',
    cancelSubscriptionAccessUntil:
      "{{ date | longDate('en-US') }} sanasigacha '{{plan}}' imkoniyatlaridan foydalanishingiz mumkin, undan keyin kirish huquqingiz yo'qoladi.",
    cancelSubscriptionNoCharge: "Bu obuna uchun to'lov olinmaydi.",
    cancelSubscriptionPastDue:
      "Obunangiz darhol tugaydi va barcha tarif imkoniyatlaridan foydalana olmaysiz. Keyingi obunada muddati o'tgan to'lovni to'lashingiz so'raladi.",
    cancelSubscriptionTitle: '{{plan}} obunasini bekor qilishni xohlaysizmi?',
    cannotSubscribeMonthly:
      "Bu tarifga oylik to'lov orqali obuna bo'la olmaysiz. Unga obuna bo'lish uchun yillik to'lovni tanlashingiz kerak.",
    cannotSubscribeUnrecoverable:
      "Bu tarifga obuna bo'la olmaysiz. Mavjud obunangiz bu tarifdan qimmatroq.",
    checkout: {
      description__paymentSuccessful: "To'lovingiz muvaffaqiyatli amalga oshirildi.",
      description__subscriptionSuccessful: 'Yangi obunangiz tayyor.',
      downgradeNotice:
        "Joriy obunangiz va uning imkoniyatlarini hisob-kitob davri tugaguncha saqlab qolasiz, so'ngra ushbu obunaga o'tiladi.",
      emailForm: {
        subtitle:
          "Xarid yakunlashdan oldin kvitansiyalar yuborilishi uchun email manzil qo'shishingiz kerak.",
        title: "Email manzil qo'shish",
      },
      lineItems: {
        title__freeTrialEndsAt: 'Sinov tugash sanasi',
        title__paymentMethod: "To'lov usuli",
        title__statementId: 'Hisobot ID',
        title__subscriptionBegins: 'Obuna boshlanishi',
        title__totalPaid: "Jami to'langan",
      },
      pastDueNotice: "Avvalgi obunangiz to'lovsiz muddati o'tgan edi.",
      perMonth: 'oyiga',
      title: "To'lov",
      title__paymentSuccessful: "To'lov muvaffaqiyatli!",
      title__subscriptionSuccessful: 'Muvaffaqiyat!',
      title__trialSuccess: 'Sinov muvaffaqiyatli boshlandi!',
      totalDueAfterTrial: "Sinov {{days}} kundan keyin tugagach to'lanishi kerak bo'lgan jami",
    },
    credit: 'Kredit',
    prorationCredit: 'Proporsional kredit',
    accountCredit: 'Hisob krediti',
    creditRemainder: 'Joriy obunaning qolgan qismi uchun kredit.',
    payerCreditRemainder: 'Hisob balansidagi kredit.',
    defaultFreePlanActive: 'Hozirda Bepul tarifdasiz',
    free: 'Bepul',
    getStarted: 'Boshlash',
    keepFreeTrial: 'Bepul sinovni davom ettirish',
    keepSubscription: 'Obunani saqlab qolish',
    manage: 'Boshqarish',
    manageSubscription: 'Obunani boshqarish',
    month: 'Oy',
    monthAbbreviation: 'oy',
    monthPerUnit: 'Har {{unitName}} uchun oylik',
    monthly: 'Oylik',
    pastDue: "Muddati o'tgan",
    pay: "{{amount}} to'lash",
    paymentMethod: {
      applePayDescription: {
        annual: "Yillik to'lov",
        monthly: "Oylik to'lov",
      },
      dev: {
        anyNumbers: 'Istalgan raqamlar',
        cardNumber: 'Karta raqami',
        cvcZip: 'CVC, ZIP',
        developmentMode: 'Ishlab chiqish rejimi',
        expirationDate: 'Amal qilish muddati',
        testCardInfo: "Test karta ma'lumotlari",
      },
    },
    paymentMethods__label: "To'lov usullari",
    highlightedPlanBadge: 'Mashhur',
    pricingTable: {
      billingCycle: 'Hisob-kitob davri',
      included: 'Kiritilgan',
      seatCost: {
        freeUpToSeats: "{{endsAfterBlock}} o'ringacha bepul",
        upToSeats: "{{endsAfterBlock}} o'ringacha",
        perSeat: "Har o'rin uchun {{feePerBlockAmount}}/{{periodAbbreviation}}",
        includedSeats: "{{includedSeats}} ta o'rin kiritilgan",
        additionalSeats:
          "(qo'shimcha uchun {{additionalTierFeePerBlockAmount}}/{{periodAbbreviation}})",
        unlimitedSeats: "Cheksiz o'rinlar",
        tooltip: {
          freeForUpToSeats: "{{endsAfterBlock}} ta o'ringacha bepul.",
          additionalSeatsEach: "Qo'shimcha o'rinlar har biri {{feePerBlockAmount}}/{{period}}.",
          firstSeatsIncludedInPlan: "Birinchi {{endsAfterBlock}} ta o'rin tarifga kiritilgan.",
        },
      },
    },
    reSubscribe: "Qayta obuna bo'lish",
    seats: "O'rinlar",
    seeAllFeatures: "Barcha imkoniyatlarni ko'rish",
    startFreeTrial: 'Bepul sinovni boshlash',
    startFreeTrial__days: '{{days}} kunlik bepul sinovni boshlash',
    subscribe: "Obuna bo'lish",
    subscriptionDetails: {
      beginsOn: 'Boshlanadi',
      currentBillingCycle: 'Joriy hisob-kitob davri',
      endsOn: 'Tugaydi',
      firstPaymentAmount: "Birinchi to'lov summasi",
      firstPaymentOn: "Birinchi to'lov sanasi",
      nextPaymentAmount: "Keyingi to'lov summasi",
      nextPaymentOn: "Keyingi to'lov sanasi",
      pastDueAt: "Muddati o'tgan sana",
      renewsAt: 'Yangilanadi',
      subscribedOn: "Obuna bo'lgan sana",
      title: 'Obuna',
      trialEndsOn: 'Sinov tugash sanasi',
      trialStartedOn: 'Sinov boshlangan sana',
    },
    subtotal: 'Oraliq jami',
    switchPlan: "Ushbu tarifga o'tish",
    switchToAnnual: "Yillikka o'tish",
    switchToAnnualWithAnnualPrice: "Yillik {{currency}}{{price}} / yil tarifiga o'tish",
    switchToMonthly: "Oylikka o'tish",
    switchToMonthlyWithPrice: "Oylik {{currency}}{{price}} / oy tarifiga o'tish",
    totalDue: "Jami to'lanadigan",
    totalDueToday: "Bugun to'lanadigan jami",
    viewFeatures: "Imkoniyatlarni ko'rish",
    viewPayment: "To'lovni ko'rish",
    year: 'Yil',
    yearAbbreviation: 'yil',
    yearPerUnit: 'Har {{unitName}} uchun yillik',
  },
  configureSSO: {
    confirmation: {
      configurationSection: {
        certificateLabel: 'Sertifikat',
        configureAgainLink: 'Qayta sozlash',
        issuerLabel: 'Chiqaruvchi',
        ssoUrlLabel: 'Kirish URL manzili',
        title: 'Konfiguratsiya tafsilotlari',
      },
      domainSection: {
        title: 'Domen',
      },
      enableSection: {
        title: 'SSO ni yoqish',
      },
      resetSection: {
        confirmationFieldLabel: 'Tasdiqlash uchun "{{name}}" deb yozing',
        submitButton: 'Ulanishni tiklash',
        title: 'Ulanishni tiklash',
        warning:
          "Bu SSO konfiguratsiyasini butunlay o'chiradi. A'zolar endi SSO orqali kira olmaydi.",
      },
      statusSection: {
        activeBadge: 'Faol',
        inactiveBadge: 'Faol emas',
        title: 'SSO holati',
      },
    },
    missingManageEnterpriseConnectionsPermission: {
      subtitle:
        'Korporativ ulanishlarni boshqarish uchun ruxsat olish maqsadida tashkilot administratoriga murojaat qiling.',
      title: "Korporativ ulanishlarni boshqarish uchun ruxsatingiz yo'q",
    },
    navbar: {
      title: 'Yagona kirish tizimini sozlash (SSO)',
    },
    selectProviderStep: {
      title: "Ta'minotchini tanlash",
      subtitle: "SSO uchun sozlamoqchi bo'lgan ta'minotchini tanlang.",
      body: {
        title: "Identifikatsiya ta'minotchingizni tanlang",
        description: "Keyingi bosqichda batafsil sozlash jarayonini ko'rsatamiz.",
      },
      saml: {
        groupLabel: 'SAML',
        okta: 'Okta Workforce',
        customSaml: "Maxsus SAML ta'minotchisi",
      },
      warning: "Ta'minotchi tanlanganidan so'ng, konfiguratsiya tugaguncha uni o'zgartira olmaysiz",
    },
    verifyEmailDomainStep: {
      title: 'Email manzilini tasdiqlash',
      subtitle: "Korporativ ulanishni yoqmoqchi bo'lgan email manzilingizni tasdiqlang.",
      addEmailAddress: {
        formTitle: 'Email manzilingiz kerak',
        formSubtitle: 'Boshlash uchun email manzilingiz kerak',
        inputPlaceholder: 'ism@kompaniya.com',
        inputLabel: 'Email manzili',
      },
      emailCode: {
        formTitle: 'Email manzilingizni tasdiqlang',
        formSubtitle: '{{identifier}} manziliga yuborilgan tasdiqlash kodini kiriting',
        resendButton: 'Kod kelmadimi? Qayta yuborish',
        verified: {
          title: 'Email manzilingiz qabul qilindi',
          subtitle: 'Quyidagi email manzilini tasdiqladingiz',
          inputLabel: 'Tasdiqlangan email manzili',
        },
      },
      domainTaken: {
        title: 'Bu domen ({{domain}}) allaqachon SSO ulanishiga ega',
        subtitle: 'Mavjud ulanish orqali kirish uchun ilova administratoriga murojaat qiling.',
      },
    },
    testConfigurationStep: {
      title: "SSO ulanishingizni sinovdan o'tkazing",
      subtitle:
        "Ulanishni to'g'ri sozlaganingizni tekshirish uchun sinov SSO URL manzili orqali autentifikatsiya qiling.",
      error__noSuccessfulTestRun:
        'Davom etishdan oldin kamida bitta muvaffaqiyatli sinov talab qilinadi. Sinov SSO URL manzilini yarating va kirish jarayonini yakunlang.',
      testUrl: {
        title: "SSO URL manzilingizni sinab ko'ring",
        subtitle: 'Autentifikatsiya uchun sinov SSO URL manzilini yarating va nusxalang.',
        actionLabel__copy: 'Sinov URL manzilini nusxalash',
      },
      testResults: {
        title: 'Sinov natijalari',
        actionLabel__refresh: 'Jurnallarni yangilash',
        polling: 'Sinov tugashini kutish…',
        status__success: 'Muvaffaqiyatli',
        status__failed: 'Muvaffaqiyatsiz',
        status__pending: 'Kutilmoqda',
      },
      testRunDetails: {
        title: 'Sinov ishga tushirilishi',
        runDetails: {
          sectionTitle: 'Ishga tushirish tafsilotlari',
          timestamp: 'Vaqt belgisi',
          status: 'Holat',
          errorCode: 'Xato kodi',
          fullMessage: "To'liq xabar",
          actionLabel__copy: 'Xabarni nusxalash',
          actionLabel__copied: 'Nusxalandi',
        },
        parsedUserInfo: {
          sectionTitle: "Tahlil qilingan foydalanuvchi ma'lumotlari",
          email: 'Email',
          firstName: 'Ism',
        },
        howToFix: {
          sectionTitle: 'Qanday tuzatish kerak',
          actionLabel__viewDocumentation: "Hujjatlarni ko'rish",
          saml_user_attribute_missing: {
            intro: 'Bu xatoni tuzatish uchun quyidagi qadamlarni bajaring:',
            step1: "Identifikatsiya ta'minotchingizning konfiguratsiya boshqaruv paneliga kiring.",
            step2: "Ilovangizning SAML sozlamalari yoki atribut moslash konfiguratsiyasiga o'ting.",
            step3:
              "'mail' atributi foydalanuvchining email manzili maydoniga to'g'ri moslashtirilganligini tekshiring.",
          },
          saml_response_relaystate_missing: {
            description:
              "Identifikatsiya ta'minotchingiz asl so'rovda yuborilgan RelayState parametrini to'g'ri qaytarayotganini tekshiring.",
          },
          saml_email_address_domain_mismatch: {
            description:
              "Foydalanuvchi ushbu ulanish uchun ruxsat etilgan domenlardan biriga mos email manzil bilan kirayotganini tekshiring. Qo'shimcha domenlar qo'shish kerak bo'lsa, ulanish sozlamalaridagi ruxsat etilgan domenlarni yangilang.",
          },
          oauth_access_denied: {
            description:
              "Bu xato foydalanuvchi OAuth ta'minotchisining avtorizatsiya ekranida Bekor qilish yoki Rad etish tugmasini bosganda yoki ta'minotchi avtorizatsiya so'rovini rad etganda yuz beradi. OAuth ilova ma'lumotlarini (Client ID va Client Secret) to'g'ri sozlanganligini tekshiring.",
          },
          oauth_token_exchange_error: {
            description:
              "OAuth ilovangizning Client ID va Client Secret ma'lumotlari to'g'ri sozlanganligini va OAuth ta'minotchisi boshqaruv panelidagi hisob ma'lumotlariga mos kelishini tekshiring.",
          },
          oauth_fetch_user_error: {
            intro: 'Bu xatoni tuzatish uchun quyidagi qadamlarni bajaring:',
            step1:
              "Ulanish sozlamalaridagi OAuth ko'lamlari foydalanuvchi profil ma'lumotlarini o'qish uchun zarur ruxsatlarni o'z ichiga olishini tekshiring.",
            step2:
              "Foydalanuvchi ma'lumotlari endpoint URL manzili to'g'ri sozlanganligini tekshiring.",
          },
        },
      },
    },
    configureStep: {
      spFields: {
        acsUrl: {
          label: 'Yagona kirish URL manzili',
        },
        spEntityId: {
          label: 'Auditoriya URI',
        },
      },
      attributeMapping: {
        title: "SAML javoblaringizda quyidagi aniq atributlar bo'lishi kutiladi:",
        paragraph:
          "Bular standart sozlamalar bo'lib, o'zgartirishingiz shart emas. Ammo ko'p SAML konfiguratsiya xatolari noto'g'ri atribut moslashtirishidan kelib chiqadi, shuning uchun tekshirib ko'ring. Bu yerda qanday qilish kerak:",
        columns: {
          attribute: 'Atribut',
          claimName: 'Talab nomi',
          claimValue: 'Talab qiymati',
        },
        badges: {
          required: 'Majburiy',
          optional: 'Ixtiyoriy',
        },
        rows: {
          email: {
            attribute: 'Email manzili',
            claim: 'mail',
          },
          firstName: {
            attribute: 'Ism',
            claim: 'firstName',
          },
          lastName: {
            attribute: 'Familiya',
            claim: 'lastName',
          },
        },
      },
      samlOkta: {
        headerTitle: 'Okta Workforce ni sozlash',
        createApp: {
          headerSubtitle: 'Okta boshqaruv panelingizda yangi korporativ ilova yarating',
          title: "Okta'da yangi korporativ ilova yarating",
          step1: "Okta'ga kiring va <bold>Admin → Ilovalar</bold> bo'limiga o'ting.",
          step2: '<bold>Ilova integratsiyasini yaratish</bold> tugmasini bosing.',
          step3: '<bold>SAML 2.0</bold> ni tanlang.',
          step4: "Umumiy sozlamalarni to'ldiring (Ilova nomi majburiy).",
          step5: 'Ilovani yaratishni yakunlash uchun <bold>Keyingi</bold> tugmasini bosing.',
        },
        serviceProvider: {
          title: "Xizmat ta'minotchisini sozlash",
          paragraph1:
            "Umumiy sozlamalar ko'rsatmalaridan o'tganingizdan so'ng, SAML sozlash sahifasi ko'rsatiladi.",
          paragraph2:
            "Xizmat ta'minotchingizni (Clerk) sozlash uchun Okta ilovangizga ushbu ikkita maydonni qo'shishingiz kerak:",
        },
        completeSamlIntegration: {
          title: 'SAML integratsiyasini yakunlash',
          step1: 'Imkoniyatlar menyusidan <bold>Bu biz yaratgan ichki ilova</bold> ni tanlang.',
          step2: "Formani izohlar bilan to'ldiring va <bold>Tugatish</bold> ni tanlang.",
        },
        configureAttributes: {
          headerSubtitle: "Okta'dagi foydalanuvchi atributlarini Clerk bilan moslashtiring",
          step1: "Okta boshqaruv panelida <bold>Atribut bayonotlari</bold> bo'limini toping.",
          step2:
            "Har bir atribut uchun <bold>Ifoda qo'shish</bold> ni tanlang va quyidagi nom va ifoda juftlarini kiriting:",
          pairs: {
            conjunction: ' va ',
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
          headerSubtitle: 'Korporativ ilovaga foydalanuvchilar tayinlash',
          title: "Okta'da tanlangan foydalanuvchi yoki guruhni tayinlash",
          paragraph:
            'Foydalanuvchilar yoki guruhlar ilova orqali kira olishidan oldin ularni korporativ ilovangizga tayinlashingiz kerak.',
          step1: "Okta boshqaruv panelida <bold>Tayinlamalar</bold> yorlig'ini tanlang.",
          step2:
            '<bold>Tayinlash</bold> ochiladigan menyusini tanlang. <bold>Odamlarga tayinlash</bold> yoki <bold>Guruhlarga tayinlash</bold> ni tanlashingiz mumkin.',
          step3:
            "Qidiruv maydoniga ilovaga tayinlamoqchi bo'lgan foydalanuvchi yoki guruh nomini kiriting.",
          step4:
            "Tayinlamoqchi bo'lgan foydalanuvchi yoki guruh yonidagi <bold>Tayinlash</bold> tugmasini bosing.",
          step5: 'Tayinlashni yakunlash uchun <bold>Bajarildi</bold> tugmasini bosing.',
        },
        metadataUrl: {
          headerSubtitle: "Identifikatsiya ta'minotchisi metadata'sini sozlash",
          label: 'Metadata URL manzili',
          placeholder: 'URL manzilni bu yerga joylashtiring...',
          description:
            "Okta SAML ilovangizda Sign On yorlig'iga o'ting va metadata URL manzilini oling. Uni quyiga joylashtiring.",
        },
        modes: {
          ariaLabel: 'Konfiguratsiya rejimi',
          metadataUrl: "Metadata orqali qo'shish",
          manual: "Qo'lda sozlash",
        },
        submitSamlConfig: {
          title: "Okta SAML ilova tafsilotlarini to'ldiring",
        },
        manual: {
          description:
            "Okta SAML ilovangizda Sign On yorlig'iga o'ting va ushbu qiymatlarni oling.",
          signOnUrl: {
            label: 'Kirish URL manzili',
            placeholder: 'URL manzilni bu yerga joylashtiring...',
          },
          issuer: {
            label: 'Chiqaruvchi',
            placeholder: 'URL manzilni bu yerga joylashtiring...',
          },
          signingCertificate: {
            label: 'Imzolash sertifikati',
            uploadFile: 'Fayl yuklash',
            replaceFile: 'Faylni almashtirish',
            removeFile: "Faylni o'chirish",
            fileUploaded: 'Fayl yuklandi',
          },
        },
      },
      samlCustom: {
        headerTitle: "Identifikatsiya ta'minotchingizni (IdP) sozlash",
        createApp: {
          headerSubtitle:
            "Clerk ni IdP'da xizmat ta'minotchisi sifatida ro'yxatdan o'tkazing, so'ngra identifikatsiya ta'minotchisi konfiguratsiyasini qo'shing.",
          title: "Identifikatsiya ta'minotchingizda SAML ilovasi yarating",
          subtitle:
            "Identifikatsiya ta'minotchingizning admin boshqaruv panelida yangi SAML 2.0 ilovasi yarating va quyidagi xizmat ta'minotchisi tafsilotlarini ishlating:",
        },
        configureAttributes: {
          headerSubtitle:
            "Identifikatsiya ta'minotchingizdan Clerk'ga foydalanuvchi atributlarini moslashtiring.",
          title: "SAML javoblaringizda quyidagi aniq atributlar bo'lishi kutiladi:",
        },
        assignUsers: {
          headerSubtitle: 'Korporativ ilovaga foydalanuvchilar tayinlash',
          title: 'Tanlangan foydalanuvchi yoki guruhni tayinlash',
          paragraph:
            'Foydalanuvchilar yoki guruhlar ilova orqali kira olishidan oldin ularni korporativ ilovangizga tayinlashingiz kerak.',
        },
        metadataUrl: {
          headerSubtitle: "Identifikatsiya ta'minotchisi metadata'sini sozlash",
          label: 'Metadata URL manzili',
          placeholder: 'URL manzilni bu yerga joylashtiring...',
          description:
            'Korporativ ilovangizda metadata URL manzilini oling. Uni quyiga joylashtiring.',
        },
        modes: {
          ariaLabel: 'Konfiguratsiya rejimi',
          metadataUrl: "Metadata orqali qo'shish",
          manual: "Qo'lda sozlash",
        },
        submitSamlConfig: {
          title: "SAML ilova tafsilotlarini to'ldiring",
        },
        manual: {
          description: 'SAML ilovangizda ushbu qiymatlarni oling.',
          signOnUrl: {
            label: 'Kirish URL manzili',
            placeholder: 'URL manzilni bu yerga joylashtiring...',
          },
          issuer: {
            label: 'Chiqaruvchi',
            placeholder: 'URL manzilni bu yerga joylashtiring...',
          },
          signingCertificate: {
            label: 'Imzolash sertifikati',
            uploadFile: 'Fayl yuklash',
            replaceFile: 'Faylni almashtirish',
            removeFile: "Faylni o'chirish",
            fileUploaded: 'Fayl yuklandi',
          },
        },
      },
    },
  },
  createOrganization: {
    formButtonSubmit: 'Tashkilot yaratish',
    invitePage: {
      formButtonReset: "O'tkazib yuborish",
    },
    title: 'Tashkilot yaratish',
  },
  dates: {
    lastDay: "Kecha {{ date | timeString('en-US') }} da",
    next6Days: "{{ date | weekday('en-US','long') }} {{ date | timeString('en-US') }} da",
    nextDay: "Ertaga {{ date | timeString('en-US') }} da",
    numeric: "{{ date | numeric('en-US') }}",
    previous6Days:
      "O'tgan {{ date | weekday('en-US','long') }} {{ date | timeString('en-US') }} da",
    sameDay: "Bugun {{ date | timeString('en-US') }} da",
  },
  dividerText: 'yoki',
  footerActionLink__alternativePhoneCodeProvider: 'Kodni SMS orqali yuborish',
  footerActionLink__useAnotherMethod: 'Boshqa usuldan foydalanish',
  footerPageLink__help: 'Yordam',
  footerPageLink__privacy: 'Maxfiylik',
  footerPageLink__terms: 'Shartlar',
  formButtonPrimary: 'Davom etish',
  formButtonPrimary__verify: 'Tasdiqlash',
  formFieldAction__forgotPassword: 'Parolni unutdingizmi?',
  formFieldError__matchingPasswords: 'Parollar mos keladi.',
  formFieldError__notMatchingPasswords: 'Parollar mos kelmaydi.',
  formFieldError__verificationLinkExpired:
    "Tasdiqlash havolasi muddati o'tdi. Yangi havola so'rang.",
  formFieldHintText__optional: 'Ixtiyoriy',
  formFieldHintText__slug:
    "Slug — bu noyob bo'lishi kerak bo'lgan, odamlar o'qiy oladigan ID. Ko'pincha URL manzillarda ishlatiladi.",
  formFieldInputPlaceholder__apiKeyDescription:
    'Bu kalitni nima uchun yaratayotganingizni tushuntiring',
  formFieldInputPlaceholder__apiKeyExpirationDate: 'Sanani tanlang',
  formFieldInputPlaceholder__apiKeyName: 'Maxfiy kalit nomini kiriting',
  formFieldInputPlaceholder__backupCode: 'Zaxira kodni kiriting',
  formFieldInputPlaceholder__confirmDeletionUserAccount: "Hisobni o'chirish",
  formFieldInputPlaceholder__emailAddress: 'Email manzilingizni kiriting',
  formFieldInputPlaceholder__emailAddress_username: 'Email yoki foydalanuvchi nomini kiriting',
  formFieldInputPlaceholder__emailAddresses: 'example@email.com, example2@email.com',
  formFieldInputPlaceholder__firstName: 'Ism',
  formFieldInputPlaceholder__lastName: 'Familiya',
  formFieldInputPlaceholder__organizationDomain: 'example.com',
  formFieldInputPlaceholder__organizationDomainEmailAddress: 'siz@example.com',
  formFieldInputPlaceholder__organizationName: 'Tashkilot nomi',
  formFieldInputPlaceholder__organizationSlug: 'mening-tashkilotim',
  formFieldInputPlaceholder__password: 'Parolingizni kiriting',
  formFieldInputPlaceholder__signUpPassword: 'Parol yarating',
  formFieldInputPlaceholder__phoneNumber: 'Telefon raqamingizni kiriting',
  formFieldInputPlaceholder__username: 'Foydalanuvchi nomingizni kiriting',
  formFieldInput__emailAddress_format: 'Namuna format: ism@example.com',
  formFieldLabel__apiKey: 'API kaliti',
  formFieldLabel__apiKeyDescription: 'Tavsif',
  formFieldLabel__apiKeyExpiration: 'Muddati',
  formFieldLabel__apiKeyName: 'Maxfiy kalit nomi',
  formFieldLabel__automaticInvitations: 'Bu domen uchun avtomatik takliflarni yoqish',
  formFieldLabel__backupCode: 'Zaxira kod',
  formFieldLabel__confirmDeletion: 'Tasdiqlash',
  formFieldLabel__confirmPassword: 'Parolni tasdiqlash',
  formFieldLabel__currentPassword: 'Joriy parol',
  formFieldLabel__emailAddress: 'Email manzili',
  formFieldLabel__emailAddress_username: 'Email manzili yoki foydalanuvchi nomi',
  formFieldLabel__emailAddresses: 'Email manzillari',
  formFieldLabel__firstName: 'Ism',
  formFieldLabel__lastName: 'Familiya',
  formFieldLabel__newPassword: 'Yangi parol',
  formFieldLabel__organizationDomain: 'Domen',
  formFieldLabel__organizationDomainDeletePending:
    "Kutilayotgan takliflar va tavsiyalarni o'chirish",
  formFieldLabel__organizationDomainEmailAddress: 'Tasdiqlash email manzili',
  formFieldLabel__organizationDomainEmailAddressDescription:
    'Ushbu domenni tasdiqlash uchun kod olish maqsadida shu domen ostidagi email manzilni kiriting.',
  formFieldLabel__organizationName: 'Nomi',
  formFieldLabel__organizationSlug: 'Slug',
  formFieldLabel__passkeyName: 'Kalit iborasining nomi',
  formFieldLabel__password: 'Parol',
  formFieldLabel__phoneNumber: 'Telefon raqami',
  formFieldLabel__role: 'Rol',
  formFieldLabel__signOutOfOtherSessions: 'Boshqa barcha qurilmalardan chiqish',
  formFieldLabel__username: 'Foydalanuvchi nomi',
  impersonationFab: {
    action__signOut: 'Chiqish',
    title: '{{identifier}} sifatida kirilgan',
  },
  lastAuthenticationStrategy: 'Oxirgi foydalanilgan',
  maintenanceMode:
    "Hozirda texnik xizmat ko'rsatilmoqda, lekin tashvishlanmang, bu bir necha daqiqadan ko'p vaqt olmaydi.",
  membershipRole__admin: 'Administrator',
  membershipRole__basicMember: "A'zo",
  membershipRole__guestMember: 'Mehmon',
  organizationList: {
    action__createOrganization: 'Tashkilot yaratish',
    action__invitationAccept: "Qo'shilish",
    action__suggestionsAccept: "Qo'shilishni so'rash",
    createOrganization: 'Tashkilot yaratish',
    invitationAcceptedLabel: "Qo'shildi",
    subtitle: '{{applicationName}} ga davom etish uchun',
    suggestionsAcceptedLabel: 'Tasdiq kutilmoqda',
    title: 'Hisobni tanlang',
    titleWithoutPersonal: 'Tashkilotni tanlang',
  },
  oauthConsent: {
    action__allow: 'Ruxsat berish',
    action__deny: 'Rad etish',
    offlineAccessNotice: ' Chiqquningizcha yoki kirish bekor qilinguncha tizimda qolasiz.',
    redirectNotice: "Ruxsat bersangiz, bu ilova sizni {{domainAction}} ga yo'naltiradi.",
    redirectUriModal: {
      subtitle:
        '{{applicationName}} ga ishonganingizga va bu URL {{applicationName}} ga tegishli ekanligiga ishonch hosil qiling.',
      title: "Yo'naltirish URL manzili",
    },
    scopeList: {
      title: 'Bu {{applicationName}} ga quyidagilarga kirish imkonini beradi:',
    },
    subtitle: '{{identifier}} nomidan {{applicationName}} ga kirmoqchi',
    viewFullUrl: "To'liq URL manzilni ko'rish",
    warning:
      "{{applicationName}} ({{domainAction}}) ga ishonganingizga ishonch hosil qiling. Siz bu sayt yoki ilova bilan maxfiy ma'lumotlarni ulashayotgan bo'lishingiz mumkin.",
  },
  organizationProfile: {
    apiKeysPage: {
      title: 'API kalitlari',
    },
    badge__automaticInvitation: 'Avtomatik takliflar',
    badge__automaticSuggestion: 'Avtomatik tavsiyalar',
    badge__manualInvitation: "Avtomatik qabul yo'q",
    badge__unverified: 'Tasdiqlanmagan',
    billingPage: {
      paymentHistorySection: {
        empty: "To'lov tarixi yo'q",
        notFound: "To'lov urinishi topilmadi",
        tableHeader__amount: 'Summa',
        tableHeader__date: 'Sana',
        tableHeader__status: 'Holat',
      },
      paymentMethodsSection: {
        actionLabel__default: 'Standart qilish',
        actionLabel__remove: "O'chirish",
        add: "Yangi to'lov usuli qo'shish",
        addSubtitle: "Hisobingizga yangi to'lov usuli qo'shing.",
        cancelButton: 'Bekor qilish',
        formButtonPrimary__add: "To'lov usuli qo'shish",
        formButtonPrimary__pay: "{{amount}} to'lash",
        payWithTestCardButton: "Test karta bilan to'lash",
        removeMethod: {
          messageLine1: "{{identifier}} bu hisobdan o'chiriladi.",
          messageLine2:
            "Endi bu to'lov usulidan foydalana olmaysiz va unga bog'liq takrorlanuvchi obunalar ishlamay qoladi.",
          successMessage: "{{paymentMethod}} hisobingizdan o'chirildi.",
          title: "To'lov usulini o'chirish",
        },
        title: "To'lov usullari",
      },
      start: {
        headerTitle__payments: "To'lovlar",
        headerTitle__plans: 'Tariflar',
        headerTitle__statements: 'Hisobotlar',
        headerTitle__subscriptions: 'Obuna',
      },
      statementsSection: {
        empty: "Ko'rsatiladigan hisobotlar yo'q",
        itemCaption__paidForPlan: "{{plan}} {{period}} tarifi uchun to'landi",
        itemCaption__proratedCredit:
          'Avvalgi obunaning qisman foydalanishi uchun proporsional kredit',
        itemCaption__payerCredit: 'Hisob balansidagi kredit',
        itemCaption__subscribedAndPaidForPlan:
          "{{plan}} {{period}} tarifiga obuna bo'lindi va to'landi",
        notFound: 'Hisobot topilmadi',
        tableHeader__amount: 'Summa',
        tableHeader__date: 'Sana',
        title: 'Hisobotlar',
        totalPaid: "Jami to'langan",
      },
      subscriptionsListSection: {
        actionLabel__manageSubscription: 'Boshqarish',
        actionLabel__newSubscription: "Tarifga obuna bo'lish",
        actionLabel__switchPlan: "Tarifni o'zgartirish",
        tableHeader__edit: 'Tahrirlash',
        tableHeader__plan: 'Tarif',
        tableHeader__startDate: 'Boshlanish sanasi',
        title: 'Obuna',
      },
      subscriptionsSection: {
        actionLabel__default: 'Boshqarish',
      },
      switchPlansSection: {
        title: "Tarifni o'zgartirish",
      },
      title: 'Hisob-kitob',
    },
    createDomainPage: {
      subtitle:
        "Tasdiqlash uchun domenni qo'shing. Bu domenga tegishli email manzilga ega foydalanuvchilar tashkilotga avtomatik qo'shilishi yoki qo'shilishni so'rashi mumkin.",
      title: "Domen qo'shish",
    },
    invitePage: {
      detailsTitle__inviteFailed:
        'Takliflar yuborilmadi. Quyidagi email manzillar uchun allaqachon kutilayotgan takliflar mavjud: {{email_addresses}}.',
      formButtonPrimary__continue: 'Takliflarni yuborish',
      selectDropdown__role: 'Rolni tanlang',
      subtitle:
        "Bir yoki bir nechta email manzillarni bo'sh joy yoki vergul bilan ajratib kiriting yoki joylashtiring.",
      successMessage: 'Takliflar muvaffaqiyatli yuborildi',
      title: "Yangi a'zolarni taklif qilish",
    },
    membersPage: {
      action__invite: 'Taklif qilish',
      action__search: 'Qidirish',
      activeMembersTab: {
        menuAction__remove: "A'zoni o'chirish",
        tableHeader__actions: 'Amallar',
        tableHeader__joined: "Qo'shilgan",
        tableHeader__role: 'Rol',
        tableHeader__user: 'Foydalanuvchi',
      },
      alerts: {
        roleSetMigrationInProgress: {
          subtitle: "Mavjud rollar yangilanmoqda. Bu tugagach, rollarni yana o'zgartira olasiz.",
          title: 'Rollar vaqtincha qulflangan',
        },
      },
      detailsTitle__emptyRow: "Ko'rsatiladigan a'zolar yo'q",
      invitationsTab: {
        autoInvitations: {
          headerSubtitle:
            "Email domenini tashkilotingizga ulash orqali foydalanuvchilarni taklif qiling. Mos email domeniga ega ro'yxatdan o'tgan har kim istalgan vaqt tashkilotga qo'shila oladi.",
          headerTitle: 'Avtomatik takliflar',
          primaryButton: 'Tasdiqlangan domenlarni boshqarish',
        },
        table__emptyRow: "Ko'rsatiladigan takliflar yo'q",
      },
      invitedMembersTab: {
        menuAction__revoke: 'Taklifni bekor qilish',
        tableHeader__invited: 'Taklif qilingan',
      },
      requestsTab: {
        autoSuggestions: {
          headerSubtitle:
            "Mos email domeniga ega ro'yxatdan o'tgan foydalanuvchilar tashkilotingizga qo'shilishni so'rash tavsiyasini ko'ra oladi.",
          headerTitle: 'Avtomatik tavsiyalar',
          primaryButton: 'Tasdiqlangan domenlarni boshqarish',
        },
        menuAction__approve: 'Tasdiqlash',
        menuAction__reject: 'Rad etish',
        tableHeader__requested: "Kirish so'raldi",
        table__emptyRow: "Ko'rsatiladigan so'rovlar yo'q",
      },
      start: {
        headerTitle__invitations: 'Takliflar',
        headerTitle__members: "A'zolar",
        headerTitle__requests: "So'rovlar",
      },
    },
    navbar: {
      apiKeys: 'API kalitlari',
      billing: 'Hisob-kitob',
      description: 'Tashkilotingizni boshqaring.',
      general: 'Umumiy',
      members: "A'zolar",
      title: 'Tashkilot',
    },
    plansPage: {
      alerts: {
        noPermissionsToManageBilling:
          'Bu tashkilot uchun hisob-kitobni boshqarish ruxsatiga ega emassiz.',
        planMembershipLimitExceeded:
          "Tashkilotingizda {{count}} ta a'zo bor (kutilayotgan takliflar bilan birga). Bu tarif faqat {{limit}} ta a'zoga ruxsat beradi.",
      },
      title: 'Tariflar',
    },
    profilePage: {
      dangerSection: {
        deleteOrganization: {
          actionDescription: 'Davom etish uchun quyiga "{{organizationName}}" deb yozing.',
          messageLine1: "Bu tashkilotni o'chirishni xohlaysizmi?",
          messageLine2: "Bu amal doimiy va qaytarib bo'lmaydi.",
          successMessage: "Tashkilotni o'chirdingiz.",
          title: "Tashkilotni o'chirish",
        },
        leaveOrganization: {
          actionDescription: 'Davom etish uchun quyiga "{{organizationName}}" deb yozing.',
          messageLine1:
            "Bu tashkilotdan chiqishni xohlaysizmi? Tashkilot va uning ilovalariga kirish huquqingizni yo'qotasiz.",
          messageLine2: "Bu amal doimiy va qaytarib bo'lmaydi.",
          successMessage: 'Tashkilotdan chiqdingiz.',
          title: 'Tashkilotdan chiqish',
        },
        title: 'Xavfli zona',
      },
      domainSection: {
        menuAction__manage: 'Boshqarish',
        menuAction__remove: "O'chirish",
        menuAction__verify: 'Tasdiqlash',
        primaryButton: "Domen qo'shish",
        subtitle:
          "Foydalanuvchilarga tasdiqlangan email domeni asosida tashkilotga avtomatik qo'shilish yoki qo'shilishni so'rash imkonini bering.",
        title: 'Tasdiqlangan domenlar',
      },
      successMessage: 'Tashkilot yangilandi.',
      title: 'Profilni yangilash',
    },
    removeDomainPage: {
      messageLine1: "{{domain}} email domeni o'chiriladi.",
      messageLine2: "Bundan keyin foydalanuvchilar tashkilotga avtomatik qo'shila olmaydi.",
      successMessage: "{{domain}} o'chirildi.",
      title: "Domenni o'chirish",
    },
    start: {
      headerTitle__general: 'Umumiy',
      headerTitle__members: "A'zolar",
      membershipSeatUsageLabel: "{{limit}} o'rindan {{count}} tasi ishlatilmoqda",
      profileSection: {
        primaryButton: 'Profilni yangilash',
        title: 'Tashkilot profili',
        uploadAction__title: 'Logotip',
      },
    },
    verifiedDomainPage: {
      dangerTab: {
        calloutInfoLabel: "Bu domenni o'chirish taklif qilingan foydalanuvchilarga ta'sir qiladi.",
        removeDomainActionLabel__remove: "Domenni o'chirish",
        removeDomainSubtitle: "Bu domenni tasdiqlangan domenlaringizdan o'chirib tashlang",
        removeDomainTitle: "Domenni o'chirish",
      },
      enrollmentTab: {
        automaticInvitationOption__description:
          "Foydalanuvchilar ro'yxatdan o'tganda avtomatik tashkilotga taklif qilinadi va istalgan vaqt qo'shila oladi.",
        automaticInvitationOption__label: 'Avtomatik takliflar',
        automaticSuggestionOption__description:
          "Foydalanuvchilar qo'shilishni so'rash tavsiyasini oladi, lekin tashkilotga qo'shilishdan oldin admin tomonidan tasdiqlanishi kerak.",
        automaticSuggestionOption__label: 'Avtomatik tavsiyalar',
        calloutInfoLabel:
          "Qabul qilish rejimini o'zgartirish faqat yangi foydalanuvchilarga ta'sir qiladi.",
        calloutInvitationCountLabel:
          'Foydalanuvchilarga yuborilgan kutilayotgan takliflar: {{count}}',
        calloutSuggestionCountLabel:
          'Foydalanuvchilarga yuborilgan kutilayotgan tavsiyalar: {{count}}',
        manualInvitationOption__description:
          "Foydalanuvchilar faqat qo'lda tashkilotga taklif qilinishi mumkin.",
        manualInvitationOption__label: "Avtomatik qabul yo'q",
        subtitle: "Bu domendan foydalanuvchilar tashkilotga qanday qo'shilishini tanlang.",
      },
      start: {
        headerTitle__danger: 'Xavfli zona',
        headerTitle__enrollment: 'Qabul qilish sozlamalari',
      },
      subtitle: '{{domain}} domeni tasdiqlandi. Qabul qilish rejimini tanlab davom eting.',
      title: '{{domain}} ni yangilash',
    },
    verifyDomainPage: {
      formSubtitle: 'Email manzilingizga yuborilgan tasdiqlash kodini kiriting',
      formTitle: 'Tasdiqlash kodi',
      resendButton: 'Kod kelmadimi? Qayta yuborish',
      subtitle: '{{domainName}} domeni email orqali tasdiqlanishi kerak.',
      subtitleVerificationCodeScreen:
        '{{emailAddress}} manziliga tasdiqlash kodi yuborildi. Davom etish uchun kodni kiriting.',
      title: 'Domenni tasdiqlash',
    },
  },
  organizationSwitcher: {
    action__closeOrganizationSwitcher: 'Tashkilot almashtirgichni yopish',
    action__createOrganization: 'Tashkilot yaratish',
    action__invitationAccept: "Qo'shilish",
    action__manageOrganization: 'Boshqarish',
    action__openOrganizationSwitcher: 'Tashkilot almashtirgichni ochish',
    action__suggestionsAccept: "Qo'shilishni so'rash",
    notSelected: 'Tashkilot tanlanmagan',
    personalWorkspace: 'Shaxsiy hisob',
    suggestionsAcceptedLabel: 'Tasdiq kutilmoqda',
  },
  paginationButton__next: 'Keyingi',
  paginationButton__previous: 'Oldingi',
  paginationRowText__displaying: "Ko'rsatilmoqda",
  paginationRowText__of: 'dan',
  reverification: {
    alternativeMethods: {
      actionLink: 'Yordam olish',
      actionText: "Bularning hech biri yo'qmi?",
      blockButton__backupCode: 'Zaxira kodni ishlatish',
      blockButton__emailCode: '{{identifier}} ga email kodi yuborish',
      blockButton__passkey: 'Passkeyingizdan foydalanish',
      blockButton__password: 'Parolingiz bilan davom etish',
      blockButton__phoneCode: '{{identifier}} ga SMS kodi yuborish',
      blockButton__totp: 'Autentifikator ilovangizdan foydalanish',
      getHelp: {
        blockButton__emailSupport: "Qo'llab-quvvatlash xizmati",
        content:
          "Hisobingizni tasdiqlashda muammo bo'lsa, bizga email yozing va biz imkon qadar tezroq kirishni tiklashga yordam beramiz.",
        title: 'Yordam olish',
      },
      subtitle: 'Muammo bormi? Tasdiqlash uchun quyidagi usullardan birini ishlatishingiz mumkin.',
      title: 'Boshqa usuldan foydalanish',
    },
    backupCodeMfa: {
      subtitle: 'Ikki bosqichli autentifikatsiyani sozlashda olgan zaxira kodingizni kiriting',
      title: 'Zaxira kodni kiriting',
    },
    emailCode: {
      formTitle: 'Tasdiqlash kodi',
      resendButton: 'Kod kelmadimi? Qayta yuborish',
      subtitle: 'Davom etish uchun emailingizga yuborilgan kodni kiriting',
      title: 'Tasdiqlash talab qilinadi',
    },
    noAvailableMethods: {
      message: 'Tasdiqlashni davom ettirish mumkin emas. Mos autentifikatsiya omili sozlanmagan',
      subtitle: 'Xato yuz berdi',
      title: 'Hisobingizni tasdiqlash mumkin emas',
    },
    passkey: {
      blockButton__passkey: 'Passkeyingizdan foydalanish',
      subtitle:
        "Passkeyingizdan foydalanish shaxsingizni tasdiqlaydi. Qurilmangiz barmoq izi, yuz yoki ekran qulfini so'rashi mumkin.",
      title: 'Passkeyingizdan foydalanish',
    },
    password: {
      actionLink: 'Boshqa usuldan foydalanish',
      subtitle: 'Davom etish uchun joriy parolingizni kiriting',
      title: 'Tasdiqlash talab qilinadi',
    },
    phoneCode: {
      formTitle: 'Tasdiqlash kodi',
      resendButton: 'Kod kelmadimi? Qayta yuborish',
      subtitle: 'Davom etish uchun telefoningizga yuborilgan kodni kiriting',
      title: 'Tasdiqlash talab qilinadi',
    },
    phoneCodeMfa: {
      formTitle: 'Tasdiqlash kodi',
      resendButton: 'Kod kelmadimi? Qayta yuborish',
      subtitle: 'Davom etish uchun telefoningizga yuborilgan kodni kiriting',
      title: 'Tasdiqlash talab qilinadi',
    },
    totpMfa: {
      formTitle: 'Tasdiqlash kodi',
      subtitle: 'Davom etish uchun autentifikator ilovangiz tomonidan yaratilgan kodni kiriting',
      title: 'Tasdiqlash talab qilinadi',
    },
  },
  signIn: {
    accountSwitcher: {
      action__addAccount: "Hisob qo'shish",
      action__signOutAll: 'Barcha hisoblardan chiqish',
      subtitle: "Davom etmoqchi bo'lgan hisobni tanlang.",
      title: 'Hisob tanlash',
    },
    alternativeMethods: {
      actionLink: 'Yordam olish',
      actionText: "Bularning hech biri yo'qmi?",
      blockButton__backupCode: 'Zaxira kodni ishlatish',
      blockButton__emailCode: '{{identifier}} ga email kodi yuborish',
      blockButton__emailLink: '{{identifier}} ga email havola yuborish',
      blockButton__passkey: 'Passkey bilan kirish',
      blockButton__password: 'Parol bilan kirish',
      blockButton__phoneCode: '{{identifier}} ga SMS kodi yuborish',
      blockButton__totp: 'Autentifikator ilovangizdan foydalanish',
      getHelp: {
        blockButton__emailSupport: "Qo'llab-quvvatlash xizmati",
        content:
          "Hisobingizga kirishda muammo bo'lsa, bizga email yozing va biz imkon qadar tezroq kirishni tiklashga yordam beramiz.",
        title: 'Yordam olish',
      },
      subtitle: 'Muammo bormi? Kirish uchun quyidagi usullardan birini ishlatishingiz mumkin.',
      title: 'Boshqa usuldan foydalanish',
    },
    alternativePhoneCodeProvider: {
      formTitle: 'Tasdiqlash kodi',
      resendButton: 'Kod kelmadimi? Qayta yuborish',
      subtitle: '{{applicationName}} ga davom etish uchun',
      title: '{{provider}} ni tekshiring',
    },
    backupCodeMfa: {
      subtitle: 'Zaxira kodingiz ikki bosqichli autentifikatsiyani sozlashda olgansiz.',
      title: 'Zaxira kodni kiriting',
    },
    emailCode: {
      formTitle: 'Tasdiqlash kodi',
      resendButton: 'Kod kelmadimi? Qayta yuborish',
      subtitle: '{{applicationName}} ga davom etish uchun',
      title: 'Emailingizni tekshiring',
    },
    emailCodeMfa: {
      formTitle: 'Emailingizni tekshiring',
      resendButton: 'Kod kelmadimi? Qayta yuborish',
      subtitle: '{{applicationName}} ga davom etish uchun',
      title: 'Emailingizni tekshiring',
    },
    emailLink: {
      clientMismatch: {
        subtitle:
          'Davom etish uchun kirish boshlagan qurilma va brauzerda tasdiqlash havolasini oching',
        title: 'Tasdiqlash havolasi bu qurilma uchun yaroqsiz',
      },
      expired: {
        subtitle: 'Davom etish uchun asl tabga qayting.',
        title: 'Bu tasdiqlash havolasining amal qilish muddati tugagan',
      },
      failed: {
        subtitle: 'Davom etish uchun asl tabga qayting.',
        title: 'Bu tasdiqlash havolasi yaroqsiz',
      },
      formSubtitle: 'Emailingizga yuborilgan tasdiqlash havolasidan foydalaning',
      formTitle: 'Tasdiqlash havolasi',
      loading: {
        subtitle: "Tez orada yo'naltirilasiz",
        title: 'Kirilmoqda...',
      },
      resendButton: 'Havola kelmadimi? Qayta yuborish',
      subtitle: '{{applicationName}} ga davom etish uchun',
      title: 'Emailingizni tekshiring',
      unusedTab: {
        title: 'Bu tabni yopishingiz mumkin',
      },
      verified: {
        subtitle: "Tez orada yo'naltirilasiz",
        title: 'Muvaffaqiyatli kirildi',
      },
      verifiedSwitchTab: {
        subtitle: 'Davom etish uchun asl tabga qayting',
        subtitleNewTab: 'Davom etish uchun yangi ochilgan tabga qayting',
        titleNewTab: 'Boshqa tabda kirildi',
      },
    },
    emailLinkMfa: {
      formSubtitle: 'Emailingizga yuborilgan tasdiqlash havolasidan foydalaning',
      resendButton: 'Havola kelmadimi? Qayta yuborish',
      subtitle: '{{applicationName}} ga davom etish uchun',
      title: 'Emailingizni tekshiring',
    },
    enterpriseConnections: {
      subtitle: "Davom etmoqchi bo'lgan korporativ hisobni tanlang.",
      title: 'Korporativ hisobingizni tanlang',
    },
    forgotPassword: {
      formTitle: 'Parolni tiklash kodi',
      resendButton: 'Kod kelmadimi? Qayta yuborish',
      subtitle: 'parolni tiklash uchun',
      subtitle_email: 'Avval email manzilingizga yuborilgan kodni kiriting',
      subtitle_phone: 'Avval telefoningizga yuborilgan kodni kiriting',
      title: 'Parolni tiklash',
    },
    forgotPasswordAlternativeMethods: {
      blockButton__resetPassword: 'Parolingizni tiklash',
      label__alternativeMethods: 'Yoki, boshqa usul bilan kirish',
      title: 'Parolni unutdingizmi?',
    },
    newDeviceVerificationNotice:
      "Yangi qurilmadan kirayapsiz. Hisobingizni himoya qilish uchun tasdiqlash so'ralmoqda.",
    noAvailableMethods: {
      message: 'Kirish davom ettirilmaydi. Hech qanday autentifikatsiya omili mavjud emas.',
      subtitle: 'Xato yuz berdi',
      title: 'Kirish mumkin emas',
    },
    passkey: {
      subtitle:
        "Passkeyingizdan foydalanish siz ekanligingizni tasdiqlaydi. Qurilmangiz barmoq izi, yuz yoki ekran qulfini so'rashi mumkin.",
      title: 'Passkeyingizdan foydalanish',
    },
    password: {
      actionLink: 'Boshqa usuldan foydalanish',
      subtitle: "Hisobingizga bog'liq parolni kiriting",
      title: 'Parolingizni kiriting',
    },
    passwordCompromised: {
      title: 'Parol buzilgan',
    },
    passwordPwned: {
      title: 'Parol buzilgan',
    },
    passwordUntrusted: {
      title: 'Parol ishonchsiz',
    },
    phoneCode: {
      formTitle: 'Tasdiqlash kodi',
      resendButton: 'Kod kelmadimi? Qayta yuborish',
      subtitle: '{{applicationName}} ga davom etish uchun',
      title: 'Telefoningizni tekshiring',
    },
    phoneCodeMfa: {
      formTitle: 'Tasdiqlash kodi',
      resendButton: 'Kod kelmadimi? Qayta yuborish',
      subtitle: 'Davom etish uchun telefoningizga yuborilgan tasdiqlash kodini kiriting',
      title: 'Telefoningizni tekshiring',
    },
    resetPassword: {
      formButtonPrimary: 'Parolni tiklash',
      requiredMessage: 'Xavfsizlik sabablari bilan parolingizni tiklash talab qilinadi.',
      successMessage: "Parolingiz muvaffaqiyatli o'zgartirildi. Kirilmoqda, iltimos bir oz kuting.",
      title: "Yangi parol o'rnatish",
    },
    resetPasswordMfa: {
      detailsLabel: 'Parolingizni tiklashdan avval shaxsingizni tasdiqlaymiz.',
    },
    start: {
      actionLink: "Ro'yxatdan o'tish",
      actionLink__join_waitlist: "Kutish ro'yxatiga qo'shilish",
      actionLink__use_email: 'Email ishlatish',
      actionLink__use_email_username: 'Email yoki foydalanuvchi nomi ishlatish',
      actionLink__use_passkey: 'Passkey ishlatish',
      actionLink__use_phone: 'Telefon ishlatish',
      actionLink__use_username: 'Foydalanuvchi nomi ishlatish',
      actionText: "Hisobingiz yo'qmi?",
      actionText__join_waitlist: 'Erta kirmoqchimisiz?',
      alternativePhoneCodeProvider: {
        actionLink: 'Boshqa usuldan foydalanish',
        label: '{{provider}} telefon raqami',
        subtitle: '{{provider}} da tasdiqlash kodi olish uchun telefon raqamingizni kiriting.',
        title: '{{provider}} bilan {{applicationName}} ga kirish',
      },
      subtitle: 'Xush kelibsiz! Davom etish uchun kiring',
      title: '{{applicationName}} ga kirish',
      titleCombined: '{{applicationName}} ga davom etish',
    },
    totpMfa: {
      formTitle: 'Tasdiqlash kodi',
      subtitle:
        'Davom etish uchun autentifikator ilovangiz tomonidan yaratilgan tasdiqlash kodini kiriting',
      title: 'Ikki bosqichli tasdiqlash',
    },
    web3Solana: {
      subtitle: 'Kirish uchun quyidagi hamyonni tanlang',
      title: 'Solana bilan kirish',
    },
  },
  signInEnterPasswordTitle: 'Parolingizni kiriting',
  signUp: {
    alternativePhoneCodeProvider: {
      resendButton: 'Kod kelmadimi? Qayta yuborish',
      subtitle: '{{provider}} ga yuborilgan tasdiqlash kodini kiriting',
      title: '{{provider}} ni tasdiqlash',
    },
    continue: {
      actionLink: 'Kirish',
      actionText: 'Hisobingiz bormi?',
      subtitle: "Davom etish uchun qolgan ma'lumotlarni to'ldiring.",
      title: "Yo'q maydonlarni to'ldirish",
    },
    emailCode: {
      formSubtitle: 'Email manzilingizga yuborilgan tasdiqlash kodini kiriting',
      formTitle: 'Tasdiqlash kodi',
      resendButton: 'Kod kelmadimi? Qayta yuborish',
      subtitle: 'Emailingizga yuborilgan tasdiqlash kodini kiriting',
      title: 'Emailingizni tasdiqlash',
    },
    emailLink: {
      clientMismatch: {
        subtitle:
          "Davom etish uchun ro'yxatdan o'tishni boshlagan qurilma va brauzerda tasdiqlash havolasini oching",
        title: 'Tasdiqlash havolasi bu qurilma uchun yaroqsiz',
      },
      formSubtitle: 'Email manzilingizga yuborilgan tasdiqlash havolasidan foydalaning',
      formTitle: 'Tasdiqlash havolasi',
      loading: {
        title: "Ro'yxatdan o'tilmoqda...",
      },
      resendButton: 'Havola kelmadimi? Qayta yuborish',
      subtitle: '{{applicationName}} ga davom etish uchun',
      title: 'Emailingizni tasdiqlash',
      verified: {
        title: "Muvaffaqiyatli ro'yxatdan o'tildi",
      },
      verifiedSwitchTab: {
        subtitle: 'Davom etish uchun yangi ochilgan tabga qayting',
        subtitleNewTab: 'Davom etish uchun oldingi tabga qayting',
        title: 'Email muvaffaqiyatli tasdiqlandi',
      },
    },
    enterpriseConnections: {
      subtitle: "Davom etmoqchi bo'lgan korporativ hisobni tanlang.",
      title: 'Korporativ hisobingizni tanlang',
    },
    legalConsent: {
      checkbox: {
        label__onlyPrivacyPolicy:
          'Men {{ privacyPolicyLink || link("Maxfiylik siyosati") }} ga roziman',
        label__onlyTermsOfService:
          'Men {{ termsOfServiceLink || link("Foydalanish shartlari") }} ga roziman',
        label__termsOfServiceAndPrivacyPolicy:
          'Men {{ termsOfServiceLink || link("Foydalanish shartlari") }} va {{ privacyPolicyLink || link("Maxfiylik siyosati") }} ga roziman',
      },
      continue: {
        subtitle: "Davom etish uchun shartlarni o'qing va qabul qiling",
        title: 'Huquqiy rozilik',
      },
    },
    phoneCode: {
      formSubtitle: 'Telefon raqamingizga yuborilgan tasdiqlash kodini kiriting',
      formTitle: 'Tasdiqlash kodi',
      resendButton: 'Kod kelmadimi? Qayta yuborish',
      subtitle: 'Telefoningizga yuborilgan tasdiqlash kodini kiriting',
      title: 'Telefoningizni tasdiqlash',
    },
    restrictedAccess: {
      actionLink: 'Kirish',
      actionText: 'Hisobingiz bormi?',
      blockButton__emailSupport: "Qo'llab-quvvatlash xizmati",
      blockButton__joinWaitlist: "Kutish ro'yxatiga qo'shilish",
      subtitle:
        "Ro'yxatdan o'tish hozirda o'chirilgan. Kirish huquqingiz bo'lishi kerak deb hisoblasangiz, qo'llab-quvvatlash xizmatiga murojaat qiling.",
      subtitleWaitlist:
        "Ro'yxatdan o'tish hozirda o'chirilgan. Ishga tushirishimiz haqida birinchi xabardor bo'lish uchun kutish ro'yxatiga qo'shiling.",
      title: 'Kirish cheklangan',
    },
    start: {
      actionLink: 'Kirish',
      actionLink__use_email: 'Email ishlatish',
      actionLink__use_phone: 'Telefon ishlatish',
      actionText: 'Hisobingiz bormi?',
      alternativePhoneCodeProvider: {
        actionLink: 'Boshqa usuldan foydalanish',
        label: '{{provider}} telefon raqami',
        subtitle: '{{provider}} da tasdiqlash kodi olish uchun telefon raqamingizni kiriting.',
        title: "{{provider}} bilan {{applicationName}} da ro'yxatdan o'tish",
      },
      subtitle: "Xush kelibsiz! Boshlash uchun ma'lumotlarni to'ldiring.",
      subtitleCombined: "Xush kelibsiz! Boshlash uchun ma'lumotlarni to'ldiring.",
      title: 'Hisobingizni yarating',
      titleCombined: 'Hisobingizni yarating',
    },
    web3Solana: {
      subtitle: "Ro'yxatdan o'tish uchun quyidagi hamyonni tanlang",
      title: "Solana bilan ro'yxatdan o'tish",
    },
  },
  socialButtonsBlockButton: '{{provider|titleize}} bilan davom etish',
  socialButtonsBlockButtonManyInView: '{{provider|titleize}}',
  taskChooseOrganization: {
    alerts: {
      organizationAlreadyExists:
        "Aniqlangan kompaniya nomi ({{organizationName}}) va {{organizationDomain}} uchun tashkilot allaqachon mavjud. Taklif orqali qo'shiling.",
    },
    chooseOrganization: {
      action__createOrganization: 'Yangi tashkilot yaratish',
      action__invitationAccept: "Qo'shilish",
      action__suggestionsAccept: "Qo'shilish so'rovi",
      subtitle: "Mavjud tashkilotga qo'shiling yoki yangi tashkilot yarating",
      subtitle__createOrganizationDisabled: "Mavjud tashkilotga qo'shiling",
      suggestionsAcceptedLabel: 'Tasdiq kutilmoqda',
      title: 'Tashkilot tanlash',
    },
    createOrganization: {
      formButtonReset: 'Bekor qilish',
      formButtonSubmit: 'Davom etish',
      formFieldInputPlaceholder__name: 'Mening Tashkilotim',
      formFieldInputPlaceholder__slug: 'mening-tashkilotim',
      formFieldLabel__name: 'Nomi',
      formFieldLabel__slug: 'Slug',
      subtitle: "Davom etish uchun tashkilot ma'lumotlarini kiriting",
      title: 'Tashkilotingizni sozlash',
    },
    organizationCreationDisabled: {
      subtitle: 'Taklif uchun tashkilot administratoringizga murojaat qiling.',
      title: "Tashkilotga a'zo bo'lishingiz kerak",
    },
    signOut: {
      actionLink: 'Chiqish',
      actionText: '{{identifier}} sifatida kirilgan',
    },
  },
  taskResetPassword: {
    formButtonPrimary: 'Parolni tiklash',
    signOut: {
      actionLink: 'Chiqish',
      actionText: '{{identifier}} sifatida kirilgan',
    },
    subtitle: 'Davom etishdan oldin hisobingiz uchun yangi parol talab qilinadi',
    title: 'Parolingizni tiklash',
  },
  taskSetupMfa: {
    badge: 'Ikki bosqichli tasdiqlashni sozlash',
    signOut: {
      actionLink: 'Chiqish',
      actionText: '{{identifier}} sifatida kirilgan',
    },
    smsCode: {
      addPhone: {
        formButtonPrimary: 'Davom etish',
        infoText:
          "Bu telefon raqamiga tasdiqlash kodi bilan SMS yuboriladi. Xabar va ma'lumot to'lovlari qo'llanilishi mumkin.",
      },
      addPhoneNumber: "Telefon raqami qo'shish",
      cancel: 'Bekor qilish',
      subtitle:
        "SMS kod ikki bosqichli tasdiqlash uchun ishlatmoqchi bo'lgan telefon raqamini tanlang",
      success: {
        finishButton: 'Davom etish',
        message1:
          "Ikki bosqichli tasdiqlash yoqildi. Kirishda ushbu telefon raqamiga yuborilgan tasdiqlash kodini kiritishingiz kerak bo'ladi.",
        message2:
          "Bu zaxira kodlarni saqlang va xavfsiz joyda saqlang. Autentifikatsiya qurilmangizga kirish imkoni bo'lmasa, zaxira kodlar bilan kirishingiz mumkin.",
        title: 'SMS kod tasdiqlash yoqildi',
      },
      title: "SMS kod tasdiqlashni qo'shish",
      verifyPhone: {
        formButtonPrimary: 'Davom etish',
        formTitle: 'Tasdiqlash kodi',
        resendButton: 'Kod kelmadimi? Qayta yuborish',
        subtitle: 'Yuborilgan tasdiqlash kodini kiriting',
        title: 'Telefon raqamingizni tasdiqlash',
      },
    },
    start: {
      methodSelection: {
        phoneCode: 'SMS kod',
        totp: 'Autentifikator ilova',
      },
      subtitle:
        "Hisobingizni qo'shimcha xavfsizlik qatlami bilan himoya qilish uchun usulni tanlang",
      title: 'Ikki bosqichli tasdiqlashni sozlash',
    },
    totpCode: {
      addAuthenticatorApp: {
        buttonAbleToScan__nonPrimary: 'QR kodni skanerlash',
        buttonUnableToScan__nonPrimary: "QR kodni skanerlab bo'lmayaptimi?",
        formButtonPrimary: 'Davom etish',
        formButtonReset: 'Bekor qilish',
        infoText__ableToScan:
          'Autentifikator ilovangizda yangi kirish usulini sozlang va uni hisobingizga ulash uchun quyidagi QR kodni skanerlang.',
        infoText__unableToScan:
          'Autentifikatordangizda yangi kirish usulini sozlang va quyida berilgan kalitni kiriting.',
        inputLabel__unableToScan1:
          "Vaqtga asoslangan yoki bir martalik parollar yoqilganiga ishonch hosil qiling, so'ng hisobingizni ulashni tugatng.",
      },
      success: {
        finishButton: 'Davom etish',
        message1:
          "Ikki bosqichli tasdiqlash yoqildi. Kirishda ushbu autentifikatordagi tasdiqlash kodini kiritishingiz kerak bo'ladi.",
        message2:
          "Bu zaxira kodlarni saqlang va xavfsiz joyda saqlang. Autentifikatsiya qurilmangizga kirish imkoni bo'lmasa, zaxira kodlar bilan kirishingiz mumkin.",
        title: 'Autentifikator ilova tasdiqlashi yoqildi',
      },
      title: "Autentifikator ilova qo'shish",
      verifyTotp: {
        formButtonPrimary: 'Davom etish',
        formButtonReset: 'Bekor qilish',
        formTitle: 'Tasdiqlash kodi',
        subtitle: 'Autentifikatordangiz tomonidan yaratilgan tasdiqlash kodini kiriting',
        title: "Autentifikator ilova qo'shish",
      },
    },
  },
  unstable__errors: {
    already_a_member_in_organization: "{{email}} allaqachon tashkilot a'zosi.",
    api_key_name_already_exists: 'API kalit nomi allaqachon mavjud.',
    api_key_usage_exceeded:
      "Foydalanish limitingizga yetdingiz. Pullik rejaga o'tib limitni olib tashlashingiz mumkin.",
    avatar_file_size_exceeded:
      'Fayl hajmi 10MB maksimal limitdan oshib ketdi. Kichikroq fayl tanlang.',
    avatar_file_type_invalid:
      "Fayl turi qo'llab-quvvatlanmaydi. JPG, PNG, GIF yoki WEBP rasm yuklang.",
    captcha_unavailable:
      "Bot tekshiruvi muvaffaqiyatsiz bo'lgani uchun ro'yxatdan o'tish amalga oshmadi. Qayta urinish uchun sahifani yangilang yoki qo'shimcha yordam uchun qo'llab-quvvatlash xizmatiga murojaat qiling.",
    form_new_password_matches_current:
      "Yangi parol joriy parol bilan bir xil bo'lishi mumkin emas.",
    form_password_length_too_short:
      "Parolingiz juda qisqa. Kamida 8 ta belgidan iborat bo'lishi kerak.",
    form_password_not_strong_enough: 'Parolingiz yetarlicha kuchli emas.',
    form_password_pwned:
      "Bu parol ma'lumotlar buzilishida topilgan va ishlatilishi mumkin emas, boshqa parol kiriting.",
    form_password_pwned__sign_in:
      "Bu parol ma'lumotlar buzilishida topilgan va ishlatilishi mumkin emas, parolingizni tiklang.",
    form_password_untrusted__sign_in:
      "Parolingiz xavf ostida bo'lishi mumkin. Hisobingizni himoya qilish uchun muqobil kirish usuli bilan davom eting. Kirgandan so'ng parolingizni tiklashingiz talab qilinadi.",
    form_username_invalid_length:
      "Foydalanuvchi nomingiz {{min_length}} dan {{max_length}} ta belgigacha bo'lishi kerak.",
    form_username_needs_non_number_char:
      "Foydalanuvchi nomingizda kamida bitta raqam bo'lmagan belgi bo'lishi kerak.",
    organization_membership_quota_exceeded:
      "Kutilayotgan takliflar bilan birga tashkilot a'zolik limitingizga yetdingiz.",
    organization_not_found_or_unauthorized:
      "Siz endi bu tashkilot a'zosi emassiz. Boshqasini tanlang yoki yangi tashkilot yarating.",
    organization_not_found_or_unauthorized_with_create_organization_disabled:
      "Siz endi bu tashkilot a'zosi emassiz. Boshqasini tanlang.",
    passkey_already_exists: "Bu qurilmada passkey allaqachon ro'yxatdan o'tgan.",
    passkey_not_supported: "Bu qurilmada passkeylar qo'llab-quvvatlanmaydi.",
    passkey_pa_not_supported:
      "Ro'yxatdan o'tish uchun platforma autentifikatori talab qilinadi, lekin qurilma buni qo'llab-quvvatlamaydi.",
    passkey_registration_cancelled: "Passkey ro'yxatdan o'tishi bekor qilindi yoki vaqt tugadi.",
    passkey_retrieval_cancelled: 'Passkey tasdiqlashi bekor qilindi yoki vaqt tugadi.',
    passwordComplexity: {
      maximumLength: '{{length}} belgidan kam',
      minimumLength: "{{length}} va undan ko'p belgi",
      requireLowercase: 'kichik harf',
      requireNumbers: 'raqam',
      requireSpecialCharacter: 'maxsus belgi',
      requireUppercase: 'katta harf',
      sentencePrefix: "Parolingiz quyidagilarni o'z ichiga olishi kerak",
    },
    web3_missing_identifier:
      "Web3 hamyon kengaytmasi topilmadi. Davom etish uchun birini o'rnating.",
    web3_signature_request_rejected:
      "Imzo so'rovini rad etdingiz. Davom etish uchun qayta urinib ko'ring.",
    web3_solana_signature_generation_failed:
      "Imzo yaratishda xato yuz berdi. Davom etish uchun qayta urinib ko'ring.",
    zxcvbn: {
      couldBeStronger:
        "Parolingiz ishlaydi, lekin kuchliroq bo'lishi mumkin. Ko'proq belgi qo'shib ko'ring.",
      goodPassword: 'Parolingiz barcha talablarni bajaradi.',
      notEnough: 'Parolingiz yetarlicha kuchli emas.',
      suggestions: {
        allUppercase: "Ba'zi harflarni katta qiling, lekin hammasini emas.",
        anotherWord: "Kamroq tarqalgan so'zlar qo'shing.",
        associatedYears: "Siz bilan bog'liq yillardan qoching.",
        capitalization: "Birinchi harfdan ko'proq harfni katta qiling.",
        dates: "Siz bilan bog'liq sanalar va yillardan qoching.",
        l33t: "'a' o'rniga '@' kabi taxminan harf almashinuvlaridan qoching.",
        longerKeyboardPattern:
          "Uzunroq klaviatura naqshlarini ishlating va yozish yo'nalishini bir necha marta o'zgartiring.",
        noNeed: 'Ramzlar, raqamlar yoki katta harflarsiz ham kuchli parol yaratishingiz mumkin.',
        pwned: "Agar bu parolni boshqa joyda ishlatsangiz, uni o'zgartiring.",
        recentYears: "So'nggi yillardan qoching.",
        repeated: "Takrorlangan so'zlar va belgilardan qoching.",
        reverseWords: "Keng tarqalgan so'zlarning teskari yozilishidan qoching.",
        sequences: 'Keng tarqalgan belgi ketma-ketliklaridan qoching.',
        useWords: "Bir nechta so'z ishlating, lekin keng tarqalgan iboralardan qoching.",
      },
      warnings: {
        common: 'Bu keng tarqalgan parol.',
        commonNames: 'Keng tarqalgan ismlar va familiyalar osonlikcha taxmin qilinadi.',
        dates: 'Sanalar osonlikcha taxmin qilinadi.',
        extendedRepeat: '"abcabcabc" kabi takrorlangan belgi naqshlari osonlikcha taxmin qilinadi.',
        keyPattern: 'Qisqa klaviatura naqshlari osonlikcha taxmin qilinadi.',
        namesByThemselves: "Yolg'iz ismlar yoki familiyalar osonlikcha taxmin qilinadi.",
        pwned: "Parolingiz internetdagi ma'lumotlar buzilishida oshkor bo'lgan.",
        recentYears: "So'nggi yillar osonlikcha taxmin qilinadi.",
        sequences: '"abc" kabi keng tarqalgan belgi ketma-ketliklari osonlikcha taxmin qilinadi.',
        similarToCommon: "Bu keng tarqalgan parolga o'xshash.",
        simpleRepeat: '"aaa" kabi takrorlangan belgilar osonlikcha taxmin qilinadi.',
        straightRow: "Klaviaturadagi to'g'ri qator tugmalari osonlikcha taxmin qilinadi.",
        topHundred: 'Bu tez-tez ishlatiladigan parol.',
        topTen: "Bu juda ko'p ishlatiladigan parol.",
        userInputs: "Shaxsiy yoki sahifaga oid ma'lumotlar bo'lmasligi kerak.",
        wordByItself: "Yolg'iz so'zlar osonlikcha taxmin qilinadi.",
      },
    },
  },
  userButton: {
    action__addAccount: "Hisob qo'shish",
    action__closeUserMenu: 'Foydalanuvchi menyusini yopish',
    action__manageAccount: 'Hisobni boshqarish',
    action__openUserMenu: 'Foydalanuvchi menyusini ochish',
    action__signOut: 'Chiqish',
    action__signOutAll: 'Barcha hisoblardan chiqish',
  },
  userProfile: {
    apiKeysPage: {
      title: 'API kalitlari',
    },
    backupCodePage: {
      actionLabel__copied: 'Nusxalandi!',
      actionLabel__copy: 'Hammasini nusxalash',
      actionLabel__download: '.txt yuklab olish',
      actionLabel__print: 'Chop etish',
      infoText1: 'Bu hisob uchun zaxira kodlar yoqiladi.',
      infoText2:
        'Zaxira kodlarni maxfiy saqlang va xavfsiz joyda saqlang. Ular buzilgan deb hisoblasangiz, zaxira kodlarni qayta yaratishingiz mumkin.',
      subtitle__codelist: 'Xavfsiz joyda saqlang va maxfiy tuting.',
      successMessage:
        "Zaxira kodlar yoqildi. Autentifikatsiya qurilmangizga kirish imkoni bo'lmasa, ulardan birini ishlatib hisobingizga kirishingiz mumkin. Har bir kod faqat bir marta ishlatilishi mumkin.",
      successSubtitle:
        "Autentifikatsiya qurilmangizga kirish imkoni bo'lmasa, ulardan birini ishlatib hisobingizga kirishingiz mumkin.",
      title: "Zaxira kod tasdiqlashni qo'shish",
      title__codelist: 'Zaxira kodlar',
    },
    billingPage: {
      paymentHistorySection: {
        empty: "To'lov tarixi yo'q",
        notFound: "To'lov urinishi topilmadi",
        tableHeader__amount: 'Summa',
        tableHeader__date: 'Sana',
        tableHeader__status: 'Holat',
      },
      paymentMethodsSection: {
        actionLabel__default: 'Asosiy qilish',
        actionLabel__remove: "O'chirish",
        add: "Yangi to'lov usuli qo'shish",
        addSubtitle: "Hisobingizga yangi to'lov usuli qo'shing.",
        cancelButton: 'Bekor qilish',
        formButtonPrimary__add: "To'lov usuli qo'shish",
        formButtonPrimary__pay: "{{amount}} to'lash",
        payWithTestCardButton: "Test karta bilan to'lash",
        removeMethod: {
          messageLine1: '{{identifier}} bu hisobdan olib tashlanadi.',
          messageLine2:
            "Bu to'lov manbasini endi ishlatib bo'lmaydi va unga bog'liq muntazam obunalar ham ishlamay qoladi.",
          successMessage: '{{paymentMethod}} hisobingizdan olib tashlandi.',
          title: "To'lov usulini o'chirish",
        },
        title: "To'lov usullari",
      },
      start: {
        headerTitle__payments: "To'lovlar",
        headerTitle__plans: 'Tariflar',
        headerTitle__statements: "Ko'chirmalar",
        headerTitle__subscriptions: 'Obuna',
      },
      statementsSection: {
        empty: "Ko'rsatiladigan ko'chirma yo'q",
        itemCaption__paidForPlan: "{{plan}} {{period}} tarif uchun to'landi",
        itemCaption__proratedCredit:
          'Oldingi obunaning qisman foydalanilishi uchun mutanosib kredit',
        itemCaption__payerCredit: 'Hisob balansidan kredit',
        itemCaption__subscribedAndPaidForPlan:
          "{{plan}} {{period}} tarifiga obuna bo'lindi va to'landi",
        notFound: "Ko'chirma topilmadi",
        tableHeader__amount: 'Summa',
        tableHeader__date: 'Sana',
        title: "Ko'chirmalar",
        totalPaid: "Jami to'landi",
      },
      subscriptionsListSection: {
        actionLabel__manageSubscription: 'Boshqarish',
        actionLabel__newSubscription: "Tarifga obuna bo'lish",
        actionLabel__switchPlan: 'Tarifni almashtirish',
        tableHeader__edit: 'Tahrirlash',
        tableHeader__plan: 'Tarif',
        tableHeader__startDate: 'Boshlanish sanasi',
        title: 'Obuna',
      },
      subscriptionsSection: {
        actionLabel__default: 'Boshqarish',
      },
      switchPlansSection: {
        title: 'Tarifni almashtirish',
      },
      title: 'Hisob-kitob',
    },
    connectedAccountPage: {
      formHint: 'Hisobingizni ulash uchun provayder tanlang.',
      formHint__noAccounts: "Mavjud tashqi hisob provayderlari yo'q.",
      removeResource: {
        messageLine1: '{{identifier}} bu hisobdan olib tashlanadi.',
        messageLine2:
          "Bu ulangan hisobni endi ishlatib bo'lmaydi va unga bog'liq funksiyalar ham ishlamay qoladi.",
        successMessage: '{{connectedAccount}} hisobingizdan olib tashlandi.',
        title: "Ulangan hisobni o'chirish",
      },
      socialButtonsBlockButton: '{{provider|titleize}}',
      successMessage: "Provayder hisobingizga qo'shildi",
      title: "Ulangan hisob qo'shish",
    },
    deletePage: {
      actionDescription: 'Davom etish uchun quyiga "Hisobni o\'chirish" deb yozing.',
      confirm: "Hisobni o'chirish",
      messageLine1:
        "Hisobingizni o'chirishni xohlaysizmi? Ba'zi bog'liq ma'lumotlar saqlanib qolishi mumkin. To'liq ma'lumotlarni o'chirish uchun qo'llab-quvvatlash xizmatiga murojaat qiling.",
      messageLine2: "Bu amalni qaytarib bo'lmaydi.",
      title: "Hisobni o'chirish",
    },
    emailAddressPage: {
      emailCode: {
        formHint: 'Bu email manziliga tasdiqlash kodi bilan email yuboriladi.',
        formSubtitle: '{{identifier}} ga yuborilgan tasdiqlash kodini kiriting',
        formTitle: 'Tasdiqlash kodi',
        resendButton: 'Kod kelmadimi? Qayta yuborish',
        successMessage: "{{identifier}} email hisobingizga qo'shildi.",
      },
      emailLink: {
        formHint: 'Bu email manziliga tasdiqlash havolasi bilan email yuboriladi.',
        formSubtitle: '{{identifier}} ga yuborilgan emaildagi tasdiqlash havolasini bosing',
        formTitle: 'Tasdiqlash havolasi',
        resendButton: 'Havola kelmadimi? Qayta yuborish',
        successMessage: "{{identifier}} email hisobingizga qo'shildi.",
      },
      enterpriseSSOLink: {
        formButton: 'Kirish uchun bosing',
        formSubtitle: '{{identifier}} bilan kirishni tugatish',
      },
      formHint: "Bu email manzilini hisobingizga qo'shishdan oldin tasdiqlashingiz kerak.",
      removeResource: {
        messageLine1: '{{identifier}} bu hisobdan olib tashlanadi.',
        messageLine2: 'Bu email manzili orqali endi kira olmaysiz.',
        successMessage: '{{emailAddress}} hisobingizdan olib tashlandi.',
        title: "Email manzilini o'chirish",
      },
      title: "Email manzili qo'shish",
      verifyTitle: 'Email manzilini tasdiqlash',
    },
    formButtonPrimary__add: "Qo'shish",
    formButtonPrimary__continue: 'Davom etish',
    formButtonPrimary__finish: 'Tugatish',
    formButtonPrimary__remove: "O'chirish",
    formButtonPrimary__save: 'Saqlash',
    formButtonReset: 'Bekor qilish',
    mfaPage: {
      formHint: "Qo'shish uchun usul tanlang.",
      title: "Ikki bosqichli tasdiqlashni qo'shish",
    },
    mfaPhoneCodePage: {
      backButton: 'Mavjud raqamdan foydalanish',
      primaryButton__addPhoneNumber: "Telefon raqami qo'shish",
      removeResource: {
        messageLine1: "{{identifier}} kirishda tasdiqlash kodlari olishni to'xtatadi.",
        messageLine2: 'Hisobingiz xavfsizligi kamayishi mumkin. Davom etishni xohlaysizmi?',
        successMessage: "{{mfaPhoneCode}} uchun SMS kod ikki bosqichli tasdiqlash o'chirildi",
        title: "Ikki bosqichli tasdiqlashni o'chirish",
      },
      subtitle__availablePhoneNumbers:
        "SMS kod ikki bosqichli tasdiqlash uchun mavjud telefon raqamini tanlang yoki yangisini qo'shing.",
      subtitle__unavailablePhoneNumbers:
        "SMS kod ikki bosqichli tasdiqlash uchun mavjud telefon raqami yo'q, yangi raqam qo'shing.",
      successMessage1:
        "Kirishda ushbu telefon raqamiga yuborilgan tasdiqlash kodini kiritishingiz kerak bo'ladi.",
      successMessage2:
        "Bu zaxira kodlarni saqlang va xavfsiz joyda saqlang. Autentifikatsiya qurilmangizga kirish imkoni bo'lmasa, zaxira kodlar bilan kirishingiz mumkin.",
      successTitle: 'SMS kod tasdiqlash yoqildi',
      title: "SMS kod tasdiqlashni qo'shish",
    },
    mfaTOTPPage: {
      authenticatorApp: {
        buttonAbleToScan__nonPrimary: 'QR kodni skanerlash',
        buttonUnableToScan__nonPrimary: "QR kodni skanerlab bo'lmayaptimi?",
        infoText__ableToScan:
          'Autentifikator ilovangizda yangi kirish usulini sozlang va uni hisobingizga ulash uchun quyidagi QR kodni skanerlang.',
        infoText__unableToScan:
          'Autentikatordangizda yangi kirish usulini sozlang va quyida berilgan kalitni kiriting.',
        inputLabel__unableToScan1:
          "Vaqtga asoslangan yoki bir martalik parollar yoqilganiga ishonch hosil qiling, so'ng hisobingizni ulashni tugatng.",
        inputLabel__unableToScan2:
          "Muqobil ravishda, autentifikatordangiz TOTP URI larini qo'llasa, to'liq URI ni ham nusxalashingiz mumkin.",
      },
      removeResource: {
        messageLine1: 'Bu autentifikatordagi tasdiqlash kodlari kirishda endi talab qilinmaydi.',
        messageLine2: 'Hisobingiz xavfsizligi kamayishi mumkin. Davom etishni xohlaysizmi?',
        successMessage: "Autentifikator ilova orqali ikki bosqichli tasdiqlash o'chirildi.",
        title: "Ikki bosqichli tasdiqlashni o'chirish",
      },
      successMessage:
        "Ikki bosqichli tasdiqlash yoqildi. Kirishda ushbu autentifikatordagi tasdiqlash kodini kiritishingiz kerak bo'ladi.",
      title: "Autentifikator ilova qo'shish",
      verifySubtitle: 'Autentifikatordangiz tomonidan yaratilgan tasdiqlash kodini kiriting',
      verifyTitle: 'Tasdiqlash kodi',
    },
    mobileButton__menu: 'Menyu',
    navbar: {
      account: 'Profil',
      apiKeys: 'API kalitlari',
      billing: 'Hisob-kitob',
      description: "Hisob ma'lumotlaringizni boshqaring.",
      security: 'Xavfsizlik',
      title: 'Hisob',
    },
    passkeyScreen: {
      removeResource: {
        messageLine1: '{{name}} bu hisobdan olib tashlanadi.',
        title: "Passkey ni o'chirish",
      },
      subtitle__rename: "Passkey nomini topish osonroq bo'lishi uchun o'zgartirishingiz mumkin.",
      title__rename: "Passkey nomini o'zgartirish",
    },
    passwordPage: {
      checkboxInfoText__signOutOfOtherSessions:
        "Eski parolingizdan foydalanishi mumkin bo'lgan boshqa qurilmalardan chiqish tavsiya etiladi.",
      readonly:
        'Parolingizni hozirda tahrirlash mumkin emas, chunki faqat korporativ aloqa orqali kirishingiz mumkin.',
      successMessage__set: "Parolingiz o'rnatildi.",
      successMessage__signOutOfOtherSessions: 'Barcha boshqa qurilmalardan chiqildi.',
      successMessage__update: 'Parolingiz yangilandi.',
      title__set: "Parol o'rnatish",
      title__update: 'Parolni yangilash',
    },
    phoneNumberPage: {
      infoText:
        "Bu telefon raqamiga tasdiqlash kodi bilan SMS yuboriladi. Xabar va ma'lumot to'lovlari qo'llanilishi mumkin.",
      removeResource: {
        messageLine1: '{{identifier}} bu hisobdan olib tashlanadi.',
        messageLine2: 'Bu telefon raqami orqali endi kira olmaysiz.',
        successMessage: '{{phoneNumber}} hisobingizdan olib tashlandi.',
        title: "Telefon raqamini o'chirish",
      },
      successMessage: "{{identifier}} hisobingizga qo'shildi.",
      title: "Telefon raqami qo'shish",
      verifySubtitle: '{{identifier}} ga yuborilgan tasdiqlash kodini kiriting',
      verifyTitle: 'Telefon raqamini tasdiqlash',
    },
    plansPage: {
      title: 'Tariflar',
    },
    profilePage: {
      fileDropAreaHint: "Tavsiya etilgan o'lcham 1:1, 10MB gacha.",
      imageFormDestructiveActionSubtitle: "O'chirish",
      imageFormSubtitle: 'Yuklash',
      imageFormTitle: 'Profil rasmi',
      readonly:
        "Profil ma'lumotlaringiz korporativ aloqa tomonidan taqdim etilgan va tahrirlab bo'lmaydi.",
      successMessage: 'Profilingiz yangilandi.',
      title: 'Profilni yangilash',
    },
    start: {
      activeDevicesSection: {
        destructiveAction: 'Qurilmadan chiqish',
        title: 'Faol qurilmalar',
      },
      connectedAccountsSection: {
        actionLabel__connectionFailed: 'Qayta ulash',
        actionLabel__reauthorize: 'Hozir ruxsat berish',
        destructiveActionTitle: "O'chirish",
        primaryButton: 'Hisob ulash',
        subtitle__disconnected: 'Bu hisob uzilgan.',
        subtitle__reauthorize:
          "Talab qilingan ruxsatlar yangilandi va funksionallik cheklangan bo'lishi mumkin. Muammolarni oldini olish uchun ushbu ilovani qayta ruxsatlang",
        title: 'Ulangan hisoblar',
      },
      dangerSection: {
        deleteAccountButton: "Hisobni o'chirish",
        title: "Hisobni o'chirish",
      },
      emailAddressesSection: {
        destructiveAction: "Emailni o'chirish",
        detailsAction__nonPrimary: 'Asosiy qilish',
        detailsAction__primary: 'Tasdiqlashni tugatish',
        detailsAction__unverified: 'Tasdiqlash',
        primaryButton: "Email manzili qo'shish",
        title: 'Email manzillari',
      },
      enterpriseAccountsSection: {
        primaryButton: 'Hisob ulash',
        title: 'Korporativ hisoblar',
      },
      headerTitle__account: 'Profil tafsilotlari',
      headerTitle__security: 'Xavfsizlik',
      mfaSection: {
        backupCodes: {
          actionLabel__regenerate: 'Qayta yaratish',
          headerTitle: 'Zaxira kodlar',
          subtitle__regenerate:
            "Yangi xavfsiz zaxira kodlar oling. Oldingi zaxira kodlar o'chiriladi va ishlatilmaydi.",
          title__regenerate: 'Zaxira kodlarni qayta yaratish',
        },
        phoneCode: {
          actionLabel__setDefault: 'Asosiy qilish',
          destructiveActionLabel: "O'chirish",
        },
        primaryButton: "Ikki bosqichli tasdiqlash qo'shish",
        title: 'Ikki bosqichli tasdiqlash',
        totp: {
          destructiveActionTitle: "O'chirish",
          headerTitle: 'Autentifikator ilova',
        },
      },
      passkeysSection: {
        menuAction__destructive: "O'chirish",
        menuAction__rename: "Nomini o'zgartirish",
        primaryButton: "Passkey qo'shish",
        title: 'Passkeylar',
      },
      passwordSection: {
        primaryButton__setPassword: "Parol o'rnatish",
        primaryButton__updatePassword: 'Parolni yangilash',
        title: 'Parol',
      },
      phoneNumbersSection: {
        destructiveAction: "Telefon raqamini o'chirish",
        detailsAction__nonPrimary: 'Asosiy qilish',
        detailsAction__primary: 'Tasdiqlashni tugatish',
        detailsAction__unverified: 'Telefon raqamini tasdiqlash',
        primaryButton: "Telefon raqami qo'shish",
        title: 'Telefon raqamlari',
      },
      profileSection: {
        primaryButton: 'Profilni yangilash',
        title: 'Profil',
      },
      usernameSection: {
        primaryButton__setUsername: "Foydalanuvchi nomini o'rnatish",
        primaryButton__updateUsername: 'Foydalanuvchi nomini yangilash',
        title: 'Foydalanuvchi nomi',
      },
      web3WalletsSection: {
        destructiveAction: "Hamyonni o'chirish",
        detailsAction__nonPrimary: 'Asosiy qilish',
        primaryButton: 'Hamyon ulash',
        title: 'Web3 hamyonlar',
        web3SelectSolanaWalletScreen: {
          subtitle: 'Hisobingizga ulash uchun Solana hamyonini tanlang.',
          title: "Solana hamyoni qo'shish",
        },
      },
    },
    usernamePage: {
      successMessage: 'Foydalanuvchi nomingiz yangilandi.',
      title__set: "Foydalanuvchi nomini o'rnatish",
      title__update: 'Foydalanuvchi nomini yangilash',
    },
    web3WalletPage: {
      removeResource: {
        messageLine1: '{{identifier}} bu hisobdan olib tashlanadi.',
        messageLine2: 'Bu web3 hamyon orqali endi kira olmaysiz.',
        successMessage: '{{web3Wallet}} hisobingizdan olib tashlandi.',
        title: "Web3 hamyonni o'chirish",
      },
      subtitle__availableWallets: 'Hisobingizga ulash uchun web3 hamyonni tanlang.',
      subtitle__unavailableWallets: "Mavjud web3 hamyonlar yo'q.",
      successMessage: "Hamyon hisobingizga qo'shildi.",
      title: "Web3 hamyon qo'shish",
      web3WalletButtonsBlockButton: '{{provider|titleize}}',
    },
  },
  waitlist: {
    start: {
      actionLink: 'Kirish',
      actionText: 'Allaqachon kirishingiz bormi?',
      formButton: "Kutish ro'yxatiga qo'shilish",
      subtitle: "Email manzilingizni kiriting va o'rningiz tayyor bo'lganida sizga xabar beramiz",
      title: "Kutish ro'yxatiga qo'shilish",
    },
    success: {
      message: "Tez orada yo'naltirilasiz...",
      subtitle: "O'rningiz tayyor bo'lganida siz bilan bog'lanamiz",
      title: "Kutish ro'yxatiga qo'shilganingiz uchun rahmat!",
    },
  },
  web3SolanaWalletButtons: {
    connect: '{{walletName}} bilan ulash',
    continue: '{{walletName}} bilan davom etish',
    noneAvailable:
      'Hech qanday Solana Web3 hamyoni topilmadi. Web3 ga mos {{ solanaWalletsLink || link("hamyon kengaytmasi") }} o\'rnating.',
  },
} as LocalizationResource;
