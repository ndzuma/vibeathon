import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { ConvexBetterAuthProvider } from '@convex-dev/better-auth/react';
import { ConvexReactClient } from 'convex/react';
import { Slot, router } from 'expo-router';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { authClient } from '@/lib/auth-client';

const convex = new ConvexReactClient(
  process.env.EXPO_PUBLIC_CONVEX_URL as string,
  { unsavedChangesWarning: false }
);

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ConvexBetterAuthProvider client={convex} authClient={authClient}>
        <RootNavigator />
      </ConvexBetterAuthProvider>
    </ThemeProvider>
  );
}

/**
 * Inner component so we can call the authClient hook after the provider
 * is mounted.  Redirects unauthenticated users to the auth stack.
 */
function RootNavigator() {
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (isPending) return;

    if (!session) {
      // Not logged in — send to login screen
      router.replace('/(auth)/login');
    } else {
      // Logged in — send to main app
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      router.replace('/(app)' as any);
    }
  }, [session, isPending]);

  // Render the matched route (Slot) — the effect above handles redirects
  return <Slot />;
}
