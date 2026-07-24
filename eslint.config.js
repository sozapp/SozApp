// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      // Kullanılmayan Expo şablonu — uygulama runtime'ına dahil değil
      'app-example/**',
      // Deno edge functions — Node/Expo eslint resolver ile uyumsuz
      'supabase/functions/**',
      // Tek seferlik Node script'leri (__dirname vb.)
      'scripts/**',
      // Jest globals; lint ortamı jest'i tanımlamaz
      'jest.setup.js',
    ],
  },
  {
    rules: {
      // RN Text'te HTML entity kaçışı gerekmez; Türkçe metinlerde gürültü yaratıyor
      'react/no-unescaped-entities': 'off',
    },
  },
]);
