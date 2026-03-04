import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import {
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { ConvexReactClient } from 'convex/react';
import { useFonts } from 'expo-font';
import { Slot, router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';

import { authClient } from '@/lib/auth-client';
import { ThemeProvider, useThemeContext } from '@/contexts/theme-context';

// Keep the splash screen visible while we load resources
SplashScreen.preventAutoHideAsync();

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string,
  { unsavedChangesWarning: false }
);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Geist-Regular': Geist_400Regular,
    'Geist-Medium': Geist_500Medium,
    'Geist-SemiBold': Geist_600SemiBold,
    'Geist-Bold': Geist_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

function ThemedApp() {
  const { isDark } = useThemeContext();
  return (
    <NavThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <RootNavigator />
      </ConvexBetterAuthProvider>
    </NavThemeProvider>
  );
}

/**
 * Inner component so we can call the authClient hook after the provider
 * is mounted. Checks onboarding status first, then auth state.
 */
function RootNavigator() {
  const { data: session, isPending } = authClient.useSession();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  // Read onboarding flag once on mount
  useEffect(() => {
    SecureStore.getItemAsync('hasOnboarded').then((val) => {
      setHasOnboarded(val === 'true');
    });
  }, []);

  useEffect(() => {
    // Wait until both checks have resolved
    if (isPending || hasOnboarded === null) return;

    if (!hasOnboarded) {
      router.replace('/(auth)/onboarding' as any);
    } else if (!session) {
      router.replace('/(auth)/login');
    } else {
      router.replace('/(app)' as any);
    }
  }, [session, isPending, hasOnboarded]);

  return <Slot />;
}
