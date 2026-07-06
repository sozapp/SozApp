import { useState } from 'react';
import type { SozAlertButton } from '@/components/SozAlert';

export function useSozAlert() {
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message?: string;
    buttons: SozAlertButton[];
  }>({ visible: false, title: '', buttons: [] });

  const showAlert = (title: string, message?: string, buttons?: SozAlertButton[]) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons: buttons ?? [{ text: 'Tamam' }],
    });
  };

  const hideAlert = () => setAlertConfig((c) => ({ ...c, visible: false }));

  return { alertConfig, showAlert, hideAlert };
}
