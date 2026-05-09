import { COLORS } from "@/src/constants/colors";
import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "info" | "success" | "error";

interface ToastProps {
  message: string | null;
  type?: ToastType;
  onDone?: () => void;
  topOffset?: number;
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
  topOffset,
}: ToastProps) {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-6)).current;

  useEffect(() => {
    if (!message) return;
    opacity.setValue(0);
    translateY.setValue(-6);
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 140,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -6,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDone?.();
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [message, onDone, opacity, translateY]);

  if (!message) return null;

  const color = TOAST_COLORS[type];

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          top: topOffset ?? insets.top + 10,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: color }]} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
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
    alignSelf: "center",
    maxWidth: 280,
    minWidth: 170,
    zIndex: 200,
    elevation: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
    backgroundColor: "rgba(5, 12, 8, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },
  icon: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  text: {
    flex: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
});
