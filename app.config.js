import 'dotenv/config'

export default {
  expo: {
    name: 'Söz',
    slug: 'soz',
    scheme: 'soz',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    extra: {
      eas: {
        projectId: '47e34af9-c3d3-4627-9434-6eedbcdbef3d',
      },
    },
    owner: 'alihaydin',
    ios: {
      bundleIdentifier: 'com.soz.incil',
      supportsTablet: false,
      requiresFullScreen: false,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSFaceIDUsageDescription:
          'Söz, notlarınızı ve kişisel içeriklerinizi korumak için Face ID kullanır.',
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
          NSAllowsLocalNetworking: true,
        },
      },
    },
    watchos: {
      bundleIdentifier: 'com.sozapp.watch',
    },
    android: {
      package: 'com.soz.incil',
      usesCleartextTraffic: true,
    },
    plugins: [
      'expo-font',
      'expo-router',
      'expo-web-browser',
      'expo-local-authentication',
      [
        'expo-notifications',
        {
          icon: './assets/images/notification-icon.png',
          color: '#C4956A',
        },
      ],
      '@sentry/react-native/expo',
      'expo-widgets',
      [
        './widgets/plugin',
        {
          targetName: 'DailyVerseWidget',
          bundleIdentifier: 'com.sozapp.widget',
        },
      ],
      [
        'expo-quick-actions',
        {
          // İlk açılıştan önce bile görünsün (static iOS actions)
          iosActions: [
            {
              id: 'daily-verse',
              title: 'Günün Ayeti',
              subtitle: 'Bugünkü ayeti aç',
              icon: 'symbol:sun.max',
              params: { href: '/(tabs)' },
            },
            {
              id: 'ask-soz',
              title: "Söz'e Sor",
              subtitle: 'İncil hakkında sor',
              icon: 'symbol:bubble.left.and.bubble.right',
              params: { href: '/ask' },
            },
            {
              id: 'continue-plan',
              title: 'Devam Et',
              subtitle: 'Kaldığın yerden oku',
              icon: 'bookmark',
              params: { href: '/continue-plan' },
            },
            {
              id: 'random-verse',
              title: 'Rastgele Ayet',
              subtitle: 'Paylaşılacak bir ayet',
              icon: 'shuffle',
              params: { href: '/random-verse' },
            },
          ],
        },
      ],
    ],
  },
}
