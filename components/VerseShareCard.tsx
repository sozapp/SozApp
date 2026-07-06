import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SozLogo } from '@/components/SozLogo';
import { fonts } from '@/constants/theme';

export type ShareTheme = {
  id: string;
  name: string;
  bg: string;
  text: string;
  accent: string;
  muted: string;
};

export const SHARE_THEMES: ShareTheme[] = [
  { id: 'midnight', name: 'Gece', bg: '#0A0A08', text: '#E8E0D0', accent: '#C4956A', muted: 'rgba(232,224,208,0.5)' },
  { id: 'parchment', name: 'Parşömen', bg: '#F2E8D9', text: '#3C2415', accent: '#C4956A', muted: 'rgba(60,36,21,0.5)' },
  { id: 'ivory', name: 'Fildişi', bg: '#F5F0E8', text: '#2C2C2C', accent: '#C4956A', muted: 'rgba(44,44,44,0.5)' },
  { id: 'obsidian', name: 'Obsidyen', bg: '#000000', text: '#FFFFFF', accent: '#C4956A', muted: 'rgba(255,255,255,0.5)' },
  { id: 'forest', name: 'Orman', bg: '#1A2A1A', text: '#E0EAD8', accent: '#7CB87C', muted: 'rgba(224,234,216,0.5)' },
  { id: 'ocean', name: 'Okyanus', bg: '#0D1B2A', text: '#C9D6E3', accent: '#6BA3BE', muted: 'rgba(201,214,227,0.5)' },
  { id: 'rose', name: 'Gül', bg: '#2A1A1A', text: '#EAD8D8', accent: '#BE6B7C', muted: 'rgba(234,216,216,0.5)' },
  { id: 'gold', name: 'Altın', bg: '#1A1508', text: '#F0E6C8', accent: '#D4A843', muted: 'rgba(240,230,200,0.5)' },
];

const CARD_SIZE = 1080;
const scale = (n: number) => (n / 300) * CARD_SIZE;

type VerseShareCardProps = {
  theme: ShareTheme;
  verseText: string;
  verseRef: string;
};

export function VerseShareCard({ theme, verseText, verseRef }: VerseShareCardProps) {
  const isLong = verseText.length > 120;
  return (
    <View style={[styles.card, { backgroundColor: theme.bg, padding: scale(36) }]}>
      <View style={styles.headerRow}>
        <SozLogo size={scale(18)} color={theme.accent} />
        <Text style={[styles.brandText, { color: theme.accent }]}>Söz</Text>
      </View>

      <View style={styles.verseBlock}>
        <Text style={[styles.quoteMark, { color: theme.accent }]}>"</Text>
        <Text
          style={[
            styles.verseText,
            {
              color: theme.text,
              fontSize: isLong ? scale(13) : scale(15),
              lineHeight: isLong ? scale(20) : scale(24),
            },
          ]}
          numberOfLines={8}
        >
          {verseText}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={[styles.divider, { backgroundColor: theme.accent }]} />
        <Text style={[styles.refText, { color: theme.accent }]}>{verseRef}</Text>
        <Text style={[styles.siteText, { color: theme.muted }]}>sozapp.com</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  brandText: {
    fontSize: scale(14),
    letterSpacing: 0.1,
    fontFamily: fonts.regular,
  },
  verseBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  quoteMark: {
    fontSize: scale(48),
    lineHeight: scale(40),
    fontFamily: fonts.regular,
    marginBottom: scale(4),
    opacity: 0.6,
  },
  verseText: {
    fontStyle: 'italic',
    fontFamily: fonts.italic,
  },
  footer: {},
  divider: {
    height: 0.5,
    opacity: 0.3,
    marginBottom: scale(12),
  },
  refText: {
    fontSize: scale(12),
    letterSpacing: 0.1,
    marginBottom: scale(4),
    fontFamily: fonts.regular,
  },
  siteText: {
    fontSize: scale(10),
    letterSpacing: 0.05,
    fontFamily: fonts.regular,
  },
});
