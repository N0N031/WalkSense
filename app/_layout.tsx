import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Href, router, Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/src/hooks/use-color-scheme';
import { authService } from '@/src/services/authService';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();

  useEffect(() => {
    let active = true;
    async function routeGate() {
      const onboardingDone = await authService.isOnboardingDone();
      if (!active) return;
      if (!onboardingDone && pathname !== "/onboarding") {
        router.replace("/onboarding" as Href);
        return;
      }

      const hasAuth = await authService.hasAuth();
      if (!active) return;
      if (onboardingDone && (!hasAuth || !authService.isUnlocked()) && pathname !== "/auth") {
        router.replace("/auth" as Href);
      }
    }
    routeGate();
    return () => {
      active = false;
    };
  }, [pathname]);

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="light" />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
