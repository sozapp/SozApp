import { useEffect, useRef } from 'react';
import { Animated, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

const ACCENT = '#C4956A';

export interface SozAlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface SozAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons: SozAlertButton[];
  onDismiss: () => void;
}

export function SozAlert({ visible, title, message, buttons, onDismiss }: SozAlertProps) {
  const { colors, fonts } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scaleAnim.setValue(0.8);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        damping: 15,
        stiffness: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, opacityAnim, scaleAnim]);

  return (
    <Modal transparent visible={visible} onRequestClose={onDismiss}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.6)',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: opacityAnim,
        }}
      >
        <Animated.View
          style={{
            backgroundColor: colors.card,
            borderRadius: 20,
            padding: 24,
            width: '80%',
            maxWidth: 320,
            borderWidth: 1,
            borderColor: colors.border,
            transform: [{ scale: scaleAnim }],
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontFamily: fonts.regular,
              color: colors.text,
              textAlign: 'center',
              marginBottom: message ? 8 : 20,
            }}
          >
            {title}
          </Text>

          {message ? (
            <Text
              style={{
                fontSize: 14,
                color: colors.textSecondary,
                textAlign: 'center',
                lineHeight: 20,
                marginBottom: 20,
              }}
            >
              {message}
            </Text>
          ) : null}

          <View
            style={{
              height: 1,
              backgroundColor: colors.border,
              marginBottom: 16,
            }}
          />

          <View
            style={{
              flexDirection: buttons.length > 2 ? 'column' : 'row',
              gap: 10,
            }}
          >
            {buttons.map((btn, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => {
                  btn.onPress?.();
                  onDismiss();
                }}
                style={{
                  flex: buttons.length <= 2 ? 1 : undefined,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: 'center',
                  backgroundColor:
                    btn.style === 'destructive'
                      ? '#E5737320'
                      : btn.style === 'cancel'
                        ? colors.background
                        : ACCENT,
                  borderWidth: btn.style === 'cancel' ? 1 : 0,
                  borderColor: colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontFamily: fonts.regular,
                    color:
                      btn.style === 'destructive'
                        ? '#E57373'
                        : btn.style === 'cancel'
                          ? colors.textSecondary
                          : '#FFF8EE',
                  }}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
