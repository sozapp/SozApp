import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const STORAGE_AMBIENT_TRACK = '@soz/ambientTrack';
export const STORAGE_AMBIENT_VOLUME = '@soz/ambientVolume';
export const STORAGE_AMBIENT_AUTO_PLAY = '@soz/ambientAutoPlay';

const STORAGE_TRACK = STORAGE_AMBIENT_TRACK;
const STORAGE_VOLUME = STORAGE_AMBIENT_VOLUME;
const STORAGE_AUTO_PLAY = STORAGE_AMBIENT_AUTO_PLAY;

export type AmbientTrack = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  color: string;
  /** Metro `require()` sonucu veya henüz dosya yoksa null */
  source: number | null;
};

/** Hook dışına açılan şu anki parça özeti */
export type AmbientCurrentTrack = { id: string; name: string; icon: string };

/**
 * MP3 dosyalarını assets/sounds/ altına ekleyip burada require edin.
 * Dosya yokken null bırakın — uygulama çökmez, sadece sessizlik.
 */
export const AMBIENT_TRACKS: AmbientTrack[] = [
  {
    id: 'silence',
    name: 'Sessizlik',
    desc: 'Sadece Söz',
    icon: 'moon-outline',
    color: 'rgba(232,224,208,0.5)',
    source: null,
  },
  {
    id: 'rain',
    name: 'Yağmur',
    desc: 'Hafif yağmur sesi',
    icon: 'rainy-outline',
    color: '#6BA3BE',
    source: null,
  },
  {
    id: 'wind',
    name: 'Esinti',
    desc: 'Hafif rüzgar',
    icon: 'leaf-outline',
    color: '#7CB87C',
    source: null,
  },
  {
    id: 'fire',
    name: 'Kor Ateş',
    desc: 'Şömine sesi',
    icon: 'flame-outline',
    color: '#C4956A',
    source: null,
  },
  {
    id: 'stream',
    name: 'Dere',
    desc: 'Akan su sesi',
    icon: 'water-outline',
    color: '#7BAFC4',
    source: null,
  },
  {
    id: 'birds',
    name: 'Kuşlar',
    desc: 'Sabah kuş sesleri',
    icon: 'sunny-outline',
    color: '#D4A843',
    source: null,
  },
  {
    id: 'piano',
    name: 'Piyano',
    desc: 'Sakin enstrümantal',
    icon: 'musical-notes-outline',
    color: '#B87CB8',
    source: null,
  },
  {
    id: 'strings',
    name: 'Yaylılar',
    desc: 'Derin yaylı müzik',
    icon: 'musical-note-outline',
    color: '#C47C7C',
    source: null,
  },
];

function toPublicTrack(t: AmbientTrack | undefined): AmbientCurrentTrack | null {
  if (!t) return null;
  return { id: t.id, name: t.name, icon: t.icon };
}

export function useAmbientMusicInternal() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [activeTrackId, setActiveTrackId] = useState<string>('silence');
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(0.4);
  const volumeRef = useRef(0.4);
  const [ambientAutoPlay, setAmbientAutoPlayState] = useState(false);

  const currentTrack = useMemo(
    () => toPublicTrack(AMBIENT_TRACKS.find((t) => t.id === activeTrackId)),
    [activeTrackId],
  );

  const stopAndUnload = useCallback(async () => {
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch {
      /* ignore */
    }
  }, []);

  const playTrack = useCallback(
    async (trackId: string) => {
      try {
        await stopAndUnload();

        if (trackId === 'silence') {
          setActiveTrackId('silence');
          setIsPlaying(false);
          await AsyncStorage.setItem(STORAGE_TRACK, 'silence');
          return;
        }

        const track = AMBIENT_TRACKS.find((t) => t.id === trackId);
        if (!track || !track.source) {
          if (__DEV__) {
            console.log('Ambient: ses dosyası yok, track:', trackId);
          }
          setActiveTrackId(trackId);
          setIsPlaying(false);
          await AsyncStorage.setItem(STORAGE_TRACK, trackId);
          return;
        }

        const vol = volumeRef.current;

        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
        });

        const { sound } = await Audio.Sound.createAsync(track.source, {
          isLooping: true,
          volume: vol,
          shouldPlay: true,
        });

        soundRef.current = sound;
        setActiveTrackId(trackId);
        setIsPlaying(true);
        await AsyncStorage.setItem(STORAGE_TRACK, trackId);
      } catch (e) {
        if (__DEV__) console.log('Audio error:', e);
        setIsPlaying(false);
      }
    },
    [stopAndUnload],
  );

  const togglePlay = useCallback(async () => {
    if (!soundRef.current) return;
    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch {
      /* ignore */
    }
  }, [isPlaying]);

  /** Aynı track: pause/resume; farklı track: durdur ve yenisini başlat */
  const toggleTrack = useCallback(
    async (trackId: string) => {
      if (trackId === activeTrackId) {
        if (trackId === 'silence') return;
        if (soundRef.current) {
          await togglePlay();
          return;
        }
        await playTrack(trackId);
        return;
      }
      await playTrack(trackId);
    },
    [activeTrackId, togglePlay, playTrack],
  );

  const playPause = useCallback(async () => {
    if (isPlaying) {
      await togglePlay();
      return;
    }
    await togglePlay();
    if (soundRef.current) return;
    const nextId =
      activeTrackId !== 'silence'
        ? activeTrackId
        : (AMBIENT_TRACKS.find((t) => t.id !== 'silence')?.id ?? 'silence');
    if (nextId !== 'silence') await playTrack(nextId);
  }, [isPlaying, activeTrackId, togglePlay, playTrack]);

  const setVolume = useCallback(async (v: number) => {
    const next = Math.min(1, Math.max(0, v));
    volumeRef.current = next;
    setVolumeState(next);
    try {
      if (soundRef.current) {
        await soundRef.current.setVolumeAsync(next);
      }
      await AsyncStorage.setItem(STORAGE_VOLUME, String(next));
    } catch {
      /* ignore */
    }
  }, []);

  const setAmbientAutoPlay = useCallback(async (enabled: boolean) => {
    setAmbientAutoPlayState(enabled);
    try {
      await AsyncStorage.setItem(STORAGE_AUTO_PLAY, enabled ? 'true' : 'false');
    } catch {
      /* ignore */
    }
  }, []);

  const stopMusic = useCallback(async () => {
    await stopAndUnload();
    setIsPlaying(false);
    setActiveTrackId('silence');
    try {
      await AsyncStorage.setItem(STORAGE_TRACK, 'silence');
    } catch {
      /* ignore */
    }
  }, [stopAndUnload]);

  const suspendPlayback = useCallback(async () => {
    await stopAndUnload();
    setIsPlaying(false);
  }, [stopAndUnload]);

  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  const playTrackRef = useRef(playTrack);
  playTrackRef.current = playTrack;
  const stopAndUnloadRef = useRef(stopAndUnload);
  stopAndUnloadRef.current = stopAndUnload;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [savedTrack, volStr, autoStr] = await Promise.all([
          AsyncStorage.getItem(STORAGE_TRACK),
          AsyncStorage.getItem(STORAGE_VOLUME),
          AsyncStorage.getItem(STORAGE_AUTO_PLAY),
        ]);

        let tid = 'silence';
        if (savedTrack && AMBIENT_TRACKS.some((t) => t.id === savedTrack)) {
          tid = savedTrack;
        }

        let vol = 0.4;
        if (volStr != null) {
          const parsed = parseFloat(volStr);
          if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 1) vol = parsed;
        }
        volumeRef.current = vol;
        setVolumeState(vol);

        const autoPlay = autoStr === 'true';
        setAmbientAutoPlayState(autoPlay);
        setActiveTrackId(tid);

        if (cancelled) return;

        if (autoPlay && tid !== 'silence') {
          const track = AMBIENT_TRACKS.find((t) => t.id === tid);
          if (track?.source) {
            if (!cancelled) await playTrackRef.current(tid);
          } else if (!cancelled) {
            setIsPlaying(false);
          }
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
      void stopAndUnloadRef.current();
    };
  }, []);

  return {
    currentTrack,
    isPlaying,
    volume,
    ambientAutoPlay,
    setAmbientAutoPlay,
    playTrack,
    toggleTrack,
    togglePlay,
    playPause,
    setVolume,
    /** Geriye dönük */
    changeVolume: setVolume,
    stopMusic,
    suspendPlayback,
    tracks: AMBIENT_TRACKS,
  };
}

export type AmbientMusicContextValue = ReturnType<typeof useAmbientMusicInternal>;
