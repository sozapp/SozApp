import { fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { OB } from './onboardingPalette';

const FEATURES: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
  color: string;
}[] = [
  {
    title: 'Tüm Yeni Ahit',
    desc: '27 kitap, Türkçe çeviri',
    icon: 'book-outline',
    color: '#C4956A',
  },
  {
    icon: 'heart-outline',
    title: 'Nasılsın? AI',
    desc: 'Ruh haline göre ayet',
    color: '#E87C7C',
  },
  {
    icon: 'game-controller-outline',
    title: 'Günlük Oyunlar',
    desc: 'Kim Söyledi?, D/Y, Eksik Kelime',
    color: '#7CB87C',
  },
  {
    icon: 'school-outline',
    title: 'Ayet Ezberleme',
    desc: 'Spaced repetition sistemi',
    color: '#6BA3BE',
  },
  {
    icon: 'map-outline',
    title: 'Anadolu Haritası',
    desc: '12 kutsal yer',
    color: '#C4956A',
  },
];

type Props = Record<string, never>;

export function Step3Features(_props: Props) {
  const [featureIdx, setFeatureIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setFeatureIdx((i) => (i + 1) % FEATURES.length);
    }, 2500);
    return () => clearInterval(t);
  }, []);

  const feature = FEATURES[featureIdx];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Özellik Turu</Text>
        <Text style={styles.subtitle}>Söz ile neler yapabilirsin</Text>
      </View>
      <View style={styles.featuresWrap}>
        <View style={styles.featureMain}>
          <View style={[styles.featureIconBig, { borderColor: feature.color }]}>
            <Ionicons name={feature.icon} size={40} color={feature.color} />
          </View>
          <Text style={styles.featureMainTitle}>{feature.title}</Text>
          <Text style={styles.featureMainDesc}>{feature.desc}</Text>
        </View>

        <View style={styles.featureDots}>
          {FEATURES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setFeatureIdx(i)}
              style={[styles.featureDot, i === featureIdx && styles.featureDotActive]}
            />
          ))}
        </View>

        <View style={styles.featureGrid}>
          {FEATURES.map((f, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.featureChip, i === featureIdx && styles.featureChipActive]}
              onPress={() => setFeatureIdx(i)}
            >
              <Ionicons
                name={f.icon}
                size={14}
                color={i === featureIdx ? f.color : OB.muted}
              />
              <Text style={[styles.featureChipText, i === featureIdx && { color: f.color }]}>
                {f.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
    backgroundColor: 'transparent',
    paddingHorizontal: 24,
    paddingBottom: 0,
    minHeight: 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  title: {
    fontFamily: fonts.thin,
    fontSize: 28,
    color: OB.title,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: fonts.italic,
    fontSize: 14,
    color: OB.muted,
  },
  featuresWrap: {
    flex: 1,
    minHeight: 0,
    gap: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureMain: {
    alignItems: 'center',
    gap: 12,
  },
  featureIconBig: {
    width: 100,
    height: 100,
    borderRadius: 28,
    borderWidth: 1.5,
    backgroundColor: 'rgba(196,149,80,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureMainTitle: {
    fontSize: 22,
    color: OB.title,
    fontFamily: fonts.regular,
    letterSpacing: -0.02,
  },
  featureMainDesc: {
    fontSize: 14,
    color: OB.body,
    fontStyle: 'italic',
    fontFamily: fonts.italic,
  },
  featureDots: {
    flexDirection: 'row',
    gap: 6,
  },
  featureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(196,149,80,0.2)',
  },
  featureDotActive: {
    width: 18,
    backgroundColor: OB.accent,
  },
  featureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 0.5,
    borderColor: OB.border,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  featureChipActive: {
    borderColor: 'rgba(196,149,80,0.45)',
    backgroundColor: 'rgba(196,149,80,0.1)',
  },
  featureChipText: {
    fontSize: 12,
    color: OB.muted,
    fontFamily: fonts.regular,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});
