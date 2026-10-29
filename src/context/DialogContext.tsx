import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import {
  AppDialog,
  DialogButton,
  DialogConfig,
} from '@/src/components/ui/AppDialog';

interface DialogContextValue {
  showDialog: (config: DialogConfig) => void;
  alert: (title: string, message?: string, buttons?: DialogButton[]) => void;
  confirm: (options: {
    title: string;
    message?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    destructive?: boolean;
    icon?: DialogConfig['icon'];
    onConfirm: () => void;
  }) => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<DialogConfig | null>(null);

  const close = useCallback(() => {
    setVisible(false);
  }, []);

  const showDialog = useCallback((next: DialogConfig) => {
    setConfig(next);
    setVisible(true);
  }, []);

  const alert = useCallback(
    (title: string, message?: string, buttons?: DialogButton[]) => {
      showDialog({
        title,
        message,
        icon: 'information-circle-outline',
        tone: 'primary',
        buttons: buttons ?? [{ label: 'OK', variant: 'primary' }],
      });
    },
    [showDialog],
  );

  const confirm = useCallback(
    (options: {
      title: string;
      message?: string;
      confirmLabel?: string;
      cancelLabel?: string;
      destructive?: boolean;
      icon?: DialogConfig['icon'];
      onConfirm: () => void;
    }) => {
      showDialog({
        title: options.title,
        message: options.message,
        icon: options.icon ?? (options.destructive ? 'trash-outline' : 'help-circle-outline'),
        tone: options.destructive ? 'danger' : 'primary',
        buttons: [
          { label: options.cancelLabel ?? 'Cancel', variant: 'secondary' },
          {
            label: options.confirmLabel ?? 'Confirm',
            variant: options.destructive ? 'danger' : 'primary',
            onPress: options.onConfirm,
          },
        ],
      });
    },
    [showDialog],
  );

  const value = useMemo(
    () => ({ showDialog, alert, confirm }),
    [showDialog, alert, confirm],
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      <AppDialog visible={visible} config={config} onClose={close} />
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return ctx;
}
