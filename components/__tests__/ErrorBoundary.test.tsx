import * as React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { act, create } from 'react-test-renderer';

import { ErrorBoundary } from '@/components/ErrorBoundary';

jest.mock('expo-router', () => ({
  router: { replace: jest.fn(), push: jest.fn() },
}));

// @expo/vector-icons -> expo-font -> expo-asset zinciri Jest'in modül çözümlemesinde
// bulunamıyor (Metro'da sorun yok, sadece Jest ortamında) — ikon render'ını test
// etmediğimiz için basit bir stub yeterli.
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// jest.setup.js zaten @sentry/react-native'i no-op stub'lıyor; burada sadece
// reportError'un componentDidCatch içinde patlamadığını (import zinciri sağlam)
// doğrulamak yeterli — ayrıca çağrıldığını da teyit ediyoruz.
jest.mock('@/constants/sentry', () => ({
  reportError: jest.fn(),
}));

function Bomb(): React.ReactElement {
  throw new Error('boom');
}

function Safe() {
  return <Text>çalışıyor</Text>;
}

describe('ErrorBoundary', () => {
  // React, hatayı componentDidCatch'e iletmeden önce konsola da basıyor —
  // testte bu beklenen ve gürültülü olduğu için susturuyoruz.
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('çocuk bileşen render sırasında hata fırlatınca fallback UI gösterir ve reportError çağırır', () => {
    const { reportError } = jest.requireMock('@/constants/sentry');

    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <ErrorBoundary>
          <Bomb />
        </ErrorBoundary>
      );
    });

    const tree = renderer!.toJSON();
    const text = JSON.stringify(tree);
    expect(text).toContain('Bir şeyler ters gitti');
    expect(text).toContain('Yeniden Dene');
    expect(reportError).toHaveBeenCalledWith('ErrorBoundary', expect.any(Error));
  });

  it('hata fırlatmayan çocukları normal şekilde render eder (fallback devreye girmez)', () => {
    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <ErrorBoundary>
          <Safe />
        </ErrorBoundary>
      );
    });

    const text = JSON.stringify(renderer!.toJSON());
    expect(text).toContain('çalışıyor');
    expect(text).not.toContain('Bir şeyler ters gitti');
  });

  it('"Yeniden Dene" butonu state\'i resetler ve children tekrar denenir', () => {
    let shouldThrow = true;
    function Flaky() {
      if (shouldThrow) throw new Error('boom');
      return <Text>düzeldi</Text>;
    }

    let renderer: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <ErrorBoundary>
          <Flaky />
        </ErrorBoundary>
      );
    });

    expect(JSON.stringify(renderer!.toJSON())).toContain('Bir şeyler ters gitti');

    // Kullanıcı sorunu "düzelttiği" senaryoyu simüle ediyoruz (örn. state güncellendi),
    // sonra "Yeniden Dene" ile boundary'nin children'ı tekrar render etmesini bekliyoruz.
    shouldThrow = false;
    const retryButton = renderer!.root
      .findAllByType(TouchableOpacity)
      .find((btn) => btn.findByType(Text).props.children === 'Yeniden Dene');
    act(() => {
      retryButton!.props.onPress();
    });

    expect(JSON.stringify(renderer!.toJSON())).toContain('düzeldi');
  });
});
