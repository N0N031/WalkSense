import { COLORS } from "@/src/constants/colors";
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "info" | "success" | "error";

interface ToastProps {
  message: string | null;
  type?: ToastType;
  onDone?: () => void;
}

interface ToastState {
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    setToast({ message, type });
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast
        message={toast?.message ?? null}
        type={toast?.type}
        onDone={() => setToast(null)}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: () => undefined,
    };
  }
  return context;
}

export default function Toast({
  message,
  type = "info",
  onDone,
}: ToastProps) {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => onDone?.(), 3000);
    return () => clearTimeout(timer);
  }, [message, onDone]);

  if (!message) return null;

  const color = TOAST_COLORS[type];

  return (
    <View style={[styles.toast, { top: insets.top + 12 }]}>
      <View style={[styles.icon, { backgroundColor: color }]} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const TOAST_COLORS: Record<ToastType, string> = {
  info: COLORS.info,
  success: COLORS.primary,
  error: COLORS.error,
};

const styles = StyleSheet.create({
  toast: {
    position: "absolute",
    left: 18,
    right: 18,
    zIndex: 200,
    elevation: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    backgroundColor: "rgba(5, 12, 7, 0.95)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.30)",
  },
  icon: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  text: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "700",
  },
});
