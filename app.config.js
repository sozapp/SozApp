import 'dotenv/config'

export default {
  expo: {
    name: 'Söz',
    slug: 'soz',
    scheme: 'soz',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark',
    extra: {},
    ios: {
      bundleIdentifier: 'com.soz.incil',
      supportsTablet: false,
      requiresFullScreen: false,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
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
      [
        'expo-notifications',
        {
          icon: './assets/images/notification-icon.png',
          color: '#C4956A',
        },
      ],
      'expo-widgets',
      [
        './widgets/plugin',
        {
          targetName: 'DailyVerseWidget',
          bundleIdentifier: 'com.sozapp.widget',
        },
      ],
    ],
  },
}
