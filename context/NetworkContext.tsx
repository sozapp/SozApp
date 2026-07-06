import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export function isOnlineFromNetInfo(state: NetInfoState | null): boolean {
  if (state == null) return true;
  if (state.isConnected !== true) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}

type NetworkContextType = {
  isOnline: boolean;
  isOffline: boolean;
};

const NetworkContext = createContext<NetworkContextType | null>(null);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let mounted = true;
    NetInfo.fetch()
      .then((state) => {
        if (mounted) setIsOnline(isOnlineFromNetInfo(state));
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn('NetInfo.fetch:', msg);
        if (mounted) setIsOnline(true);
      });
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(isOnlineFromNetInfo(state));
    });
    return () => {
      mounted = false;
      unsub();
    };
  }, []);

  const value = useMemo(
    () => ({ isOnline, isOffline: !isOnline }),
    [isOnline]
  );

  return (
    <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>
  );
}

export function useNetwork() {
  const ctx = useContext(NetworkContext);
  if (!ctx) {
    return { isOnline: true, isOffline: false };
  }
  return ctx;
}
