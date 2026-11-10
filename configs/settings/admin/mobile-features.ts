import { defineSettings } from '@/platform/metadata/settings';

defineSettings({
  module: 'admin',
  name: 'mobile_features',
  label: { en: 'Mobile features', ru: 'Мобильные функции', tr: 'Mobil özellikler' },
  fields: {
    offlineEnabled: {
      type: 'boolean',
      label: { en: 'Offline mode', ru: 'Офлайн-режим', tr: 'Çevrimdışı mod' },
      default: true,
      group: 'core',
    },
    biometricEnabled: {
      type: 'boolean',
      label: {
        en: 'Biometric unlock (Face / Touch ID)',
        ru: 'Биометрическая разблокировка',
        tr: 'Biyometrik kilit (Face / Touch ID)',
      },
      default: true,
      group: 'core',
    },
    pushEnabled: {
      type: 'boolean',
      label: { en: 'Push notifications', ru: 'Push-уведомления', tr: 'Anlık bildirimler' },
      default: true,
      group: 'core',
    },
    appleSignInEnabled: {
      type: 'boolean',
      label: { en: 'Sign in with Apple', ru: 'Вход через Apple', tr: 'Apple ile giriş' },
      default: true,
      group: 'platform',
    },
    siriShortcutsEnabled: {
      type: 'boolean',
      label: { en: 'Siri shortcuts', ru: 'Команды Siri', tr: 'Siri kısayolları' },
      default: false,
      group: 'platform',
    },
    widgetsEnabled: {
      type: 'boolean',
      label: {
        en: 'Home-screen widgets',
        ru: 'Виджеты главного экрана',
        tr: 'Ana ekran widget’ları',
      },
      default: false,
      group: 'platform',
    },
    autofillEnabled: {
      type: 'boolean',
      label: {
        en: 'AutoFill credentials',
        ru: 'AutoFill учётных данных',
        tr: 'Kimlik bilgileri otomatik doldurma',
      },
      default: false,
      group: 'platform',
    },
    directShareEnabled: {
      type: 'boolean',
      label: { en: 'Direct share', ru: 'Прямой шаринг', tr: 'Doğrudan paylaşım' },
      default: false,
      group: 'platform',
    },
  },
});
