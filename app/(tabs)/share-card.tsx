import { colors, fonts } from '@/constants/theme';
import { SozAlert } from '@/components/SozAlert';
import { useSozAlert } from '@/hooks/useSozAlert';
import { usePremium } from '@/hooks/usePremium';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

type FontSizeKey = 'sm' | 'md' | 'lg';

const ACCENT = '#C4956A';

type ThemeDef = {
  id: string;
  name: string;
  kind: 'solid' | 'gradient';
  bg?: string;
  grad?: readonly [string, string, ...string[]];
  text: string;
  accent: string;
};

const CARD_THEMES: ThemeDef[] = [
  { id: 'gece', name: 'Gece', kind: 'solid', bg: '#1A1208', text: '#E8E0D0', accent: '#C49650' },
  { id: 'kehribar', name: 'Kehribar', kind: 'solid', bg: '#2D1F0A', text: '#E8E0D0', accent: '#C49650' },
  { id: 'deniz', name: 'Deniz', kind: 'solid', bg: '#0A1520', text: '#E8E0D0', accent: '#6B9BA8' },
  { id: 'krem', name: 'Krem', kind: 'solid', bg: '#F5F0E8', text: '#1A1208', accent: '#8B6914' },
  {
    id: 'mermer',
    name: 'Mermer',
    kind: 'gradient',
    grad: ['#FAFAF8', '#E8E4E0', '#D0CCC8'],
    text: '#9A7B2D',
    accent: '#B8860B',
  },
  { id: 'geceYarisi', name: 'Gece Yarısı', kind: 'solid', bg: '#050505', text: '#E8E6F0', accent: '#7C5CB3' },
  { id: 'zeytinlik', name: 'Zeytinlik', kind: 'solid', bg: '#1A2F24', text: '#F5ECD8', accent: '#9DAA7A' },
  { id: 'bakir', name: 'Bakır', kind: 'solid', bg: '#1a0f08', text: '#E8DDD4', accent: '#B87333' },
];

const ASPECT = {
  '1:1': { w: 1080, h: 1080, label: 'Kare (1:1 · Feed)' },
  '9:16': { w: 1080, h: 1920, label: 'Hikaye (9:16)' },
  '4:5': { w: 1080, h: 1350, label: 'Dikey (4:5)' },
} as const;

type AspectKey = keyof typeof ASPECT;

const FREE_THEME_INDEX = 0;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const H_PAD = 24;
const PREVIEW_MAX_W = SCREEN_WIDTH - H_PAD * 2;

function fontSizesFor(width: number, key: FontSizeKey) {
  const m = key === 'sm' ? 0.85 : key === 'lg' ? 1.2 : 1;
  const base = width * 0.034;
  const verse = Math.round(base * m * 10) / 10;
  const lh = Math.round(verse * 1.48 * 10) / 10;
  const ref = Math.round(width * 0.022 * m * 10) / 10;
  const logo = Math.round(width * 0.018 * 10) / 10;
  const wm = Math.round(width * 0.016 * 10) / 10;
  return { verse, lh, ref, logo, wm };
}

function ShareCardCanvas({
  width,
  height,
  theme,
  verseText,
  verseRef,
  fontKey,
  showReference,
  showWatermark,
}: {
  width: number;
  height: number;
  theme: ThemeDef;
  verseText: string;
  verseRef: string;
  fontKey: FontSizeKey;
  showReference: boolean;
  showWatermark: boolean;
}) {
  const fs = fontSizesFor(width, fontKey);
  const bg =
    theme.kind === 'gradient' && theme.grad ? (
      <LinearGradient colors={[...theme.grad]} style={StyleSheet.absoluteFill} />
    ) : (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: theme.bg ?? '#1A1208' }]} />
    );

  return (
    <View style={{ width, height, borderRadius: 12, overflow: 'hidden' }}>
      {bg}
      <View style={[styles.cardInnerAbs, { padding: width * 0.06 }]}>
        <Text style={[styles.cardLogoDyn, { color: theme.accent, fontSize: fs.logo }]}>SÖZ</Text>
        <View style={styles.verseWrap}>
          <Text
            style={[
              styles.cardVerseDyn,
              {
                color: theme.text,
                fontSize: fs.verse,
                lineHeight: fs.lh,
              },
            ]}
          >
            {verseText || '—'}
          </Text>
        </View>
        {showReference && verseRef ? (
          <Text style={[styles.cardRefDyn, { color: theme.accent, fontSize: fs.ref }]}>— {verseRef}</Text>
        ) : (
          <View style={{ minHeight: fs.ref + 4 }} />
        )}
        {showWatermark ? (
          <Text style={[styles.cardWmDyn, { color: theme.text, fontSize: fs.wm, opacity: 0.45 }]}>
            Söz uygulamasıyla oluşturuldu
          </Text>
        ) : null}
      </View>
      <CardCorners accent={theme.accent} size={Math.min(width, height) * 0.028} />
    </View>
  );
}

function CardCorners({ accent, size }: { accent: string; size: number }) {
  const b = Math.max(1, size * 0.08);
  const r = 12;
  return (
    <>
      <View style={[styles.c, styles.cTL, { width: size, height: size, borderColor: accent, borderTopWidth: b, borderLeftWidth: b, borderTopLeftRadius: r }]} />
      <View style={[styles.c, styles.cTR, { width: size, height: size, borderColor: accent, borderTopWidth: b, borderRightWidth: b, borderTopRightRadius: r }]} />
      <View style={[styles.c, styles.cBL, { width: size, height: size, borderColor: accent, borderBottomWidth: b, borderLeftWidth: b, borderBottomLeftRadius: r }]} />
      <View style={[styles.c, styles.cBR, { width: size, height: size, borderColor: accent, borderBottomWidth: b, borderRightWidth: b, borderBottomRightRadius: r }]} />
    </>
  );
}

export default function ShareCardScreen() {
  const params = useLocalSearchParams<{ text?: string; ref?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPremium } = usePremium();
  const exportShotRef = useRef<ViewShot>(null);

  const [themeIndex, setThemeIndex] = useState(0);
  const [fontKey, setFontKey] = useState<FontSizeKey>('md');
  const [showReference, setShowReference] = useState(true);
  const [showWatermark, setShowWatermark] = useState(true);
  const [aspectKey, setAspectKey] = useState<AspectKey>('4:5');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { alertConfig, showAlert, hideAlert } = useSozAlert();

  const verseText = params.text ?? '';
  const verseRef = params.ref ?? '';
  const theme = CARD_THEMES[themeIndex];
  const hasContent = Boolean(verseText.trim());
  const aspect = ASPECT[aspectKey];
  const exportW = aspect.w;
  const exportH = aspect.h;
  const scale = Math.min(PREVIEW_MAX_W / exportW, (Dimensions.get('window').height * 0.42) / exportH);
  const previewW = exportW * scale;
  const previewH = exportH * scale;

  const watermarkOnCard = !isPremium || showWatermark;

  const runCapture = useCallback(async (): Promise<string | null> => {
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    const shot = exportShotRef.current;
    if (!shot || typeof shot.capture !== 'function') return null;
    try {
      return await shot.capture();
    } catch {
      return null;
    }
  }, []);

  const openPreview = useCallback(async () => {
    if (!hasContent) return;
    setPreviewLoading(true);
    setPreviewOpen(true);
    setPreviewUri(null);
    const uri = await runCapture();
    setPreviewUri(uri);
    setPreviewLoading(false);
    if (!uri) {
      showAlert('Önizleme', 'Görüntü oluşturulamadı. Tekrar deneyin.');
    }
  }, [hasContent, runCapture, showAlert]);

  const shareUri = useCallback(async (uri: string) => {
    const ok = await Sharing.isAvailableAsync();
    if (!ok) {
      showAlert('Paylaşım', 'Bu cihazda paylaşım kullanılamıyor.');
      return;
    }
    await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Ayet kartını paylaş' });
  }, []);

  const saveUri = useCallback(async (uri: string) => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      showAlert('İzin gerekli', 'Kaydetmek için fotoğraf galerisi izni verin.');
      return;
    }
    await MediaLibrary.saveToLibraryAsync(uri);
    showAlert('Söz', 'Kart fotoğraflarınıza kaydedildi.');
  }, [showAlert]);

  const handlePreviewShare = useCallback(async () => {
    if (!previewUri) return;
    try {
      setActionLoading(true);
      await shareUri(previewUri);
    } finally {
      setActionLoading(false);
    }
  }, [previewUri, shareUri]);

  const handlePreviewSave = useCallback(async () => {
    if (!previewUri) return;
    try {
      setActionLoading(true);
      await saveUri(previewUri);
    } catch {
      showAlert('Hata', 'Kaydedilemedi.');
    } finally {
      setActionLoading(false);
    }
  }, [previewUri, saveUri]);

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { borderBottomColor: colors.dark.surface, paddingTop: insets.top > 0 ? 8 : 14 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.dark.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.dark.text }]}>Paylaşım kartı</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionLabel, { color: colors.dark.textMuted }]}>Önizleme</Text>
        <View style={styles.cardWrapper}>
          <View style={{ width: previewW, height: previewH, borderRadius: 10, overflow: 'hidden' }}>
            <ShareCardCanvas
              width={previewW}
              height={previewH}
              theme={theme}
              verseText={hasContent ? verseText : 'Ayet metni yüklenmedi'}
              verseRef={verseRef}
              fontKey={fontKey}
              showReference={showReference}
              showWatermark={watermarkOnCard}
            />
          </View>
        </View>

        <Text style={[styles.sectionLabel, { color: colors.dark.textMuted }]}>Format</Text>
        <View style={styles.chipRow}>
          {(Object.keys(ASPECT) as AspectKey[]).map((k) => (
            <Pressable
              key={k}
              style={[styles.chip, aspectKey === k && styles.chipOn, { borderColor: ACCENT }]}
              onPress={() => setAspectKey(k)}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: aspectKey === k ? colors.dark.background : colors.dark.text },
                ]}
              >
                {ASPECT[k].label.split(' ')[0]}
              </Text>
              <Text style={[styles.chipSub, { color: colors.dark.textMuted }]}>{k}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.dark.textMuted }]}>Tema</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themeRow}>
          {CARD_THEMES.map((t, i) => {
            const locked = !isPremium && i > FREE_THEME_INDEX;
            return (
              <Pressable
                key={t.id}
                style={[styles.themeCircleWrap, themeIndex === i && styles.themeCircleSelected]}
                onPress={() => {
                  if (locked) {
                    router.push('/paywall');
                    return;
                  }
                  setThemeIndex(i);
                }}
              >
                {t.kind === 'gradient' && t.grad ? (
                  <LinearGradient colors={[...t.grad]} style={styles.themeCircle} />
                ) : (
                  <View style={[styles.themeCircle, { backgroundColor: t.bg }]} />
                )}
                {locked && (
                  <View style={styles.themeLockOverlay}>
                    <Ionicons name="lock-closed-outline" size={14} color={ACCENT} style={styles.themeLockIcon} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
        <Text style={[styles.themeCurrent, { color: colors.dark.textMuted }]}>
          Seçili: <Text style={{ color: ACCENT }}>{theme.name}</Text>
        </Text>

        <Text style={[styles.sectionLabel, { color: colors.dark.textMuted }]}>Yazı boyutu</Text>
        <View style={styles.chipRow}>
          {(
            [
              ['sm', 'Küçük'],
              ['md', 'Orta'],
              ['lg', 'Büyük'],
            ] as const
          ).map(([k, label]) => (
            <Pressable
              key={k}
              style={[styles.chip, fontKey === k && styles.chipOn, { borderColor: ACCENT }]}
              onPress={() => setFontKey(k)}
            >
              <Text
                style={[styles.chipText, { color: fontKey === k ? colors.dark.background : colors.dark.text }]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: colors.dark.text }]}>Ayet referansı</Text>
          <Switch
            value={showReference}
            onValueChange={setShowReference}
            trackColor={{ false: '#444', true: ACCENT }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.toggleLabel, { color: colors.dark.text }]}>Filigran (Söz)</Text>
            {!isPremium ? (
              <Text style={[styles.toggleHint, { color: colors.dark.textMuted }]}>Ücretsiz planda zorunlu</Text>
            ) : null}
          </View>
          <Switch
            value={isPremium ? showWatermark : true}
            onValueChange={(v) => {
              if (isPremium) setShowWatermark(v);
            }}
            disabled={!isPremium}
            trackColor={{ false: '#444', true: ACCENT }}
            thumbColor="#fff"
          />
        </View>

        <Pressable
          style={[styles.btnPrimary, !hasContent && styles.btnDisabled]}
          onPress={openPreview}
          disabled={!hasContent || previewLoading}
        >
          <Text style={styles.btnPrimaryText}>{previewLoading ? 'Hazırlanıyor…' : 'Önizleme'}</Text>
        </Pressable>

        <Text style={[styles.footerNote, { color: colors.dark.textMuted, opacity: colors.watermarkOpacity }]}>
          Yüksek çözünürlükte dışa aktarılır · Önizlemede paylaş veya kaydet
        </Text>
      </ScrollView>

      {/* Off-screen export (full resolution) */}
      <View style={styles.offscreen} collapsable={false}>
        <ViewShot ref={exportShotRef} options={{ format: 'png', quality: 1 }} style={{ width: exportW, height: exportH }}>
          <ShareCardCanvas
            width={exportW}
            height={exportH}
            theme={theme}
            verseText={hasContent ? verseText : '—'}
            verseRef={verseRef}
            fontKey={fontKey}
            showReference={showReference}
            showWatermark={watermarkOnCard}
          />
        </ViewShot>
      </View>

      <Modal visible={previewOpen} animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
        <View style={[styles.modalRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setPreviewOpen(false)} hitSlop={12}>
              <Text style={[styles.modalClose, { color: ACCENT }]}>Kapat</Text>
            </Pressable>
            <Text style={[styles.modalTitle, { color: '#fff' }]}>Önizleme</Text>
            <View style={{ width: 48 }} />
          </View>
          <View style={styles.modalImageWrap}>
            {previewLoading ? (
              <ActivityIndicator size="large" color={ACCENT} />
            ) : previewUri ? (
              <Image source={{ uri: previewUri }} style={styles.modalImage} resizeMode="contain" />
            ) : null}
          </View>
          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnOutline, { borderColor: ACCENT }]}
              onPress={handlePreviewSave}
              disabled={!previewUri || actionLoading}
            >
              <Text style={[styles.modalBtnOutlineText, { color: ACCENT }]}>Kaydet</Text>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, { backgroundColor: ACCENT }]}
              onPress={handlePreviewShare}
              disabled={!previewUri || actionLoading}
            >
              <Text style={styles.modalBtnText}>{actionLoading ? '…' : 'Paylaş'}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <SozAlert {...alertConfig} onDismiss={hideAlert} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.dark.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  headerTitle: { fontFamily: fonts.medium, fontSize: 18 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 20,
    paddingBottom: 48,
  },
  sectionLabel: { fontFamily: fonts.medium, fontSize: 13, marginBottom: 10, marginTop: 8 },
  cardWrapper: { alignItems: 'center', marginBottom: 8 },
  cardInnerAbs: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  verseWrap: { flex: 1, justifyContent: 'center', paddingVertical: 8 },
  cardLogoDyn: { fontFamily: fonts.thin, letterSpacing: 3 },
  cardVerseDyn: { fontFamily: fonts.italic, textAlign: 'center' },
  cardRefDyn: { fontFamily: fonts.regular, textAlign: 'right', marginTop: 8 },
  cardWmDyn: { fontFamily: fonts.regular, textAlign: 'center', marginTop: 12 },
  c: { position: 'absolute' },
  cTL: { top: 0, left: 0 },
  cTR: { top: 0, right: 0 },
  cBL: { bottom: 0, left: 0 },
  cBR: { bottom: 0, right: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#555',
    minWidth: 72,
    alignItems: 'center',
  },
  chipOn: { backgroundColor: ACCENT, borderColor: ACCENT },
  chipText: { fontFamily: fonts.medium, fontSize: 13 },
  chipSub: { fontSize: 10, marginTop: 2 },
  themeRow: { flexDirection: 'row', gap: 14, marginBottom: 8, paddingRight: H_PAD },
  themeCurrent: { fontFamily: fonts.regular, fontSize: 12, marginBottom: 16, textAlign: 'center' },
  themeCircleWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0,
  },
  themeCircleSelected: { borderWidth: 2.5, borderColor: ACCENT },
  themeCircle: { width: 36, height: 36, borderRadius: 18 },
  themeLockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeLockIcon: { fontSize: 14 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingVertical: 4,
  },
  toggleLabel: { fontFamily: fonts.regular, fontSize: 15 },
  toggleHint: { fontSize: 11, marginTop: 4 },
  btnPrimary: {
    backgroundColor: ACCENT,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  btnDisabled: { opacity: 0.45 },
  btnPrimaryText: { fontFamily: fonts.medium, fontSize: 16, color: colors.white },
  footerNote: { fontFamily: fonts.regular, fontSize: 11, textAlign: 'center', marginTop: 16 },
  offscreen: {
    position: 'absolute',
    left: -4000,
    top: 0,
    width: 1080,
    pointerEvents: 'none',
  },
  modalRoot: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalClose: { fontFamily: fonts.medium, fontSize: 16 },
  modalTitle: { fontFamily: fonts.medium, fontSize: 17 },
  modalImageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  modalImage: { width: '100%', height: '100%' },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalBtnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
  },
  modalBtnText: { fontFamily: fonts.medium, fontSize: 16, color: '#fff' },
  modalBtnOutlineText: { fontFamily: fonts.medium, fontSize: 16 },
});
