import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Share,
  Animated,
  Dimensions,
} from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SozLogo } from '@/components/SozLogo';
import { buildShareMessage, type VerseDeepLinkParams } from '@/constants/share-verse';
import { fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_SIZE = Math.min(SCREEN_WIDTH - 64, 280);

const DARK_BG_IDS = new Set(['midnight', 'obsidian', 'forest', 'ocean', 'rose', 'gold']);

export type ShareThemeItem = {
  id: string;
  name: string;
  bg: string;
  text: string;
  accent: string;
  muted: string;
};

const SHARE_THEMES: ShareThemeItem[] = [
  { id: 'midnight', name: 'Gece', bg: '#0A0A08', text: '#E8E0D0', accent: '#C4956A', muted: 'rgba(232,224,208,0.5)' },
  { id: 'parchment', name: 'Parşömen', bg: '#F2E8D9', text: '#3C2415', accent: '#C4956A', muted: 'rgba(60,36,21,0.5)' },
  { id: 'ivory', name: 'Fildişi', bg: '#F5F0E8', text: '#2C2C2C', accent: '#C4956A', muted: 'rgba(44,44,44,0.5)' },
  { id: 'obsidian', name: 'Obsidyen', bg: '#000000', text: '#FFFFFF', accent: '#C4956A', muted: 'rgba(255,255,255,0.5)' },
  { id: 'forest', name: 'Orman', bg: '#1A2A1A', text: '#E0EAD8', accent: '#7CB87C', muted: 'rgba(224,234,216,0.5)' },
  { id: 'ocean', name: 'Okyanus', bg: '#0D1B2A', text: '#C9D6E3', accent: '#6BA3BE', muted: 'rgba(201,214,227,0.5)' },
  { id: 'rose', name: 'Gül', bg: '#2A1A1A', text: '#EAD8D8', accent: '#BE6B7C', muted: 'rgba(234,216,216,0.5)' },
  { id: 'gold', name: 'Altın', bg: '#1A1508', text: '#F0E6C8', accent: '#D4A843', muted: 'rgba(240,230,200,0.5)' },
];

export interface ShareVerseModalProps {
  visible: boolean;
  onClose: () => void;
  verseText: string;
  verseRef: string;
  /** Uygulama yüklüyse soz://read?... deep link için */
  deepLinkParams?: VerseDeepLinkParams | null;
}

export default function ShareVerseModal({
  visible,
  onClose,
  verseText,
  verseRef,
  deepLinkParams,
}: ShareVerseModalProps) {
  const { colors } = useTheme();
  const [selectedTheme, setSelectedTheme] = useState<ShareThemeItem>(SHARE_THEMES[0]);
  const viewShotRef = useRef<ViewShot>(null);
  const slideAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: 500,
        duration: 250,
        useNativeDriver: false,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) return;
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Ayeti Paylaş',
        });
      } else {
        await Share.share({
          message: buildShareMessage(verseText, verseRef, deepLinkParams, {
            brandLine: 'sozapp.com',
          }),
        });
      }
      onClose();
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  const handleTextShare = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        message: buildShareMessage(verseText, verseRef, deepLinkParams),
      });
      onClose();
    } catch (_) {}
  };

  const isLong = verseText.length > 120;
  const styles = makeStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        {/* Overlay */}
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />

        {/* Bottom Sheet */}
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
          <SafeAreaView edges={['bottom']}>
            {/* Handle */}
            <View style={[styles.handle, { backgroundColor: colors.border }]} />

            <View style={{ gap: 16, paddingBottom: 12 }}>
              {/* Başlık */}
              <Text style={styles.sheetTitle}>AYET KARTINI PAYLAŞ</Text>

              {/* Kart önizleme */}
              <View style={{ alignItems: 'center' }}>
                <ViewShot
                  ref={viewShotRef}
                  options={{ format: 'jpg', quality: 1.0 }}
                  style={styles.shotWrap}
                >
                  <View style={[styles.card, { backgroundColor: selectedTheme.bg }]}>
                    <View style={styles.cardHeader}>
                      <SozLogo size={16} color={selectedTheme.accent} />
                      <Text style={[styles.cardBrand, { color: selectedTheme.accent }]}>Söz</Text>
                    </View>

                    <View style={styles.cardMiddle}>
                      <Text style={[styles.quoteMark, { color: selectedTheme.accent }]}>"</Text>
                      <Text
                        style={[
                          styles.cardVerse,
                          {
                            color: selectedTheme.text,
                            fontSize: isLong ? 13 : 15,
                            lineHeight: isLong ? 20 : 24,
                          },
                        ]}
                        numberOfLines={8}
                      >
                        {verseText}
                      </Text>
                    </View>

                    <View>
                      <View style={[styles.cardDivider, { backgroundColor: selectedTheme.accent }]} />
                      <Text style={[styles.cardRef, { color: selectedTheme.accent }]}>{verseRef}</Text>
                      <Text style={[styles.cardSite, { color: selectedTheme.muted }]}>sozapp.com</Text>
                    </View>
                  </View>
                </ViewShot>
                <Text style={[styles.themeName, { color: colors.textMuted }]}>{selectedTheme.name}</Text>
              </View>

              {/* Tema seçici */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.themeRow}
              >
                {SHARE_THEMES.map((theme) => {
                  const isSelected = selectedTheme.id === theme.id;
                  const checkColor = DARK_BG_IDS.has(theme.id) ? '#C4956A' : '#3C2415';
                  return (
                    <TouchableOpacity
                      key={theme.id}
                      onPress={() => {
                        setSelectedTheme(theme);
                        Haptics.selectionAsync();
                      }}
                      style={{ alignItems: 'center', gap: 6 }}
                    >
                      <View
                        style={[
                          styles.themeDot,
                          {
                            backgroundColor: theme.bg,
                            borderWidth: isSelected ? 2.5 : 1,
                            borderColor: isSelected ? '#C4956A' : 'rgba(196,149,80,0.3)',
                          },
                        ]}
                      >
                        {isSelected && (
                          <Ionicons name="checkmark" size={16} color={checkColor} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.themeDotLabel,
                          { color: isSelected ? '#C4956A' : colors.textMuted },
                        ]}
                      >
                        {theme.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Butonlar — yan yana */}
              <View style={styles.btnRow}>
                <TouchableOpacity onPress={handleShare} style={styles.btnPrimary}>
                  <Ionicons name="image-outline" size={16} color="#0A0A08" />
                  <Text style={styles.btnPrimaryText}>Görsel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleTextShare} style={[styles.btnSecondary, { borderColor: 'rgba(196,149,80,0.4)' }]}>
                  <Ionicons name="text-outline" size={16} color="#C4956A" />
                  <Text style={styles.btnSecondaryText}>Metin</Text>
                </TouchableOpacity>
              </View>

              {/* İptal */}
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>İptal</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors: { background: string; textMuted: string; border: string }) =>
  StyleSheet.create({
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 12,
      paddingHorizontal: 20,
      paddingBottom: 8,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      alignSelf: 'center',
      marginBottom: 20,
    },
    sheetTitle: {
      fontSize: 11,
      letterSpacing: 0.2,
      color: '#C4956A',
      fontFamily: fonts.medium,
      textAlign: 'center',
    },
    shotWrap: {
      borderRadius: 12,
      overflow: 'hidden',
    },
    card: {
      width: CARD_SIZE,
      height: CARD_SIZE,
      padding: 28,
      justifyContent: 'space-between',
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cardBrand: {
      fontSize: 13,
      fontFamily: fonts.regular,
      letterSpacing: 0.05,
    },
    cardMiddle: {
      flex: 1,
      justifyContent: 'center',
      paddingVertical: 12,
    },
    quoteMark: {
      fontSize: 42,
      lineHeight: 36,
      opacity: 0.5,
      fontFamily: fonts.regular,
      marginBottom: 4,
    },
    cardVerse: {
      fontStyle: 'italic',
      fontFamily: fonts.italic,
    },
    cardDivider: {
      height: 0.5,
      opacity: 0.3,
      marginBottom: 10,
    },
    cardRef: {
      fontSize: 12,
      letterSpacing: 0.1,
      marginBottom: 3,
      fontFamily: fonts.regular,
    },
    cardSite: {
      fontSize: 10,
      letterSpacing: 0.05,
      fontFamily: fonts.regular,
    },
    themeName: {
      fontSize: 11,
      fontStyle: 'italic',
      fontFamily: fonts.italic,
      marginTop: 8,
    },
    themeRow: {
      flexDirection: 'row',
      gap: 14,
      paddingVertical: 4,
      paddingHorizontal: 2,
    },
    themeDot: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    themeDotLabel: {
      fontSize: 9,
      fontFamily: fonts.regular,
      letterSpacing: 0.05,
    },
    btnRow: {
      flexDirection: 'row',
      gap: 10,
    },
    btnPrimary: {
      flex: 1,
      backgroundColor: '#C4956A',
      borderRadius: 10,
      paddingVertical: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    btnPrimaryText: {
      fontSize: 14,
      color: '#0A0A08',
      fontFamily: fonts.medium,
    },
    btnSecondary: {
      flex: 1,
      borderWidth: 0.5,
      borderRadius: 10,
      paddingVertical: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    btnSecondaryText: {
      fontSize: 14,
      color: '#C4956A',
      fontFamily: fonts.regular,
    },
    cancelBtn: {
      alignItems: 'center',
      paddingVertical: 6,
      marginBottom: 4,
    },
    cancelText: {
      fontSize: 13,
      fontFamily: fonts.regular,
    },
  });
