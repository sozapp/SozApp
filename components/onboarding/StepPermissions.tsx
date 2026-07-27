import { fonts } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { OB } from './onboardingPalette';

type PermissionRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
};

function PermissionRow({ icon, title, description, value, onValueChange }: PermissionRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={OB.accent} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(139,111,94,0.3)', true: OB.accent }}
        thumbColor={value ? '#FFF8EE' : '#FFFFFF'}
      />
    </View>
  );
}

type Props = {
  appLockEnabled: boolean;
  onToggleAppLock: (v: boolean) => void;
  appLockAvailable: boolean;
  analyticsEnabled: boolean;
  onToggleAnalytics: (v: boolean) => void;
};

export function StepPermissions({
  appLockEnabled,
  onToggleAppLock,
  appLockAvailable,
  analyticsEnabled,
  onToggleAnalytics,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons name="shield-checkmark-outline" size={40} color={OB.accent} />
      </View>
      <Text style={styles.title}>Gizlilik Tercihlerin</Text>
      <Text style={styles.subtitle}>
        Bu ayarları istediğin zaman Profil'den değiştirebilirsin.
      </Text>

      <View style={styles.card}>
        {appLockAvailable && (
          <PermissionRow
            icon="lock-closed-outline"
            title="Face ID ile Kilitle"
            description="Uygulamayı açarken kimlik doğrulaması iste."
            value={appLockEnabled}
            onValueChange={onToggleAppLock}
          />
        )}
        <PermissionRow
          icon="stats-chart-outline"
          title="Anonim Kullanım Verisi"
          description="Uygulamayı geliştirmemize yardımcı olacak anonim veri."
          value={analyticsEnabled}
          onValueChange={onToggleAnalytics}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(196,149,80,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: fonts.thin,
    fontSize: 26,
    color: OB.title,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: OB.muted,
    textAlign: 'center',
    marginBottom: 28,
    maxWidth: 280,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: OB.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: OB.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: OB.border,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    alignItems: 'center',
  },
  rowBody: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: fonts.medium,
    fontSize: 15,
    color: OB.title,
  },
  rowDesc: {
    fontFamily: fonts.regular,
    fontSize: 12.5,
    color: OB.muted,
    marginTop: 2,
  },
});
